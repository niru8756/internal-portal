/**
 * Resource Category Service
 * 
 * Provides CRUD operations for resource categories, including:
 * - Fetching predefined system categories (Laptop, Phone, SaaS, Cloud Account)
 * - Creating custom categories within resource types
 * - Deleting categories with referential integrity checks
 * - Type-category validation
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { prisma } from './prisma';
import { 
  ResourceCategoryEntity, 
  ResourceCategoryWithType,
  CreateResourceCategoryRequest,
  UpdateResourceCategoryRequest,
  ResourceCategoryListResponse
} from '../types/resource-structure';

/**
 * Predefined system categories by resource type
 */
const SYSTEM_CATEGORIES: Record<string, string[]> = {
  'Hardware': ['Laptop', 'Desktop', 'Phone', 'Tablet', 'Monitor', 'Peripheral'],
  'Software': ['SaaS', 'Desktop Application', 'Development Tool', 'Operating System'],
  'Cloud': ['Cloud Account', 'Cloud Storage', 'Cloud Compute', 'Cloud Database'],
};

/**
 * Seeds predefined system categories into the database
 * This should be called after system resource types are seeded
 */
export async function seedSystemCategories(): Promise<void> {
  try {
    for (const [typeName, categories] of Object.entries(SYSTEM_CATEGORIES)) {
      // Find the resource type
      const resourceType = await prisma.resourceTypeEntity.findUnique({
        where: { name: typeName },
      });

      if (!resourceType) {
        console.warn(`Resource type "${typeName}" not found, skipping categories`);
        continue;
      }

      for (const categoryName of categories) {
        await prisma.resourceCategoryEntity.upsert({
          where: {
            name_resourceTypeId: {
              name: categoryName,
              resourceTypeId: resourceType.id,
            },
          },
          update: {},
          create: {
            name: categoryName,
            description: `System-defined ${categoryName} category for ${typeName}`,
            resourceTypeId: resourceType.id,
            isSystem: true,
          },
        });
      }
    }
    console.log('System categories seeded successfully');
  } catch (error) {
    console.error('Error seeding system categories:', error);
    throw error;
  }
}

/**
 * Fetches all resource categories (both system and custom)
 * Requirements: 2.4 - Display categories grouped by their parent type
 */
export async function getAllCategories(): Promise<ResourceCategoryListResponse> {
  const categories = await prisma.resourceCategoryEntity.findMany({
    include: {
      resourceType: true,
    },
    orderBy: [
      { resourceType: { name: 'asc' } },
      { isSystem: 'desc' },
      { name: 'asc' },
    ],
  });

  return {
    categories: categories.map(mapPrismaToCategoryWithType),
    total: categories.length,
  };
}

/**
 * Fetches categories for a specific resource type
 * Requirements: 2.4 - Display categories grouped by their parent type
 */
export async function getCategoriesByType(resourceTypeId: string): Promise<ResourceCategoryWithType[]> {
  // Validate that the resource type exists
  const resourceType = await prisma.resourceTypeEntity.findUnique({
    where: { id: resourceTypeId },
  });

  if (!resourceType) {
    throw new Error('Resource type not found');
  }

  const categories = await prisma.resourceCategoryEntity.findMany({
    where: { resourceTypeId },
    include: {
      resourceType: true,
    },
    orderBy: [
      { isSystem: 'desc' },
      { name: 'asc' },
    ],
  });

  return categories.map(mapPrismaToCategoryWithType);
}

/**
 * Fetches a single category by ID
 */
export async function getCategoryById(id: string): Promise<ResourceCategoryWithType | null> {
  const category = await prisma.resourceCategoryEntity.findUnique({
    where: { id },
    include: {
      resourceType: true,
    },
  });

  return category ? mapPrismaToCategoryWithType(category) : null;
}

/**
 * Creates a new custom category
 * Requirements: 2.1 - Associate with exactly one resource type
 * Requirements: 2.3 - Store without requiring schema changes
 */
export async function createCategory(
  request: CreateResourceCategoryRequest
): Promise<ResourceCategoryWithType> {
  // Validate that the resource type exists
  const resourceType = await prisma.resourceTypeEntity.findUnique({
    where: { id: request.resourceTypeId },
  });

  if (!resourceType) {
    throw new Error('Resource type not found');
  }

  // Validate that the name doesn't already exist for this type
  const existing = await prisma.resourceCategoryEntity.findUnique({
    where: {
      name_resourceTypeId: {
        name: request.name,
        resourceTypeId: request.resourceTypeId,
      },
    },
  });

  if (existing) {
    throw new Error(
      `Category with name "${request.name}" already exists for resource type "${resourceType.name}"`
    );
  }

  // Validate name format
  if (!request.name || request.name.trim().length === 0) {
    throw new Error('Category name cannot be empty');
  }

  if (request.name.length > 100) {
    throw new Error('Category name cannot exceed 100 characters');
  }

  const category = await prisma.resourceCategoryEntity.create({
    data: {
      name: request.name.trim(),
      description: request.description?.trim() || null,
      resourceTypeId: request.resourceTypeId,
      isSystem: false,
    },
    include: {
      resourceType: true,
    },
  });

  return mapPrismaToCategoryWithType(category);
}

/**
 * Updates an existing category
 * Note: System categories can only have their description updated
 */
export async function updateCategory(
  id: string,
  updates: UpdateResourceCategoryRequest
): Promise<ResourceCategoryWithType> {
  const existing = await prisma.resourceCategoryEntity.findUnique({
    where: { id },
    include: { resourceType: true },
  });

  if (!existing) {
    throw new Error('Category not found');
  }

  // System categories can only have description updated
  if (existing.isSystem && updates.name && updates.name !== existing.name) {
    throw new Error('System category names cannot be modified');
  }

  // Validate name uniqueness if changing
  if (updates.name && updates.name !== existing.name) {
    const nameExists = await prisma.resourceCategoryEntity.findUnique({
      where: {
        name_resourceTypeId: {
          name: updates.name,
          resourceTypeId: existing.resourceTypeId,
        },
      },
    });
    if (nameExists) {
      throw new Error(
        `Category with name "${updates.name}" already exists for resource type "${existing.resourceType.name}"`
      );
    }
  }

  const category = await prisma.resourceCategoryEntity.update({
    where: { id },
    data: {
      ...(updates.name && !existing.isSystem && { name: updates.name.trim() }),
      ...(updates.description !== undefined && { description: updates.description?.trim() || null }),
    },
    include: {
      resourceType: true,
    },
  });

  return mapPrismaToCategoryWithType(category);
}

/**
 * Deletes a category
 * Requirements: 2.5 - Prevent deletion if resources are assigned to that category
 */
export async function deleteCategory(id: string): Promise<void> {
  const existing = await prisma.resourceCategoryEntity.findUnique({
    where: { id },
    include: {
      resources: { select: { id: true } },
      resourceType: true,
    },
  });

  if (!existing) {
    throw new Error('Category not found');
  }

  // System categories cannot be deleted
  if (existing.isSystem) {
    throw new Error('System categories cannot be deleted');
  }

  // Check for associated resources
  if (existing.resources.length > 0) {
    throw new Error(
      `Cannot delete category "${existing.name}" as it has ${existing.resources.length} associated resource(s). ` +
      'Please reassign or delete those resources first.'
    );
  }

  await prisma.resourceCategoryEntity.delete({
    where: { id },
  });
}

/**
 * Validates that a category belongs to a specific resource type
 * Requirements: 3.4 - Validate that assigned categories belong to the selected resource type
 */
export async function validateCategoryBelongsToType(
  categoryId: string,
  resourceTypeId: string
): Promise<{ valid: boolean; error?: string }> {
  const category = await prisma.resourceCategoryEntity.findUnique({
    where: { id: categoryId },
    include: { resourceType: true },
  });

  if (!category) {
    return { valid: false, error: 'Category not found' };
  }

  if (category.resourceTypeId !== resourceTypeId) {
    return {
      valid: false,
      error: `Category "${category.name}" does not belong to the selected resource type. ` +
        `It belongs to "${category.resourceType.name}".`,
    };
  }

  return { valid: true };
}

/**
 * Checks if a category has any associated resources
 */
export async function hasAssociatedResources(id: string): Promise<boolean> {
  const count = await prisma.resource.count({
    where: { resourceCategoryId: id },
  });
  return count > 0;
}

/**
 * Gets categories grouped by resource type
 * Requirements: 2.4 - Display categories grouped by their parent type
 */
export async function getCategoriesGroupedByType(): Promise<Record<string, ResourceCategoryWithType[]>> {
  const categories = await prisma.resourceCategoryEntity.findMany({
    include: {
      resourceType: true,
    },
    orderBy: [
      { resourceType: { name: 'asc' } },
      { isSystem: 'desc' },
      { name: 'asc' },
    ],
  });

  const grouped: Record<string, ResourceCategoryWithType[]> = {};

  for (const category of categories) {
    const typeName = category.resourceType.name;
    if (!grouped[typeName]) {
      grouped[typeName] = [];
    }
    grouped[typeName].push(mapPrismaToCategoryWithType(category));
  }

  return grouped;
}

/**
 * Maps Prisma ResourceCategoryEntity model to TypeScript interface
 */
function mapPrismaToCategory(category: {
  id: string;
  name: string;
  description: string | null;
  resourceTypeId: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ResourceCategoryEntity {
  return {
    id: category.id,
    name: category.name,
    description: category.description ?? undefined,
    resourceTypeId: category.resourceTypeId,
    isSystem: category.isSystem,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

/**
 * Maps Prisma ResourceCategoryEntity with type to TypeScript interface
 */
function mapPrismaToCategoryWithType(category: {
  id: string;
  name: string;
  description: string | null;
  resourceTypeId: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  resourceType: {
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    mandatoryProperties?: unknown;
    createdAt: Date;
    updatedAt: Date;
  };
}): ResourceCategoryWithType {
  return {
    ...mapPrismaToCategory(category),
    resourceType: {
      id: category.resourceType.id,
      name: category.resourceType.name,
      description: category.resourceType.description ?? undefined,
      isSystem: category.resourceType.isSystem,
      mandatoryProperties: (category.resourceType.mandatoryProperties as string[]) || [],
      createdAt: category.resourceType.createdAt,
      updatedAt: category.resourceType.updatedAt,
    },
  };
}
