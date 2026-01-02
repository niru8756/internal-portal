/**
 * Resource Types Seed API
 * 
 * Endpoint:
 * - POST /api/resource-types/seed - Seed system resource types
 * 
 * This endpoint initializes the predefined system resource types (Hardware, Software, Cloud)
 * with their default mandatory properties:
 * - Cloud: mandatoryProperties = ['maxUsers']
 * - Hardware: mandatoryProperties = ['serialNumber', 'warrantyExpiry']
 * - Software: mandatoryProperties = []
 * 
 * Requirements: 1.1, 2.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { seedSystemResourceTypes } from '@/lib/resourceTypeService';
import { DEFAULT_MANDATORY_PROPERTIES } from '@/types/resource-structure';

/**
 * POST /api/resource-types/seed
 * Seeds predefined system resource types with default mandatory properties
 * Only accessible by administrators
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

    // Only administrators can seed resource types
    if (!['CEO', 'CTO', 'ADMIN'].includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to seed resource types' },
        { status: 403 }
      );
    }

    await seedSystemResourceTypes();

    return NextResponse.json({
      success: true,
      message: 'System resource types seeded successfully with mandatory properties',
      types: [
        { name: 'Hardware', mandatoryProperties: DEFAULT_MANDATORY_PROPERTIES['Hardware'] || [] },
        { name: 'Software', mandatoryProperties: DEFAULT_MANDATORY_PROPERTIES['Software'] || [] },
        { name: 'Cloud', mandatoryProperties: DEFAULT_MANDATORY_PROPERTIES['Cloud'] || [] },
      ],
    });
  } catch (error) {
    console.error('Error seeding resource types:', error);
    return NextResponse.json(
      { error: 'Failed to seed resource types' },
      { status: 500 }
    );
  }
}
