'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from './Notification';
import ElegantSelect from './ElegantSelect';
import PropertySelector from './PropertySelector';
import { getCompanyName } from '@/lib/config/company';
import { 
  PropertyDefinition, 
  ResourceTypeEntity, 
  ResourceCategoryEntity 
} from '@/types/resource-structure';
import { ChevronRight, ChevronLeft, Check, Info, AlertCircle, Loader2 } from 'lucide-react';

interface ResourceCreationWizardProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

type WizardStep = 'type' | 'category' | 'properties' | 'details' | 'review';

interface StepConfig {
  id: WizardStep;
  title: string;
  description: string;
}

const WIZARD_STEPS: StepConfig[] = [
  { id: 'type', title: 'Resource Type', description: 'Select the type of resource' },
  { id: 'category', title: 'Category', description: 'Choose a category (optional)' },
  { id: 'properties', title: 'Properties', description: 'Configure property schema' },
  { id: 'details', title: 'Details', description: 'Enter resource information' },
  { id: 'review', title: 'Review', description: 'Review and create' },
];

/**
 * ResourceCreationWizard Component
 * 
 * A guided step-by-step wizard for creating resources with type/category selection
 * and property schema configuration.
 * 
 * Requirements: 14.1, 14.2, 14.5, 14.8
 */
export default function ResourceCreationWizard({ onSubmit, onCancel }: ResourceCreationWizardProps) {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('type');
  const [loading, setLoading] = useState(false);
  
  // Resource types and categories from API
  const [resourceTypes, setResourceTypes] = useState<ResourceTypeEntity[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<ResourceCategoryEntity[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  // Property selection state
  const [selectedProperties, setSelectedProperties] = useState<PropertyDefinition[]>([]);
  const [propertyError, setPropertyError] = useState<string | null>(null);
  
  // Employees for custodian selection
  const [employees, setEmployees] = useState<Array<{ id: string; name: string; email: string; department: string }>>([]);
  const [ceoInfo, setCeoInfo] = useState<any>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'ACTIVE',
    quantity: 1,
    resourceTypeId: '',
    resourceCategoryId: '',
    custodianId: '',
  });

  // Get selected resource type
  const selectedType = resourceTypes.find(t => t.id === formData.resourceTypeId);
  const selectedCategory = filteredCategories.find(c => c.id === formData.resourceCategoryId);

  // Fetch resource types from API
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

  // Fetch employees and CEO info
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/employees/accessible');
        if (response.ok) {
          const data = await response.json();
          setEmployees(data);
          const ceo = data.find((emp: any) => emp.role === 'CEO');
          setCeoInfo(ceo);
          // Set default custodian to CEO
          if (ceo && !formData.custodianId) {
            setFormData(prev => ({ ...prev, custodianId: ceo.id }));
          }
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };
    fetchEmployees();
  }, []);

  // Map type name to legacy enum
  const mapTypeNameToLegacy = (typeName: string): string => {
    const mapping: Record<string, string> = {
      'Hardware': 'PHYSICAL',
      'Software': 'SOFTWARE',
      'Cloud': 'CLOUD',
    };
    return mapping[typeName] || 'PHYSICAL';
  };

  // Handle type selection
  const handleTypeSelect = (typeId: string) => {
    setFormData(prev => ({
      ...prev,
      resourceTypeId: typeId,
      resourceCategoryId: '', // Clear category when type changes
    }));
    setSelectedProperties([]); // Clear properties when type changes
    setPropertyError(null);
  };

  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      resourceCategoryId: categoryId,
    }));
  };

  // Get current step index
  const getCurrentStepIndex = () => WIZARD_STEPS.findIndex(s => s.id === currentStep);

  // Check if step is complete
  const isStepComplete = (step: WizardStep): boolean => {
    switch (step) {
      case 'type':
        return !!formData.resourceTypeId;
      case 'category':
        return true; // Category is optional
      case 'properties':
        return selectedProperties.length > 0;
      case 'details':
        return !!formData.name && !!formData.custodianId;
      case 'review':
        return false;
      default:
        return false;
    }
  };

  // Check if can proceed to next step
  const canProceed = (): boolean => {
    return isStepComplete(currentStep);
  };

  // Navigate to next step
  const goToNextStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < WIZARD_STEPS.length - 1) {
      setCurrentStep(WIZARD_STEPS[currentIndex + 1].id);
    }
  };

  // Navigate to previous step
  const goToPreviousStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setCurrentStep(WIZARD_STEPS[currentIndex - 1].id);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    setLoading(true);
    setPropertyError(null);

    try {
      // Validate property selection
      if (selectedProperties.length === 0) {
        setPropertyError('Please select at least one property for this resource');
        setCurrentStep('properties');
        setLoading(false);
        return;
      }

      const submitData = {
        ...formData,
        type: mapTypeNameToLegacy(selectedType?.name || ''),
        selectedProperties: selectedProperties,
        quantity: selectedType?.name === 'Cloud' ? formData.quantity : null,
        owner: getCompanyName(),
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting form:', error);
      showNotification('error', 'Error', 'Failed to create resource');
    } finally {
      setLoading(false);
    }
  };

  // Get type icon
  const getTypeIcon = (typeName: string) => {
    switch (typeName) {
      case 'Hardware':
        return (
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'Software':
        return (
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'Cloud':
        return (
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        );
      default:
        return (
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
    }
  };

  // Get type description
  const getTypeDescription = (typeName: string): string => {
    switch (typeName) {
      case 'Hardware':
        return 'Physical devices like laptops, phones, monitors, and peripherals';
      case 'Software':
        return 'Software licenses, applications, and development tools';
      case 'Cloud':
        return 'Cloud services, SaaS subscriptions, and cloud accounts';
      default:
        return 'Custom resource type';
    }
  };

  // Render step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {WIZARD_STEPS.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = getCurrentStepIndex() > index;
        
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                  transition-all duration-200
                  ${isActive ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : ''}
                  ${isCompleted ? 'bg-green-500 text-white' : ''}
                  ${!isActive && !isCompleted ? 'bg-gray-200 text-gray-500' : ''}
                `}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
              </div>
              <span className={`mt-2 text-xs font-medium ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}>
                {step.title}
              </span>
            </div>
            {index < WIZARD_STEPS.length - 1 && (
              <div className={`w-16 h-1 mx-2 rounded ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  // Render type selection step
  const renderTypeStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">What type of resource are you adding?</h3>
        <p className="text-sm text-gray-500 mt-1">
          Select the category that best describes your resource
        </p>
      </div>

      {loadingTypes ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="ml-3 text-gray-600">Loading resource types...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {resourceTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => handleTypeSelect(type.id)}
              className={`
                p-6 rounded-xl border-2 text-left transition-all duration-200
                hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer
                ${formData.resourceTypeId === type.id
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className={`mb-4 ${formData.resourceTypeId === type.id ? 'text-indigo-600' : 'text-gray-400'}`}>
                {getTypeIcon(type.name)}
              </div>
              <h4 className={`font-semibold ${formData.resourceTypeId === type.id ? 'text-indigo-900' : 'text-gray-900'}`}>
                {type.name}
              </h4>
              <p className="text-sm text-gray-500 mt-1">
                {type.description || getTypeDescription(type.name)}
              </p>
              {type.isSystem && (
                <span className="inline-block mt-3 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                  System Type
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Guidance message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Choosing the right type</p>
            <p className="mt-1">
              The resource type determines the default properties and assignment model. 
              Hardware items are assigned individually, while Cloud resources can be shared.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Render category selection step
  const renderCategoryStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Select a category</h3>
        <p className="text-sm text-gray-500 mt-1">
          Categories help organize resources within the {selectedType?.name} type
        </p>
      </div>

      {loadingCategories ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="ml-3 text-gray-600">Loading categories...</span>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">No categories available</p>
          <p className="text-sm text-gray-500 mt-1">
            You can skip this step or create categories in the Resource Type Manager
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* No category option */}

          {filteredCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => handleCategorySelect(category.id)}
              className={`
                p-4 rounded-xl border-2 text-left transition-all duration-200
                hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500
                ${formData.resourceCategoryId === category.id
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <h4 className={`font-semibold ${formData.resourceCategoryId === category.id ? 'text-indigo-900' : 'text-gray-900'}`}>
                {category.name}
              </h4>
              {category.description && (
                <p className="text-sm text-gray-500 mt-1">{category.description}</p>
              )}
              {category.isSystem && (
                <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                  System
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Render properties step
  const renderPropertiesStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Configure Property Schema</h3>
        <p className="text-sm text-gray-500 mt-1">
          Select the properties you want to track for items of this resource
        </p>
      </div>

      <PropertySelector
        selectedProperties={selectedProperties}
        onPropertiesChange={setSelectedProperties}
        resourceTypeId={formData.resourceTypeId}
        resourceTypeName={selectedType?.name}
        error={propertyError || undefined}
      />

      {/* Warning about schema locking */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Important: Schema Locking</p>
            <p className="mt-1">
              Once you create the first item for this resource, the property schema will be locked.
              All subsequent items will use the same properties.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Render details step
  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Resource Details</h3>
        <p className="text-sm text-gray-500 mt-1">
          Enter the basic information for your resource
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Resource Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., MacBook Pro 16-inch, Figma License, AWS EC2"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Brief description of the resource..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custodian <span className="text-red-500">*</span>
          </label>
          <ElegantSelect
            value={formData.custodianId}
            onChange={(value) => setFormData(prev => ({ ...prev, custodianId: value }))}
            options={employees.map(emp => ({
              value: emp.id,
              label: emp.name,
              description: `${emp.email} • ${emp.department}`,
            }))}
            placeholder="Select custodian"
            searchable
          />
          <p className="text-xs text-gray-500 mt-1">
            The person responsible for managing this resource
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <ElegantSelect
            value={formData.status}
            onChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            options={[
              { value: 'ACTIVE', label: 'Active', description: 'Available for assignment' },
              { value: 'RETURNED', label: 'Returned', description: 'Returned to inventory' },
              { value: 'LOST', label: 'Lost', description: 'Missing or lost' },
              { value: 'DAMAGED', label: 'Damaged', description: 'Needs repair' },
            ]}
            placeholder="Select status"
          />
        </div>

        {selectedType?.name === 'Cloud' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Number of licenses/instances"
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use 999999 for unlimited
            </p>
          </div>
        )}
      </div>

      {/* Company ownership info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Resource Ownership</h4>
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-sm font-bold text-white">
              {getCompanyName().charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <span className="text-sm font-medium text-blue-900">{getCompanyName()}</span>
            <p className="text-xs text-blue-600">All resources are owned by the company</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Render review step
  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Review Your Resource</h3>
        <p className="text-sm text-gray-500 mt-1">
          Please review the details before creating the resource
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Resource Type & Category */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="text-indigo-600">
              {getTypeIcon(selectedType?.name || '')}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{selectedType?.name}</h4>
              {selectedCategory && (
                <p className="text-sm text-gray-500">{selectedCategory.name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Resource Details */}
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</label>
            <p className="text-gray-900 font-medium">{formData.name || 'Not specified'}</p>
          </div>

          {formData.description && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</label>
              <p className="text-gray-900">{formData.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
              <p className="text-gray-900">{formData.status}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Custodian</label>
              <p className="text-gray-900">
                {employees.find(e => e.id === formData.custodianId)?.name || 'Not specified'}
              </p>
            </div>
          </div>

          {selectedType?.name === 'Cloud' && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quantity</label>
              <p className="text-gray-900">{formData.quantity}</p>
            </div>
          )}
        </div>

        {/* Property Schema */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Property Schema</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedProperties.map(prop => (
              <span
                key={prop.key}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
              >
                {prop.label}
                <span className="ml-1 text-xs text-indigo-500">({prop.dataType.toLowerCase()})</span>
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {selectedProperties.length} properties selected
          </p>
        </div>
      </div>

      {/* Final confirmation */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <Check className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-green-800">
            <p className="font-medium">Ready to create</p>
            <p className="mt-1">
              Click "Create Resource" to add this resource to your catalog. 
              You can then add individual items with the properties you've selected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'type':
        return renderTypeStep();
      case 'category':
        return renderCategoryStep();
      case 'properties':
        return renderPropertiesStep();
      case 'details':
        return renderDetailsStep();
      case 'review':
        return renderReviewStep();
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create New Resource</h2>
            <p className="text-sm text-gray-500">
              {WIZARD_STEPS.find(s => s.id === currentStep)?.description}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          {renderStepIndicator()}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <button
            type="button"
            onClick={getCurrentStepIndex() === 0 ? onCancel : goToPreviousStep}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {getCurrentStepIndex() === 0 ? 'Cancel' : 'Back'}
          </button>

          {currentStep === 'review' ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Create Resource
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={goToNextStep}
              disabled={!canProceed()}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
