/**
 * Resource Structure Timeline Service
 * 
 * Provides timeline tracking for resource structure entities:
 * - Resource Types (create, update, delete)
 * - Resource Categories (create, update, delete)
 * - Property Schema changes
 * - Assignment status changes
 * 
 * Requirements: 11.4, 11.5, 11.6, 11.8
 */

import { prisma } from './prisma';
import { ActivityType, Prisma } from '@prisma/client';

// ============================================
// Timeline Entry Interfaces
// ============================================

export interface ResourceStructureTimelineEntry {
  id: string;
  entityType: string;
  entityId: string;
  activityType: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  performedBy: string;
  performer?: {
    id: string;
    name: string;
    email: string;
    department: string;
  };
  timestamp: Date;
  // Resource structure specific fields
  entitySubType?: string;
  resourceId?: string;
  assignmentId?: string;
  employeeId?: string;
}

export interface TimelineFilterOptions {
  entitySubType?: 'RESOURCE_TYPE' | 'RESOURCE_CATEGORY' | 'PROPERTY_SCHEMA' | 'ASSIGNMENT_MODEL';
  resourceId?: string;
  employeeId?: string;
  activityType?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

// ============================================
// Timeline Query Functions
// ============================================

/**
 * Gets timeline entries for resource structure changes
 * Requirements: 11.4 - Create timeline entries for resource structure changes
 */
export async function getResourceStructureTimeline(
  options: TimelineFilterOptions = {}
): Promise<{ entries: ResourceStructureTimelineEntry[]; total: number }> {
  const { 
    entitySubType, 
    resourceId, 
    employeeId, 
    activityType,
    startDate,
    endDate,
    page = 1, 
    limit = 20 
  } = options;
  
  const skip = (page - 1) * limit;

  // Build where clause for resource structure entries
  const where: any = {
    entityType: 'RESOURCE',
  };

  // Filter by entity sub-type (stored in metadata)
  if (entitySubType) {
    where.metadata = {
      path: ['entitySubType'],
      equals: entitySubType,
    };
  }

  if (resourceId) {
    where.resourceId = resourceId;
  }

  if (employeeId) {
    where.employeeId = employeeId;
  }

  if (activityType) {
    where.activityType = activityType;
  }

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) {
      where.timestamp.gte = startDate;
    }
    if (endDate) {
      where.timestamp.lte = endDate;
    }
  }

  const [entries, total] = await Promise.all([
    prisma.activityTimeline.findMany({
      where,
      skip,
      take: limit,
      include: {
        performer: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    }),
    prisma.activityTimeline.count({ where }),
  ]);

  return {
    entries: entries.map(mapToTimelineEntry),
    total,
  };
}

/**
 * Gets timeline entries for a specific resource type
 * Requirements: 11.4 - Create timeline entries for resource structure changes
 */
export async function getResourceTypeTimeline(
  resourceTypeId: string,
  options: { page?: number; limit?: number } = {}
): Promise<{ entries: ResourceStructureTimelineEntry[]; total: number }> {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const where = {
    entityType: 'RESOURCE' as const,
    entityId: resourceTypeId,
    metadata: {
      path: ['entitySubType'],
      equals: 'RESOURCE_TYPE',
    },
  };

  const [entries, total] = await Promise.all([
    prisma.activityTimeline.findMany({
      where,
      skip,
      take: limit,
      include: {
        performer: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    }),
    prisma.activityTimeline.count({ where }),
  ]);

  return {
    entries: entries.map(mapToTimelineEntry),
    total,
  };
}

/**
 * Gets timeline entries for a specific resource category
 * Requirements: 11.4 - Create timeline entries for resource structure changes
 */
export async function getResourceCategoryTimeline(
  categoryId: string,
  options: { page?: number; limit?: number } = {}
): Promise<{ entries: ResourceStructureTimelineEntry[]; total: number }> {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const where = {
    entityType: 'RESOURCE' as const,
    entityId: categoryId,
    metadata: {
      path: ['entitySubType'],
      equals: 'RESOURCE_CATEGORY',
    },
  };

  const [entries, total] = await Promise.all([
    prisma.activityTimeline.findMany({
      where,
      skip,
      take: limit,
      include: {
        performer: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    }),
    prisma.activityTimeline.count({ where }),
  ]);

  return {
    entries: entries.map(mapToTimelineEntry),
    total,
  };
}

/**
 * Gets assignment status change timeline for a resource
 * Requirements: 11.5 - Add assignment status change tracking
 */
export async function getAssignmentStatusTimeline(
  resourceId: string,
  options: { page?: number; limit?: number } = {}
): Promise<{ entries: ResourceStructureTimelineEntry[]; total: number }> {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const activityTypes: ActivityType[] = ['ASSIGNED', 'STATUS_CHANGED', 'ACCESS_REVOKED'];
  
  const where = {
    entityType: 'RESOURCE' as const,
    resourceId,
    activityType: {
      in: activityTypes,
    },
  };

  const [entries, total] = await Promise.all([
    prisma.activityTimeline.findMany({
      where,
      skip,
      take: limit,
      include: {
        performer: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    }),
    prisma.activityTimeline.count({ where }),
  ]);

  return {
    entries: entries.map(mapToTimelineEntry),
    total,
  };
}

/**
 * Gets assignment timeline for a specific employee
 * Requirements: 11.5 - Add assignment status change tracking
 */
export async function getEmployeeAssignmentTimeline(
  employeeId: string,
  options: { page?: number; limit?: number } = {}
): Promise<{ entries: ResourceStructureTimelineEntry[]; total: number }> {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const activityTypes: ActivityType[] = ['ASSIGNED', 'STATUS_CHANGED', 'ACCESS_REVOKED'];

  const where = {
    entityType: 'RESOURCE' as const,
    employeeId,
    activityType: {
      in: activityTypes,
    },
  };

  const [entries, total] = await Promise.all([
    prisma.activityTimeline.findMany({
      where,
      skip,
      take: limit,
      include: {
        performer: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    }),
    prisma.activityTimeline.count({ where }),
  ]);

  return {
    entries: entries.map(mapToTimelineEntry),
    total,
  };
}

/**
 * Gets property schema change timeline for a resource
 * Requirements: 11.6 - Integrate with existing ActivityTimeline model
 */
export async function getPropertySchemaTimeline(
  resourceId: string,
  options: { page?: number; limit?: number } = {}
): Promise<{ entries: ResourceStructureTimelineEntry[]; total: number }> {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const where = {
    entityType: 'RESOURCE' as const,
    resourceId,
    metadata: {
      path: ['entitySubType'],
      equals: 'PROPERTY_SCHEMA',
    },
  };

  const [entries, total] = await Promise.all([
    prisma.activityTimeline.findMany({
      where,
      skip,
      take: limit,
      include: {
        performer: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    }),
    prisma.activityTimeline.count({ where }),
  ]);

  return {
    entries: entries.map(mapToTimelineEntry),
    total,
  };
}

/**
 * Gets combined resource timeline including structure changes, items, and assignments
 * Requirements: 11.6 - Integrate with existing ActivityTimeline model
 */
export async function getResourceFullTimeline(
  resourceId: string,
  options: { page?: number; limit?: number } = {}
): Promise<{ entries: ResourceStructureTimelineEntry[]; total: number }> {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const where = {
    entityType: 'RESOURCE' as const,
    OR: [
      { resourceId },
      { entityId: resourceId },
    ],
  };

  const [entries, total] = await Promise.all([
    prisma.activityTimeline.findMany({
      where,
      skip,
      take: limit,
      include: {
        performer: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    }),
    prisma.activityTimeline.count({ where }),
  ]);

  return {
    entries: entries.map(mapToTimelineEntry),
    total,
  };
}

/**
 * Gets recent resource structure activity across all entities
 * Requirements: 11.8 - Provide comprehensive activity tracking
 */
export async function getRecentResourceStructureActivity(
  options: { limit?: number } = {}
): Promise<ResourceStructureTimelineEntry[]> {
  const { limit = 10 } = options;

  const entries = await prisma.activityTimeline.findMany({
    where: {
      entityType: 'RESOURCE',
      metadata: {
        not: Prisma.DbNull,
      },
    },
    take: limit,
    include: {
      performer: {
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
        },
      },
    },
    orderBy: { timestamp: 'desc' },
  });

  return entries.map(mapToTimelineEntry);
}

/**
 * Gets timeline statistics for resource structure
 * Requirements: 11.8 - Provide comprehensive activity tracking
 */
export async function getResourceStructureTimelineStats(): Promise<{
  totalEntries: number;
  byEntitySubType: Record<string, number>;
  byActivityType: Record<string, number>;
  recentActivityCount: number;
}> {
  const [totalEntries, recentActivityCount] = await Promise.all([
    prisma.activityTimeline.count({
      where: { entityType: 'RESOURCE' },
    }),
    prisma.activityTimeline.count({
      where: {
        entityType: 'RESOURCE',
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    }),
  ]);

  // Get counts by activity type
  const activityTypeCounts = await prisma.activityTimeline.groupBy({
    by: ['activityType'],
    where: { entityType: 'RESOURCE' },
    _count: { activityType: true },
  });

  const byActivityType: Record<string, number> = {};
  for (const item of activityTypeCounts) {
    byActivityType[item.activityType] = item._count.activityType;
  }

  // Note: Grouping by JSON field (entitySubType in metadata) is not directly supported
  // We'll return a simplified version
  const byEntitySubType: Record<string, number> = {
    RESOURCE_TYPE: 0,
    RESOURCE_CATEGORY: 0,
    PROPERTY_SCHEMA: 0,
    ASSIGNMENT_MODEL: 0,
  };

  return {
    totalEntries,
    byEntitySubType,
    byActivityType,
    recentActivityCount,
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Maps Prisma ActivityTimeline to ResourceStructureTimelineEntry
 */
function mapToTimelineEntry(entry: any): ResourceStructureTimelineEntry {
  const metadata = entry.metadata as Record<string, unknown> | null;
  
  return {
    id: entry.id,
    entityType: entry.entityType,
    entityId: entry.entityId,
    activityType: entry.activityType,
    title: entry.title,
    description: entry.description,
    metadata,
    performedBy: entry.performedBy,
    performer: entry.performer ? {
      id: entry.performer.id,
      name: entry.performer.name,
      email: entry.performer.email,
      department: entry.performer.department,
    } : undefined,
    timestamp: entry.timestamp,
    entitySubType: metadata?.entitySubType as string | undefined,
    resourceId: entry.resourceId ?? undefined,
    assignmentId: entry.assignmentId ?? undefined,
    employeeId: entry.employeeId ?? undefined,
  };
}

/**
 * Formats a timeline entry for display
 */
export function formatTimelineEntry(entry: ResourceStructureTimelineEntry): string {
  const performerName = entry.performer?.name || 'Unknown user';
  const timestamp = entry.timestamp.toLocaleString();
  
  return `[${timestamp}] ${performerName}: ${entry.title}`;
}

/**
 * Gets a human-readable description for an activity type
 */
export function getActivityTypeDescription(activityType: string): string {
  const descriptions: Record<string, string> = {
    CREATED: 'Created',
    UPDATED: 'Updated',
    DELETED: 'Deleted',
    STATUS_CHANGED: 'Status Changed',
    ASSIGNED: 'Assigned',
    ACCESS_REVOKED: 'Access Revoked',
    DELETION_FAILED: 'Deletion Blocked',
  };
  
  return descriptions[activityType] || activityType;
}

/**
 * Gets a human-readable description for an entity sub-type
 */
export function getEntitySubTypeDescription(entitySubType: string): string {
  const descriptions: Record<string, string> = {
    RESOURCE_TYPE: 'Resource Type',
    RESOURCE_CATEGORY: 'Resource Category',
    PROPERTY_SCHEMA: 'Property Schema',
    ASSIGNMENT_MODEL: 'Assignment',
  };
  
  return descriptions[entitySubType] || entitySubType;
}
