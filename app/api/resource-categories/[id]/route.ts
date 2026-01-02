/**
 * Resource Category by ID API
 * 
 * Endpoints:
 * - GET /api/resource-categories/[id] - Fetch a single category
 * - PUT /api/resource-categories/[id] - Update a category
 * - DELETE /api/resource-categories/[id] - Delete a category
 * 
 * Requirements: 2.5, 7.3, 7.5, 11.1, 11.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { 
  logResourceCategoryUpdated, 
  logResourceCategoryDeleted,
  logDeletionAttemptFailed 
} from '@/lib/resourceStructureAudit';
import {
  getCategoryById,
  updateCategory,
  deleteCategory,
} from '@/lib/resourceCategoryService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/resource-categories/[id]
 * Fetches a single category by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const category = await getCategoryById(id);

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error('Error fetching resource category:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resource category' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/resource-categories/[id]
 * Updates a category
 * Requirements: 7.3 - Verify administrative permissions
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await getUserFromToken(token);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Requirement 7.3: Verify administrative permissions
    if (!['CEO', 'CTO', 'ADMIN'].includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update resource categories' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description } = body;

    // Get existing category for audit logging
    const existingCategory = await getCategoryById(id);
    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    const category = await updateCategory(id, { name, description });

    // Requirement 7.5, 11.1: Log structural changes for audit
    await logResourceCategoryUpdated(
      {
        categoryId: category.id,
        categoryName: category.name,
        description: category.description,
        resourceTypeId: category.resourceTypeId,
        resourceTypeName: category.resourceType.name,
        isSystem: category.isSystem,
        performedById: currentUser.id,
        performedByName: currentUser.name,
      },
      {
        name: existingCategory.name,
        description: existingCategory.description,
      }
    );

    return NextResponse.json({
      success: true,
      message: `Category "${category.name}" updated successfully`,
      category,
    });
  } catch (error) {
    console.error('Error updating resource category:', error);
    
    if (error instanceof Error) {
      if (
        error.message.includes('not found') ||
        error.message.includes('already exists') ||
        error.message.includes('cannot be modified')
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: error.message.includes('not found') ? 404 : 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to update resource category' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/resource-categories/[id]
 * Deletes a category
 * Requirements: 2.5 - Prevent deletion if resources are assigned
 * Requirements: 7.3 - Verify administrative permissions
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await getUserFromToken(token);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Requirement 7.3: Verify administrative permissions
    if (!['CEO', 'CTO', 'ADMIN'].includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete resource categories' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Get existing category for audit logging
    const existingCategory = await getCategoryById(id);
    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    await deleteCategory(id);

    // Requirement 7.5, 11.1: Log structural changes for audit
    await logResourceCategoryDeleted({
      categoryId: id,
      categoryName: existingCategory.name,
      description: existingCategory.description,
      resourceTypeId: existingCategory.resourceTypeId,
      resourceTypeName: existingCategory.resourceType.name,
      isSystem: existingCategory.isSystem,
      performedById: currentUser.id,
      performedByName: currentUser.name,
    });

    return NextResponse.json({
      success: true,
      message: `Category "${existingCategory.name}" deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting resource category:', error);
    
    if (error instanceof Error) {
      // Requirement 2.5: Return specific error for referential integrity violations
      if (
        error.message.includes('cannot be deleted') ||
        error.message.includes('associated resource')
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to delete resource category' },
      { status: 500 }
    );
  }
}
