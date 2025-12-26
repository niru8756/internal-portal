import { NextRequest, NextResponse } from 'next/server';
import { getPendingOperationalWorkflows } from '@/lib/workflowService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const approverId = searchParams.get('approverId');

    if (!approverId) {
      return NextResponse.json({ error: 'Approver ID is required' }, { status: 400 });
    }

    console.log(`Fetching pending workflows for approver: ${approverId}`);
    
    const workflows = await getPendingOperationalWorkflows(approverId);
    
    console.log(`Found ${workflows.length} pending workflows`);
    return NextResponse.json(workflows);

  } catch (error) {
    console.error('Error fetching pending workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending workflows' },
      { status: 500 }
    );
  }
}