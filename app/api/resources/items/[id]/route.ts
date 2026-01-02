import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { 
  getResourceItemById, 
  updateResourceItem, 
  deleteResourceItem,
  updateItemStatus,
  canDeleteItem
} from '@/lib/resourceItemService';
import { ItemStatus } from '@/types/resource-structure';

// GET /api/resources/items/[id] - Get specific resource item
// Requirements: 8.8 - Display only properties selected for that resource type
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use the new service to get item with enhanced data
    const item = await getResourceItemById(id);

    if (!item) {
      return NextResponse.json({ error: 'Resource item not found' }, { status: 404 });
    }

    return NextResponse.json(item);

  } catch (error) {
    console.error('Error fetching resource item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resource item' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT /api/resources/items/[id] - Update resource item with property validation
// Requirements: 15.1 - Allow editing while maintaining locked schema
// Requirements: 15.2 - Enforce same property keys as first item
// Requirements: 15.6 - Validate data types and constraints
// Requirements: 15.7 - Log all edits in audit trail
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!['CEO', 'CTO', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { properties, status } = body;

    // Check if using new dynamic properties format
    if (properties !== undefined) {
      // Check for duplicate serial number if changing
      if (properties.serialNumber) {
        const currentItem = await prisma.resourceItem.findUnique({
          where: { id },
          select: { serialNumber: true }
        });

        if (currentItem && properties.serialNumber !== currentItem.serialNumber) {
          const existingItem = await prisma.resourceItem.findUnique({
            where: { serialNumber: properties.serialNumber }
          });

          if (existingItem) {
            return NextResponse.json(
              { error: 'Serial number already exists' },
              { status: 400 }
            );
          }
        }
      }

      try {
        const updatedItem = await updateResourceItem(
          id,
          { properties, status },
          user.id
        );
        return NextResponse.json(updatedItem);
      } catch (error: any) {
        if (error.message.includes('Property validation failed') ||
            error.message.includes('Resource item not found')) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          );
        }
        throw error;
      }
    }

    // Handle status-only update
    if (status && !properties) {
      try {
        const updatedItem = await updateItemStatus(id, status as ItemStatus, user.id);
        return NextResponse.json(updatedItem);
      } catch (error: any) {
        if (error.message.includes('Resource item not found')) {
          return NextResponse.json(
            { error: error.message },
            { status: 404 }
          );
        }
        throw error;
      }
    }

    // Legacy format support
    const {
      serialNumber,
      hostname,
      ipAddress,
      macAddress,
      operatingSystem,
      osVersion,
      processor,
      memory,
      storage,
      purchaseDate,
      warrantyExpiry,
      value
    } = body;

    // Get current item for audit trail
    const currentItem = await prisma.resourceItem.findUnique({
      where: { id },
      include: { resource: true }
    });

    if (!currentItem) {
      return NextResponse.json({ error: 'Resource item not found' }, { status: 404 });
    }

    // Check for duplicate serial number if changing
    if (serialNumber && serialNumber !== currentItem.serialNumber) {
      const existingItem = await prisma.resourceItem.findUnique({
        where: { serialNumber }
      });

      if (existingItem) {
        return NextResponse.json(
          { error: 'Serial number already exists' },
          { status: 400 }
        );
      }
    }

    // Build properties object from legacy fields
    const legacyProperties: Record<string, unknown> = {
      ...(currentItem.properties as Record<string, unknown> || {})
    };
    if (serialNumber !== undefined) legacyProperties.serialNumber = serialNumber;
    if (hostname !== undefined) legacyProperties.hostname = hostname;
    if (ipAddress !== undefined) legacyProperties.ipAddress = ipAddress;
    if (macAddress !== undefined) legacyProperties.macAddress = macAddress;
    if (operatingSystem !== undefined) legacyProperties.operatingSystem = operatingSystem;
    if (osVersion !== undefined) legacyProperties.osVersion = osVersion;
    if (processor !== undefined) legacyProperties.processor = processor;
    if (memory !== undefined) legacyProperties.memory = memory;
    if (storage !== undefined) legacyProperties.storage = storage;
    if (purchaseDate !== undefined) legacyProperties.purchaseDate = purchaseDate;
    if (warrantyExpiry !== undefined) legacyProperties.warrantyExpiry = warrantyExpiry;
    if (value !== undefined) legacyProperties.value = value ? parseFloat(value) : null;

    // Check if resource has a property schema
    const propertySchema = (currentItem.resource.propertySchema as any[]) || [];
    
    if (propertySchema.length > 0) {
      // Use new service with property validation
      try {
        const updatedItem = await updateResourceItem(
          id,
          { properties: legacyProperties, status: status || undefined },
          user.id
        );
        return NextResponse.json(updatedItem);
      } catch (error: any) {
        if (error.message.includes('Property validation failed')) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          );
        }
        throw error;
      }
    }

    // Fallback to legacy update for resources without property schema
    const updatedItem = await prisma.$transaction(async (tx) => {
      const item = await tx.resourceItem.update({
        where: { id },
        data: {
          ...(serialNumber !== undefined && { serialNumber }),
          ...(hostname !== undefined && { hostname }),
          ...(ipAddress !== undefined && { ipAddress }),
          ...(macAddress !== undefined && { macAddress }),
          ...(operatingSystem !== undefined && { operatingSystem }),
          ...(osVersion !== undefined && { osVersion }),
          ...(processor !== undefined && { processor }),
          ...(memory !== undefined && { memory }),
          ...(storage !== undefined && { storage }),
          ...(purchaseDate !== undefined && { purchaseDate: purchaseDate ? new Date(purchaseDate) : null }),
          ...(warrantyExpiry !== undefined && { warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null }),
          ...(value !== undefined && { value: value ? parseFloat(value) : null }),
          ...(status && { status }),
          properties: legacyProperties,
        },
        include: {
          resource: {
            select: { id: true, name: true, type: true, category: true }
          }
        }
      });

      // Log changes in audit trail
      const changes = [];
      if (serialNumber !== undefined && serialNumber !== currentItem.serialNumber) {
        changes.push({ field: 'serialNumber', oldValue: currentItem.serialNumber, newValue: serialNumber });
      }
      if (hostname !== undefined && hostname !== currentItem.hostname) {
        changes.push({ field: 'hostname', oldValue: currentItem.hostname, newValue: hostname });
      }
      if (status && status !== currentItem.status) {
        changes.push({ field: 'status', oldValue: currentItem.status, newValue: status });
      }

      for (const change of changes) {
        await tx.auditLog.create({
          data: {
            entityType: 'RESOURCE',
            entityId: currentItem.resourceId,
            changedById: user.id,
            fieldChanged: `item_${change.field}`,
            oldValue: change.oldValue,
            newValue: change.newValue,
            resourceId: currentItem.resourceId
          }
        });
      }

      if (changes.length > 0) {
        await tx.activityTimeline.create({
          data: {
            entityType: 'RESOURCE',
            entityId: currentItem.resourceId,
            activityType: 'UPDATED',
            title: `${currentItem.resource.name} item updated`,
            description: `Resource item ${currentItem.serialNumber || currentItem.hostname || id} updated`,
            performedBy: user.id,
            resourceId: currentItem.resourceId,
            metadata: {
              itemId: id,
              changes: changes
            }
          }
        });
      }

      return item;
    });

    return NextResponse.json(updatedItem);

  } catch (error) {
    console.error('Error updating resource item:', error);
    return NextResponse.json(
      { error: 'Failed to update resource item' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE /api/resources/items/[id] - Delete resource item with assignment checks
// Requirements: 15.3 - Allow deletion when not currently assigned
// Requirements: 15.4 - Prevent deletion if item has active assignments
// Requirements: 15.5 - Provide clear error messages when deletion is prevented
// Requirements: 15.7 - Log deletions in audit trail
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!['CEO', 'CTO'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if item can be deleted
    const canDelete = await canDeleteItem(id);
    
    if (!canDelete.canDelete) {
      return NextResponse.json(
        { error: canDelete.reason || 'Cannot delete item' },
        { status: 400 }
      );
    }

    try {
      await deleteResourceItem(id, user.id);
      return NextResponse.json({ message: 'Resource item deleted successfully' });
    } catch (error: any) {
      if (error.message.includes('Resource item not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes('Cannot delete item')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      throw error;
    }

  } catch (error) {
    console.error('Error deleting resource item:', error);
    return NextResponse.json(
      { error: 'Failed to delete resource item' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}