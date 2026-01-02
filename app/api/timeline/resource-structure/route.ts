/**
 * Resource Structure Timeline API
 * 
 * Endpoints:
 * - GET /api/timeline/resource-structure - Fetch resource structure timeline entries
 * 
 * Query Parameters:
 * - entitySubType: Filter by entity sub-type (RESOURCE_TYPE, RESOURCE_CATEGORY, PROPERTY_SCHEMA, ASSIGNMENT_MODEL)
 * - resourceId: Filter by resource ID
 * - employeeId: Filter by employee ID
 * - activityType: Filter by activity type
 * - startDate: Filter by start date (ISO string)
 * - endDate: Filter by end date (ISO string)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * 
 * Requirements: 11.4, 11.5, 11.6, 11.8
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import {
  getResourceStructureTimeline,
  getResourceStructureTimelineStats,
  getRecentResourceStructureActivity,
} from '@/lib/resourceStructureTimeline';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Check if stats are requested
    const stats = searchParams.get('stats') === 'true';
    if (stats) {
      const timelineStats = await getResourceStructureTimelineStats();
      return NextResponse.json({
        success: true,
        stats: timelineStats,
      });
    }

    // Check if recent activity is requested
    const recent = searchParams.get('recent') === 'true';
    if (recent) {
      const limit = parseInt(searchParams.get('limit') || '10');
      const recentActivity = await getRecentResourceStructureActivity({ limit });
      return NextResponse.json({
        success: true,
        entries: recentActivity,
      });
    }

    // Parse filter options
    const entitySubType = searchParams.get('entitySubType') as 
      'RESOURCE_TYPE' | 'RESOURCE_CATEGORY' | 'PROPERTY_SCHEMA' | 'ASSIGNMENT_MODEL' | null;
    const resourceId = searchParams.get('resourceId');
    const employeeId = searchParams.get('employeeId');
    const activityType = searchParams.get('activityType');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build filter options
    const filterOptions: any = {
      page,
      limit,
    };

    if (entitySubType) {
      filterOptions.entitySubType = entitySubType;
    }
    if (resourceId) {
      filterOptions.resourceId = resourceId;
    }
    if (employeeId) {
      filterOptions.employeeId = employeeId;
    }
    if (activityType) {
      filterOptions.activityType = activityType;
    }
    if (startDateStr) {
      filterOptions.startDate = new Date(startDateStr);
    }
    if (endDateStr) {
      filterOptions.endDate = new Date(endDateStr);
    }

    const result = await getResourceStructureTimeline(filterOptions);

    return NextResponse.json({
      success: true,
      entries: result.entries,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    });

  } catch (error) {
    console.error('Error fetching resource structure timeline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resource structure timeline' },
      { status: 500 }
    );
  }
}
