import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export async function GET() {
  try {
    const workflows = await prisma.approvalWorkflow.findMany({
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
            title: true,
            category: true
          }
        },
        document: {
          select: {
            id: true,
            title: true,
            category: true
          }
        },
        resource: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(workflows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, requesterId, data, policyId, documentId, resourceId } = body;

    const workflow = await prisma.approvalWorkflow.create({
      data: {
        type,
        requesterId,
        status: 'PENDING',
        data,
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

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 });
  }
}