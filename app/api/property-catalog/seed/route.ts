/**
 * Property Catalog Seed API Endpoint
 * 
 * POST /api/property-catalog/seed - Seeds predefined system properties
 * 
 * Requirements: 8.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { seedPredefinedProperties } from '@/lib/propertyCatalogService';

/**
 * POST /api/property-catalog/seed
 * 
 * Seeds predefined system properties into the database.
 * Only users with administrative permissions can seed properties.
 * This is idempotent - running it multiple times will update existing properties.
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

    // Check if user has permission to seed properties (CEO, CTO, or Admin)
    if (!['CEO', 'CTO', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to seed properties' },
        { status: 403 }
      );
    }

    await seedPredefinedProperties();

    return NextResponse.json({
      success: true,
      message: 'Predefined properties seeded successfully',
    });

  } catch (error) {
    console.error('Error seeding properties:', error);
    return NextResponse.json(
      { error: 'Failed to seed properties' },
      { status: 500 }
    );
  }
}
