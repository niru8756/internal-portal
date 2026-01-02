'use client';

import { useState } from 'react';
import { useNotification } from '@/components/Notification';
import { 
  Edit2, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  User, 
  Settings, 
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { PropertyDefinition, ItemStatus } from '@/types/resource-structure';
import ResourceItemForm from './ResourceItemForm';

interface ResourceItem {
  id: string;
  status: ItemStatus;
  properties: Record<string, unknown>;
  serialNumber?: string;
  hostname?: string;
  ipAddress?: string;
  macAddress?: string;
  operatingSystem?: string;
  osVersion?: string;
  processor?: string;
  memory?: string;
  storage?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  licenseExpiry?: string;
  softwareVersion?: string;
  licenseType?: string;
  licenseKey?: string;
  value?: number;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  assignments: Array<{
    id: string;
    status: string;
    employee: {
      id: string;
      name: string;
      email: string;
      department: string;
    };
  }>;
}

interface ResourceItemsListProps {
  resourceId: string;
  resourceName?: string;
  resourceType?: 'PHYSICAL' | 'SOFTWARE' | 'CLOUD';
  propertySchema?: PropertyDefinition[];
  items: ResourceItem[];
  onRefresh: () => void;
  canManage: boolean;
}

/**
 * ResourceItemsList Component
 * 
 * Displays resource items with dynamic properties, editing, and deletion capabilities.
 * Requirements: 8.8, 15.1, 15.5
 * 
 * - 8.8: Display only properties selected for that resource type
 * - 15.1: Allow editing of resource item properties
 * - 15.5: Provide clear error messages when deletion is prevented
 */
export default function ResourceItemsList({
  resourceId,
  resourceName = 'Resource',
  resourceType = 'PHYSICAL',
  propertySchema = [],
  items,
  onRefresh,
  canManage
}: ResourceItemsListProps) {
  const { showNotification } = useNotification();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<ResourceItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800';
      case 'ASSIGNED':
        return 'bg-blue-100 text-blue-800';
      case 'MAINTENANCE':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOST':
        return 'bg-red-100 text-red-800';
      case 'DAMAGED':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'ASSIGNED':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'MAINTENANCE':
        return <Settings className="w-4 h-4 text-yellow-600" />;
      case 'LOST':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'DAMAGED':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.id));
    }
  };

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedItems.length === 0) return;

    try {
      const updatePromises = selectedItems.map(itemId =>
        fetch(`/api/resources/items/${itemId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        })
      );

      const results = await Promise.all(updatePromises);
      const successCount = results.filter(r => r.ok).length;

      if (successCount === selectedItems.length) {
        showNotification('success', 'Items Updated', `${successCount} items updated successfully`);
      } else {
        showNotification('warning', 'Partial Success', `${successCount}/${selectedItems.length} items updated`);
      }

      setSelectedItems([]);
      setShowBulkActions(false);
      onRefresh();
    } catch (error) {
      console.error('Error updating items:', error);
      showNotification('error', 'Update Failed', 'Failed to update items');
    }
  };

  // Requirement 15.1: Handle item editing
  const handleEditItem = (item: ResourceItem) => {
    setEditingItem(item);
  };

  // Requirement 15.5: Handle item deletion with clear error messages
  const handleDeleteItem = async (itemId: string) => {
    setDeletingItemId(itemId);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/resources/items/${itemId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showNotification('success', 'Item Deleted', 'Resource item has been removed');
        onRefresh();
      } else {
        const errorData = await response.json();
        // Requirement 15.5: Provide clear error messages
        setDeleteError(errorData.error || 'Failed to delete item');
        showNotification('error', 'Delete Failed', errorData.error || 'Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      setDeleteError('An error occurred while deleting the item');
      showNotification('error', 'Delete Failed', 'An error occurred while deleting the item');
    } finally {
      setDeletingItemId(null);
    }
  };

  // Get display value for a property
  const getPropertyDisplayValue = (item: ResourceItem, prop: PropertyDefinition): string => {
    // First check dynamic properties
    let value = item.properties?.[prop.key];
    
    // Fall back to legacy fields if not in properties
    if (value === undefined || value === null) {
      const legacyValue = (item as unknown as Record<string, unknown>)[prop.key];
      if (legacyValue !== undefined && legacyValue !== null) {
        value = legacyValue;
      }
    }
    
    if (value === undefined || value === null || value === '') {
      return '-';
    }
    
    // Format based on data type
    switch (prop.dataType) {
      case 'DATE':
        try {
          return new Date(value as string).toLocaleDateString();
        } catch {
          return String(value);
        }
      case 'BOOLEAN':
        return value ? 'Yes' : 'No';
      case 'NUMBER':
        if (prop.key === 'value' || prop.key.toLowerCase().includes('cost') || prop.key.toLowerCase().includes('price')) {
          return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return String(value);
      default:
        return String(value);
    }
  };

  // Get item identifier for display
  const getItemIdentifier = (item: ResourceItem): string => {
    // Check properties first
    if (item.properties?.serialNumber) return String(item.properties.serialNumber);
    if (item.properties?.licenseKey) return String(item.properties.licenseKey);
    if (item.properties?.hostname) return String(item.properties.hostname);
    
    // Fall back to legacy fields
    if (item.serialNumber) return item.serialNumber;
    if (item.licenseKey) return item.licenseKey;
    if (item.hostname) return item.hostname;
    
    return item.id.substring(0, 8);
  };

  // Check if item has active assignments (for deletion constraint)
  const hasActiveAssignments = (item: ResourceItem): boolean => {
    return item.assignments.some(a => a.status === 'ACTIVE');
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m8 0V4.5" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Items Found</h3>
        <p className="text-gray-600 mb-4">
          This resource doesn't have any items yet.
        </p>
        {canManage && (
          <p className="text-sm text-gray-500">
            Use the "Add Item" button to add items to this resource.
          </p>
        )}
      </div>
    );
  }

  // Determine which properties to display
  const displayProperties = propertySchema.length > 0 
    ? propertySchema 
    : getDefaultPropertiesForType(resourceType);

  return (
    <div className="space-y-4">
      {/* Edit Modal */}
      {editingItem && (
        <ResourceItemForm
          resourceId={resourceId}
          resourceType={resourceType}
          resourceName={resourceName}
          editMode={true}
          itemId={editingItem.id}
          initialData={editingItem.properties || {}}
          onItemCreated={() => {
            setEditingItem(null);
            onRefresh();
          }}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Delete Error Alert */}
      {deleteError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Cannot Delete Item</p>
            <p className="text-sm text-red-700 mt-1">{deleteError}</p>
          </div>
          <button 
            onClick={() => setDeleteError(null)}
            className="text-red-400 hover:text-red-600"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Bulk Actions */}
      {canManage && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedItems.length === items.length && items.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Select All ({selectedItems.length}/{items.length})
              </span>
            </label>
            
            {selectedItems.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Bulk Actions ({selectedItems.length})
                </button>
                
                {showBulkActions && (
                  <div className="absolute top-8 left-0 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10">
                    <button
                      onClick={() => handleBulkStatusUpdate('AVAILABLE')}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Mark as Available
                    </button>
                    <button
                      onClick={() => handleBulkStatusUpdate('MAINTENANCE')}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Mark as Maintenance
                    </button>
                    <button
                      onClick={() => handleBulkStatusUpdate('DAMAGED')}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Mark as Damaged
                    </button>
                    <button
                      onClick={() => handleBulkStatusUpdate('LOST')}
                      className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Mark as Lost
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const isExpanded = expandedItems.has(item.id);
          const canDelete = !hasActiveAssignments(item);
          
          return (
            <div key={item.id} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {canManage && (
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleItemSelect(item.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    )}
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(item.status)}
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  {canManage && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleEditItem(item)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Edit item"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={!canDelete || deletingItemId === item.id}
                        className={`p-1.5 rounded transition-colors ${
                          canDelete 
                            ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' 
                            : 'text-gray-300 cursor-not-allowed'
                        }`}
                        title={canDelete ? 'Delete item' : 'Cannot delete: item has active assignments'}
                      >
                        {deletingItemId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Item Identifier */}
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {getItemIdentifier(item)}
                  </p>
                </div>
              </div>

              {/* Item Properties - Requirement 8.8: Display only selected properties */}
              <div className="p-4 space-y-2">
                {displayProperties.slice(0, isExpanded ? undefined : 4).map((prop) => {
                  const displayValue = getPropertyDisplayValue(item, prop);
                  if (displayValue === '-' && !isExpanded) return null;
                  
                  return (
                    <div key={prop.key} className="text-sm">
                      <span className="font-medium text-gray-700">{prop.label}:</span>
                      <span className="ml-2 text-gray-900">{displayValue}</span>
                    </div>
                  );
                })}
                
                {/* Expand/Collapse for more properties */}
                {displayProperties.length > 4 && (
                  <button
                    onClick={() => toggleItemExpanded(item.id)}
                    className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 mt-2"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-1" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-1" />
                        Show {displayProperties.length - 4} more
                      </>
                    )}
                  </button>
                )}

                {/* Legacy metadata display */}
                {item.metadata && Object.keys(item.metadata).length > 0 && isExpanded && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <div className="text-xs font-medium text-gray-500 mb-1">Additional Metadata:</div>
                    {Object.entries(item.metadata).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium text-gray-700">{key}:</span>
                        <span className="ml-2 text-gray-900">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assignment Info */}
              {item.assignments.length > 0 && (
                <div className="px-4 pb-4">
                  <div className="pt-3 border-t border-gray-200">
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Assigned to:</span>
                      <div className="mt-1 space-y-1">
                        {item.assignments
                          .filter(a => a.status === 'ACTIVE')
                          .map((assignment) => (
                            <div key={assignment.id} className="flex items-center space-x-2">
                              <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-indigo-600">
                                  {assignment.employee.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-gray-900 text-sm">{assignment.employee.name}</span>
                              <span className="text-gray-500 text-xs">({assignment.employee.department})</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cannot Delete Warning */}
              {!canDelete && canManage && (
                <div className="px-4 pb-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800 flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1.5 flex-shrink-0" />
                    Cannot delete: has active assignments
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Get default properties to display for legacy resources without property schema
 */
function getDefaultPropertiesForType(resourceType: 'PHYSICAL' | 'SOFTWARE' | 'CLOUD'): PropertyDefinition[] {
  switch (resourceType) {
    case 'SOFTWARE':
      return [
        { key: 'licenseKey', label: 'License Key', dataType: 'STRING' },
        { key: 'softwareVersion', label: 'Version', dataType: 'STRING' },
        { key: 'licenseType', label: 'License Type', dataType: 'STRING' },
        { key: 'maxUsers', label: 'Max Users', dataType: 'STRING' },
        { key: 'licenseExpiry', label: 'License Expiry', dataType: 'DATE' },
        { key: 'purchaseDate', label: 'Purchase Date', dataType: 'DATE' },
        { key: 'value', label: 'Value', dataType: 'NUMBER' },
      ];
    case 'CLOUD':
      return [
        { key: 'accountId', label: 'Account ID', dataType: 'STRING' },
        { key: 'region', label: 'Region', dataType: 'STRING' },
        { key: 'subscriptionTier', label: 'Subscription Tier', dataType: 'STRING' },
        { key: 'licenseExpiry', label: 'Expiry', dataType: 'DATE' },
        { key: 'value', label: 'Value', dataType: 'NUMBER' },
      ];
    case 'PHYSICAL':
    default:
      return [
        { key: 'serialNumber', label: 'Serial Number', dataType: 'STRING' },
        { key: 'hostname', label: 'Hostname', dataType: 'STRING' },
        { key: 'ipAddress', label: 'IP Address', dataType: 'STRING' },
        { key: 'operatingSystem', label: 'OS', dataType: 'STRING' },
        { key: 'processor', label: 'Processor', dataType: 'STRING' },
        { key: 'memory', label: 'Memory', dataType: 'STRING' },
        { key: 'storage', label: 'Storage', dataType: 'STRING' },
        { key: 'purchaseDate', label: 'Purchase Date', dataType: 'DATE' },
        { key: 'warrantyExpiry', label: 'Warranty Expiry', dataType: 'DATE' },
        { key: 'value', label: 'Value', dataType: 'NUMBER' },
      ];
  }
}
