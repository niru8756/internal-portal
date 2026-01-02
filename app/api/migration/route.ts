/**
 * Data Migration API
 * 
 * Provides endpoints for running and monitoring data migrations:
 * - GET: Get migration status
 * - POST: Run migration
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { 
  migrateResourcesToNewStructure, 
  getMigrationStatus,
  validateAssignments 
} from '@/lib/dataMigration';

/**
 * GET /api/migration - Get migration status
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

    // Only admins can check migration status
    if (!['CEO', 'CTO', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions' 
      }, { status: 403 });
    }

    const status = await getMigrationStatus();
    const assignmentValidation = await validateAssignments();

    return NextResponse.json({
      status,
      assignmentValidation,
      migrationComplete: status.pendingResources === 0 && status.pendingItems === 0,
    });

  } catch (error) {
    console.error('Error getting migration status:', error);
    return NextResponse.json({ 
      error: 'Failed to get migration status' 
    }, { status: 500 });
  }
}

/**
 * POST /api/migration - Run data migration
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

    // Only admins can run migrations
    if (!['CEO', 'CTO', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to run migration' 
      }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { dryRun = false } = body;

    if (dryRun) {
      // Just return current status without making changes
      const status = await getMigrationStatus();
      return NextResponse.json({
        dryRun: true,
        status,
        message: 'Dry run complete. No changes made.',
      });
    }

    // Run the migration
    const result = await migrateResourcesToNewStructure();

    // Get updated status
    const finalStatus = await getMigrationStatus();

    return NextResponse.json({
      success: result.success,
      result,
      finalStatus,
      message: result.success 
        ? `Migration completed. Migrated ${result.migratedResources} resources and ${result.migratedItems} items.`
        : `Migration completed with errors. Check the errors array for details.`,
    });

  } catch (error) {
    console.error('Error running migration:', error);
    return NextResponse.json({ 
      error: 'Failed to run migration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
