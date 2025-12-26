import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { logCreatedActivity, logTimelineActivity } from '@/lib/timeline';
import { getUserFromToken } from '@/lib/auth';
import { trackEntityUpdate } from '@/lib/changeTracker';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assignedTo = searchParams.get('assignedTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const skip = (page - 1) * limit;

    // Get the authenticated user
    const token = request.cookies.get('auth-token')?.value;
    const currentUser = token ? await getUserFromToken(token) : null;
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let whereClause = {};
    
    // Role-based filtering
    if (currentUser.role === 'CEO' || currentUser.role === 'CTO') {
      // CEO and CTO can see all resources
      if (assignedTo) {
        // Handle both single assignment (assignedToId) and multiple assignments (assignedToIds)
        whereClause = {
          OR: [
            { assignedToId: assignedTo },
            { assignedToIds: { has: assignedTo } }
          ]
        };
      }
      // If no assignedTo filter, show all resources (no additional filtering)
    } else {
      // Regular employees can only see resources assigned to them
      whereClause = {
        OR: [
          { assignedToId: currentUser.id },
          { assignedToIds: { has: currentUser.id } }
        ]
      };
    }

    // Get total count
    const total = await prisma.resource.count({ where: whereClause });

    // Get paginated resources
    const resources = await prisma.resource.findMany({
      where: whereClause,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });

    // For resources with multiple assignments, fetch the assigned employees
    const resourcesWithAssignments = await Promise.all(
      resources.map(async (resource) => {
        if (resource.assignedToIds && resource.assignedToIds.length > 0) {
          const assignedEmployees = await prisma.employee.findMany({
            where: {
              id: { in: resource.assignedToIds }
            },
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              role: true
            }
          });
          return {
            ...resource,
            assignedEmployees
          };
        }
        return resource;
      })
    );

    return NextResponse.json({
      resources: resourcesWithAssignments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching resources:', error);
    return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('=== RESOURCE CREATION API CALLED ===');
    console.log('Received resource data:', JSON.stringify(body, null, 2));
    
    // Get the authenticated user
    const token = request.cookies.get('auth-token')?.value;
    const currentUser = token ? await getUserFromToken(token) : null;
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Validate required fields
    if (!body.name || !body.type) {
      console.log('Validation failed: missing required fields');
      return NextResponse.json({ 
        error: 'Missing required fields: name and type are required' 
      }, { status: 400 });
    }

    // Validate assignment based on resource type
    if (body.type === 'PHYSICAL' && !body.assignedToId) {
      return NextResponse.json({ 
        error: 'Physical resources must have a single assigned user (assignedToId)' 
      }, { status: 400 });
    }

    if ((body.type === 'SOFTWARE' || body.type === 'CLOUD') && (!body.assignedToIds || body.assignedToIds.length === 0)) {
      return NextResponse.json({ 
        error: 'Software and Cloud resources must have at least one assigned user (assignedToIds)' 
      }, { status: 400 });
    }

    console.log('Creating resource in database...');
    console.log('Current user creating resource:', currentUser.name, '(', currentUser.role, ')');

    // Create resource with minimal data first
    const resource = await prisma.resource.create({
      data: {
        name: body.name,
        type: body.type,
        assignedToId: body.type === 'PHYSICAL' ? body.assignedToId : null,
        assignedToIds: body.type !== 'PHYSICAL' ? (body.assignedToIds || []) : [],
        permissionLevel: body.permissionLevel || 'READ',
        status: body.status || 'ACTIVE',
        category: body.category || null,
        description: body.description || null,
        ownerId: body.ownerId || null,
        // Add other fields as needed
        serialNumber: body.serialNumber || null,
        modelNumber: body.modelNumber || null,
        brand: body.brand || null,
        location: body.location || null,
        value: body.value ? parseFloat(body.value) : null,
        monthlyRate: body.monthlyRate ? parseFloat(body.monthlyRate) : null,
        annualRate: body.annualRate ? parseFloat(body.annualRate) : null,
        provider: body.provider || null,
        serviceLevel: body.serviceLevel || null,
        softwareVersion: body.softwareVersion || null,
        // Handle dates
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null,
        licenseExpiry: body.licenseExpiry ? new Date(body.licenseExpiry) : null,
        subscriptionExpiry: body.subscriptionExpiry ? new Date(body.subscriptionExpiry) : null,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            role: true
          }
        }
      }
    });

    console.log('Resource created successfully:', resource.id);

    // Try audit logging (but don't fail if it errors)
    try {
      await logAudit({
        entityType: 'RESOURCE',
        entityId: resource.id,
        changedById: currentUser.id,
        fieldChanged: 'created',
        oldValue: null,
        newValue: JSON.stringify({ name: resource.name, type: resource.type })
      });
    } catch (auditError) {
      console.error('Audit logging failed:', auditError);
    }

    // Try timeline logging (but don't fail if it errors)
    try {
      console.log('Attempting to log timeline activity...');
      
      // Create a more detailed description
      const assignedToName = resource.assignedTo?.name || 'Unassigned';
      const description = `New resource was created by ${currentUser.name} (${currentUser.role}) and assigned to ${assignedToName}`;
      
      await logTimelineActivity({
        entityType: 'RESOURCE',
        entityId: resource.id,
        activityType: 'CREATED',
        title: `Created resource: ${resource.name}`,
        description: description,
        metadata: {
          type: resource.type,
          status: resource.status,
          createdBy: currentUser.name,
          createdByRole: currentUser.role,
          assignedTo: assignedToName,
          assignedToId: resource.assignedToId
        },
        performedBy: currentUser.id,
        resourceId: resource.id
      });
      console.log('Timeline activity logged successfully');
    } catch (timelineError) {
      console.error('Timeline logging failed:', timelineError);
      console.error('Timeline error stack:', (timelineError as Error).stack);
    }

    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    console.error('Error creating resource:', error);
    return NextResponse.json({ 
      error: 'Failed to create resource', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Resource ID is required' }, { status: 400 });
    }

    const body = await request.json();

    // Get current resource data for change tracking
    const currentResource = await prisma.resource.findUnique({
      where: { id }
    });

    if (!currentResource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Update resource
    const updatedResource = await prisma.resource.update({
      where: { id },
      data: {
        name: body.name,
        type: body.type,
        category: body.category || null,
        description: body.description || null,
        ownerId: body.ownerId || null,
        assignedToId: body.type === 'PHYSICAL' ? body.assignedToId : null,
        assignedToIds: body.type !== 'PHYSICAL' ? (body.assignedToIds || []) : [],
        permissionLevel: body.permissionLevel || 'READ',
        status: body.status || 'ACTIVE',
        serialNumber: body.serialNumber || null,
        modelNumber: body.modelNumber || null,
        brand: body.brand || null,
        location: body.location || null,
        value: body.value ? parseFloat(body.value) : null,
        monthlyRate: body.monthlyRate ? parseFloat(body.monthlyRate) : null,
        annualRate: body.annualRate ? parseFloat(body.annualRate) : null,
        provider: body.provider || null,
        serviceLevel: body.serviceLevel || null,
        softwareVersion: body.softwareVersion || null,
        licenseKey: body.licenseKey || null,
        subscriptionId: body.subscriptionId || null,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null,
        licenseExpiry: body.licenseExpiry ? new Date(body.licenseExpiry) : null,
        subscriptionExpiry: body.subscriptionExpiry ? new Date(body.subscriptionExpiry) : null,
        assignedDate: body.assignedDate ? new Date(body.assignedDate) : null,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        lastMaintenance: body.lastMaintenance ? new Date(body.lastMaintenance) : null,
        nextMaintenance: body.nextMaintenance ? new Date(body.nextMaintenance) : null,
        lastUpdate: body.lastUpdate ? new Date(body.lastUpdate) : null,
        updateVersion: body.updateVersion || null
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            role: true
          }
        }
      }
    });

    // Track all changes comprehensively
    await trackEntityUpdate(
      'RESOURCE',
      id,
      updatedResource.name,
      currentResource,
      updatedResource,
      request
    );

    return NextResponse.json(updatedResource);
  } catch (error) {
    console.error('Error updating resource:', error);
    return NextResponse.json({ 
      error: 'Failed to update resource', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}