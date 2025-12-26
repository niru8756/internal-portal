import { NextRequest, NextResponse } from 'next/server';
import { 
  getEntityTimeline, 
  getAllTimeline, 
  getTimelineByEntityType,
  getUserTimeline,
  getEntityTimelineCount,
  getAllTimelineCount,
  getTimelineByEntityTypeCount,
  getUserTimelineCount
} from '@/lib/timeline';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    if (entityType && entityId) {
      // Get timeline for specific entity
      const activities = await getEntityTimeline(entityType, entityId, limit, page);
      const total = await getEntityTimelineCount(entityType, entityId);
      return NextResponse.json({
        activities,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } else if (userId) {
      // Get timeline for specific user
      const activities = await getUserTimeline(userId, limit, page);
      const total = await getUserTimelineCount(userId);
      return NextResponse.json({
        activities,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } else if (entityType) {
      // Get timeline for entity type
      const activities = await getTimelineByEntityType(entityType, limit, page);
      const total = await getTimelineByEntityTypeCount(entityType);
      return NextResponse.json({
        activities,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } else {
      // Get all timeline activities
      const activities = await getAllTimeline(limit, page);
      const total = await getAllTimelineCount();
      return NextResponse.json({
        activities,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    }
  } catch (error) {
    console.error('Error fetching timeline:', error);
    return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 });
  }
}