import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { approverId, comments } = body;

    const workflow = await prisma.approvalWorkflow.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approverId,
        comments,
        updatedAt: new Date()
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Log audit trail
    await logAudit({
      entityType: 'APPROVAL_WORKFLOW',
      entityId: workflow.id,
      changedById: approverId,
      fieldChanged: 'status',
      oldValue: 'PENDING',
      newValue: 'REJECTED'
    });

    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Error rejecting workflow:', error);
    return NextResponse.json({ error: 'Failed to reject workflow' }, { status: 500 });
  }
}