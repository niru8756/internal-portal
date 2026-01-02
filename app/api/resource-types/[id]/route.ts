/**
 * Resource Type by ID API
 * 
 * Endpoints:
 * - GET /api/resource-types/[id] - Fetch a single resource type
 * - PUT /api/resource-types/[id] - Update a resource type
 * - DELETE /api/resource-types/[id] - Delete a resource type
 * 
 * Requirements: 1.4, 1.5, 2.4, 3.2, 3.3, 7.3, 7.5, 11.1, 11.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { 
  logResourceTypeUpdated, 
  logResourceTypeDeleted,
  logDeletionAttemptFailed 
} from '@/lib/resourceStructureAudit';
import {
  getResourceTypeById,
  getResourceTypeWithCategories,
  updateResourceType,
  deleteResourceType,
} from '@/lib/resourceTypeService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/resource-types/[id]
 * Fetches a single resource type by ID with its categories
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
    const resourceType = await getResourceTypeWithCategories(id);

    if (!resourceType) {
      return NextResponse.json(
        { error: 'Resource type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      resourceType,
    });
  } catch (error) {
    console.error('Error fetching resource type:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resource type' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/resource-types/[id]
 * Updates a resource type
 * Requirements: 3.2, 3.3 - Update mandatoryProperties
 * Requirements: 1.4, 2.4 - Prevent removal of default mandatory properties
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
        { error: 'Insufficient permissions to update resource types' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, mandatoryProperties } = body;

    // Validate mandatoryProperties is an array if provided
    if (mandatoryProperties !== undefined && !Array.isArray(mandatoryProperties)) {
      return NextResponse.json(
        { error: 'mandatoryProperties must be an array of property keys' },
        { status: 400 }
      );
    }

    // Get existing type for audit logging
    const existingType = await getResourceTypeById(id);
    if (!existingType) {
      return NextResponse.json(
        { error: 'Resource type not found' },
        { status: 404 }
      );
    }

    const resourceType = await updateResourceType(id, { name, description, mandatoryProperties });

    // Requirement 7.5, 11.1: Log structural changes for audit
    await logResourceTypeUpdated(
      {
        resourceTypeId: resourceType.id,
        resourceTypeName: resourceType.name,
        description: resourceType.description,
        isSystem: resourceType.isSystem,
        performedById: currentUser.id,
        performedByName: currentUser.name,
      },
      {
        name: existingType.name,
        description: existingType.description,
      }
    );

    return NextResponse.json({
      success: true,
      message: `Resource type "${resourceType.name}" updated successfully`,
      resourceType,
    });
  } catch (error) {
    console.error('Error updating resource type:', error);
    
    if (error instanceof Error) {
      if (
        error.message.includes('not found') ||
        error.message.includes('already exists') ||
        error.message.includes('cannot be modified') ||
        error.message.includes('Cannot remove default mandatory')
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: error.message.includes('not found') ? 404 : 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to update resource type' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/resource-types/[id]
 * Deletes a resource type
 * Requirements: 1.4 - Prevent deletion if resources are assigned
 * Requirements: 1.5 - Maintain referential integrity
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
        { error: 'Insufficient permissions to delete resource types' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Get existing type for audit logging
    const existingType = await getResourceTypeById(id);
    if (!existingType) {
      return NextResponse.json(
        { error: 'Resource type not found' },
        { status: 404 }
      );
    }

    await deleteResourceType(id);

    // Requirement 7.5, 11.1: Log structural changes for audit
    await logResourceTypeDeleted({
      resourceTypeId: id,
      resourceTypeName: existingType.name,
      description: existingType.description,
      isSystem: existingType.isSystem,
      performedById: currentUser.id,
      performedByName: currentUser.name,
    });

    return NextResponse.json({
      success: true,
      message: `Resource type "${existingType.name}" deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting resource type:', error);
    
    if (error instanceof Error) {
      // Requirement 1.4: Return specific error for referential integrity violations
      if (
        error.message.includes('cannot be deleted') ||
        error.message.includes('associated resource') ||
        error.message.includes('associated category')
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
      { error: 'Failed to delete resource type' },
      { status: 500 }
    );
  }
}
