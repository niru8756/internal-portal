'use client';

import { useState, useEffect } from 'react';
import { Loader2, Info, AlertCircle, Lock } from 'lucide-react';
import { PropertyDefinition, PropertyDataType } from '@/types/resource-structure';

interface ResourceItemFormProps {
  resourceId: string;
  resourceType: 'PHYSICAL' | 'SOFTWARE' | 'CLOUD';
  resourceName: string;
  onItemCreated?: () => void;
  onClose?: () => void;
  editMode?: boolean;
  itemId?: string;
  initialData?: Record<string, unknown>;
}

interface ResourceSchema {
  propertySchema: PropertyDefinition[];
  schemaLocked: boolean;
  mandatoryProperties?: string[];  // Array of mandatory property keys
}

/**
 * ResourceItemForm Component
 * 
 * Implements dynamic form generation based on property schema.
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.7
 * 
 * - 13.1: Display only properties selected for that resource
 * - 13.2: Derive input field types from property data types
 * - 13.3: Prefill input fields with default values
 * - 13.4: Validate input values according to data types
 * - 13.7: Prevent submission if required properties are missing or invalid
 */
export default function ResourceItemForm({ 
  resourceId, 
  resourceType,
  resourceName,
  onItemCreated, 
  onClose,
  editMode = false,
  itemId,
  initialData
}: ResourceItemFormProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Resource schema state
  const [resourceSchema, setResourceSchema] = useState<ResourceSchema | null>(null);
  
  // Form data - dynamic properties based on schema
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  
  // Legacy form data for resources without property schema
  const [legacyFormData, setLegacyFormData] = useState({
    serialNumber: '',
    hostname: '',
    purchaseDate: '',
    warrantyExpiry: '',
    value: '',
    licenseKey: '',
    softwareVersion: '',
    licenseType: '',
    maxUsers: '',
    licenseExpiry: '',
    activationCode: ''
  });

  // Fetch resource schema on mount
  useEffect(() => {
    fetchResourceSchema();
  }, [resourceId]);

  // Initialize form data when schema is loaded or in edit mode
  useEffect(() => {
    if (resourceSchema && resourceSchema.propertySchema.length > 0) {
      initializeFormData();
    }
  }, [resourceSchema, initialData]);

  const fetchResourceSchema = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/resources/catalog/${resourceId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch resource schema');
      }
      
      const data = await response.json();
      
      // Parse propertySchema - handle both array and string formats
      let parsedSchema: PropertyDefinition[] = [];
      if (data.propertySchema) {
        if (Array.isArray(data.propertySchema)) {
          parsedSchema = data.propertySchema;
        } else if (typeof data.propertySchema === 'string') {
          try {
            parsedSchema = JSON.parse(data.propertySchema);
          } catch {
            console.warn('Failed to parse propertySchema string:', data.propertySchema);
            parsedSchema = [];
          }
        }
      }
      
      console.log('Fetched resource schema:', {
        resourceId,
        propertySchema: parsedSchema,
        schemaLocked: data.schemaLocked,
        rawPropertySchema: data.propertySchema
      });
      
      // Fetch mandatory properties from resource type if available
      let mandatoryProps: string[] = [];
      if (data.resourceTypeId) {
        try {
          const typeResponse = await fetch(`/api/resource-types/${data.resourceTypeId}`);
          if (typeResponse.ok) {
            const typeData = await typeResponse.json();
            mandatoryProps = typeData.mandatoryProperties || [];
          }
        } catch (typeErr) {
          console.warn('Failed to fetch resource type mandatory properties:', typeErr);
        }
      }
      
      setResourceSchema({
        propertySchema: parsedSchema,
        schemaLocked: data.schemaLocked || false,
        mandatoryProperties: mandatoryProps
      });
    } catch (err) {
      console.error('Error fetching resource schema:', err);
      setError('Failed to load resource configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const initializeFormData = () => {
    if (!resourceSchema) return;
    
    const initialFormData: Record<string, unknown> = {};
    
    for (const prop of resourceSchema.propertySchema) {
      // Use initial data if in edit mode, otherwise use default value
      if (editMode && initialData && initialData[prop.key] !== undefined) {
        initialFormData[prop.key] = initialData[prop.key];
      } else if (prop.defaultValue !== undefined && prop.defaultValue !== null) {
        // Requirement 13.3: Prefill with default values
        initialFormData[prop.key] = prop.defaultValue;
      } else {
        // Set appropriate empty value based on type
        initialFormData[prop.key] = getEmptyValueForType(prop.dataType);
      }
    }
    
    setFormData(initialFormData);
  };

  const getEmptyValueForType = (dataType: PropertyDataType): unknown => {
    switch (dataType) {
      case 'STRING':
        return '';
      case 'NUMBER':
        return '';
      case 'BOOLEAN':
        return false;
      case 'DATE':
        return '';
      default:
        return '';
    }
  };

  // Requirement 13.4: Validate input values according to data types
  const validatePropertyValue = (key: string, value: unknown, dataType: PropertyDataType): string | null => {
    if (value === '' || value === null || value === undefined) {
      return null; // Empty values are allowed (unless required)
    }
    
    switch (dataType) {
      case 'NUMBER':
        if (typeof value === 'string' && value !== '') {
          const num = parseFloat(value);
          if (isNaN(num)) {
            return 'Must be a valid number';
          }
        }
        break;
      case 'DATE':
        if (typeof value === 'string' && value !== '') {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            return 'Must be a valid date';
          }
        }
        break;
      case 'BOOLEAN':
        if (typeof value !== 'boolean') {
          return 'Must be true or false';
        }
        break;
    }
    
    return null;
  };

  const handlePropertyChange = (key: string, value: unknown, _dataType: PropertyDataType) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[key]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    if (!resourceSchema) return true;
    
    const errors: Record<string, string> = {};
    const mandatoryProps = resourceSchema.mandatoryProperties || [];
    
    for (const prop of resourceSchema.propertySchema) {
      const value = formData[prop.key];
      const isMandatory = mandatoryProps.includes(prop.key);
      
      // Check required fields (both isRequired flag and mandatory properties)
      // Requirement 4.2: Prevent resource item creation if mandatory property is not filled
      if ((prop.isRequired || isMandatory) && (value === '' || value === null || value === undefined)) {
        errors[prop.key] = `${prop.label} is required${isMandatory ? ' (mandatory for this resource type)' : ''}`;
        continue;
      }
      
      // Validate data type
      const typeError = validatePropertyValue(prop.key, value, prop.dataType);
      if (typeError) {
        errors[prop.key] = typeError;
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Requirement 13.7: Prevent submission if validation fails
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    setError(null);

    try {
      // Prepare properties for submission
      const properties: Record<string, unknown> = {};
      
      if (resourceSchema && resourceSchema.propertySchema.length > 0) {
        // Use dynamic properties from schema
        for (const prop of resourceSchema.propertySchema) {
          let value = formData[prop.key];
          
          // Convert values to appropriate types
          if (value !== '' && value !== null && value !== undefined) {
            if (prop.dataType === 'NUMBER' && typeof value === 'string') {
              value = parseFloat(value);
            } else if (prop.dataType === 'DATE' && typeof value === 'string') {
              value = new Date(value).toISOString();
            }
            properties[prop.key] = value;
          }
        }
      } else {
        // Use legacy form data for resources without schema
        if (resourceType === 'SOFTWARE') {
          if (legacyFormData.licenseKey) properties.licenseKey = legacyFormData.licenseKey;
          if (legacyFormData.softwareVersion) properties.softwareVersion = legacyFormData.softwareVersion;
          if (legacyFormData.licenseType) properties.licenseType = legacyFormData.licenseType;
          if (legacyFormData.maxUsers) properties.maxUsers = legacyFormData.maxUsers;
          if (legacyFormData.activationCode) properties.activationCode = legacyFormData.activationCode;
          if (legacyFormData.licenseExpiry) properties.licenseExpiry = new Date(legacyFormData.licenseExpiry).toISOString();
          if (legacyFormData.purchaseDate) properties.purchaseDate = new Date(legacyFormData.purchaseDate).toISOString();
          if (legacyFormData.value) properties.value = parseFloat(legacyFormData.value);
          // Use licenseKey as serialNumber for software
          if (legacyFormData.licenseKey) properties.serialNumber = legacyFormData.licenseKey;
        } else {
          if (legacyFormData.serialNumber) properties.serialNumber = legacyFormData.serialNumber;
          if (legacyFormData.hostname) properties.hostname = legacyFormData.hostname;
          if (legacyFormData.purchaseDate) properties.purchaseDate = new Date(legacyFormData.purchaseDate).toISOString();
          if (legacyFormData.warrantyExpiry) properties.warrantyExpiry = new Date(legacyFormData.warrantyExpiry).toISOString();
          if (legacyFormData.value) properties.value = parseFloat(legacyFormData.value);
        }
      }

      const url = editMode && itemId 
        ? `/api/resources/items/${itemId}`
        : '/api/resources/items';
      
      const method = editMode ? 'PUT' : 'POST';
      
      const submitData = editMode 
        ? { properties }
        : { resourceId, properties };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        onItemCreated?.();
        onClose?.();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save item');
      }
    } catch (err) {
      console.error('Error saving item:', err);
      setError('An error occurred while saving the item');
    } finally {
      setSubmitting(false);
    }
  };

  // Requirement 13.2 & 13.5: Render appropriate input control based on data type
  const renderPropertyInput = (prop: PropertyDefinition) => {
    const value = formData[prop.key];
    const hasError = !!validationErrors[prop.key];
    
    const baseInputClass = `w-full px-3 py-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 ${
      hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
    }`;
    
    switch (prop.dataType) {
      case 'STRING':
        return (
          <input
            type="text"
            value={value as string || ''}
            onChange={(e) => handlePropertyChange(prop.key, e.target.value, prop.dataType)}
            className={baseInputClass}
            placeholder={prop.description || `Enter ${prop.label.toLowerCase()}`}
          />
        );
        
      case 'NUMBER':
        return (
          <input
            type="number"
            step="any"
            value={value as string || ''}
            onChange={(e) => handlePropertyChange(prop.key, e.target.value, prop.dataType)}
            className={baseInputClass}
            placeholder={prop.description || `Enter ${prop.label.toLowerCase()}`}
          />
        );
        
      case 'BOOLEAN':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={value as boolean || false}
              onChange={(e) => handlePropertyChange(prop.key, e.target.checked, prop.dataType)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-600">
              {prop.description || prop.label}
            </span>
          </div>
        );
        
      case 'DATE':
        return (
          <input
            type="date"
            value={value ? formatDateForInput(value as string) : ''}
            onChange={(e) => handlePropertyChange(prop.key, e.target.value, prop.dataType)}
            className={baseInputClass}
          />
        );
        
      default:
        return (
          <input
            type="text"
            value={value as string || ''}
            onChange={(e) => handlePropertyChange(prop.key, e.target.value, prop.dataType)}
            className={baseInputClass}
          />
        );
    }
  };

  const formatDateForInput = (dateValue: string | Date): string => {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  const getDataTypeLabel = (dataType: PropertyDataType): string => {
    switch (dataType) {
      case 'STRING': return 'text';
      case 'NUMBER': return 'number';
      case 'BOOLEAN': return 'yes/no';
      case 'DATE': return 'date';
      default: return String(dataType).toLowerCase();
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-6 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="ml-3 text-gray-600">Loading resource configuration...</span>
          </div>
        </div>
      </div>
    );
  }

  // Check if we should use dynamic schema or legacy form
  const useDynamicSchema = resourceSchema && resourceSchema.propertySchema.length > 0;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {editMode ? 'Edit' : 'Add'} {resourceType === 'SOFTWARE' ? 'Software License' : resourceType === 'CLOUD' ? 'Cloud Resource' : 'Hardware Item'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {editMode 
                ? `Update item details for ${resourceName}`
                : `Add a new ${resourceType === 'SOFTWARE' ? 'license/instance' : resourceType === 'CLOUD' ? 'cloud resource' : 'hardware item'} for ${resourceName}`
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {useDynamicSchema ? (
            /* Dynamic Property Schema Form */
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900">
                  Item Properties
                </h4>
                {resourceSchema?.schemaLocked && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <Info className="w-3 h-3 mr-1" />
                    Schema Locked
                  </span>
                )}
              </div>
              
              {/* Requirement 13.6: Display property labels clearly */}
              {/* Requirement 13.8: Maintain consistent field ordering */}
              {/* Requirement 4.2: Mark mandatory property fields as required */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resourceSchema?.propertySchema.map((prop) => {
                  const isMandatory = resourceSchema.mandatoryProperties?.includes(prop.key);
                  const isRequired = prop.isRequired || isMandatory;
                  
                  return (
                  <div key={prop.key} className={prop.dataType === 'BOOLEAN' ? 'md:col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <span className="flex items-center gap-1">
                        {prop.label}
                        {isRequired && <span className="text-red-500">*</span>}
                        {isMandatory && (
                          <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 ml-1">
                            <Lock className="w-3 h-3 mr-0.5" />
                            mandatory
                          </span>
                        )}
                      </span>
                      <span className="ml-2 text-xs text-gray-400">({getDataTypeLabel(prop.dataType)})</span>
                    </label>
                    
                    {renderPropertyInput(prop)}
                    
                    {/* Validation error */}
                    {validationErrors[prop.key] && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors[prop.key]}</p>
                    )}
                    
                    {/* Property description */}
                    {prop.description && prop.dataType !== 'BOOLEAN' && (
                      <p className="mt-1 text-xs text-gray-500">{prop.description}</p>
                    )}
                  </div>
                  );
                })}
              </div>
              
              {resourceSchema?.propertySchema.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Info className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No properties defined for this resource.</p>
                  <p className="text-sm mt-1">Configure properties when creating the resource.</p>
                </div>
              )}
            </div>
          ) : (
            /* Legacy Form - for resources without property schema */
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                {resourceType === 'SOFTWARE' ? 'License Information' : 'Essential Information'}
              </h4>
              
              {resourceType === 'SOFTWARE' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      License Key <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={legacyFormData.licenseKey}
                      onChange={(e) => setLegacyFormData({ ...legacyFormData, licenseKey: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., XXXXX-XXXXX-XXXXX-XXXXX"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Software Version</label>
                    <input
                      type="text"
                      value={legacyFormData.softwareVersion}
                      onChange={(e) => setLegacyFormData({ ...legacyFormData, softwareVersion: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., 2024.1, v16.2.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">License Type</label>
                    <input
                      type="text"
                      value={legacyFormData.licenseType}
                      onChange={(e) => setLegacyFormData({ ...legacyFormData, licenseType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., Per-seat, Concurrent, Site License"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
                    <input
                      type="text"
                      value={legacyFormData.maxUsers}
                      onChange={(e) => setLegacyFormData({ ...legacyFormData, maxUsers: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., 1, 5, Unlimited"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">License Expiry</label>
                    <input
                      type="date"
                      value={legacyFormData.licenseExpiry}
                      onChange={(e) => setLegacyFormData({ ...legacyFormData, licenseExpiry: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Activation Code</label>
                    <input
                      type="text"
                      value={legacyFormData.activationCode}
                      onChange={(e) => setLegacyFormData({ ...legacyFormData, activationCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Additional activation code if needed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                    <input
                      type="date"
                      value={legacyFormData.purchaseDate}
                      onChange={(e) => setLegacyFormData({ ...legacyFormData, purchaseDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">License Cost ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={legacyFormData.value}
                      onChange={(e) => setLegacyFormData({ ...legacyFormData, value: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., 299.99"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Serial Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={legacyFormData.serialNumber}
                      onChange={(e) => setLegacyFormData({ ...legacyFormData, serialNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., ABC123456789"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hostname</label>
                    <input
                      type="text"
                      value={legacyFormData.hostname}
                      onChange={(e) => setLegacyFormData({ ...legacyFormData, hostname: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., LAPTOP-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                    <input
                      type="date"
                      value={legacyFormData.purchaseDate}
                      onChange={(e) => setLegacyFormData({ ...legacyFormData, purchaseDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Expiry</label>
                    <input
                      type="date"
                      value={legacyFormData.warrantyExpiry}
                      onChange={(e) => setLegacyFormData({ ...legacyFormData, warrantyExpiry: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Value ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={legacyFormData.value}
                      onChange={(e) => setLegacyFormData({ ...legacyFormData, value: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., 1299.99"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {submitting 
                ? (editMode ? 'Saving...' : 'Creating...') 
                : (editMode ? 'Save Changes' : `Create ${resourceType === 'SOFTWARE' ? 'License' : resourceType === 'CLOUD' ? 'Cloud Resource' : 'Item'}`)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
