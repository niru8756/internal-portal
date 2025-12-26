import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logTimelineActivity } from '@/lib/timeline';
import { getUserFromToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resourceId, employeeId, assignmentType } = body;

    // Get the authenticated user
    const token = request.cookies.get('auth-token')?.value;
    const currentUser = token ? await getUserFromToken(token) : null;
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Validate required fields
    if (!resourceId || !employeeId) {
      return NextResponse.json({ 
        error: 'resourceId and employeeId are required' 
      }, { status: 400 });
    }

    // Get resource and employee details
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { 
        id: true, 
        name: true, 
        type: true, 
        assignedToId: true, 
        assignedToIds: true,
        status: true
      }
    });

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, email: true, department: true }
    });

    if (!resource || !employee) {
      return NextResponse.json({ 
        error: 'Resource or employee not found' 
      }, { status: 404 });
    }

    // Handle assignment based on resource type
    let updatedResource;
    
    if (resource.type === 'PHYSICAL') {
      // Physical resources: single assignment
      if (resource.assignedToId && resource.assignedToId !== employeeId) {
        return NextResponse.json({ 
          error: `Physical resource ${resource.name} is already assigned to another employee` 
        }, { status: 400 });
      }

      updatedResource = await prisma.resource.update({
        where: { id: resourceId },
        data: {
          assignedToId: employeeId,
          status: 'ASSIGNED',
          assignedDate: new Date()
        }
      });
    } else {
      // Software/Cloud resources: multiple assignments
      const currentAssignedIds = resource.assignedToIds || [];
      
      if (currentAssignedIds.includes(employeeId)) {
        return NextResponse.json({ 
          error: `Resource ${resource.name} is already assigned to ${employee.name}` 
        }, { status: 400 });
      }

      updatedResource = await prisma.resource.update({
        where: { id: resourceId },
        data: {
          assignedToIds: [...currentAssignedIds, employeeId],
          status: 'ASSIGNED',
          assignedDate: new Date()
        }
      });
    }

    // Log the assignment activity
    await logTimelineActivity({
      entityType: 'RESOURCE',
      entityId: resource.id,
      activityType: 'ASSIGNED',
      title: `Resource assigned to ${employee.name}`,
      description: `${resource.name} (${resource.type}) was assigned to ${employee.name} by ${currentUser.name}`,
      metadata: {
        resourceName: resource.name,
        resourceType: resource.type,
        resourceCategory: resource.type,
        employeeName: employee.name,
        employeeId: employeeId,
        employeeDepartment: employee.department,
        assignmentMethod: 'manual_assignment',
        assignedBy: currentUser.name,
        assignedById: currentUser.id,
        assignmentType: resource.type === 'PHYSICAL' ? 'single' : 'multiple'
      },
      performedBy: currentUser.id,
      resourceId: resource.id,
      employeeId: employeeId
    });

    // Log activity for the employee as well
    await logTimelineActivity({
      entityType: 'EMPLOYEE',
      entityId: employeeId,
      activityType: 'RESOURCE_ASSIGNED',
      title: `Resource assigned: ${resource.name}`,
      description: `${resource.name} (${resource.type}) was assigned to ${employee.name} by ${currentUser.name}`,
      metadata: {
        resourceName: resource.name,
        resourceType: resource.type,
        resourceId: resource.id,
        assignedBy: currentUser.name,
        assignedById: currentUser.id,
        assignmentMethod: 'manual_assignment'
      },
      performedBy: currentUser.id,
      employeeId: employeeId,
      resourceId: resource.id
    });

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${resource.name} to ${employee.name}`,
      resource: updatedResource,
      employee: employee
    });

  } catch (error: any) {
    console.error('Error assigning resource:', error);
    return NextResponse.json({ 
      error: 'Failed to assign resource',
      details: error.message 
    }, { status: 500 });
  }
}