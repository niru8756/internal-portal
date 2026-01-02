import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, AssignmentStatus } from '@prisma/client';
import { getUserFromToken } from '@/lib/auth';
import { logTimelineActivity } from '@/lib/timeline';
import { 
  updateAssignmentStatus, 
  revokeAssignment,
} from '@/lib/resourceAssignmentService';

const prisma = new PrismaClient();

/**
 * GET /api/resources/assignments/[id] - Get assignment details
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await getUserFromToken(token);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assignment = await prisma.resourceAssignment.findUnique({
      where: { id },
      include: {
        resource: {
          select: { 
            id: true, 
            name: true, 
            type: true, 
            category: true,
          }
        },
        employee: {
          select: { id: true, name: true, email: true, role: true, department: true }
        },
        item: {
          select: { id: true, serialNumber: true, hostname: true, licenseKey: true, status: true }
        },
        assignedByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    return NextResponse.json({ assignment });

  } catch (error) {
    console.error('Error fetching assignment:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch assignment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * PUT /api/resources/assignments/[id] - Update assignment status
 * 
 * Supports actions:
 * - return: Return the resource (status -> RETURNED)
 * - revoke: Revoke the assignment (admin only, status -> RETURNED with revoke note)
 * - updateStatus: Direct status update (ACTIVE, RETURNED, LOST, DAMAGED)
 * 
 * Requirements: 10.4, 10.8
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, returnReason, notes, status, itemCondition } = body;

    // Get current user from cookie
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await getUserFromToken(token);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get assignment details
    const assignment = await prisma.resourceAssignment.findUnique({
      where: { id },
      include: {
        resource: {
          select: { id: true, name: true, type: true, category: true }
        },
        employee: {
          select: { id: true, name: true, email: true, role: true, department: true }
        },
        item: {
          select: { id: true, serialNumber: true, hostname: true }
        },
        assignedByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!assignment) {
      return NextResponse.json({ 
        error: 'Assignment not found' 
      }, { status: 404 });
    }

    // Handle different actions
    if (action === 'return') {
      if (assignment.status !== 'ACTIVE') {
        return NextResponse.json({ 
          error: 'Assignment is not active' 
        }, { status: 400 });
      }

      if (!returnReason) {
        return NextResponse.json({ 
          error: 'Return reason is required' 
        }, { status: 400 });
      }

      // Check permissions - user must be manager/admin or the assigned employee
      const canReturn = ['CEO', 'CTO', 'ADMIN', 'ENGINEERING_MANAGER', 'HR_MANAGER'].includes(currentUser.role) ||
        currentUser.id === assignment.employeeId;

      if (!canReturn) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      // Determine new status based on item condition
      let newStatus: AssignmentStatus = 'RETURNED';
      if (itemCondition === 'LOST') newStatus = 'LOST';
      if (itemCondition === 'DAMAGED') newStatus = 'DAMAGED';

      const result = await updateAssignmentStatus(
        id,
        {
          status: newStatus,
          notes: `Return reason: ${returnReason}${notes ? `\n${notes}` : ''}`,
          returnedAt: new Date(),
        },
        currentUser.id
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      // Log employee activity
      await logTimelineActivity({
        entityType: 'EMPLOYEE',
        entityId: assignment.employee.id,
        activityType: 'UPDATED',
        title: `Returned ${assignment.resource.name}`,
        description: `${assignment.employee.name} returned ${assignment.resource.name}. Reason: ${returnReason}`,
        performedBy: currentUser.id,
        metadata: {
          resourceName: assignment.resource.name,
          resourceType: assignment.resource.type,
          resourceId: assignment.resource.id,
          returnReason,
          returnedBy: currentUser.name,
          returnedById: currentUser.id
        },
        employeeId: assignment.employee.id
      });

      return NextResponse.json({
        success: true,
        message: `Successfully processed return from ${assignment.employee.name}`,
        assignment: result.assignment,
        returnType: 'full_return',
        returnReason
      });

    } else if (action === 'revoke') {
      // Revoke action - admin only
      // Requirements: 10.8 - Allow administrators to revoke assignments
      if (!['CEO', 'CTO', 'ADMIN'].includes(currentUser.role)) {
        return NextResponse.json({ 
          error: 'Only administrators can revoke assignments' 
        }, { status: 403 });
      }

      if (assignment.status !== 'ACTIVE') {
        return NextResponse.json({ 
          error: 'Can only revoke active assignments' 
        }, { status: 400 });
      }

      const result = await revokeAssignment(
        id,
        currentUser.id,
        notes || returnReason || 'Assignment revoked by administrator'
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      // Log revocation activity
      await logTimelineActivity({
        entityType: 'RESOURCE',
        entityId: assignment.resource.id,
        activityType: 'ACCESS_REVOKED',
        title: `Assignment revoked`,
        description: `${assignment.resource.name} assignment for ${assignment.employee.name} was revoked by ${currentUser.name}`,
        performedBy: currentUser.id,
        metadata: {
          resourceName: assignment.resource.name,
          employeeName: assignment.employee.name,
          revokedBy: currentUser.name,
          reason: notes || returnReason
        },
        resourceId: assignment.resource.id
      });

      return NextResponse.json({
        success: true,
        message: `Assignment revoked for ${assignment.employee.name}`,
        assignment: result.assignment
      });

    } else if (action === 'updateStatus' && status) {
      // Direct status update
      // Requirements: 10.4 - Track assignment status with values: ACTIVE, RETURNED, REVOKED
      if (!['CEO', 'CTO', 'ADMIN', 'ENGINEERING_MANAGER', 'HR_MANAGER'].includes(currentUser.role)) {
        return NextResponse.json({ 
          error: 'Insufficient permissions to update assignment status' 
        }, { status: 403 });
      }

      const result = await updateAssignmentStatus(
        id,
        {
          status: status as AssignmentStatus,
          notes: notes,
        },
        currentUser.id
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `Assignment status updated to ${status}`,
        assignment: result.assignment
      });

    } else {
      return NextResponse.json({ 
        error: 'Invalid action. Supported actions: "return", "revoke", "updateStatus"' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in assignment update:', error);
    return NextResponse.json({ 
      error: 'Failed to update assignment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Get current user from cookie
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await getUserFromToken(token);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to delete assignments
    if (!['CEO', 'CTO', 'ADMIN'].includes(currentUser.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to delete assignments' 
      }, { status: 403 });
    }

    // Get assignment details before deletion
    const assignment = await prisma.resourceAssignment.findUnique({
      where: { id },
      include: {
        resource: {
          select: { id: true, name: true, type: true, category: true }
        },
        employee: {
          select: { id: true, name: true, email: true, role: true, department: true }
        },
        item: true,
        assignedByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!assignment) {
      return NextResponse.json({ 
        error: 'Assignment not found' 
      }, { status: 404 });
    }

    // Delete the assignment
    await prisma.resourceAssignment.delete({
      where: { id }
    });

    // If this was a physical item assignment, update the item status back to AVAILABLE
    if (assignment.itemId) {
      await prisma.resourceItem.update({
        where: { id: assignment.itemId },
        data: { status: 'AVAILABLE' }
      });
    }

    // Log deletion activity
    await logTimelineActivity({
      entityType: 'RESOURCE',
      entityId: assignment.resource.id,
      activityType: 'UPDATED',
      title: `Assignment deleted`,
      description: `Assignment of ${assignment.resource.name} to ${assignment.employee.name} was deleted by ${currentUser.name}`,
      performedBy: currentUser.id,
      metadata: {
        resourceName: assignment.resource.name,
        resourceType: assignment.resource.type,
        employeeName: assignment.employee.name,
        employeeId: assignment.employee.id,
        deletedBy: currentUser.name,
        deletedById: currentUser.id,
        originalAssignmentId: id
      },
      resourceId: assignment.resource.id
    });

    // Log employee activity
    await logTimelineActivity({
      entityType: 'EMPLOYEE',
      entityId: assignment.employee.id,
      activityType: 'UPDATED',
      title: `Assignment removed`,
      description: `Assignment of ${assignment.resource.name} was removed by ${currentUser.name}`,
      performedBy: currentUser.id,
      metadata: {
        resourceName: assignment.resource.name,
        resourceType: assignment.resource.type,
        resourceId: assignment.resource.id,
        deletedBy: currentUser.name,
        deletedById: currentUser.id
      },
      employeeId: assignment.employee.id
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted assignment of ${assignment.resource.name} from ${assignment.employee.name}`,
      deletedAssignment: {
        id: assignment.id,
        resourceName: assignment.resource.name,
        employeeName: assignment.employee.name
      }
    });

  } catch (error) {
    console.error('Error in assignment deletion:', error);
    return NextResponse.json({ 
      error: 'Failed to delete assignment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
