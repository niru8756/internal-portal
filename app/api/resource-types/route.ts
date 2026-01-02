/**
 * Resource Types API
 * 
 * Endpoints:
 * - GET /api/resource-types - Fetch all resource types
 * - POST /api/resource-types - Create a new resource type
 * 
 * Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 7.1, 7.2, 11.1, 11.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { logResourceTypeCreated } from '@/lib/resourceStructureAudit';
import {
  getAllResourceTypes,
  createResourceType,
  seedSystemResourceTypes,
  getDefaultMandatoryProperties,
} from '@/lib/resourceTypeService';

/**
 * GET /api/resource-types
 * Fetches all resource types (both system and custom)
 * Requirements: 1.1, 1.3 - Display predefined and user-created types
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

    // Requirement 7.4: All authorized users can view types
    const result = await getAllResourceTypes();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error fetching resource types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resource types' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/resource-types
 * Creates a new custom resource type
 * Requirements: 1.2 - Store without schema changes
 * Requirements: 3.1, 3.2 - Accept and store mandatoryProperties
 * Requirements: 7.1 - Verify administrative permissions
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

    // Requirement 7.1: Verify administrative permissions
    if (!['CEO', 'CTO', 'ADMIN'].includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create resource types' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, mandatoryProperties } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    // Validate mandatoryProperties is an array if provided
    if (mandatoryProperties !== undefined && !Array.isArray(mandatoryProperties)) {
      return NextResponse.json(
        { error: 'mandatoryProperties must be an array of property keys' },
        { status: 400 }
      );
    }

    // Get default mandatory properties for this type name
    const defaultMandatory = getDefaultMandatoryProperties(name);
    
    // Merge provided mandatory properties with defaults (defaults are always included)
    const finalMandatoryProperties = mandatoryProperties 
      ? Array.from(new Set([...defaultMandatory, ...mandatoryProperties]))
      : defaultMandatory;

    // Validate that at least one mandatory property is selected
    if (finalMandatoryProperties.length === 0) {
      return NextResponse.json(
        { error: 'At least one mandatory property must be selected for the resource type' },
        { status: 400 }
      );
    }

    const resourceType = await createResourceType({ 
      name, 
      description,
      mandatoryProperties: finalMandatoryProperties,
    });

    // Requirement 7.5, 11.1: Log structural changes for audit
    await logResourceTypeCreated({
      resourceTypeId: resourceType.id,
      resourceTypeName: resourceType.name,
      description: resourceType.description,
      isSystem: resourceType.isSystem,
      performedById: currentUser.id,
      performedByName: currentUser.name,
    });

    return NextResponse.json({
      success: true,
      message: `Resource type "${resourceType.name}" created successfully`,
      resourceType,
    });
  } catch (error) {
    console.error('Error creating resource type:', error);
    
    if (error instanceof Error) {
      // Return validation errors with 400 status
      if (
        error.message.includes('already exists') ||
        error.message.includes('cannot be empty') ||
        error.message.includes('cannot exceed')
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create resource type' },
      { status: 500 }
    );
  }
}
