'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from './Notification';
import ElegantSelect from './ElegantSelect';
import { 
  ResourceTypeEntity, 
  ResourceCategoryEntity,
  ResourceCategoryWithType,
  PropertyCatalog,
  DEFAULT_MANDATORY_PROPERTIES
} from '@/types/resource-structure';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  ChevronDown, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  X,
  FolderTree,
  Tag,
  Shield,
  Lock,
  Info,
  Settings,
  Layers,
  Sparkles
} from 'lucide-react';
import { PropertyDataType } from '@/types/resource-structure';

interface ResourceTypeManagerProps {
  onClose?: () => void;
}

interface TypeWithCategories extends ResourceTypeEntity {
  categories: ResourceCategoryEntity[];
  _count?: {
    resources: number;
    categories: number;
  };
}

/**
 * ResourceTypeManager Component
 * 
 * A CRUD interface for managing resource types and categories.
 * Implements permission-based access control.
 */
export default function ResourceTypeManager({ onClose }: ResourceTypeManagerProps) {
  const { user } = useAuth();
  const { showNotification, NotificationComponent } = useNotification();

  // State
  const [loading, setLoading] = useState(true);
  const [resourceTypes, setResourceTypes] = useState<TypeWithCategories[]>([]);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  
  // Form states
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingType, setEditingType] = useState<ResourceTypeEntity | null>(null);
  const [editingCategory, setEditingCategory] = useState<ResourceCategoryWithType | null>(null);
  
  // Form data
  const [typeFormData, setTypeFormData] = useState({ name: '', description: '' });
  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '', resourceTypeId: '' });
  
  // Mandatory properties state
  const [availableProperties, setAvailableProperties] = useState<PropertyCatalog[]>([]);
  const [selectedMandatoryProperties, setSelectedMandatoryProperties] = useState<string[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  
  // Operation states
  const [savingType, setSavingType] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Inline property creation state
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [propertyFormData, setPropertyFormData] = useState({
    key: '',
    label: '',
    dataType: 'STRING' as PropertyDataType,
    description: ''
  });
  const [savingProperty, setSavingProperty] = useState(false);

  // Permission check
  const canManage = user && ['CEO', 'CTO', 'ADMIN'].includes(user.role);

  // Fetch resource types with categories
  const fetchResourceTypes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/resource-types');
      if (response.ok) {
        const data = await response.json();
        const types = data.types || [];
        
        const typesWithCategories = await Promise.all(
          types.map(async (type: ResourceTypeEntity) => {
            try {
              const catResponse = await fetch(`/api/resource-categories?resourceTypeId=${type.id}`);
              if (catResponse.ok) {
                const catData = await catResponse.json();
                return { ...type, categories: catData.categories || [] };
              }
            } catch (error) {
              console.error(`Error fetching categories for type ${type.id}:`, error);
            }
            return { ...type, categories: [] };
          })
        );
        
        setResourceTypes(typesWithCategories);
      }
    } catch (error) {
      console.error('Error fetching resource types:', error);
      showNotification('error', 'Error', 'Failed to load resource types');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchResourceTypes();
  }, [fetchResourceTypes]);

  // Fetch available properties from catalog
  const fetchAvailableProperties = useCallback(async () => {
    setLoadingProperties(true);
    try {
      const response = await fetch('/api/property-catalog');
      if (response.ok) {
        const data = await response.json();
        const allProperties = [
          ...(data.systemProperties || []),
          ...(data.customProperties || [])
        ];
        setAvailableProperties(allProperties);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoadingProperties(false);
    }
  }, []);

  useEffect(() => {
    if (showTypeForm || editingType) {
      fetchAvailableProperties();
    }
  }, [showTypeForm, editingType, fetchAvailableProperties]);

  const getDefaultMandatoryProperties = (typeName: string): string[] => {
    return DEFAULT_MANDATORY_PROPERTIES[typeName] || [];
  };

  const isDefaultMandatoryProperty = (propertyKey: string): boolean => {
    const typeName = editingType?.name || typeFormData.name;
    const defaults = getDefaultMandatoryProperties(typeName);
    return defaults.includes(propertyKey);
  };

  const handleMandatoryPropertyToggle = (propertyKey: string) => {
    if (isDefaultMandatoryProperty(propertyKey)) {
      showNotification('warning', 'Cannot Remove', `"${propertyKey}" is a default mandatory property for this resource type.`);
      return;
    }
    
    setSelectedMandatoryProperties(prev => {
      if (prev.includes(propertyKey)) {
        return prev.filter(k => k !== propertyKey);
      } else {
        return [...prev, propertyKey];
      }
    });
  };

  useEffect(() => {
    if (editingType) {
      setSelectedMandatoryProperties(editingType.mandatoryProperties || []);
    } else if (showTypeForm) {
      const defaults = getDefaultMandatoryProperties(typeFormData.name);
      setSelectedMandatoryProperties(defaults);
    }
  }, [editingType, showTypeForm]);

  useEffect(() => {
    if (showTypeForm && !editingType) {
      const defaults = getDefaultMandatoryProperties(typeFormData.name);
      setSelectedMandatoryProperties(prev => {
        const combined = new Set([...prev, ...defaults]);
        return Array.from(combined);
      });
    }
  }, [typeFormData.name, showTypeForm, editingType]);

  const toggleTypeExpansion = (typeId: string) => {
    setExpandedTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(typeId)) {
        newSet.delete(typeId);
      } else {
        newSet.add(typeId);
      }
      return newSet;
    });
  };

  // Handle create type
  const handleCreateType = async () => {
    if (!typeFormData.name.trim()) {
      showNotification('error', 'Validation Error', 'Type name is required');
      return;
    }

    if (selectedMandatoryProperties.length === 0) {
      showNotification('error', 'Validation Error', 'Please select at least one mandatory property');
      return;
    }

    setSavingType(true);
    try {
      const response = await fetch('/api/resource-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...typeFormData,
          mandatoryProperties: selectedMandatoryProperties,
        }),
      });

      if (response.ok) {
        showNotification('success', 'Success', 'Resource type created successfully');
        setShowTypeForm(false);
        setTypeFormData({ name: '', description: '' });
        setSelectedMandatoryProperties([]);
        fetchResourceTypes();
      } else {
        const error = await response.json();
        showNotification('error', 'Error', error.error || 'Failed to create resource type');
      }
    } catch (error) {
      console.error('Error creating resource type:', error);
      showNotification('error', 'Error', 'Failed to create resource type');
    } finally {
      setSavingType(false);
    }
  };

  const handleUpdateType = async () => {
    if (!editingType || !typeFormData.name.trim()) {
      showNotification('error', 'Validation Error', 'Type name is required');
      return;
    }

    setSavingType(true);
    try {
      const response = await fetch(`/api/resource-types/${editingType.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...typeFormData,
          mandatoryProperties: selectedMandatoryProperties,
        }),
      });

      if (response.ok) {
        showNotification('success', 'Success', 'Resource type updated successfully');
        setEditingType(null);
        setTypeFormData({ name: '', description: '' });
        setSelectedMandatoryProperties([]);
        fetchResourceTypes();
      } else {
        const error = await response.json();
        showNotification('error', 'Error', error.error || 'Failed to update resource type');
      }
    } catch (error) {
      console.error('Error updating resource type:', error);
      showNotification('error', 'Error', 'Failed to update resource type');
    } finally {
      setSavingType(false);
    }
  };

  const handleDeleteType = async (typeId: string) => {
    const type = resourceTypes.find(t => t.id === typeId);
    if (!type) return;

    if (type.isSystem) {
      showNotification('error', 'Error', 'System types cannot be deleted');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${type.name}"?`)) {
      return;
    }

    setDeletingId(typeId);
    try {
      const response = await fetch(`/api/resource-types/${typeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showNotification('success', 'Success', 'Resource type deleted successfully');
        fetchResourceTypes();
      } else {
        const error = await response.json();
        showNotification('error', 'Error', error.error || 'Failed to delete resource type');
      }
    } catch (error) {
      console.error('Error deleting resource type:', error);
      showNotification('error', 'Error', 'Failed to delete resource type');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryFormData.name.trim()) {
      showNotification('error', 'Validation Error', 'Category name is required');
      return;
    }

    if (!categoryFormData.resourceTypeId) {
      showNotification('error', 'Validation Error', 'Please select a resource type');
      return;
    }

    setSavingCategory(true);
    try {
      const response = await fetch('/api/resource-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryFormData),
      });

      if (response.ok) {
        showNotification('success', 'Success', 'Category created successfully');
        setShowCategoryForm(false);
        setCategoryFormData({ name: '', description: '', resourceTypeId: '' });
        fetchResourceTypes();
        setExpandedTypes(prev => new Set([...prev, categoryFormData.resourceTypeId]));
      } else {
        const error = await response.json();
        showNotification('error', 'Error', error.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      showNotification('error', 'Error', 'Failed to create category');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !categoryFormData.name.trim()) {
      showNotification('error', 'Validation Error', 'Category name is required');
      return;
    }

    setSavingCategory(true);
    try {
      const response = await fetch(`/api/resource-categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: categoryFormData.name, description: categoryFormData.description }),
      });

      if (response.ok) {
        showNotification('success', 'Success', 'Category updated successfully');
        setEditingCategory(null);
        setCategoryFormData({ name: '', description: '', resourceTypeId: '' });
        fetchResourceTypes();
      } else {
        const error = await response.json();
        showNotification('error', 'Error', error.error || 'Failed to update category');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      showNotification('error', 'Error', 'Failed to update category');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string, isSystem: boolean) => {
    if (isSystem) {
      showNotification('error', 'Error', 'System categories cannot be deleted');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${categoryName}"?`)) {
      return;
    }

    setDeletingId(categoryId);
    try {
      const response = await fetch(`/api/resource-categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showNotification('success', 'Success', 'Category deleted successfully');
        fetchResourceTypes();
      } else {
        const error = await response.json();
        showNotification('error', 'Error', error.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      showNotification('error', 'Error', 'Failed to delete category');
    } finally {
      setDeletingId(null);
    }
  };

  const startEditingType = (type: ResourceTypeEntity) => {
    setEditingType(type);
    setTypeFormData({ name: type.name, description: type.description || '' });
    setSelectedMandatoryProperties(type.mandatoryProperties || []);
    setShowTypeForm(false);
  };

  const startEditingCategory = (category: ResourceCategoryWithType) => {
    setEditingCategory(category);
    setCategoryFormData({ 
      name: category.name, 
      description: category.description || '',
      resourceTypeId: category.resourceTypeId 
    });
    setShowCategoryForm(false);
  };

  const cancelEditing = () => {
    setEditingType(null);
    setEditingCategory(null);
    setTypeFormData({ name: '', description: '' });
    setCategoryFormData({ name: '', description: '', resourceTypeId: '' });
    setSelectedMandatoryProperties([]);
  };

  const startAddingCategoryToType = (typeId: string) => {
    setCategoryFormData({ name: '', description: '', resourceTypeId: typeId });
    setShowCategoryForm(true);
    setExpandedTypes(prev => new Set([...prev, typeId]));
  };

  // Handle inline property creation
  const handleCreateProperty = async () => {
    if (!propertyFormData.label.trim()) {
      showNotification('error', 'Validation Error', 'Property label is required');
      return;
    }

    // Auto-generate key from label if not provided
    let key = propertyFormData.key.trim();
    if (!key) {
      key = propertyFormData.label
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(' ')
        .map((word, index) => 
          index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
        )
        .join('');
    }

    // Validate key format
    if (!/^[a-z][a-zA-Z0-9]*$/.test(key)) {
      showNotification('error', 'Validation Error', 'Key must be in camelCase format');
      return;
    }

    setSavingProperty(true);
    try {
      const response = await fetch('/api/property-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          label: propertyFormData.label,
          dataType: propertyFormData.dataType,
          description: propertyFormData.description || undefined,
        }),
      });

      if (response.ok) {
        showNotification('success', 'Success', 'Property created successfully');
        setPropertyFormData({ key: '', label: '', dataType: 'STRING', description: '' });
        setShowPropertyForm(false);
        // Refresh properties list
        fetchAvailableProperties();
      } else {
        const error = await response.json();
        showNotification('error', 'Error', error.error || 'Failed to create property');
      }
    } catch (error) {
      console.error('Error creating property:', error);
      showNotification('error', 'Error', 'Failed to create property');
    } finally {
      setSavingProperty(false);
    }
  };

  const getTypeIcon = (typeName: string) => {
    switch (typeName) {
      case 'Hardware':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'Software':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'Cloud':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        );
      default:
        return <FolderTree className="h-5 w-5" />;
    }
  };

  // Render type form with improved UI
  const renderTypeForm = () => {
    const currentTypeName = editingType?.name || typeFormData.name;
    const defaultMandatory = getDefaultMandatoryProperties(currentTypeName);
    
    return (
      <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-indigo-100 rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Settings className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">
                {editingType ? 'Edit Resource Type' : 'Create New Resource Type'}
              </h4>
              <p className="text-sm text-gray-500">Define the type and its mandatory properties</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowTypeForm(false);
              cancelEditing();
            }}
            className="p-2 hover:bg-white/80 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={typeFormData.name}
                onChange={(e) => setTypeFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={editingType?.isSystem}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 transition-all"
                placeholder="e.g., Hardware, Software, Cloud"
              />
              {editingType?.isSystem && (
                <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> System type names cannot be modified
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                value={typeFormData.description}
                onChange={(e) => setTypeFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Brief description of this resource type"
              />
            </div>
          </div>

          {/* Mandatory Properties Section */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <h5 className="font-medium text-gray-900">Mandatory Properties</h5>
                  <span className="text-red-500">*</span>
                </div>
                {selectedMandatoryProperties.length > 0 && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                    {selectedMandatoryProperties.length} selected
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Select properties that must be filled when creating resource items of this type
              </p>
            </div>
            
            <div className="p-4">
              {loadingProperties ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                  <span className="ml-2 text-sm text-gray-500">Loading properties...</span>
                </div>
              ) : availableProperties.length === 0 && !showPropertyForm ? (
                /* Empty State with Button to Add Properties */
                <div className="text-center py-8">
                  <div className="mx-auto w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-7 h-7 text-amber-500" />
                  </div>
                  <h4 className="text-base font-medium text-gray-900 mb-2">No Properties Available</h4>
                  <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
                    Create your first property to define what information should be tracked for resources.
                  </p>
                  <button
                    onClick={() => setShowPropertyForm(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    Create First Property
                  </button>
                </div>
              ) : showPropertyForm || availableProperties.length === 0 ? (
                /* Inline Property Creation Form */
                <div className="space-y-4">
                  {availableProperties.length > 0 && (
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium text-gray-700">Create New Property</h5>
                      <button
                        onClick={() => setShowPropertyForm(false)}
                        className="text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Label <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={propertyFormData.label}
                        onChange={(e) => {
                          const label = e.target.value;
                          const key = label
                            .toLowerCase()
                            .replace(/[^a-zA-Z0-9\s]/g, '')
                            .split(' ')
                            .map((word, index) => 
                              index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
                            )
                            .join('');
                          setPropertyFormData(prev => ({ ...prev, label, key }));
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g., Serial Number"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Key (auto-generated)
                      </label>
                      <input
                        type="text"
                        value={propertyFormData.key}
                        onChange={(e) => setPropertyFormData(prev => ({ ...prev, key: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                        placeholder="serialNumber"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Data Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={propertyFormData.dataType}
                        onChange={(e) => setPropertyFormData(prev => ({ ...prev, dataType: e.target.value as PropertyDataType }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="STRING">Text</option>
                        <option value="NUMBER">Number</option>
                        <option value="BOOLEAN">Yes/No</option>
                        <option value="DATE">Date</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={propertyFormData.description}
                        onChange={(e) => setPropertyFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Optional description"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    {availableProperties.length > 0 && (
                      <button
                        onClick={() => {
                          setShowPropertyForm(false);
                          setPropertyFormData({ key: '', label: '', dataType: 'STRING', description: '' });
                        }}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={handleCreateProperty}
                      disabled={savingProperty || !propertyFormData.label.trim()}
                      className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      {savingProperty && <Loader2 className="w-3 h-3 animate-spin" />}
                      Create Property
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableProperties.map((property) => {
                    const isSelected = selectedMandatoryProperties.includes(property.key);
                    const isDefault = defaultMandatory.includes(property.key);
                    
                    return (
                      <label
                        key={property.key}
                        className={`
                          flex items-center p-3 rounded-lg border cursor-pointer transition-all
                          ${isSelected 
                            ? isDefault 
                              ? 'border-amber-300 bg-amber-50' 
                              : 'border-indigo-300 bg-indigo-50' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }
                          ${isDefault ? 'cursor-not-allowed' : ''}
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleMandatoryPropertyToggle(property.key)}
                          disabled={isDefault}
                          className="sr-only"
                        />
                        <div className={`
                          flex-shrink-0 w-5 h-5 rounded border-2 mr-3
                          flex items-center justify-center transition-colors
                          ${isSelected 
                            ? isDefault 
                              ? 'bg-amber-500 border-amber-500' 
                              : 'bg-indigo-500 border-indigo-500' 
                            : 'border-gray-300 bg-white'
                          }
                        `}>
                          {isSelected && (isDefault ? <Lock className="w-3 h-3 text-white" /> : <span className="w-2 h-2 bg-white rounded-sm" />)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">{property.label}</span>
                            <span className={`
                              text-xs px-2 py-0.5 rounded-full
                              ${property.dataType === 'STRING' ? 'bg-emerald-100 text-emerald-700' : ''}
                              ${property.dataType === 'NUMBER' ? 'bg-purple-100 text-purple-700' : ''}
                              ${property.dataType === 'BOOLEAN' ? 'bg-yellow-100 text-yellow-700' : ''}
                              ${property.dataType === 'DATE' ? 'bg-blue-100 text-blue-700' : ''}
                            `}>
                              {property.dataType.toLowerCase()}
                            </span>
                            {isDefault && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                default
                              </span>
                            )}
                          </div>
                          {property.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{property.description}</p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                  
                  {/* Add more properties button */}
                  <button
                    onClick={() => setShowPropertyForm(true)}
                    className="w-full p-3 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add New Property</span>
                  </button>
                </div>
              )}
            </div>
            
            {/* Info about default mandatory properties */}
            {defaultMandatory.length > 0 && availableProperties.length > 0 && (
              <div className="px-4 py-3 bg-amber-50 border-t border-amber-100">
                <p className="text-xs text-amber-700 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 flex-shrink-0" />
                  Properties marked with <Lock className="w-3 h-3 inline" /> are default mandatory for {currentTypeName} and cannot be removed.
                </p>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setShowTypeForm(false);
                cancelEditing();
              }}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={editingType ? handleUpdateType : handleCreateType}
              disabled={savingType || availableProperties.length === 0}
              className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors cursor-pointer"
            >
              {savingType && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingType ? 'Update Type' : 'Create Type'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render category form with improved UI
  const renderCategoryForm = () => (
    <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 border border-emerald-100 rounded-xl p-6 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Tag className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </h4>
            <p className="text-sm text-gray-500">Categories help organize resources within a type</p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowCategoryForm(false);
            cancelEditing();
          }}
          className="p-2 hover:bg-white/80 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="space-y-4">
        {!editingCategory && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resource Type <span className="text-red-500">*</span>
            </label>
            <ElegantSelect
              value={categoryFormData.resourceTypeId}
              onChange={(value) => setCategoryFormData(prev => ({ ...prev, resourceTypeId: value }))}
              options={resourceTypes.map(type => ({
                value: type.id,
                label: type.name,
                description: type.description || undefined,
              }))}
              placeholder="Select resource type"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={categoryFormData.name}
              onChange={(e) => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={editingCategory?.isSystem}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 transition-all"
              placeholder="e.g., Laptop, Phone, SaaS"
            />
            {editingCategory?.isSystem && (
              <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                <Lock className="w-3 h-3" /> System category names cannot be modified
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <input
              type="text"
              value={categoryFormData.description}
              onChange={(e) => setCategoryFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="Brief description of this category"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => {
              setShowCategoryForm(false);
              cancelEditing();
            }}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
            disabled={savingCategory}
            className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 transition-colors cursor-pointer"
          >
            {savingCategory && <Loader2 className="w-4 h-4 animate-spin" />}
            {editingCategory ? 'Update Category' : 'Create Category'}
          </button>
        </div>
      </div>
    </div>
  );

  // Render type item with improved UI
  const renderTypeItem = (type: TypeWithCategories) => {
    const isExpanded = expandedTypes.has(type.id);
    const isDeleting = deletingId === type.id;

    return (
      <div key={type.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4 shadow-sm hover:shadow-md transition-shadow">
        {/* Type Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => toggleTypeExpansion(type.id)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            <div className={`p-2.5 rounded-xl ${type.isSystem ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>
              {getTypeIcon(type.name)}
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">{type.name}</h4>
                {type.isSystem && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                    System
                  </span>
                )}
              </div>
              {type.description && (
                <p className="text-sm text-gray-500 mt-0.5">{type.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-400 mt-1.5">
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {type.categories.length} {type.categories.length === 1 ? 'category' : 'categories'}
                </span>
                {type.mandatoryProperties && type.mandatoryProperties.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    {type.mandatoryProperties.length} mandatory
                  </span>
                )}
              </div>
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => startAddingCategoryToType(type.id)}
                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                title="Add category"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => startEditingType(type)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                title="Edit type"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              {!type.isSystem && (
                <button
                  onClick={() => handleDeleteType(type.id)}
                  disabled={isDeleting}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                  title="Delete type"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Categories List */}
        {isExpanded && (
          <div className="border-t border-gray-100 bg-gray-50/50">
            {type.categories.length === 0 ? (
              <div className="p-6 text-center">
                <div className="mx-auto w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Tag className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-2">No categories yet</p>
                {canManage && (
                  <button
                    onClick={() => startAddingCategoryToType(type.id)}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
                  >
                    + Add first category
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {type.categories.map((category) => {
                  const isCategoryDeleting = deletingId === category.id;
                  
                  return (
                    <div key={category.id} className="p-3 pl-16 flex items-center justify-between hover:bg-gray-100/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-white rounded-lg border border-gray-200">
                          <Tag className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{category.name}</span>
                            {category.isSystem && (
                              <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded">
                                System
                              </span>
                            )}
                          </div>
                          {category.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{category.description}</p>
                          )}
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditingCategory({ ...category, resourceType: type })}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title="Edit category"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!category.isSystem && (
                            <button
                              onClick={() => handleDeleteCategory(category.id, category.name, category.isSystem)}
                              disabled={isCategoryDeleting}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 cursor-pointer"
                              title="Delete category"
                            >
                              {isCategoryDeleting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Permission denied view
  if (!canManage) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-6">
            You don't have permission to manage resource types and categories.
            Only administrators (CEO, CTO, ADMIN) can access this feature.
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl mx-auto max-h-[90vh] flex flex-col">
      {NotificationComponent}
      
      {/* Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-indigo-700 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-white/20 rounded-xl">
            <FolderTree className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Resource Type Manager</h2>
            <p className="text-sm text-indigo-200">Manage resource types and categories</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {/* Actions Bar */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => {
            setShowTypeForm(true);
            setShowCategoryForm(false);
            cancelEditing();
          }}
          className="px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Type
        </button>
        <button
          onClick={() => {
            setShowCategoryForm(true);
            setShowTypeForm(false);
            cancelEditing();
          }}
          className="px-4 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 flex items-center gap-2 border border-emerald-200 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto flex-1">
        {/* Forms */}
        {(showTypeForm || editingType) && renderTypeForm()}
        {(showCategoryForm || editingCategory) && renderCategoryForm()}

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
            <span className="text-gray-600">Loading resource types...</span>
          </div>
        ) : resourceTypes.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
              <FolderTree className="w-10 h-10 text-indigo-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Resource Types</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Get started by creating your first resource type to organize your resources.
            </p>
            <button
              onClick={() => setShowTypeForm(true)}
              className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors cursor-pointer"
            >
              Create Resource Type
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {resourceTypes.map(renderTypeItem)}
          </div>
        )}

        {/* Info Box */}
        {resourceTypes.length > 0 && (
          <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <Info className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">About Resource Types & Categories</p>
                <ul className="space-y-1.5 text-blue-700">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    System types (Hardware, Software, Cloud) cannot be deleted
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    Types with associated resources cannot be deleted
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    All changes are logged in the audit trail
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
