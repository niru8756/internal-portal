'use client';

import { useState, useEffect } from 'react';
import ElegantSelect from './ElegantSelect';
import PropertySelector from './PropertySelector';
import { getCompanyName } from '@/lib/config/company';
import { getCloudProviders } from '@/lib/config/resources';
import { 
  PropertyDefinition, 
  ResourceTypeEntity, 
  ResourceCategoryEntity 
} from '@/types/resource-structure';

interface ResourceFormProps {
  resource?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function ResourceForm({ resource, onSubmit, onCancel }: ResourceFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    category: '',
    description: '',
    owner: getCompanyName(),
    status: 'ACTIVE',
    quantity: 1,
    // New flexible type/category system
    resourceTypeId: '',
    resourceCategoryId: '',
  });

  // Resource types and categories from API
  const [resourceTypes, setResourceTypes] = useState<ResourceTypeEntity[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<ResourceCategoryEntity[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Property selection state
  const [selectedProperties, setSelectedProperties] = useState<PropertyDefinition[]>([]);
  const [showPropertySelector, setShowPropertySelector] = useState(false);
  const [propertyError, setPropertyError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [ceoInfo, setCeoInfo] = useState<any>(null);

  // Get selected resource type name for PropertySelector
  const selectedTypeName = resourceTypes.find(t => t.id === formData.resourceTypeId)?.name;

  // Fetch resource types from API
  // Requirement 6.1: Provide dropdown menus for type and category selection
  useEffect(() => {
    const fetchResourceTypes = async () => {
      setLoadingTypes(true);
      try {
        const response = await fetch('/api/resource-types');
        if (response.ok) {
          const data = await response.json();
          setResourceTypes(data.types || []);
        }
      } catch (error) {
        console.error('Error fetching resource types:', error);
      } finally {
        setLoadingTypes(false);
      }
    };
    fetchResourceTypes();
  }, []);

  // Fetch categories when type changes
  // Requirement 6.2: Filter categories to show only those belonging to the selected type
  useEffect(() => {
    const fetchCategories = async () => {
      if (!formData.resourceTypeId) {
        setFilteredCategories([]);
        return;
      }
      
      setLoadingCategories(true);
      try {
        const response = await fetch(`/api/resource-categories?resourceTypeId=${formData.resourceTypeId}`);
        if (response.ok) {
          const data = await response.json();
          setFilteredCategories(data.categories || []);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, [formData.resourceTypeId]);

  // Handle resource type change
  const handleTypeChange = (typeId: string) => {
    const selectedType = resourceTypes.find(t => t.id === typeId);
    const legacyType = mapTypeNameToLegacy(selectedType?.name || '');
    
    setFormData(prev => ({
      ...prev,
      resourceTypeId: typeId,
      resourceCategoryId: '', // Clear category when type changes
      type: legacyType,
    }));
    
    // Show property selector when type is selected
    if (typeId) {
      setShowPropertySelector(true);
    }
    
    // Clear selected properties when type changes
    setSelectedProperties([]);
    setPropertyError(null);
  };

  // Handle category change
  const handleCategoryChange = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      resourceCategoryId: categoryId,
    }));
  };

  // Map type name to legacy enum
  const mapTypeNameToLegacy = (typeName: string): string => {
    const mapping: Record<string, string> = {
      'Hardware': 'PHYSICAL',
      'Software': 'SOFTWARE',
      'Cloud': 'CLOUD',
    };
    return mapping[typeName] || 'PHYSICAL';
  };

  useEffect(() => {
    fetchCeoInfo();
    if (resource) {
      setFormData({
        ...formData,
        ...resource,
        resourceTypeId: resource.resourceTypeId || '',
        resourceCategoryId: resource.resourceCategoryId || '',
      });
      
      // Load existing property schema if editing
      if (resource.propertySchema && Array.isArray(resource.propertySchema)) {
        setSelectedProperties(resource.propertySchema);
        setShowPropertySelector(true);
      }
    }
  }, [resource]);

  const fetchCeoInfo = async () => {
    try {
      const response = await fetch('/api/employees/accessible');
      if (response.ok) {
        const data = await response.json();
        const ceo = data.find((emp: any) => emp.role === 'CEO');
        setCeoInfo(ceo);
      }
    } catch (error) {
      console.error('Error fetching CEO info:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPropertyError(null);

    try {
      // Validate resource type is selected
      // Requirement 6.1: Require type selection
      if (!formData.resourceTypeId) {
        setPropertyError('Please select a resource type');
        setLoading(false);
        return;
      }

      // Validate category belongs to selected type if category is selected
      // Requirement 6.4: Display validation messages for invalid type-category combinations
      if (formData.resourceCategoryId) {
        const selectedCategory = filteredCategories.find(c => c.id === formData.resourceCategoryId);
        if (!selectedCategory) {
          setPropertyError('Selected category is not valid for the chosen resource type');
          setLoading(false);
          return;
        }
      }

      // Validate property selection
      // Requirement 12.7: Validate that at least one property is selected
      if (formData.resourceTypeId && selectedProperties.length === 0) {
        setPropertyError('Please select at least one property for this resource');
        setLoading(false);
        return;
      }

      const submitData = {
        ...formData,
        // Include selected properties for new resource structure
        selectedProperties: selectedProperties,
        quantity: formData.type === 'CLOUD' ? parseInt(formData.quantity.toString()) || 1 : null,
      };

      onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const isFieldDisabled = !formData.resourceTypeId;

  // Build type options for dropdown
  const typeOptions = [
    { value: '', label: 'Select resource type', disabled: true },
    ...resourceTypes.map(type => ({
      value: type.id,
      label: type.name,
      description: type.description || undefined,
      icon: getTypeIcon(type.name),
    })),
  ];

  // Build category options for dropdown
  const categoryOptions = [
    { value: '', label: filteredCategories.length > 0 ? 'Select category (optional)' : 'No categories available' },
    ...filteredCategories.map(cat => ({
      value: cat.id,
      label: cat.name,
      description: cat.description || undefined,
    })),
  ];

  // Get icon for resource type
  function getTypeIcon(typeName: string) {
    switch (typeName) {
      case 'Hardware':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'Software':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'Cloud':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        );
      default:
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
    }
  }

  // Render additional fields based on resource type
  const renderTypeSpecificFields = () => {
    if (!selectedTypeName) return null;

    switch (selectedTypeName) {
      case 'Cloud':
        return (
          <>
            <h3 className="col-span-2 text-lg font-medium text-gray-900 border-b pb-2 mt-4">Cloud Service Details</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cloud Provider</label>
              <ElegantSelect
                options={[
                  { value: '', label: 'Select provider' },
                  ...getCloudProviders().map(provider => ({
                    value: provider.value,
                    label: provider.label,
                    description: provider.description,
                  }))
                ]}
                value={formData.category}
                onChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                placeholder="Select provider"
                searchable={true}
                showClearButton={true}
                className="w-full"
                size="md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity <span className="text-red-500">*</span></label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 5, 10, 999999 for unlimited"
                min="1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Number of instances/licenses available</p>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white mb-10">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              {resource ? 'Edit Resource' : 'Add New Resource'}
            </h3>
            <button
              type="button"
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <h3 className="col-span-2 text-lg font-medium text-gray-900 border-b pb-2">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resource Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., MacBook Pro 16-inch, Figma License, AWS EC2 Instance"
                />
              </div>

              {/* Resource Type Selection - Requirement 6.1 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resource Type <span className="text-red-500">*</span>
                </label>
                {loadingTypes ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                    Loading types...
                  </div>
                ) : (
                  <ElegantSelect
                    options={typeOptions}
                    value={formData.resourceTypeId}
                    onChange={handleTypeChange}
                    placeholder="Select resource type"
                    className="w-full"
                    size="md"
                  />
                )}
              </div>

              {/* Resource Category Selection - Requirement 6.2 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                {loadingCategories ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                    Loading categories...
                  </div>
                ) : (
                  <ElegantSelect
                    options={categoryOptions}
                    value={formData.resourceCategoryId}
                    onChange={handleCategoryChange}
                    placeholder={formData.resourceTypeId ? "Select category (optional)" : "Select a type first"}
                    disabled={!formData.resourceTypeId}
                    className="w-full"
                    size="md"
                    showClearButton={true}
                  />
                )}
                {!formData.resourceTypeId && (
                  <p className="text-xs text-gray-500 mt-1">Select a resource type to see available categories</p>
                )}
              </div>

              {/* Company Ownership Info */}
              <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Resource Ownership</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">Owner (Company)</label>
                    <div className="flex items-center space-x-2">
                      <div className="h-6 w-6 bg-blue-600 rounded flex items-center justify-center">
                        <span className="text-xs font-bold text-white">
                          {getCompanyName().charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-blue-900">{getCompanyName()}</span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">All resources are owned by the company</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">Default Custodian</label>
                    <div className="flex items-center space-x-2">
                      <div className="h-6 w-6 bg-gradient-to-r from-purple-500 to-purple-600 rounded flex items-center justify-center">
                        <span className="text-xs font-bold text-white">
                          {ceoInfo?.name?.charAt(0)?.toUpperCase() || 'C'}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-blue-900">
                        {ceoInfo?.name || 'CEO'} (CEO)
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">CEO manages all resources by default</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <ElegantSelect
                  options={[
                    { 
                      value: 'ACTIVE', 
                      label: 'Active',
                      description: 'Resource is available and working'
                    },
                    { 
                      value: 'RETURNED', 
                      label: 'Returned',
                      description: 'Resource has been returned'
                    },
                    { 
                      value: 'LOST', 
                      label: 'Lost',
                      description: 'Resource is lost or missing'
                    },
                    { 
                      value: 'DAMAGED', 
                      label: 'Damaged',
                      description: 'Resource is damaged'
                    }
                  ]}
                  value={formData.status}
                  onChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  disabled={isFieldDisabled}
                  className="w-full"
                  size="md"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={isFieldDisabled}
                  rows={3}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isFieldDisabled ? 'bg-gray-100 text-gray-500' : ''}`}
                  placeholder="Detailed description of the resource..."
                />
              </div>

              {/* Type-specific fields */}
              {renderTypeSpecificFields()}

              {/* Property Selection Section - Requirements 12.1, 12.2, 12.3 */}
              {showPropertySelector && formData.resourceTypeId && (
                <>
                  <h3 className="col-span-2 text-lg font-medium text-gray-900 border-b pb-2 mt-4">
                    Property Schema
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      (Select properties to track for items of this resource)
                    </span>
                  </h3>
                  
                  <div className="col-span-2">
                    <PropertySelector
                      selectedProperties={selectedProperties}
                      onPropertiesChange={setSelectedProperties}
                      resourceTypeId={formData.resourceTypeId}
                      resourceTypeName={selectedTypeName}
                      disabled={resource?.schemaLocked}
                      error={propertyError || undefined}
                    />
                    
                    {resource?.schemaLocked && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <strong>Schema Locked:</strong> The property schema cannot be modified because this resource already has items.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Prompt to select type if not selected */}
              {!formData.resourceTypeId && (
                <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-blue-800 font-medium">Select a resource type to configure property schema</p>
                </div>
              )}
            </div>
            
            {/* Validation Error Display - Requirement 6.4 */}
            {propertyError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 flex items-center">
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {propertyError}
                </p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={loading || !formData.resourceTypeId}
              >
                {loading ? 'Saving...' : (resource ? 'Update Resource' : 'Create Resource')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
