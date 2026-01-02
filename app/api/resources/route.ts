import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromToken } from '@/lib/auth';
import { logTimelineActivity } from '@/lib/timeline';
import { logPropertySchemaSelected } from '@/lib/resourceStructureAudit';
import { 
  createResourceWithSchema, 
  getResources,
  validatePropertyDefinitions 
} from '@/lib/resourceService';
import { PropertyDefinition } from '@/types/resource-structure';
import { 
  createBackwardCompatibleResourceResponse,
  isNewStructureResource 
} from '@/lib/backwardCompatibility';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type') as 'PHYSICAL' | 'SOFTWARE' | 'CLOUD' | null;
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const assignedTo = searchParams.get('assignedTo');
    const forAccessRequest = searchParams.get('forAccessRequest') === 'true';
    // New filters for enhanced resource structure
    const resourceTypeId = searchParams.get('resourceTypeId');
    const resourceCategoryId = searchParams.get('resourceCategoryId');

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};
    if (type) whereClause.type = type;
    if (category) whereClause.category = category;
    if (status) whereClause.status = status;
    // New filters for enhanced resource structure
    if (resourceTypeId) whereClause.resourceTypeId = resourceTypeId;
    if (resourceCategoryId) whereClause.resourceCategoryId = resourceCategoryId;
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Filter by assigned employee if specified
    if (assignedTo) {
      whereClause.assignments = {
        some: {
          employeeId: assignedTo,
          status: 'ACTIVE'
        }
      };
    }

    // For regular employees, only show resources assigned to them (EXCEPT for access requests)
    if (!['CEO', 'CTO', 'ADMIN'].includes(user.role) && !forAccessRequest) {
      whereClause.assignments = {
        some: {
          employeeId: user.id,
          status: 'ACTIVE'
        }
      };
    }

    const totalResources = await prisma.resource.count({ where: whereClause });

    const resources = await prisma.resource.findMany({
      where: whereClause,
      skip,
      take: limit,
      include: {
        custodian: {
          select: { id: true, name: true, email: true, department: true }
        },
        // Include new resource type and category relations
        resourceTypeEntity: true,
        resourceCategory: true,
        assignments: {
          where: { status: 'ACTIVE' },
          include: {
            employee: {
              select: { id: true, name: true, email: true, department: true }
            }
          }
        },
        items: {
          select: { id: true, status: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Add basic availability info and schema information
    const resourcesWithInfo = resources.map((resource: any) => ({
      ...resource,
      assignedCount: resource.assignments.length,
      isAssigned: resource.assignments.length > 0,
      itemCount: resource.items?.length || 0,
      // Include property schema information
      propertySchema: resource.propertySchema || [],
      schemaLocked: resource.schemaLocked || false,
      // Include type and category names for convenience
      resourceTypeName: resource.resourceTypeEntity?.name || null,
      resourceCategoryName: resource.resourceCategory?.name || null
    }));

    return NextResponse.json({
      resources: resourcesWithInfo,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalResources / limit),
        totalItems: totalResources,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(totalResources / limit),
        hasPreviousPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching resources:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch resources' 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await getUserFromToken(token);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to create resources
    if (!['CEO', 'CTO', 'ADMIN'].includes(currentUser.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to create resources' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { 
      name, 
      type, 
      category, 
      description, 
      custodianId,
      // New fields for enhanced resource structure
      resourceTypeId,
      resourceCategoryId,
      selectedProperties,
      quantity,
      metadata
    } = body;

    // Determine if this is a new-style request (with resourceTypeId) or legacy request (with type)
    const isEnhancedRequest = !!resourceTypeId;

    if (isEnhancedRequest) {
      // Enhanced resource creation with property schema
      // Requirements: 3.1 - Require assignment to exactly one resource type
      if (!resourceTypeId) {
        return NextResponse.json({ 
          error: 'Missing required field: resourceTypeId' 
        }, { status: 400 });
      }

      if (!name) {
        return NextResponse.json({ 
          error: 'Missing required field: name' 
        }, { status: 400 });
      }

      // Get CEO as default custodian if not specified
      let finalCustodianId = custodianId;
      if (!finalCustodianId) {
        const ceo = await prisma.employee.findFirst({
          where: { role: 'CEO' },
          select: { id: true }
        });
        
        if (!ceo) {
          return NextResponse.json({ 
            error: 'No CEO found to assign as custodian' 
          }, { status: 500 });
        }
        
        finalCustodianId = ceo.id;
      }

      // Validate selectedProperties if provided
      let propertiesToUse: PropertyDefinition[] = selectedProperties || [];
      
      // If no properties provided, use empty array (will be validated in service)
      if (propertiesToUse.length === 0) {
        // Provide a default empty schema - user can add properties later before creating items
        propertiesToUse = [];
      }

      // Validate property definitions
      if (propertiesToUse.length > 0) {
        const validationErrors = validatePropertyDefinitions(propertiesToUse);
        if (validationErrors.length > 0) {
          return NextResponse.json({ 
            error: 'Invalid property definitions',
            details: validationErrors
          }, { status: 400 });
        }
      }

      // Validate resourceCategoryId belongs to resourceTypeId if provided
      // Requirements: 3.4 - Validate that assigned categories belong to the selected resource type
      if (resourceCategoryId) {
        const categoryCheck = await prisma.resourceCategoryEntity.findUnique({
          where: { id: resourceCategoryId }
        });

        if (!categoryCheck) {
          return NextResponse.json({ 
            error: 'Invalid resource category ID' 
          }, { status: 400 });
        }

        if (categoryCheck.resourceTypeId !== resourceTypeId) {
          return NextResponse.json({ 
            error: 'Category does not belong to the selected resource type' 
          }, { status: 400 });
        }
      }

      try {
        const resource = await createResourceWithSchema({
          name,
          resourceTypeId,
          resourceCategoryId: resourceCategoryId || undefined,
          description: description || undefined,
          selectedProperties: propertiesToUse,
          custodianId: finalCustodianId,
          quantity: quantity || 1,
          metadata: metadata || undefined
        }, currentUser.id);

        // Log resource creation activity
        await logTimelineActivity({
          entityType: 'RESOURCE',
          entityId: resource.id,
          activityType: 'CREATED',
          title: `Resource created: ${resource.name}`,
          description: `${resource.name} (${resource.resourceTypeEntity?.name || resource.type}) was created by ${currentUser.name}`,
          performedBy: currentUser.id,
          metadata: {
            resourceName: resource.name,
            resourceType: resource.resourceTypeEntity?.name || resource.type,
            resourceTypeId: resource.resourceTypeId,
            resourceCategoryId: resource.resourceCategoryId,
            resourceCategoryName: resource.resourceCategory?.name,
            propertyCount: resource.propertySchema.length,
            createdBy: currentUser.name,
            createdById: currentUser.id
          },
          resourceId: resource.id
        });

        // Requirement 11.2: Log property schema selection
        if (propertiesToUse.length > 0) {
          await logPropertySchemaSelected({
            resourceId: resource.id,
            resourceName: resource.name,
            newSchema: propertiesToUse.map(p => ({
              key: p.key,
              label: p.label,
              dataType: p.dataType,
              isRequired: p.isRequired,
            })),
            schemaLocked: false,
            performedById: currentUser.id,
            performedByName: currentUser.name,
          });
        }

        return NextResponse.json({
          success: true,
          message: `Resource "${resource.name}" created successfully`,
          resource: {
            ...resource,
            assignedCount: 0,
            isAssigned: false,
            itemCount: 0
          }
        });
      } catch (error: any) {
        console.error('Error creating resource with schema:', error);
        return NextResponse.json({ 
          error: error.message || 'Failed to create resource' 
        }, { status: 400 });
      }
    } else {
      // Legacy resource creation (backward compatibility)
      if (!name || !type) {
        return NextResponse.json({ 
          error: 'Missing required fields: name, type' 
        }, { status: 400 });
      }

      // Get CEO as default custodian if not specified
      let finalCustodianId = custodianId;
      if (!finalCustodianId) {
        const ceo = await prisma.employee.findFirst({
          where: { role: 'CEO' },
          select: { id: true }
        });
        
        if (!ceo) {
          return NextResponse.json({ 
            error: 'No CEO found to assign as custodian' 
          }, { status: 500 });
        }
        
        finalCustodianId = ceo.id;
      }

      // Create resource (legacy mode)
      const resource = await prisma.resource.create({
        data: {
          name,
          type,
          category: category || null,
          description: description || null,
          owner: 'Unisouk',
          custodianId: finalCustodianId,
          status: 'ACTIVE',
          propertySchema: [],
          schemaLocked: false
        },
        include: {
          custodian: {
            select: { id: true, name: true, email: true, department: true }
          },
          resourceTypeEntity: true,
          resourceCategory: true
        }
      });

      // Log resource creation activity
      await logTimelineActivity({
        entityType: 'RESOURCE',
        entityId: resource.id,
        activityType: 'CREATED',
        title: `Resource created: ${resource.name}`,
        description: `${resource.name} (${resource.type}) was created by ${currentUser.name}`,
        performedBy: currentUser.id,
        metadata: {
          resourceName: resource.name,
          resourceType: resource.type,
          category: resource.category,
          owner: resource.owner,
          custodian: resource.custodian.name,
          createdBy: currentUser.name,
          createdById: currentUser.id
        },
        resourceId: resource.id
      });

      return NextResponse.json({
        success: true,
        message: `Resource "${resource.name}" created successfully`,
        resource: {
          ...resource,
          assignedCount: 0,
          isAssigned: false,
          itemCount: 0
        }
      });
    }

  } catch (error) {
    console.error('Error creating resource:', error);
    return NextResponse.json({ 
      error: 'Failed to create resource' 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await getUserFromToken(token);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to update resources
    if (!['CEO', 'CTO', 'ADMIN'].includes(currentUser.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to update resources' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { 
      id, 
      name, 
      type, 
      category, 
      description, 
      custodianId, 
      status,
      // New fields for enhanced resource structure
      resourceCategoryId,
      selectedProperties,
      quantity,
      metadata
    } = body;

    if (!id) {
      return NextResponse.json({ 
        error: 'Missing required field: id' 
      }, { status: 400 });
    }

    // Get existing resource
    const existingResource = await prisma.resource.findUnique({
      where: { id },
      include: {
        assignments: {
          where: { status: 'ACTIVE' }
        },
        items: {
          select: { id: true }
        }
      }
    });

    if (!existingResource) {
      return NextResponse.json({ 
        error: 'Resource not found' 
      }, { status: 404 });
    }

    // Handle property schema update
    // Requirements: 8.7 - Prevent modification of the property schema once any items exist
    if (selectedProperties !== undefined) {
      if (existingResource.schemaLocked) {
        return NextResponse.json({ 
          error: 'Cannot modify property schema: schema is locked after first item creation' 
        }, { status: 400 });
      }

      if (existingResource.items.length > 0) {
        return NextResponse.json({ 
          error: 'Cannot modify property schema: resource already has items' 
        }, { status: 400 });
      }

      // Validate property definitions
      const validationErrors = validatePropertyDefinitions(selectedProperties);
      if (validationErrors.length > 0) {
        return NextResponse.json({ 
          error: 'Invalid property definitions',
          details: validationErrors
        }, { status: 400 });
      }
    }

    // Validate resourceCategoryId if changing
    // Requirements: 3.3 - Clear any incompatible category assignment when type changes
    // Requirements: 3.4 - Validate that assigned categories belong to the selected resource type
    if (resourceCategoryId !== undefined && resourceCategoryId !== null) {
      const categoryCheck = await prisma.resourceCategoryEntity.findUnique({
        where: { id: resourceCategoryId }
      });

      if (!categoryCheck) {
        return NextResponse.json({ 
          error: 'Invalid resource category ID' 
        }, { status: 400 });
      }

      // Validate category belongs to the resource's type
      if (existingResource.resourceTypeId && categoryCheck.resourceTypeId !== existingResource.resourceTypeId) {
        return NextResponse.json({ 
          error: 'Category does not belong to the resource type' 
        }, { status: 400 });
      }
    }

    // Update resource
    const updatedResource = await prisma.resource.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(custodianId && { custodianId }),
        ...(status && { status }),
        ...(resourceCategoryId !== undefined && { resourceCategoryId }),
        ...(selectedProperties !== undefined && { 
          propertySchema: JSON.parse(JSON.stringify(selectedProperties)) 
        }),
        ...(quantity !== undefined && { quantity }),
        ...(metadata !== undefined && { metadata: JSON.parse(JSON.stringify(metadata)) })
      },
      include: {
        custodian: {
          select: { id: true, name: true, email: true, department: true }
        },
        resourceTypeEntity: true,
        resourceCategory: true,
        assignments: {
          where: { status: 'ACTIVE' },
          include: {
            employee: {
              select: { id: true, name: true, email: true, department: true }
            }
          }
        },
        items: {
          select: { id: true, status: true }
        }
      }
    });

    // Log update activity
    await logTimelineActivity({
      entityType: 'RESOURCE',
      entityId: id,
      activityType: 'UPDATED',
      title: `Resource updated: ${updatedResource.name}`,
      description: `${updatedResource.name} was updated by ${currentUser.name}`,
      performedBy: currentUser.id,
      metadata: {
        resourceName: updatedResource.name,
        resourceType: updatedResource.resourceTypeEntity?.name || updatedResource.type,
        resourceCategoryName: updatedResource.resourceCategory?.name,
        propertySchemaUpdated: selectedProperties !== undefined,
        updatedBy: currentUser.name,
        updatedById: currentUser.id
      },
      resourceId: id
    });

    return NextResponse.json({
      success: true,
      message: `Resource "${updatedResource.name}" updated successfully`,
      resource: {
        ...updatedResource,
        assignedCount: updatedResource.assignments.length,
        isAssigned: updatedResource.assignments.length > 0,
        itemCount: updatedResource.items.length,
        resourceTypeName: updatedResource.resourceTypeEntity?.name || null,
        resourceCategoryName: updatedResource.resourceCategory?.name || null
      }
    });

  } catch (error) {
    console.error('Error updating resource:', error);
    return NextResponse.json({ 
      error: 'Failed to update resource' 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}