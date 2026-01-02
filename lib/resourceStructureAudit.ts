/**
 * Resource Structure Audit Service
 * 
 * Provides audit logging and timeline tracking for resource structure entities:
 * - Resource Types (create, update, delete)
 * - Resource Categories (create, update, delete)
 * - Property Schema modifications
 * - Assignment model changes
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.7
 */

import { logAudit } from './audit';
import { logTimelineActivity } from './timeline';

// ============================================
// Entity Types for Resource Structure
// ============================================

export type ResourceStructureEntityType = 
  | 'RESOURCE_TYPE'
  | 'RESOURCE_CATEGORY'
  | 'PROPERTY_CATALOG'
  | 'PROPERTY_SCHEMA'
  | 'ASSIGNMENT_MODEL';

// ============================================
// Audit Data Interfaces
// ============================================

export interface ResourceTypeAuditData {
  resourceTypeId: string;
  resourceTypeName: string;
  description?: string;
  isSystem: boolean;
  performedById: string;
  performedByName: string;
}

export interface ResourceCategoryAuditData {
  categoryId: string;
  categoryName: string;
  description?: string;
  resourceTypeId: string;
  resourceTypeName: string;
  isSystem: boolean;
  performedById: string;
  performedByName: string;
}

export interface PropertySchemaAuditData {
  resourceId: string;
  resourceName: string;
  previousSchema?: PropertyDefinitionAudit[];
  newSchema?: PropertyDefinitionAudit[];
  schemaLocked: boolean;
  performedById: string;
  performedByName: string;
}

export interface PropertyDefinitionAudit {
  key: string;
  label: string;
  dataType: string;
  isRequired?: boolean;
}

export interface AssignmentModelAuditData {
  assignmentId: string;
  resourceId: string;
  resourceName: string;
  employeeId: string;
  employeeName: string;
  previousStatus?: string;
  newStatus: string;
  assignmentType: string;
  itemId?: string;
  performedById: string;
  performedByName: string;
}

// ============================================
// Resource Type Audit Functions
// ============================================

/**
 * Logs the creation of a new resource type
 * Requirements: 11.1 - Add audit trails for resource type changes
 */
export async function logResourceTypeCreated(data: ResourceTypeAuditData): Promise<void> {
  try {
    // Log to audit trail
    await logAudit({
      entityType: 'RESOURCE',
      entityId: data.resourceTypeId,
      changedById: data.performedById,
      fieldChanged: 'resource_type_created',
      oldValue: null,
      newValue: JSON.stringify({
        name: data.resourceTypeName,
        description: data.description,
        isSystem: data.isSystem,
      }),
    });

    // Log to activity timeline
    await logTimelineActivity({
      entityType: 'RESOURCE',
      entityId: data.resourceTypeId,
      activityType: 'CREATED',
      title: `Resource type created: ${data.resourceTypeName}`,
      description: `New resource type "${data.resourceTypeName}" was created by ${data.performedByName}`,
      performedBy: data.performedById,
      metadata: {
        entitySubType: 'RESOURCE_TYPE',
        resourceTypeName: data.resourceTypeName,
        description: data.description,
        isSystem: data.isSystem,
        createdBy: data.performedByName,
        createdById: data.performedById,
      },
    });
  } catch (error) {
    console.error('Failed to log resource type creation:', error);
  }
}

/**
 * Logs the update of a resource type
 * Requirements: 11.1 - Add audit trails for resource type changes
 */
export async function logResourceTypeUpdated(
  data: ResourceTypeAuditData,
  previousData: { name: string; description?: string }
): Promise<void> {
  try {
    const changes: Array<{ field: string; oldValue: string | undefined; newValue: string | undefined }> = [];
    
    if (previousData.name !== data.resourceTypeName) {
      changes.push({ field: 'name', oldValue: previousData.name, newValue: data.resourceTypeName });
    }
    if (previousData.description !== data.description) {
      changes.push({ field: 'description', oldValue: previousData.description, newValue: data.description });
    }

    // Log each change to audit trail
    for (const change of changes) {
      await logAudit({
        entityType: 'RESOURCE',
        entityId: data.resourceTypeId,
        changedById: data.performedById,
        fieldChanged: `resource_type_${change.field}`,
        oldValue: change.oldValue || null,
        newValue: change.newValue || null,
      });
    }

    // Log to activity timeline
    if (changes.length > 0) {
      await logTimelineActivity({
        entityType: 'RESOURCE',
        entityId: data.resourceTypeId,
        activityType: 'UPDATED',
        title: `Resource type updated: ${data.resourceTypeName}`,
        description: `Resource type "${data.resourceTypeName}" was updated by ${data.performedByName}`,
        performedBy: data.performedById,
        metadata: {
          entitySubType: 'RESOURCE_TYPE',
          resourceTypeName: data.resourceTypeName,
          previousName: previousData.name,
          previousDescription: previousData.description,
          newDescription: data.description,
          changes,
          updatedBy: data.performedByName,
          updatedById: data.performedById,
        },
      });
    }
  } catch (error) {
    console.error('Failed to log resource type update:', error);
  }
}

/**
 * Logs the deletion of a resource type
 * Requirements: 11.1 - Add audit trails for resource type changes
 */
export async function logResourceTypeDeleted(data: ResourceTypeAuditData): Promise<void> {
  try {
    // Log to audit trail
    await logAudit({
      entityType: 'RESOURCE',
      entityId: data.resourceTypeId,
      changedById: data.performedById,
      fieldChanged: 'resource_type_deleted',
      oldValue: JSON.stringify({
        name: data.resourceTypeName,
        description: data.description,
        isSystem: data.isSystem,
      }),
      newValue: null,
    });

    // Log to activity timeline
    await logTimelineActivity({
      entityType: 'RESOURCE',
      entityId: data.resourceTypeId,
      activityType: 'DELETED',
      title: `Resource type deleted: ${data.resourceTypeName}`,
      description: `Resource type "${data.resourceTypeName}" was deleted by ${data.performedByName}`,
      performedBy: data.performedById,
      metadata: {
        entitySubType: 'RESOURCE_TYPE',
        resourceTypeName: data.resourceTypeName,
        description: data.description,
        deletedBy: data.performedByName,
        deletedById: data.performedById,
      },
    });
  } catch (error) {
    console.error('Failed to log resource type deletion:', error);
  }
}

// ============================================
// Resource Category Audit Functions
// ============================================

/**
 * Logs the creation of a new resource category
 * Requirements: 11.1 - Add audit trails for resource category changes
 */
export async function logResourceCategoryCreated(data: ResourceCategoryAuditData): Promise<void> {
  try {
    // Log to audit trail
    await logAudit({
      entityType: 'RESOURCE',
      entityId: data.categoryId,
      changedById: data.performedById,
      fieldChanged: 'resource_category_created',
      oldValue: null,
      newValue: JSON.stringify({
        name: data.categoryName,
        description: data.description,
        resourceTypeId: data.resourceTypeId,
        resourceTypeName: data.resourceTypeName,
        isSystem: data.isSystem,
      }),
    });

    // Log to activity timeline
    await logTimelineActivity({
      entityType: 'RESOURCE',
      entityId: data.categoryId,
      activityType: 'CREATED',
      title: `Resource category created: ${data.categoryName}`,
      description: `New category "${data.categoryName}" was created under "${data.resourceTypeName}" by ${data.performedByName}`,
      performedBy: data.performedById,
      metadata: {
        entitySubType: 'RESOURCE_CATEGORY',
        categoryName: data.categoryName,
        description: data.description,
        resourceTypeId: data.resourceTypeId,
        resourceTypeName: data.resourceTypeName,
        isSystem: data.isSystem,
        createdBy: data.performedByName,
        createdById: data.performedById,
      },
    });
  } catch (error) {
    console.error('Failed to log resource category creation:', error);
  }
}

/**
 * Logs the update of a resource category
 * Requirements: 11.1 - Add audit trails for resource category changes
 */
export async function logResourceCategoryUpdated(
  data: ResourceCategoryAuditData,
  previousData: { name: string; description?: string }
): Promise<void> {
  try {
    const changes: Array<{ field: string; oldValue: string | undefined; newValue: string | undefined }> = [];
    
    if (previousData.name !== data.categoryName) {
      changes.push({ field: 'name', oldValue: previousData.name, newValue: data.categoryName });
    }
    if (previousData.description !== data.description) {
      changes.push({ field: 'description', oldValue: previousData.description, newValue: data.description });
    }

    // Log each change to audit trail
    for (const change of changes) {
      await logAudit({
        entityType: 'RESOURCE',
        entityId: data.categoryId,
        changedById: data.performedById,
        fieldChanged: `resource_category_${change.field}`,
        oldValue: change.oldValue || null,
        newValue: change.newValue || null,
      });
    }

    // Log to activity timeline
    if (changes.length > 0) {
      await logTimelineActivity({
        entityType: 'RESOURCE',
        entityId: data.categoryId,
        activityType: 'UPDATED',
        title: `Resource category updated: ${data.categoryName}`,
        description: `Category "${data.categoryName}" was updated by ${data.performedByName}`,
        performedBy: data.performedById,
        metadata: {
          entitySubType: 'RESOURCE_CATEGORY',
          categoryName: data.categoryName,
          resourceTypeName: data.resourceTypeName,
          previousName: previousData.name,
          previousDescription: previousData.description,
          newDescription: data.description,
          changes,
          updatedBy: data.performedByName,
          updatedById: data.performedById,
        },
      });
    }
  } catch (error) {
    console.error('Failed to log resource category update:', error);
  }
}

/**
 * Logs the deletion of a resource category
 * Requirements: 11.1 - Add audit trails for resource category changes
 */
export async function logResourceCategoryDeleted(data: ResourceCategoryAuditData): Promise<void> {
  try {
    // Log to audit trail
    await logAudit({
      entityType: 'RESOURCE',
      entityId: data.categoryId,
      changedById: data.performedById,
      fieldChanged: 'resource_category_deleted',
      oldValue: JSON.stringify({
        name: data.categoryName,
        description: data.description,
        resourceTypeId: data.resourceTypeId,
        resourceTypeName: data.resourceTypeName,
        isSystem: data.isSystem,
      }),
      newValue: null,
    });

    // Log to activity timeline
    await logTimelineActivity({
      entityType: 'RESOURCE',
      entityId: data.categoryId,
      activityType: 'DELETED',
      title: `Resource category deleted: ${data.categoryName}`,
      description: `Category "${data.categoryName}" was deleted by ${data.performedByName}`,
      performedBy: data.performedById,
      metadata: {
        entitySubType: 'RESOURCE_CATEGORY',
        categoryName: data.categoryName,
        resourceTypeName: data.resourceTypeName,
        deletedBy: data.performedByName,
        deletedById: data.performedById,
      },
    });
  } catch (error) {
    console.error('Failed to log resource category deletion:', error);
  }
}

// ============================================
// Property Schema Audit Functions
// ============================================

/**
 * Logs property schema selection during resource creation
 * Requirements: 11.2 - Log property selection and schema modifications
 */
export async function logPropertySchemaSelected(data: PropertySchemaAuditData): Promise<void> {
  try {
    // Log to audit trail
    await logAudit({
      entityType: 'RESOURCE',
      entityId: data.resourceId,
      changedById: data.performedById,
      fieldChanged: 'property_schema_selected',
      oldValue: null,
      newValue: JSON.stringify({
        schema: data.newSchema,
        propertyCount: data.newSchema?.length || 0,
      }),
    });

    // Log to activity timeline
    await logTimelineActivity({
      entityType: 'RESOURCE',
      entityId: data.resourceId,
      activityType: 'CREATED',
      title: `Property schema configured for ${data.resourceName}`,
      description: `${data.newSchema?.length || 0} properties selected for resource "${data.resourceName}" by ${data.performedByName}`,
      performedBy: data.performedById,
      resourceId: data.resourceId,
      metadata: {
        entitySubType: 'PROPERTY_SCHEMA',
        resourceName: data.resourceName,
        propertyCount: data.newSchema?.length || 0,
        properties: data.newSchema?.map(p => p.key),
        schemaLocked: data.schemaLocked,
        configuredBy: data.performedByName,
        configuredById: data.performedById,
      },
    });
  } catch (error) {
    console.error('Failed to log property schema selection:', error);
  }
}

/**
 * Logs property schema locking when first item is created
 * Requirements: 11.2 - Log property selection and schema modifications
 */
export async function logPropertySchemaLocked(data: PropertySchemaAuditData): Promise<void> {
  try {
    // Log to audit trail
    await logAudit({
      entityType: 'RESOURCE',
      entityId: data.resourceId,
      changedById: data.performedById,
      fieldChanged: 'property_schema_locked',
      oldValue: JSON.stringify({ schemaLocked: false }),
      newValue: JSON.stringify({ 
        schemaLocked: true,
        schema: data.newSchema,
      }),
    });

    // Log to activity timeline
    await logTimelineActivity({
      entityType: 'RESOURCE',
      entityId: data.resourceId,
      activityType: 'STATUS_CHANGED',
      title: `Property schema locked for ${data.resourceName}`,
      description: `Property schema for "${data.resourceName}" is now locked after first item creation`,
      performedBy: data.performedById,
      resourceId: data.resourceId,
      metadata: {
        entitySubType: 'PROPERTY_SCHEMA',
        resourceName: data.resourceName,
        schemaLocked: true,
        propertyCount: data.newSchema?.length || 0,
        lockedBy: data.performedByName,
        lockedById: data.performedById,
      },
    });
  } catch (error) {
    console.error('Failed to log property schema locking:', error);
  }
}

/**
 * Logs property schema modification (before locking)
 * Requirements: 11.2 - Log property selection and schema modifications
 */
export async function logPropertySchemaModified(data: PropertySchemaAuditData): Promise<void> {
  try {
    // Log to audit trail
    await logAudit({
      entityType: 'RESOURCE',
      entityId: data.resourceId,
      changedById: data.performedById,
      fieldChanged: 'property_schema_modified',
      oldValue: JSON.stringify({
        schema: data.previousSchema,
        propertyCount: data.previousSchema?.length || 0,
      }),
      newValue: JSON.stringify({
        schema: data.newSchema,
        propertyCount: data.newSchema?.length || 0,
      }),
    });

    // Log to activity timeline
    await logTimelineActivity({
      entityType: 'RESOURCE',
      entityId: data.resourceId,
      activityType: 'UPDATED',
      title: `Property schema modified for ${data.resourceName}`,
      description: `Property schema for "${data.resourceName}" was modified by ${data.performedByName}`,
      performedBy: data.performedById,
      resourceId: data.resourceId,
      metadata: {
        entitySubType: 'PROPERTY_SCHEMA',
        resourceName: data.resourceName,
        previousPropertyCount: data.previousSchema?.length || 0,
        newPropertyCount: data.newSchema?.length || 0,
        previousProperties: data.previousSchema?.map(p => p.key),
        newProperties: data.newSchema?.map(p => p.key),
        modifiedBy: data.performedByName,
        modifiedById: data.performedById,
      },
    });
  } catch (error) {
    console.error('Failed to log property schema modification:', error);
  }
}

// ============================================
// Assignment Model Audit Functions
// ============================================

/**
 * Logs assignment status changes
 * Requirements: 11.3 - Track assignment model changes
 */
export async function logAssignmentStatusChanged(data: AssignmentModelAuditData): Promise<void> {
  try {
    // Log to audit trail
    await logAudit({
      entityType: 'RESOURCE',
      entityId: data.resourceId,
      changedById: data.performedById,
      fieldChanged: 'assignment_status',
      oldValue: data.previousStatus || null,
      newValue: data.newStatus,
    });

    // Log to activity timeline
    await logTimelineActivity({
      entityType: 'RESOURCE',
      entityId: data.resourceId,
      activityType: 'STATUS_CHANGED',
      title: `Assignment status changed: ${data.previousStatus || 'NEW'} → ${data.newStatus}`,
      description: `Assignment for ${data.employeeName} on "${data.resourceName}" changed to ${data.newStatus}`,
      performedBy: data.performedById,
      resourceId: data.resourceId,
      employeeId: data.employeeId,
      metadata: {
        entitySubType: 'ASSIGNMENT_MODEL',
        assignmentId: data.assignmentId,
        resourceName: data.resourceName,
        employeeName: data.employeeName,
        previousStatus: data.previousStatus,
        newStatus: data.newStatus,
        assignmentType: data.assignmentType,
        itemId: data.itemId,
        changedBy: data.performedByName,
        changedById: data.performedById,
      },
    });
  } catch (error) {
    console.error('Failed to log assignment status change:', error);
  }
}

/**
 * Logs new assignment creation with type-specific model
 * Requirements: 11.3 - Track assignment model changes
 */
export async function logAssignmentCreated(data: AssignmentModelAuditData): Promise<void> {
  try {
    // Log to audit trail
    await logAudit({
      entityType: 'RESOURCE',
      entityId: data.resourceId,
      changedById: data.performedById,
      fieldChanged: 'assignment_created',
      oldValue: null,
      newValue: JSON.stringify({
        assignmentId: data.assignmentId,
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        assignmentType: data.assignmentType,
        itemId: data.itemId,
        status: data.newStatus,
      }),
    });

    // Determine assignment description based on type
    const assignmentDescription = getAssignmentTypeDescription(data.assignmentType, data.itemId);

    // Log to activity timeline
    await logTimelineActivity({
      entityType: 'RESOURCE',
      entityId: data.resourceId,
      activityType: 'ASSIGNED',
      title: `${data.resourceName} assigned to ${data.employeeName}`,
      description: `${assignmentDescription} by ${data.performedByName}`,
      performedBy: data.performedById,
      resourceId: data.resourceId,
      employeeId: data.employeeId,
      metadata: {
        entitySubType: 'ASSIGNMENT_MODEL',
        assignmentId: data.assignmentId,
        resourceName: data.resourceName,
        employeeName: data.employeeName,
        assignmentType: data.assignmentType,
        itemId: data.itemId,
        status: data.newStatus,
        assignedBy: data.performedByName,
        assignedById: data.performedById,
      },
    });
  } catch (error) {
    console.error('Failed to log assignment creation:', error);
  }
}

/**
 * Logs assignment revocation
 * Requirements: 11.3 - Track assignment model changes
 */
export async function logAssignmentRevoked(
  data: AssignmentModelAuditData,
  reason?: string
): Promise<void> {
  try {
    // Log to audit trail
    await logAudit({
      entityType: 'RESOURCE',
      entityId: data.resourceId,
      changedById: data.performedById,
      fieldChanged: 'assignment_revoked',
      oldValue: JSON.stringify({
        status: data.previousStatus,
        assignmentType: data.assignmentType,
      }),
      newValue: JSON.stringify({
        status: 'RETURNED',
        reason,
      }),
    });

    // Log to activity timeline
    await logTimelineActivity({
      entityType: 'RESOURCE',
      entityId: data.resourceId,
      activityType: 'ACCESS_REVOKED',
      title: `Assignment revoked: ${data.resourceName}`,
      description: `Assignment for ${data.employeeName} was revoked${reason ? `: ${reason}` : ''} by ${data.performedByName}`,
      performedBy: data.performedById,
      resourceId: data.resourceId,
      employeeId: data.employeeId,
      metadata: {
        entitySubType: 'ASSIGNMENT_MODEL',
        assignmentId: data.assignmentId,
        resourceName: data.resourceName,
        employeeName: data.employeeName,
        previousStatus: data.previousStatus,
        assignmentType: data.assignmentType,
        itemId: data.itemId,
        reason,
        revokedBy: data.performedByName,
        revokedById: data.performedById,
      },
    });
  } catch (error) {
    console.error('Failed to log assignment revocation:', error);
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Gets a human-readable description for assignment type
 */
function getAssignmentTypeDescription(assignmentType: string, itemId?: string): string {
  switch (assignmentType.toUpperCase()) {
    case 'INDIVIDUAL':
      return itemId 
        ? `Individual assignment (item: ${itemId.substring(0, 8)}...)` 
        : 'Individual assignment';
    case 'POOLED':
      return 'Pooled license assignment from shared pool';
    case 'SHARED':
      return 'Shared access granted (cloud resource)';
    default:
      return `Assignment (${assignmentType.toLowerCase()})`;
  }
}

/**
 * Logs a failed deletion attempt (for referential integrity violations)
 * Requirements: 11.7 - Log all structural changes for audit purposes
 */
export async function logDeletionAttemptFailed(
  entityType: 'RESOURCE_TYPE' | 'RESOURCE_CATEGORY',
  entityId: string,
  entityName: string,
  reason: string,
  performedById: string,
  performedByName: string
): Promise<void> {
  try {
    // Log to audit trail
    await logAudit({
      entityType: 'RESOURCE',
      entityId,
      changedById: performedById,
      fieldChanged: `${entityType.toLowerCase()}_deletion_failed`,
      oldValue: null,
      newValue: JSON.stringify({
        entityName,
        reason,
        attemptedBy: performedByName,
      }),
    });

    // Log to activity timeline
    await logTimelineActivity({
      entityType: 'RESOURCE',
      entityId,
      activityType: 'DELETION_FAILED',
      title: `Deletion blocked: ${entityName}`,
      description: `Deletion of ${entityType.toLowerCase().replace('_', ' ')} "${entityName}" was blocked: ${reason}`,
      performedBy: performedById,
      metadata: {
        entitySubType: entityType,
        entityName,
        reason,
        attemptedBy: performedByName,
        attemptedById: performedById,
      },
    });
  } catch (error) {
    console.error('Failed to log deletion attempt:', error);
  }
}
