/**
 * Property Catalog Service
 * 
 * Provides CRUD operations for the property catalog, including:
 * - Fetching predefined system properties
 * - Creating custom properties
 * - Type-specific property suggestions
 * 
 * Requirements: 8.2, 8.3, 12.1, 12.2
 */

import { prisma } from './prisma';
import { 
  PropertyCatalog, 
  PropertyCatalogResponse, 
  CreatePropertyCatalogRequest,
  PropertyDefinition,
  PropertyDataType
} from '../types/resource-structure';

/**
 * Predefined system properties that should be seeded into the database
 */
const PREDEFINED_PROPERTIES: Omit<CreatePropertyCatalogRequest, 'resourceTypeId'>[] = [
  // Hardware properties
  { key: 'serialNumber', label: 'Serial Number', dataType: 'STRING', description: 'Unique serial number for hardware' },
  { key: 'hostname', label: 'Hostname', dataType: 'STRING', description: 'Network hostname' },
  { key: 'ipAddress', label: 'IP Address', dataType: 'STRING', description: 'Network IP address' },
  { key: 'macAddress', label: 'MAC Address', dataType: 'STRING', description: 'Network MAC address' },
  { key: 'operatingSystem', label: 'Operating System', dataType: 'STRING', description: 'OS name' },
  { key: 'osVersion', label: 'OS Version', dataType: 'STRING', description: 'Operating system version' },
  { key: 'processor', label: 'Processor', dataType: 'STRING', description: 'CPU model' },
  { key: 'memory', label: 'Memory', dataType: 'STRING', description: 'RAM specification' },
  { key: 'storage', label: 'Storage', dataType: 'STRING', description: 'Storage capacity' },
  
  // Software properties
  { key: 'licenseKey', label: 'License Key', dataType: 'STRING', description: 'Software license key' },
  { key: 'softwareVersion', label: 'Software Version', dataType: 'STRING', description: 'Software version number' },
  { key: 'licenseType', label: 'License Type', dataType: 'STRING', description: 'Type of license (perpetual, subscription, etc.)' },
  { key: 'maxUsers', label: 'Max Users', dataType: 'STRING', description: 'Maximum number of users' },
  { key: 'activationCode', label: 'Activation Code', dataType: 'STRING', description: 'Software activation code' },
  { key: 'licenseExpiry', label: 'License Expiry', dataType: 'DATE', description: 'License expiration date' },
  
  // Cloud properties
  { key: 'accountId', label: 'Account ID', dataType: 'STRING', description: 'Cloud account identifier' },
  { key: 'region', label: 'Region', dataType: 'STRING', description: 'Cloud region' },
  { key: 'subscriptionTier', label: 'Subscription Tier', dataType: 'STRING', description: 'Subscription level' },
  
  // Common properties
  { key: 'purchaseDate', label: 'Purchase Date', dataType: 'DATE', description: 'Date of purchase' },
  { key: 'warrantyExpiry', label: 'Warranty Expiry', dataType: 'DATE', description: 'Warranty expiration date' },
  { key: 'value', label: 'Value', dataType: 'NUMBER', description: 'Monetary value' },
];

/**
 * Type-specific property suggestions mapping
 */
const TYPE_PROPERTY_SUGGESTIONS: Record<string, string[]> = {
  'Hardware': ['serialNumber', 'hostname', 'ipAddress', 'macAddress', 'operatingSystem', 'osVersion', 'processor', 'memory', 'storage', 'purchaseDate', 'warrantyExpiry', 'value'],
  'Software': ['licenseKey', 'softwareVersion', 'licenseType', 'maxUsers', 'activationCode', 'licenseExpiry', 'purchaseDate', 'value'],
  'Cloud': ['accountId', 'region', 'subscriptionTier', 'licenseExpiry', 'value'],
};

/**
 * Seeds predefined system properties into the database
 * This should be called during application initialization
 */
export async function seedPredefinedProperties(): Promise<void> {
  try {
    for (const property of PREDEFINED_PROPERTIES) {
      await prisma.propertyCatalog.upsert({
        where: { key: property.key },
        update: {
          label: property.label,
          dataType: property.dataType as PropertyDataType,
          description: property.description,
        },
        create: {
          key: property.key,
          label: property.label,
          dataType: property.dataType as PropertyDataType,
          description: property.description,
          defaultValue: property.defaultValue !== undefined ? JSON.parse(JSON.stringify(property.defaultValue)) : null,
          isSystem: true,
        },
      });
    }
    console.log('Predefined properties seeded successfully');
  } catch (error) {
    console.error('Error seeding predefined properties:', error);
    throw error;
  }
}

/**
 * Fetches all properties from the catalog
 */
export async function getAllProperties(): Promise<PropertyCatalog[]> {
  const properties = await prisma.propertyCatalog.findMany({
    orderBy: [
      { isSystem: 'desc' },
      { label: 'asc' },
    ],
  });

  return properties.map(mapPrismaToPropertyCatalog);
}

/**
 * Fetches the complete property catalog with categorization
 */
export async function getPropertyCatalog(): Promise<PropertyCatalogResponse> {
  const allProperties = await prisma.propertyCatalog.findMany({
    include: {
      resourceType: true,
    },
    orderBy: [
      { isSystem: 'desc' },
      { label: 'asc' },
    ],
  });

  const systemProperties: PropertyCatalog[] = [];
  const customProperties: PropertyCatalog[] = [];
  const typeSpecificSuggestions: Record<string, PropertyCatalog[]> = {};

  // Fetch all resource types for suggestions
  const resourceTypes = await prisma.resourceTypeEntity.findMany();

  // Initialize type-specific suggestions
  for (const type of resourceTypes) {
    typeSpecificSuggestions[type.name] = [];
  }

  // Categorize properties
  for (const property of allProperties) {
    const mappedProperty = mapPrismaToPropertyCatalog(property);

    if (property.isSystem) {
      systemProperties.push(mappedProperty);
    } else {
      customProperties.push(mappedProperty);
    }

    // Add to type-specific suggestions if applicable
    if (property.resourceTypeId && property.resourceType) {
      typeSpecificSuggestions[property.resourceType.name]?.push(mappedProperty);
    }
  }

  // Add default type suggestions based on predefined mapping
  for (const [typeName, propertyKeys] of Object.entries(TYPE_PROPERTY_SUGGESTIONS)) {
    if (!typeSpecificSuggestions[typeName]) {
      typeSpecificSuggestions[typeName] = [];
    }
    
    // Add system properties that match the type's suggested keys
    const suggestedProperties = systemProperties.filter(p => propertyKeys.includes(p.key));
    
    // Merge with existing type-specific properties, avoiding duplicates
    const existingKeys = new Set(typeSpecificSuggestions[typeName].map(p => p.key));
    for (const prop of suggestedProperties) {
      if (!existingKeys.has(prop.key)) {
        typeSpecificSuggestions[typeName].push(prop);
      }
    }
  }

  return {
    systemProperties,
    customProperties,
    typeSpecificSuggestions,
  };
}

/**
 * Fetches a single property by ID
 */
export async function getPropertyById(id: string): Promise<PropertyCatalog | null> {
  const property = await prisma.propertyCatalog.findUnique({
    where: { id },
  });

  return property ? mapPrismaToPropertyCatalog(property) : null;
}

/**
 * Fetches a single property by key
 */
export async function getPropertyByKey(key: string): Promise<PropertyCatalog | null> {
  const property = await prisma.propertyCatalog.findUnique({
    where: { key },
  });

  return property ? mapPrismaToPropertyCatalog(property) : null;
}

/**
 * Creates a new custom property in the catalog
 */
export async function createCustomProperty(
  request: CreatePropertyCatalogRequest
): Promise<PropertyCatalog> {
  // Validate that the key doesn't already exist
  const existing = await prisma.propertyCatalog.findUnique({
    where: { key: request.key },
  });

  if (existing) {
    throw new Error(`Property with key "${request.key}" already exists`);
  }

  // Validate key format (alphanumeric and camelCase)
  if (!/^[a-z][a-zA-Z0-9]*$/.test(request.key)) {
    throw new Error('Property key must be in camelCase format (start with lowercase letter, alphanumeric only)');
  }

  // Validate data type
  const validDataTypes: PropertyDataType[] = ['STRING', 'NUMBER', 'BOOLEAN', 'DATE'];
  if (!validDataTypes.includes(request.dataType)) {
    throw new Error(`Invalid data type. Must be one of: ${validDataTypes.join(', ')}`);
  }

  // Validate resourceTypeId if provided
  if (request.resourceTypeId) {
    const resourceType = await prisma.resourceTypeEntity.findUnique({
      where: { id: request.resourceTypeId },
    });
    if (!resourceType) {
      throw new Error('Invalid resource type ID');
    }
  }

  const property = await prisma.propertyCatalog.create({
    data: {
      key: request.key,
      label: request.label,
      dataType: request.dataType,
      description: request.description,
      defaultValue: request.defaultValue !== undefined ? JSON.parse(JSON.stringify(request.defaultValue)) : null,
      isSystem: false,
      resourceTypeId: request.resourceTypeId,
    },
  });

  return mapPrismaToPropertyCatalog(property);
}

/**
 * Updates an existing custom property
 * Note: System properties cannot be updated
 */
export async function updateCustomProperty(
  id: string,
  updates: Partial<Omit<CreatePropertyCatalogRequest, 'key'>>
): Promise<PropertyCatalog> {
  const existing = await prisma.propertyCatalog.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('Property not found');
  }

  if (existing.isSystem) {
    throw new Error('System properties cannot be modified');
  }

  // Validate data type if provided
  if (updates.dataType) {
    const validDataTypes: PropertyDataType[] = ['STRING', 'NUMBER', 'BOOLEAN', 'DATE'];
    if (!validDataTypes.includes(updates.dataType)) {
      throw new Error(`Invalid data type. Must be one of: ${validDataTypes.join(', ')}`);
    }
  }

  // Validate resourceTypeId if provided
  if (updates.resourceTypeId) {
    const resourceType = await prisma.resourceTypeEntity.findUnique({
      where: { id: updates.resourceTypeId },
    });
    if (!resourceType) {
      throw new Error('Invalid resource type ID');
    }
  }

  const property = await prisma.propertyCatalog.update({
    where: { id },
    data: {
      label: updates.label,
      dataType: updates.dataType,
      description: updates.description,
      defaultValue: updates.defaultValue !== undefined ? JSON.parse(JSON.stringify(updates.defaultValue)) : undefined,
      resourceTypeId: updates.resourceTypeId,
    },
  });

  return mapPrismaToPropertyCatalog(property);
}

/**
 * Deletes a custom property from the catalog
 * Note: System properties cannot be deleted
 */
export async function deleteCustomProperty(id: string): Promise<void> {
  const existing = await prisma.propertyCatalog.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('Property not found');
  }

  if (existing.isSystem) {
    throw new Error('System properties cannot be deleted');
  }

  // Check if property is in use by any resource's property schema
  // We need to fetch all resources and check their propertySchema JSON
  const allResources = await prisma.resource.findMany({
    select: { id: true, name: true, propertySchema: true },
  });

  const resourcesUsingProperty = allResources.filter(resource => {
    const schema = resource.propertySchema as unknown as PropertyDefinition[] | null;
    if (!schema || !Array.isArray(schema)) return false;
    return schema.some(prop => prop.key === existing.key);
  });

  if (resourcesUsingProperty.length > 0) {
    throw new Error(
      `Cannot delete property "${existing.key}" as it is used by ${resourcesUsingProperty.length} resource(s)`
    );
  }

  await prisma.propertyCatalog.delete({
    where: { id },
  });
}

/**
 * Gets properties suggested for a specific resource type
 */
export async function getPropertiesForType(typeId: string): Promise<PropertyCatalog[]> {
  // Get the resource type
  const resourceType = await prisma.resourceTypeEntity.findUnique({
    where: { id: typeId },
  });

  if (!resourceType) {
    throw new Error('Resource type not found');
  }

  // Get type-specific properties
  const typeSpecificProperties = await prisma.propertyCatalog.findMany({
    where: { resourceTypeId: typeId },
  });

  // Get suggested system properties based on type name
  const suggestedKeys = TYPE_PROPERTY_SUGGESTIONS[resourceType.name] || [];
  const suggestedSystemProperties = await prisma.propertyCatalog.findMany({
    where: {
      key: { in: suggestedKeys },
      isSystem: true,
    },
  });

  // Combine and deduplicate
  const allProperties = [...typeSpecificProperties, ...suggestedSystemProperties];
  const uniqueProperties = Array.from(
    new Map(allProperties.map(p => [p.key, p])).values()
  );

  return uniqueProperties.map(p => mapPrismaToPropertyCatalog(p));
}

/**
 * Converts PropertyCatalog entries to PropertyDefinition format
 * Used when creating resource property schemas
 */
export function catalogToDefinitions(properties: PropertyCatalog[]): PropertyDefinition[] {
  return properties.map(p => ({
    key: p.key,
    label: p.label,
    dataType: p.dataType,
    description: p.description,
    defaultValue: p.defaultValue as PropertyDefinition['defaultValue'],
  }));
}

/**
 * Validates that all property keys exist in the catalog
 */
export async function validatePropertyKeys(keys: string[]): Promise<{ valid: boolean; invalidKeys: string[] }> {
  const existingProperties = await prisma.propertyCatalog.findMany({
    where: { key: { in: keys } },
    select: { key: true },
  });

  const existingKeys = new Set(existingProperties.map(p => p.key));
  const invalidKeys = keys.filter(k => !existingKeys.has(k));

  return {
    valid: invalidKeys.length === 0,
    invalidKeys,
  };
}

/**
 * Maps Prisma PropertyCatalog model to TypeScript interface
 */
function mapPrismaToPropertyCatalog(property: {
  id: string;
  key: string;
  label: string;
  dataType: string;
  description: string | null;
  defaultValue: unknown;
  isSystem: boolean;
  resourceTypeId: string | null;
  createdAt: Date;
}): PropertyCatalog {
  return {
    id: property.id,
    key: property.key,
    label: property.label,
    dataType: property.dataType as PropertyDataType,
    description: property.description ?? undefined,
    defaultValue: property.defaultValue ?? undefined,
    isSystem: property.isSystem,
    resourceTypeId: property.resourceTypeId ?? undefined,
    createdAt: property.createdAt,
  };
}
