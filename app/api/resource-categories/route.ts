/**
 * Resource Categories API
 * 
 * Endpoints:
 * - GET /api/resource-categories - Fetch all categories (optionally filtered by type)
 * - POST /api/resource-categories - Create a new category
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 7.2, 11.1, 11.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { logResourceCategoryCreated } from '@/lib/resourceStructureAudit';
import {
  getAllCategories,
  getCategoriesByType,
  getCategoriesGroupedByType,
  createCategory,
  seedSystemCategories,
} from '@/lib/resourceCategoryService';

/**
 * GET /api/resource-categories
 * Fetches all categories or categories for a specific type
 * Requirements: 2.2, 2.4 - Display predefined and user-created categories grouped by type
 */
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
    const resourceTypeId = searchParams.get('resourceTypeId');
    const grouped = searchParams.get('grouped') === 'true';

    // If grouped is requested, return categories grouped by type
    if (grouped) {
      const groupedCategories = await getCategoriesGroupedByType();
      return NextResponse.json({
        success: true,
        categoriesByType: groupedCategories,
      });
    }

    // If resourceTypeId is provided, filter by type
    if (resourceTypeId) {
      try {
        const categories = await getCategoriesByType(resourceTypeId);
        return NextResponse.json({
          success: true,
          categories,
          total: categories.length,
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          return NextResponse.json(
            { error: 'Resource type not found' },
            { status: 404 }
          );
        }
        throw error;
      }
    }

    // Otherwise, return all categories
    const result = await getAllCategories();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error fetching resource categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resource categories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/resource-categories
 * Creates a new custom category
 * Requirements: 2.1 - Associate with exactly one resource type
 * Requirements: 2.3 - Store without schema changes
 * Requirements: 2.6 - Allow multiple categories per resource type
 * Requirements: 7.2 - Verify administrative permissions
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await getUserFromToken(token);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Requirement 7.2: Verify administrative permissions
    if (!['CEO', 'CTO', 'ADMIN'].includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create resource categories' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, resourceTypeId } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    if (!resourceTypeId) {
      return NextResponse.json(
        { error: 'Missing required field: resourceTypeId' },
        { status: 400 }
      );
    }

    const category = await createCategory({ name, description, resourceTypeId });

    // Requirement 7.5, 11.1: Log structural changes for audit
    await logResourceCategoryCreated({
      categoryId: category.id,
      categoryName: category.name,
      description: category.description,
      resourceTypeId: category.resourceTypeId,
      resourceTypeName: category.resourceType.name,
      isSystem: category.isSystem,
      performedById: currentUser.id,
      performedByName: currentUser.name,
    });

    return NextResponse.json({
      success: true,
      message: `Category "${category.name}" created successfully`,
      category,
    });
  } catch (error) {
    console.error('Error creating resource category:', error);
    
    if (error instanceof Error) {
      // Return validation errors with appropriate status
      if (
        error.message.includes('already exists') ||
        error.message.includes('cannot be empty') ||
        error.message.includes('cannot exceed')
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create resource category' },
      { status: 500 }
    );
  }
}
