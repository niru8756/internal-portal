/**
 * Property Catalog Individual Property API Endpoints
 * 
 * GET /api/property-catalog/[id] - Fetch a single property
 * PUT /api/property-catalog/[id] - Update a custom property
 * DELETE /api/property-catalog/[id] - Delete a custom property
 * 
 * Requirements: 8.2, 8.3, 12.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import {
  getPropertyById,
  updateCustomProperty,
  deleteCustomProperty,
} from '@/lib/propertyCatalogService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/property-catalog/[id]
 * 
 * Fetches a single property by ID.
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
    const property = await getPropertyById(id);

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(property);

  } catch (error) {
    console.error('Error fetching property:', error);
    return NextResponse.json(
      { error: 'Failed to fetch property' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/property-catalog/[id]
 * 
 * Updates a custom property. System properties cannot be modified.
 * 
 * Request Body:
 * - label: Optional new label
 * - dataType: Optional new data type
 * - description: Optional new description
 * - defaultValue: Optional new default value
 * - resourceTypeId: Optional new resource type association
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to update properties (CEO, CTO, or Admin)
    if (!['CEO', 'CTO', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update properties' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { label, dataType, description, defaultValue, resourceTypeId } = body;

    // Validate data type if provided
    if (dataType) {
      const validDataTypes = ['STRING', 'NUMBER', 'BOOLEAN', 'DATE'];
      if (!validDataTypes.includes(dataType)) {
        return NextResponse.json(
          { error: `Invalid data type. Must be one of: ${validDataTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    try {
      const property = await updateCustomProperty(id, {
        label,
        dataType,
        description,
        defaultValue,
        resourceTypeId,
      });
      return NextResponse.json(property);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Property not found') {
          return NextResponse.json(
            { error: 'Property not found' },
            { status: 404 }
          );
        }
        if (error.message === 'System properties cannot be modified') {
          return NextResponse.json(
            { error: error.message },
            { status: 403 }
          );
        }
        if (error.message.includes('Invalid')) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          );
        }
      }
      throw error;
    }

  } catch (error) {
    console.error('Error updating property:', error);
    return NextResponse.json(
      { error: 'Failed to update property' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/property-catalog/[id]
 * 
 * Deletes a custom property. System properties cannot be deleted.
 * Properties in use by resources cannot be deleted.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to delete properties (CEO, CTO, or Admin)
    if (!['CEO', 'CTO', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete properties' },
        { status: 403 }
      );
    }

    const { id } = await params;

    try {
      await deleteCustomProperty(id);
      return NextResponse.json({ success: true, message: 'Property deleted successfully' });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Property not found') {
          return NextResponse.json(
            { error: 'Property not found' },
            { status: 404 }
          );
        }
        if (error.message === 'System properties cannot be deleted') {
          return NextResponse.json(
            { error: error.message },
            { status: 403 }
          );
        }
        if (error.message.includes('Cannot delete property')) {
          return NextResponse.json(
            { error: error.message },
            { status: 409 }
          );
        }
      }
      throw error;
    }

  } catch (error) {
    console.error('Error deleting property:', error);
    return NextResponse.json(
      { error: 'Failed to delete property' },
      { status: 500 }
    );
  }
}
