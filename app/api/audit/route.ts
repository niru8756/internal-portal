import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs, getAuditLogsCount } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    const auditLogs = await getAuditLogs(entityType, entityId, limit, page);
    const total = await getAuditLogsCount(entityType, entityId);

    return NextResponse.json({
      auditLogs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}