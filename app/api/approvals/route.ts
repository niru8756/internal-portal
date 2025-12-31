import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { logCreatedActivity, logTimelineActivity } from '@/lib/timeline';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalCount = await prisma.approvalWorkflow.count();

    const workflows = await prisma.approvalWorkflow.findMany({
      skip,
      take: limit,
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        },
        policy: {
          select: {
            id: true,
            title: true
          }
        },
        document: {
          select: {
            id: true,
            title: true
          }
        },
        resource: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      workflows,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching approval workflows:', error);
    return NextResponse.json({ error: 'Failed to fetch approval workflows' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      type, 
      requesterId, 
      approverId, 
      data,
      comments,
      policyId,
      documentId,
      resourceId
    } = body;

    const workflow = await prisma.approvalWorkflow.create({
      data: {
        type,
        requesterId,
        approverId,
        status: 'PENDING',
        data,
        comments,
        policyId,
        documentId,
        resourceId
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        }
      }
    });

    // Log audit trail
    await logAudit({
      entityType: 'APPROVAL_WORKFLOW',
      entityId: workflow.id,
      changedById: requesterId,
      fieldChanged: 'created',
      oldValue: null,
      newValue: JSON.stringify(workflow)
    });

    // Log timeline activity
    await logCreatedActivity(
      'APPROVAL_WORKFLOW',
      workflow.id,
      `${workflow.type} workflow`,
      requesterId,
      {
        type: workflow.type,
        status: workflow.status,
        requesterName: workflow.requester.name,
        approverName: workflow.approver?.name
      }
    );

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    console.error('Error creating approval workflow:', error);
    return NextResponse.json({ error: 'Failed to create approval workflow' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const deletedByParam = searchParams.get('deletedBy');

    if (!id) {
      return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 });
    }

    // Get CEO user for deletion operations
    const ceoUser = await prisma.employee.findFirst({
      where: { role: 'CEO' },
      select: { id: true }
    });
    
    if (!ceoUser) {
      return NextResponse.json({ error: 'CEO user not found' }, { status: 500 });
    }
    
    const deletedBy = deletedByParam === 'system' ? ceoUser.id : (deletedByParam || ceoUser.id);

    // Get workflow details before deletion for logging
    const workflow = await prisma.approvalWorkflow.findUnique({
      where: { id },
      include: {
        requester: { select: { name: true, department: true } },
        approver: { select: { name: true, department: true } }
      }
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Approval workflow not found' }, { status: 404 });
    }

    // Log deletion attempt first
    try {
      await logTimelineActivity({
        entityType: 'APPROVAL_WORKFLOW',
        entityId: id,
        activityType: 'DELETION_ATTEMPTED',
        title: `Deletion attempted for ${workflow.type} workflow`,
        description: `Attempting to delete approval workflow requested by ${workflow.requester.name}`,
        metadata: {
          workflowType: workflow.type,
          status: workflow.status,
          requesterName: workflow.requester.name,
          approverName: workflow.approver?.name,
          deletionReason: 'Manual deletion via web interface'
        },
        performedBy: deletedBy,
        workflowId: id
      });
    } catch (timelineError) {
      console.error('Failed to log deletion attempt:', timelineError);
    }

    // Delete the workflow
    await prisma.approvalWorkflow.delete({
      where: { id }
    });

    // Log audit trail for successful deletion
    try {
      await logAudit({
        entityType: 'APPROVAL_WORKFLOW',
        entityId: id,
        changedById: deletedBy,
        fieldChanged: 'deleted',
        oldValue: JSON.stringify({
          type: workflow.type,
          status: workflow.status,
          requesterName: workflow.requester.name,
          approverName: workflow.approver?.name,
          createdAt: workflow.createdAt
        }),
        newValue: null
      });
    } catch (auditError) {
      console.error('Failed to log audit for workflow deletion:', auditError);
    }

    // Log timeline activity for successful deletion
    try {
      await logTimelineActivity({
        entityType: 'APPROVAL_WORKFLOW',
        entityId: id,
        activityType: 'DELETED',
        title: `Deleted ${workflow.type} workflow`,
        description: `Approval workflow requested by ${workflow.requester.name} was successfully removed from the system`,
        metadata: {
          workflowType: workflow.type,
          originalStatus: workflow.status,
          requesterName: workflow.requester.name,
          approverName: workflow.approver?.name,
          deletedAt: new Date().toISOString(),
          deletionMethod: 'Manual deletion',
          originalWorkflowId: id // Store the ID in metadata instead of foreign key
        },
        performedBy: deletedBy
        // Don't set workflowId since the workflow is deleted
      });
    } catch (timelineError) {
      console.error('Failed to log timeline activity for workflow deletion:', timelineError);
    }

    return NextResponse.json({ 
      message: 'Approval workflow deleted successfully',
      deletedWorkflow: {
        id: workflow.id,
        type: workflow.type,
        requesterName: workflow.requester.name
      }
    });
  } catch (error: any) {
    console.error('Error deleting approval workflow:', error);
    
    // Log failed deletion attempt
    try {
      const ceoUser = await prisma.employee.findFirst({
        where: { role: 'CEO' },
        select: { id: true }
      });
      
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      
      if (id && ceoUser) {
        await logTimelineActivity({
          entityType: 'APPROVAL_WORKFLOW',
          entityId: id,
          activityType: 'DELETION_FAILED',
          title: `Failed to delete approval workflow`,
          description: `Deletion attempt failed: ${error.message}`,
          metadata: {
            errorMessage: error.message,
            errorCode: error.code,
            attemptedAt: new Date().toISOString(),
            originalWorkflowId: id
          },
          performedBy: ceoUser.id
          // Don't set workflowId in case the workflow still exists but deletion failed
        });
      }
    } catch (logError) {
      console.error('Failed to log deletion failure:', logError);
    }

    return NextResponse.json({ 
      error: 'Failed to delete approval workflow',
      details: error.message 
    }, { status: 500 });
  }
}