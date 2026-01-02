/**
 * Resource Type Service
 * 
 * Provides CRUD operations for resource types, including:
 * - Fetching predefined system types (Hardware, Software, Cloud)
 * - Creating custom resource types
 * - Deleting resource types with referential integrity checks
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { prisma } from './prisma';
import { 
  ResourceTypeEntity, 
  CreateResourceTypeRequest,
  UpdateResourceTypeRequest,
  ResourceTypeListResponse,
  DEFAULT_MANDATORY_PROPERTIES
} from '../types/resource-structure';

/**
 * Predefined system resource types
 */
const SYSTEM_RESOURCE_TYPES = ['Hardware', 'Software', 'Cloud'];

/**
 * Seeds predefined system resource types into the database
 * This should be called during application initialization
 * 
 * Requirements: 1.1, 2.1 - Sets default mandatory properties for Cloud and Hardware types
 * - Cloud: mandatoryProperties = ['maxUsers']
 * - Hardware: mandatoryProperties = ['serialNumber', 'warrantyExpiry']
 */
export async function seedSystemResourceTypes(): Promise<void> {
  try {
    for (const typeName of SYSTEM_RESOURCE_TYPES) {
      // Get default mandatory properties for this type
      const mandatoryProperties = DEFAULT_MANDATORY_PROPERTIES[typeName] || [];
      
      await prisma.resourceTypeEntity.upsert({
        where: { name: typeName },
        update: {
          // Update existing types to include mandatory properties
          mandatoryProperties: mandatoryProperties,
        },
        create: {
          name: typeName,
          description: `System-defined ${typeName} resource type`,
          isSystem: true,
          mandatoryProperties: mandatoryProperties,
        },
      });
    }
    console.log('System resource types seeded successfully with mandatory properties');
  } catch (error) {
    console.error('Error seeding system resource types:', error);
    throw error;
  }
}

/**
 * Fetches all resource types (both system and custom)
 */
export async function getAllResourceTypes(): Promise<ResourceTypeListResponse> {
  const types = await prisma.resourceTypeEntity.findMany({
    orderBy: [
      { isSystem: 'desc' },
      { name: 'asc' },
    ],
  });

  return {
    types: types.map(mapPrismaToResourceType),
    total: types.length,
  };
}

/**
 * Fetches a single resource type by ID
 */
export async function getResourceTypeById(id: string): Promise<ResourceTypeEntity | null> {
  const type = await prisma.resourceTypeEntity.findUnique({
    where: { id },
  });

  return type ? mapPrismaToResourceType(type) : null;
}

/**
 * Fetches a single resource type by name
 */
export async function getResourceTypeByName(name: string): Promise<ResourceTypeEntity | null> {
  const type = await prisma.resourceTypeEntity.findUnique({
    where: { name },
  });

  return type ? mapPrismaToResourceType(type) : null;
}

/**
 * Creates a new custom resource type
 * Requirements: 1.2 - Store without requiring schema changes
 * Requirements: 3.1, 3.2 - Accept and store mandatoryProperties
 */
export async function createResourceType(
  request: CreateResourceTypeRequest
): Promise<ResourceTypeEntity> {
  // Validate that the name doesn't already exist
  const existing = await prisma.resourceTypeEntity.findUnique({
    where: { name: request.name },
  });

  if (existing) {
    throw new Error(`Resource type with name "${request.name}" already exists`);
  }

  // Validate name format (non-empty, reasonable length)
  if (!request.name || request.name.trim().length === 0) {
    throw new Error('Resource type name cannot be empty');
  }

  if (request.name.length > 100) {
    throw new Error('Resource type name cannot exceed 100 characters');
  }

  // Get default mandatory properties for this type name
  const defaultMandatory = getDefaultMandatoryProperties(request.name);
  
  // Merge provided mandatory properties with defaults (defaults are always included)
  const finalMandatoryProperties = request.mandatoryProperties 
    ? Array.from(new Set([...defaultMandatory, ...request.mandatoryProperties]))
    : defaultMandatory;

  const type = await prisma.resourceTypeEntity.create({
    data: {
      name: request.name.trim(),
      description: request.description?.trim() || null,
      isSystem: false,
      mandatoryProperties: finalMandatoryProperties,
    },
  });

  return mapPrismaToResourceType(type);
}

/**
 * Updates an existing resource type
 * Note: System types can only have their description updated
 * Requirements: 3.2 - Allow modification of mandatory properties
 * Requirements: 1.4, 2.4 - Prevent removal of default mandatory properties
 */
export async function updateResourceType(
  id: string,
  updates: UpdateResourceTypeRequest
): Promise<ResourceTypeEntity> {
  const existing = await prisma.resourceTypeEntity.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('Resource type not found');
  }

  // System types can only have description updated
  if (existing.isSystem && updates.name && updates.name !== existing.name) {
    throw new Error('System resource type names cannot be modified');
  }

  // Validate name uniqueness if changing
  if (updates.name && updates.name !== existing.name) {
    const nameExists = await prisma.resourceTypeEntity.findUnique({
      where: { name: updates.name },
    });
    if (nameExists) {
      throw new Error(`Resource type with name "${updates.name}" already exists`);
    }
  }

  // Handle mandatory properties update
  let finalMandatoryProperties: string[] | undefined;
  if (updates.mandatoryProperties !== undefined) {
    // Get default mandatory properties for this type
    const defaultMandatory = getDefaultMandatoryProperties(existing.name);
    
    // Check if any default mandatory properties are being removed
    const missingDefaults = defaultMandatory.filter(
      prop => !updates.mandatoryProperties!.includes(prop)
    );
    
    if (missingDefaults.length > 0) {
      throw new Error(
        `Cannot remove default mandatory properties: ${missingDefaults.join(', ')}. ` +
        `These properties are required for ${existing.name} resource types.`
      );
    }
    
    // Ensure defaults are always included
    finalMandatoryProperties = Array.from(new Set([...defaultMandatory, ...updates.mandatoryProperties]));
  }

  const type = await prisma.resourceTypeEntity.update({
    where: { id },
    data: {
      ...(updates.name && !existing.isSystem && { name: updates.name.trim() }),
      ...(updates.description !== undefined && { description: updates.description?.trim() || null }),
      ...(finalMandatoryProperties !== undefined && { mandatoryProperties: finalMandatoryProperties }),
    },
  });

  return mapPrismaToResourceType(type);
}

/**
 * Deletes a resource type
 * Requirements: 1.4 - Prevent deletion if resources are assigned to that type
 * Requirements: 1.5 - Maintain referential integrity
 */
export async function deleteResourceType(id: string): Promise<void> {
  const existing = await prisma.resourceTypeEntity.findUnique({
    where: { id },
    include: {
      resources: { select: { id: true } },
      categories: { select: { id: true } },
    },
  });

  if (!existing) {
    throw new Error('Resource type not found');
  }

  // System types cannot be deleted
  if (existing.isSystem) {
    throw new Error('System resource types cannot be deleted');
  }

  // Check for associated resources
  if (existing.resources.length > 0) {
    throw new Error(
      `Cannot delete resource type "${existing.name}" as it has ${existing.resources.length} associated resource(s). ` +
      'Please reassign or delete those resources first.'
    );
  }

  // Check for associated categories
  if (existing.categories.length > 0) {
    throw new Error(
      `Cannot delete resource type "${existing.name}" as it has ${existing.categories.length} associated category(ies). ` +
      'Please delete those categories first.'
    );
  }

  await prisma.resourceTypeEntity.delete({
    where: { id },
  });
}

/**
 * Checks if a resource type has any associated resources
 */
export async function hasAssociatedResources(id: string): Promise<boolean> {
  const count = await prisma.resource.count({
    where: { resourceTypeId: id },
  });
  return count > 0;
}

/**
 * Checks if a resource type has any associated categories
 */
export async function hasAssociatedCategories(id: string): Promise<boolean> {
  const count = await prisma.resourceCategoryEntity.count({
    where: { resourceTypeId: id },
  });
  return count > 0;
}

/**
 * Gets resource type with its categories
 */
export async function getResourceTypeWithCategories(id: string): Promise<ResourceTypeEntity & { categories: { id: string; name: string }[] } | null> {
  const type = await prisma.resourceTypeEntity.findUnique({
    where: { id },
    include: {
      categories: {
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!type) return null;

  return {
    ...mapPrismaToResourceType(type),
    categories: type.categories,
  };
}

/**
 * Maps Prisma ResourceTypeEntity model to TypeScript interface
 */
function mapPrismaToResourceType(type: {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  mandatoryProperties?: unknown;
  createdAt: Date;
  updatedAt: Date;
}): ResourceTypeEntity {
  return {
    id: type.id,
    name: type.name,
    description: type.description ?? undefined,
    isSystem: type.isSystem,
    mandatoryProperties: (type.mandatoryProperties as string[]) || [],
    createdAt: type.createdAt,
    updatedAt: type.updatedAt,
  };
}

// ============================================
// Mandatory Property Helper Functions
// Requirements: 1.1, 2.1
// ============================================

/**
 * Get default mandatory properties for a resource type name
 * Requirements: 1.1 - Cloud resources have "maxUsers" as mandatory
 * Requirements: 2.1 - Hardware resources have "serialNumber" and "warrantyExpiry" as mandatory
 * 
 * @param typeName - The name of the resource type (e.g., "Cloud", "Hardware")
 * @returns Array of property keys that are mandatory by default for this type
 */
export function getDefaultMandatoryProperties(typeName: string): string[] {
  return DEFAULT_MANDATORY_PROPERTIES[typeName] || [];
}

/**
 * Check if a property is a default mandatory property for a given type
 * Requirements: 1.4, 2.4 - Prevent removal of default mandatory properties
 * 
 * @param typeName - The name of the resource type
 * @param propertyKey - The property key to check
 * @returns true if the property is a default mandatory for this type
 */
export function isDefaultMandatoryProperty(typeName: string, propertyKey: string): boolean {
  const defaults = getDefaultMandatoryProperties(typeName);
  return defaults.includes(propertyKey);
}

/**
 * Get mandatory properties for a resource type by ID
 * Fetches the type from the database and returns its mandatory properties
 * 
 * @param typeId - The ID of the resource type
 * @returns Array of mandatory property keys for this type
 */
export async function getMandatoryPropertiesForType(typeId: string): Promise<string[]> {
  const type = await prisma.resourceTypeEntity.findUnique({
    where: { id: typeId },
    select: { mandatoryProperties: true },
  });

  if (!type) {
    return [];
  }

  return (type.mandatoryProperties as string[]) || [];
}
