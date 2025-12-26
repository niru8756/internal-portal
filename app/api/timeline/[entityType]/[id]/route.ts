import { NextRequest, NextResponse } from 'next/server';
import { getEntityTimeline } from '@/lib/timeline';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string; id: string }> }
) {
  try {
    const { entityType, id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const timeline = await getEntityTimeline(entityType.toUpperCase(), id, limit);

    return NextResponse.json(timeline);
  } catch (error) {
    console.error('Error fetching entity timeline:', error);
    return NextResponse.json({ error: 'Failed to fetch entity timeline' }, { status: 500 });
  }
}