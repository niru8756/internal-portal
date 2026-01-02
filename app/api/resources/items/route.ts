import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  createResourceItem, 
  getResourceItems,
  validateMandatoryProperties
} from '@/lib/resourceItemService';
import { ItemStatus } from '@/types/resource-structure';
import {
  createBackwardCompatibleItemResponse,
  convertLegacyFieldsToProperties,
  isNewPropertiesFormat
} from '@/lib/backwardCompatibility';

// GET /api/resources/items - List resource items (hardware and software)
// Requirements: 8.8 - Display only properties selected for that resource type
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const resourceId = searchParams.get('resourceId');
    const status = searchParams.get('status') as ItemStatus | null;
    const search = searchParams.get('search');

    // If resourceId is provided, use the new service
    if (resourceId) {
      const result = await getResourceItems(resourceId, {
        page,
        limit,
        status: status || undefined,
        search: search || undefined,
      });

      return NextResponse.json({
        items: result.items,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(result.total / limit),
          totalItems: result.total,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(result.total / limit),
          hasPreviousPage: page > 1
        }
      });
    }

    // Fallback to original behavior for listing all items
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { hostname: { contains: search, mode: 'insensitive' } },
        { licenseKey: { contains: search, mode: 'insensitive' } },
        { softwareVersion: { contains: search, mode: 'insensitive' } },
        { resource: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [items, totalCount] = await Promise.all([
      prisma.resourceItem.findMany({
        where,
        skip,
        take: limit,
        include: {
          resource: {
            select: { 
              id: true, 
              name: true, 
              type: true, 
              category: true,
              propertySchema: true,
              schemaLocked: true,
            }
          },
          assignments: {
            where: { status: 'ACTIVE' },
            include: {
              employee: {
                select: { id: true, name: true, email: true, department: true }
              },
              assignedByUser: {
                select: { id: true, name: true, email: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.resourceItem.count({ where })
    ]);

    return NextResponse.json({
      items,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPreviousPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching resource items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resource items' },
      { status: 500 }
    );
  }
}

// POST /api/resources/items - Create new resource item with dynamic properties
// Requirements: 9.1, 9.2 - Create items as actual instances with property validation
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

    // Check permissions
    if (!['CEO', 'CTO', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { resourceId, properties, status } = body;

    // Validate required fields
    if (!resourceId) {
      return NextResponse.json(
        { error: 'Missing required field: resourceId' },
        { status: 400 }
      );
    }

    // Check if using new dynamic properties format or legacy format
    if (properties) {
      // New dynamic properties format
      // Check for duplicate serial number if provided in properties
      if (properties.serialNumber) {
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

      // Fetch resource with its type to get mandatory properties
      // Requirements: 4.2, 4.4 - Validate mandatory properties on item creation
      const resource = await prisma.resource.findUnique({
        where: { id: resourceId },
        include: {
          resourceTypeEntity: {
            select: { mandatoryProperties: true, name: true }
          }
        }
      });

      if (!resource) {
        return NextResponse.json(
          { error: 'Resource not found' },
          { status: 404 }
        );
      }

      // Validate mandatory properties if the resource has a type with mandatory properties
      if (resource.resourceTypeEntity) {
        const mandatoryProperties = (resource.resourceTypeEntity.mandatoryProperties as string[]) || [];
        
        if (mandatoryProperties.length > 0) {
          const validation = validateMandatoryProperties(properties, mandatoryProperties);
          
          if (!validation.isValid) {
            return NextResponse.json(
              { 
                error: `Missing required properties: ${validation.missingProperties.join(', ')}`,
                code: 'MISSING_MANDATORY_PROPERTIES',
                details: {
                  missingProperties: validation.missingProperties,
                  errors: validation.errors
                }
              },
              { status: 400 }
            );
          }
        }
      }

      try {
        const item = await createResourceItem(
          resourceId,
          { properties, status },
          user.id
        );
        return NextResponse.json(item, { status: 201 });
      } catch (error: any) {
        // Handle validation errors
        if (error.message.includes('Property validation failed') || 
            error.message.includes('Resource not found')) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          );
        }
        throw error;
      }
    }

    // Legacy format support - convert to properties format
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
      licenseExpiry,
      value,
      metadata,
      licenseKey,
      softwareVersion,
      licenseType,
      maxUsers,
      activationCode
    } = body;

    // Validate resource exists and get its type for mandatory property validation
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        resourceTypeEntity: {
          select: { mandatoryProperties: true, name: true }
        }
      }
    });

    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Check for duplicate serial number if provided
    if (serialNumber) {
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
    const legacyProperties: Record<string, unknown> = {};
    if (serialNumber) legacyProperties.serialNumber = serialNumber;
    if (hostname) legacyProperties.hostname = hostname;
    if (ipAddress) legacyProperties.ipAddress = ipAddress;
    if (macAddress) legacyProperties.macAddress = macAddress;
    if (operatingSystem) legacyProperties.operatingSystem = operatingSystem;
    if (osVersion) legacyProperties.osVersion = osVersion;
    if (processor) legacyProperties.processor = processor;
    if (memory) legacyProperties.memory = memory;
    if (storage) legacyProperties.storage = storage;
    if (purchaseDate) legacyProperties.purchaseDate = purchaseDate;
    if (warrantyExpiry) legacyProperties.warrantyExpiry = warrantyExpiry;
    if (licenseExpiry) legacyProperties.licenseExpiry = licenseExpiry;
    if (value) legacyProperties.value = parseFloat(value);
    if (licenseKey) legacyProperties.licenseKey = licenseKey;
    if (softwareVersion) legacyProperties.softwareVersion = softwareVersion;
    if (licenseType) legacyProperties.licenseType = licenseType;
    if (maxUsers) legacyProperties.maxUsers = maxUsers;
    if (activationCode) legacyProperties.activationCode = activationCode;

    // Validate mandatory properties for legacy format
    // Requirements: 4.2, 4.4 - Validate mandatory properties on item creation
    if (resource.resourceTypeEntity) {
      const mandatoryProps = (resource.resourceTypeEntity.mandatoryProperties as string[]) || [];
      
      if (mandatoryProps.length > 0) {
        const validation = validateMandatoryProperties(legacyProperties, mandatoryProps);
        
        if (!validation.isValid) {
          return NextResponse.json(
            { 
              error: `Missing required properties: ${validation.missingProperties.join(', ')}`,
              code: 'MISSING_MANDATORY_PROPERTIES',
              details: {
                missingProperties: validation.missingProperties,
                errors: validation.errors
              }
            },
            { status: 400 }
          );
        }
      }
    }

    // Check if resource has a property schema
    const propertySchema = (resource.propertySchema as any[]) || [];
    
    if (propertySchema.length > 0) {
      // Use new service with property validation
      try {
        const item = await createResourceItem(
          resourceId,
          { properties: legacyProperties, status: status || 'AVAILABLE' },
          user.id
        );
        return NextResponse.json(item, { status: 201 });
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

    // Fallback to legacy creation for resources without property schema
    const item = await prisma.$transaction(async (tx) => {
      const newItem = await tx.resourceItem.create({
        data: {
          resourceId,
          serialNumber,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
          warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
          value: value ? parseFloat(value) : null,
          metadata: metadata || null,
          status: 'AVAILABLE',
          properties: JSON.parse(JSON.stringify(legacyProperties)),
          ...(resource.type === 'PHYSICAL' && {
            hostname,
            ipAddress,
            macAddress,
            operatingSystem,
            osVersion,
            processor,
            memory,
            storage
          }),
          ...(resource.type === 'SOFTWARE' && {
            licenseKey,
            softwareVersion,
            licenseType,
            maxUsers,
            activationCode,
            licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null
          })
        },
        include: {
          resource: {
            select: { id: true, name: true, type: true, category: true }
          }
        }
      });

      await tx.auditLog.create({
        data: {
          entityType: 'RESOURCE',
          entityId: resourceId,
          changedById: user.id,
          fieldChanged: 'item_created',
          newValue: JSON.stringify({
            itemId: newItem.id,
            serialNumber,
            hostname
          }),
          resourceId
        }
      });

      await tx.activityTimeline.create({
        data: {
          entityType: 'RESOURCE',
          entityId: resourceId,
          activityType: 'CREATED',
          title: `New ${resource.name} item added`,
          description: `Resource item ${serialNumber || hostname || 'without serial'} added to inventory`,
          performedBy: user.id,
          resourceId,
          metadata: {
            itemId: newItem.id,
            serialNumber,
            hostname,
            customMetadata: metadata
          }
        }
      });

      return newItem;
    });

    return NextResponse.json(item, { status: 201 });

  } catch (error) {
    console.error('Error creating resource item:', error);
    return NextResponse.json(
      { error: 'Failed to create resource item' },
      { status: 500 }
    );
  }
}