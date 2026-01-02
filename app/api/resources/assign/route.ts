import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { logTimelineActivity } from '@/lib/timeline';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resourceId, employeeId, itemId, notes } = body;

    // Get current user from cookie
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await getUserFromToken(token);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate required fields
    if (!resourceId || !employeeId) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: { resourceId, employeeId }
      }, { status: 400 });
    }

    // Get resource details
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        assignments: {
          where: { status: 'ACTIVE' },
          include: {
            employee: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    if (!resource) {
      return NextResponse.json({ 
        error: 'Resource not found',
        details: { resourceId }
      }, { status: 404 });
    }

    // Get employee details
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, email: true, department: true }
    });

    if (!employee) {
      return NextResponse.json({ 
        error: 'Employee not found',
        details: { employeeId }
      }, { status: 404 });
    }

    // Check if resource is active
    if (resource.status !== 'ACTIVE') {
      return NextResponse.json({ 
        error: 'Resource is not available for assignment',
        details: `Resource status: ${resource.status}`
      }, { status: 400 });
    }

    // Check if employee already has this resource assigned
    const existingAssignment = resource.assignments.find(a => a.employeeId === employeeId);
    if (existingAssignment) {
      return NextResponse.json({
        success: true,
        message: `${employee.name} already has ${resource.name} assigned`,
        assignment: {
          id: existingAssignment.id,
          assignedAt: existingAssignment.assignedAt,
          status: existingAssignment.status
        }
      });
    }

    let selectedItemId = itemId;

    // Cloud resources use quantity-based assignment (unlimited by default with quantity = -1 or null)
    // Other resource types (PHYSICAL, SOFTWARE, custom) use item-based assignment
    if (resource.type === 'CLOUD') {
      // Cloud resources: check quantity-based availability
      // quantity of -1 or null means unlimited assignments allowed
      const isUnlimited = resource.quantity === null || resource.quantity === -1;
      
      if (!isUnlimited) {
        // Check if we've reached the quantity limit
        const currentAssignments = resource.assignments.length;
        if (currentAssignments >= (resource.quantity || 0)) {
          return NextResponse.json({
            error: `Cannot assign ${resource.name}: Maximum quantity reached`,
            details: `All ${resource.quantity} license(s) are currently assigned. Please revoke existing assignments or increase the quantity.`
          }, { status: 400 });
        }
      }
      // Cloud resources don't need items - they're assigned directly
      selectedItemId = null;
    } else {
      // Non-Cloud resources: use item-based assignment
      // Check if resource has any items - resources without items cannot be assigned
      const totalItems = await prisma.resourceItem.count({
        where: { resourceId }
      });

      if (totalItems === 0) {
        return NextResponse.json({
          error: `Cannot assign ${resource.name}: No items have been added to this resource yet`,
          details: 'Please add items (licenses, hardware units, etc.) to this resource before assigning it to employees.'
        }, { status: 400 });
      }

      // Check if there are available items
      const availableItems = await prisma.resourceItem.count({
        where: { 
          resourceId,
          status: 'AVAILABLE'
        }
      });

      if (availableItems === 0) {
        return NextResponse.json({
          error: `Cannot assign ${resource.name}: No available items`,
          details: `All ${totalItems} item(s) are currently assigned or unavailable. Please return existing assignments or add more items.`
        }, { status: 400 });
      }

      // Auto-select an available item if none provided
      if (!selectedItemId) {
        const availableItem = await prisma.resourceItem.findFirst({
          where: {
            resourceId,
            status: 'AVAILABLE'
          },
          orderBy: { createdAt: 'asc' }
        });
        
        if (availableItem) {
          selectedItemId = availableItem.id;
        }
      }
    }
    
    const newAssignment = await prisma.resourceAssignment.create({
      data: {
        resourceId,
        employeeId,
        ...(selectedItemId && { itemId: selectedItemId }),
        assignedBy: currentUser.id,
        status: 'ACTIVE',
        notes: notes || `Assigned by ${currentUser.name}`
      }
    });

    // If assigning an item (non-Cloud resources), update its status
    if (selectedItemId) {
      await prisma.resourceItem.update({
        where: { id: selectedItemId },
        data: { status: 'ASSIGNED' }
      });
    }

    // Log resource assignment activity
    await logTimelineActivity({
      entityType: 'RESOURCE',
      entityId: resource.id,
      activityType: 'ASSIGNED',
      title: `${resource.name} assigned to ${employee.name}`,
      description: `${resource.name} assigned to ${employee.name} by ${currentUser.name}`,
      performedBy: currentUser.id,
      metadata: {
        resourceName: resource.name,
        resourceType: resource.type,
        resourceId: resource.id,
        employeeName: employee.name,
        employeeId: employeeId,
        employeeDepartment: employee.department,
        assignmentMethod: 'manual_assignment',
        assignedBy: currentUser.name,
        assignedById: currentUser.id,
        itemId: selectedItemId || null,
        assignmentId: newAssignment.id
      },
      resourceId: resource.id
    });

    // Log employee assignment activity
    await logTimelineActivity({
      entityType: 'EMPLOYEE',
      entityId: employeeId,
      activityType: 'ASSET_ASSIGNED',
      title: `Assigned ${resource.name}`,
      description: `${resource.name} assigned to ${employee.name} by ${currentUser.name}`,
      performedBy: currentUser.id,
      metadata: {
        resourceName: resource.name,
        resourceType: resource.type,
        resourceId: resource.id,
        assignedBy: currentUser.name,
        assignedById: currentUser.id,
        itemId: selectedItemId || null
      },
      employeeId: employeeId
    });

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${resource.name} to ${employee.name}`,
      assignment: newAssignment,
      resource: {
        id: resource.id,
        name: resource.name,
        type: resource.type
      },
      employee: {
        id: employee.id,
        name: employee.name,
        department: employee.department
      }
    });

  } catch (error) {
    console.error('Error in resource assignment:', error);
    return NextResponse.json({ 
      error: 'Failed to assign resource',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}