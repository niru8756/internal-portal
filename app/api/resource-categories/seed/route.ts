/**
 * Resource Categories Seed API
 * 
 * Endpoint:
 * - POST /api/resource-categories/seed - Seed system categories
 * 
 * This endpoint initializes the predefined system categories for each resource type
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { seedSystemCategories } from '@/lib/resourceCategoryService';

/**
 * POST /api/resource-categories/seed
 * Seeds predefined system categories
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

    // Only administrators can seed categories
    if (!['CEO', 'CTO', 'ADMIN'].includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to seed resource categories' },
        { status: 403 }
      );
    }

    await seedSystemCategories();

    return NextResponse.json({
      success: true,
      message: 'System categories seeded successfully',
      categories: {
        Hardware: ['Laptop', 'Desktop', 'Phone', 'Tablet', 'Monitor', 'Peripheral'],
        Software: ['SaaS', 'Desktop Application', 'Development Tool', 'Operating System'],
        Cloud: ['Cloud Account', 'Cloud Storage', 'Cloud Compute', 'Cloud Database'],
      },
    });
  } catch (error) {
    console.error('Error seeding resource categories:', error);
    return NextResponse.json(
      { error: 'Failed to seed resource categories' },
      { status: 500 }
    );
  }
}
