/**
 * Data Migration Service
 * 
 * Provides utilities for migrating existing data to the new resource structure:
 * - Migrate existing ResourceType enum to new ResourceTypeEntity table
 * - Convert existing resource item properties to new format
 * - Preserve all existing resource relationships
 * - Ensure backward compatibility with existing data
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { prisma } from './prisma';
import { PropertyDefinition, PropertyDataType } from '../types/resource-structure';

/**
 * Migration result interface
 */
export interface MigrationResult {
  success: boolean;
  migratedResources: number;
  migratedItems: number;
  migratedAssignments: number;
  errors: string[];
  warnings: string[];
}

/**
 * Mapping from legacy ResourceType enum to new ResourceTypeEntity names
 * Requirements: 5.3 - Map existing ResourceType enum values to the new flexible structure
 */
export const LEGACY_TYPE_MAPPING: Record<string, string> = {
  'PHYSICAL': 'PHYSICAL',
  'SOFTWARE': 'SOFTWARE',
  'CLOUD': 'CLOUD',
};

/**
 * Default property schemas for each legacy resource type
 * Used when migrating resources that don't have a property schema defined
 */
export const DEFAULT_PROPERTY_SCHEMAS: Record<string, PropertyDefinition[]> = {
  'PHYSICAL': [
    { key: 'serialNumber', label: 'Serial Number', dataType: 'STRING', description: 'Unique serial number' },
    { key: 'hostname', label: 'Hostname', dataType: 'STRING', description: 'Network hostname' },
    { key: 'ipAddress', label: 'IP Address', dataType: 'STRING', description: 'Network IP address' },
    { key: 'macAddress', label: 'MAC Address', dataType: 'STRING', description: 'Network MAC address' },
    { key: 'operatingSystem', label: 'Operating System', dataType: 'STRING', description: 'OS name' },
    { key: 'osVersion', label: 'OS Version', dataType: 'STRING', description: 'OS version' },
    { key: 'processor', label: 'Processor', dataType: 'STRING', description: 'CPU model' },
    { key: 'memory', label: 'Memory', dataType: 'STRING', description: 'RAM specification' },
    { key: 'storage', label: 'Storage', dataType: 'STRING', description: 'Storage capacity' },
    { key: 'purchaseDate', label: 'Purchase Date', dataType: 'DATE', description: 'Date of purchase' },
    { key: 'warrantyExpiry', label: 'Warranty Expiry', dataType: 'DATE', description: 'Warranty expiration' },
    { key: 'value', label: 'Value', dataType: 'NUMBER', description: 'Monetary value' },
  ],
  'SOFTWARE': [
    { key: 'licenseKey', label: 'License Key', dataType: 'STRING', description: 'Software license key' },
    { key: 'softwareVersion', label: 'Software Version', dataType: 'STRING', description: 'Version number' },
    { key: 'licenseType', label: 'License Type', dataType: 'STRING', description: 'Type of license' },
    { key: 'maxUsers', label: 'Max Users', dataType: 'STRING', description: 'Maximum users allowed' },
    { key: 'activationCode', label: 'Activation Code', dataType: 'STRING', description: 'Activation code' },
    { key: 'licenseExpiry', label: 'License Expiry', dataType: 'DATE', description: 'License expiration' },
    { key: 'purchaseDate', label: 'Purchase Date', dataType: 'DATE', description: 'Date of purchase' },
    { key: 'value', label: 'Value', dataType: 'NUMBER', description: 'Monetary value' },
  ],
  'CLOUD': [
    { key: 'accountId', label: 'Account ID', dataType: 'STRING', description: 'Cloud account identifier' },
    { key: 'region', label: 'Region', dataType: 'STRING', description: 'Cloud region' },
    { key: 'subscriptionTier', label: 'Subscription Tier', dataType: 'STRING', description: 'Service tier' },
    { key: 'purchaseDate', label: 'Purchase Date', dataType: 'DATE', description: 'Date of purchase' },
    { key: 'value', label: 'Value', dataType: 'NUMBER', description: 'Monetary value' },
  ],
};

/**
 * Legacy fields that exist on ResourceItem model
 */
const LEGACY_ITEM_FIELDS = [
  'serialNumber',
  'hostname',
  'ipAddress',
  'macAddress',
  'operatingSystem',
  'osVersion',
  'processor',
  'memory',
  'storage',
  'licenseKey',
  'softwareVersion',
  'licenseType',
  'maxUsers',
  'activationCode',
  'licenseExpiry',
  'purchaseDate',
  'warrantyExpiry',
  'value',
];

/**
 * Migrates all existing resources to the new structure
 * Requirements: 5.1, 5.2 - Preserve all existing resource type and category assignments
 */
export async function migrateResourcesToNewStructure(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    migratedResources: 0,
    migratedItems: 0,
    migratedAssignments: 0,
    errors: [],
    warnings: [],
  };

  try {
    // Step 1: Ensure resource types exist in the new table
    await ensureResourceTypesExist();

    // Step 2: Get all resources that need migration (no resourceTypeId set)
    const resourcesToMigrate = await prisma.resource.findMany({
      where: {
        resourceTypeId: null,
      },
      include: {
        items: true,
      },
    });

    if (resourcesToMigrate.length === 0) {
      result.warnings.push('No resources found that need migration');
      return result;
    }

    // Step 3: Migrate each resource
    for (const resource of resourcesToMigrate) {
      try {
        await migrateResource(resource, result);
        result.migratedResources++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to migrate resource ${resource.id}: ${errorMessage}`);
        result.success = false;
      }
    }

    // Step 4: Migrate resource items
    const itemsToMigrate = await prisma.resourceItem.findMany({
      where: {
        properties: {
          equals: {},
        },
      },
      include: {
        resource: true,
      },
    });

    for (const item of itemsToMigrate) {
      try {
        await migrateResourceItem(item, result);
        result.migratedItems++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to migrate item ${item.id}: ${errorMessage}`);
      }
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Migration failed: ${errorMessage}`);
    result.success = false;
    return result;
  }
}

/**
 * Ensures all system resource types exist in the new table
 */
async function ensureResourceTypesExist(): Promise<void> {
  const systemTypes = ['PHYSICAL', 'SOFTWARE', 'CLOUD'];

  for (const typeName of systemTypes) {
    const existing = await prisma.resourceTypeEntity.findUnique({
      where: { name: typeName },
    });

    if (!existing) {
      await prisma.resourceTypeEntity.create({
        data: {
          name: typeName,
          description: getTypeDescription(typeName),
          isSystem: true,
        },
      });
    }
  }
}

/**
 * Gets description for a resource type
 */
function getTypeDescription(typeName: string): string {
  const descriptions: Record<string, string> = {
    'PHYSICAL': 'Physical hardware assets like laptops, phones, and equipment',
    'SOFTWARE': 'Software licenses and applications',
    'CLOUD': 'Cloud services and subscriptions',
  };
  return descriptions[typeName] || `${typeName} resources`;
}

/**
 * Migrates a single resource to the new structure
 * Requirements: 5.1, 5.2 - Preserve existing type and category assignments
 */
async function migrateResource(resource: any, result: MigrationResult): Promise<void> {
  // Get the corresponding ResourceTypeEntity
  const legacyType = resource.type;
  const newTypeName = LEGACY_TYPE_MAPPING[legacyType] || legacyType;

  const resourceType = await prisma.resourceTypeEntity.findUnique({
    where: { name: newTypeName },
  });

  if (!resourceType) {
    throw new Error(`Resource type ${newTypeName} not found in new table`);
  }

  // Determine property schema
  let propertySchema: PropertyDefinition[] = [];
  const existingSchema = resource.propertySchema as any[];

  if (existingSchema && existingSchema.length > 0) {
    // Use existing schema if available
    propertySchema = existingSchema;
  } else if (resource.items && resource.items.length > 0) {
    // Infer schema from existing items
    propertySchema = inferPropertySchemaFromItems(resource.items, legacyType);
    result.warnings.push(`Inferred property schema for resource ${resource.id} from existing items`);
  } else {
    // Use default schema for the type
    propertySchema = DEFAULT_PROPERTY_SCHEMAS[legacyType] || [];
    result.warnings.push(`Using default property schema for resource ${resource.id}`);
  }

  // Determine if schema should be locked (has items)
  const schemaLocked = resource.items && resource.items.length > 0;

  // Update the resource
  await prisma.resource.update({
    where: { id: resource.id },
    data: {
      resourceTypeId: resourceType.id,
      propertySchema: JSON.parse(JSON.stringify(propertySchema)),
      schemaLocked,
    },
  });
}

/**
 * Infers property schema from existing resource items
 */
function inferPropertySchemaFromItems(items: any[], legacyType: string): PropertyDefinition[] {
  const usedProperties = new Set<string>();

  // Collect all properties used across items
  for (const item of items) {
    for (const field of LEGACY_ITEM_FIELDS) {
      if (item[field] !== null && item[field] !== undefined) {
        usedProperties.add(field);
      }
    }

    // Also check the properties JSON field
    const itemProperties = item.properties as Record<string, unknown> || {};
    for (const key of Object.keys(itemProperties)) {
      if (itemProperties[key] !== null && itemProperties[key] !== undefined) {
        usedProperties.add(key);
      }
    }
  }

  // Build property schema from used properties
  const defaultSchema = DEFAULT_PROPERTY_SCHEMAS[legacyType] || [];
  const schema: PropertyDefinition[] = [];

  for (const propKey of usedProperties) {
    // Find in default schema
    const defaultProp = defaultSchema.find(p => p.key === propKey);
    if (defaultProp) {
      schema.push(defaultProp);
    } else {
      // Create a generic property definition
      schema.push({
        key: propKey,
        label: formatPropertyLabel(propKey),
        dataType: inferDataType(propKey),
        description: `Migrated property: ${propKey}`,
      });
    }
  }

  return schema;
}

/**
 * Formats a property key into a human-readable label
 */
function formatPropertyLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Infers data type from property key
 */
function inferDataType(key: string): PropertyDataType {
  const dateFields = ['purchaseDate', 'warrantyExpiry', 'licenseExpiry', 'createdAt', 'updatedAt'];
  const numberFields = ['value', 'quantity', 'maxUsers'];
  const booleanFields = ['isActive', 'isSystem', 'schemaLocked'];

  if (dateFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
    return 'DATE';
  }
  if (numberFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
    return 'NUMBER';
  }
  if (booleanFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
    return 'BOOLEAN';
  }
  return 'STRING';
}

/**
 * Migrates a single resource item to the new properties format
 * Requirements: 5.3 - Convert existing resource item properties to new format
 */
async function migrateResourceItem(item: any, result: MigrationResult): Promise<void> {
  // Build properties object from legacy fields
  const properties: Record<string, unknown> = {};

  for (const field of LEGACY_ITEM_FIELDS) {
    const value = item[field];
    if (value !== null && value !== undefined) {
      // Handle date fields
      if (value instanceof Date) {
        properties[field] = value.toISOString();
      } else {
        properties[field] = value;
      }
    }
  }

  // Merge with any existing properties
  const existingProperties = item.properties as Record<string, unknown> || {};
  const mergedProperties = { ...properties, ...existingProperties };

  // Update the item
  await prisma.resourceItem.update({
    where: { id: item.id },
    data: {
      properties: JSON.parse(JSON.stringify(mergedProperties)),
    },
  });
}

/**
 * Validates that all existing assignments are still valid after migration
 * Requirements: 5.5 - Maintain all existing resource relationships and assignments
 */
export async function validateAssignments(): Promise<{ valid: number; invalid: number; errors: string[] }> {
  const result = { valid: 0, invalid: 0, errors: [] as string[] };

  const assignments = await prisma.resourceAssignment.findMany({
    include: {
      resource: true,
      employee: true,
    },
  });

  for (const assignment of assignments) {
    if (!assignment.resource) {
      result.invalid++;
      result.errors.push(`Assignment ${assignment.id} has no associated resource`);
    } else if (!assignment.employee) {
      result.invalid++;
      result.errors.push(`Assignment ${assignment.id} has no associated employee`);
    } else {
      result.valid++;
    }
  }

  return result;
}

/**
 * Gets migration status for the database
 */
export async function getMigrationStatus(): Promise<{
  totalResources: number;
  migratedResources: number;
  pendingResources: number;
  totalItems: number;
  migratedItems: number;
  pendingItems: number;
}> {
  const [
    totalResources,
    migratedResources,
    totalItems,
    migratedItems,
  ] = await Promise.all([
    prisma.resource.count(),
    prisma.resource.count({ where: { resourceTypeId: { not: null } } }),
    prisma.resourceItem.count(),
    prisma.resourceItem.count({
      where: {
        properties: { not: {} },
      },
    }),
  ]);

  return {
    totalResources,
    migratedResources,
    pendingResources: totalResources - migratedResources,
    totalItems,
    migratedItems,
    pendingItems: totalItems - migratedItems,
  };
}

/**
 * Rolls back migration for a specific resource (for testing/debugging)
 */
export async function rollbackResourceMigration(resourceId: string): Promise<void> {
  await prisma.resource.update({
    where: { id: resourceId },
    data: {
      resourceTypeId: null,
      resourceCategoryId: null,
      propertySchema: [],
      schemaLocked: false,
    },
  });
}

/**
 * Rolls back migration for a specific item (for testing/debugging)
 */
export async function rollbackItemMigration(itemId: string): Promise<void> {
  await prisma.resourceItem.update({
    where: { id: itemId },
    data: {
      properties: {},
    },
  });
}
