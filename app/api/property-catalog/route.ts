/**
 * Property Catalog API Endpoints
 * 
 * GET /api/property-catalog - Fetch available properties with categorization
 * POST /api/property-catalog - Create a custom property
 * 
 * Requirements: 12.1, 12.5, 13.5, 11.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { logTimelineActivity } from '@/lib/timeline';
import {
  getPropertyCatalog,
  createCustomProperty,
  seedPredefinedProperties,
  getPropertiesForType,
} from '@/lib/propertyCatalogService';
import { CreatePropertyCatalogRequest } from '@/types/resource-structure';

/**
 * GET /api/property-catalog
 * 
 * Fetches the property catalog with categorization:
 * - systemProperties: Predefined system properties
 * - customProperties: User-created custom properties
 * - typeSpecificSuggestions: Properties suggested for each resource type
 * 
 * Query Parameters:
 * - typeId: Optional resource type ID to filter suggestions
 * - seed: If 'true', seeds predefined properties first (admin only)
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
    const typeId = searchParams.get('typeId');
    const seed = searchParams.get('seed');

    // Seed predefined properties if requested (admin only)
    if (seed === 'true') {
      if (!['CEO', 'CTO', 'ADMIN'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions to seed properties' },
          { status: 403 }
        );
      }
      await seedPredefinedProperties();
    }

    // If typeId is provided, return type-specific properties
    if (typeId) {
      try {
        const properties = await getPropertiesForType(typeId);
        return NextResponse.json({
          properties,
          typeId,
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Resource type not found') {
          return NextResponse.json(
            { error: 'Resource type not found' },
            { status: 404 }
          );
        }
        throw error;
      }
    }

    // Return full property catalog
    const catalog = await getPropertyCatalog();
    
    return NextResponse.json(catalog);

  } catch (error) {
    console.error('Error fetching property catalog:', error);
    return NextResponse.json(
      { error: 'Failed to fetch property catalog' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/property-catalog
 * 
 * Creates a new custom property in the catalog.
 * Only users with administrative permissions can create properties.
 * 
 * Request Body:
 * - key: Unique property key (camelCase format)
 * - label: Human-readable label
 * - dataType: STRING | NUMBER | BOOLEAN | DATE
 * - description: Optional description
 * - defaultValue: Optional default value
 * - resourceTypeId: Optional resource type association
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to create properties (CEO, CTO, or Admin)
    if (!['CEO', 'CTO', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create properties' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { key, label, dataType, description, defaultValue, resourceTypeId } = body;

    // Validate required fields
    if (!key || !label || !dataType) {
      return NextResponse.json(
        { error: 'Missing required fields: key, label, dataType' },
        { status: 400 }
      );
    }

    // Validate data type
    const validDataTypes = ['STRING', 'NUMBER', 'BOOLEAN', 'DATE'];
    if (!validDataTypes.includes(dataType)) {
      return NextResponse.json(
        { error: `Invalid data type. Must be one of: ${validDataTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const createRequest: CreatePropertyCatalogRequest = {
      key,
      label,
      dataType,
      description,
      defaultValue,
      resourceTypeId,
    };

    try {
      const property = await createCustomProperty(createRequest);
      
      // Requirement 11.2: Log property creation for audit
      await logAudit({
        entityType: 'RESOURCE',
        entityId: property.id,
        changedById: user.id,
        fieldChanged: 'property_catalog_created',
        oldValue: null,
        newValue: JSON.stringify({
          key: property.key,
          label: property.label,
          dataType: property.dataType,
          description: property.description,
          resourceTypeId: property.resourceTypeId,
        }),
      });

      await logTimelineActivity({
        entityType: 'RESOURCE',
        entityId: property.id,
        activityType: 'CREATED',
        title: `Custom property created: ${property.label}`,
        description: `Custom property "${property.label}" (${property.key}) was added to the property catalog by ${user.name}`,
        performedBy: user.id,
        metadata: {
          entitySubType: 'PROPERTY_CATALOG',
          propertyKey: property.key,
          propertyLabel: property.label,
          dataType: property.dataType,
          description: property.description,
          resourceTypeId: property.resourceTypeId,
          createdBy: user.name,
          createdById: user.id,
        },
      });
      
      return NextResponse.json(property, { status: 201 });
    } catch (error) {
      if (error instanceof Error) {
        // Handle specific validation errors
        if (error.message.includes('already exists')) {
          return NextResponse.json(
            { error: error.message },
            { status: 409 }
          );
        }
        if (error.message.includes('camelCase') || error.message.includes('Invalid')) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          );
        }
      }
      throw error;
    }

  } catch (error) {
    console.error('Error creating property:', error);
    return NextResponse.json(
      { error: 'Failed to create property' },
      { status: 500 }
    );
  }
}
