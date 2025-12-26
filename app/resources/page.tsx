'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserPermissions } from '@/lib/permissions';
import ResourceForm from '@/components/ResourceForm';
import ResourceDetails from '@/components/ResourceDetails';
import ProtectedRoute from '@/components/ProtectedRoute';
import Pagination from '@/components/Pagination';

interface Resource {
  id: string;
  name: string;
  type: 'PHYSICAL' | 'SOFTWARE' | 'CLOUD';
  status: 'ACTIVE' | 'INACTIVE' | 'ASSIGNED' | 'REVOKED' | 'EXPIRED';
  category?: string;
  description?: string;
  assignedDate?: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
  value?: number;
  monthlyRate?: number;
  annualRate?: number;
  serialNumber?: string;
  modelNumber?: string;
  brand?: string;
  location?: string;
  softwareVersion?: string;
  provider?: string;
  serviceLevel?: string;
  permissionLevel?: 'READ' | 'WRITE' | 'EDIT' | 'ADMIN';
  assignedToIds?: string[];
  assignedEmployees?: Array<{
    id: string;
    name: string;
    email: string;
    department: string;
    role: string;
  }>;
  owner?: {
    id: string;
    name: string;
    email: string;
    department: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    department: string;
    role: string;
  };
}

export default function ResourcesPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'all' | 'own'>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12); // 12 for grid layout
  const [totalResources, setTotalResources] = useState(0);

  const permissions = user ? getUserPermissions(user.role as any) : null;

  useEffect(() => {
    fetchResources();
  }, [user, viewMode, currentPage, itemsPerPage]);

  const fetchResources = async () => {
    try {
      let url = `/api/resources?page=${currentPage}&limit=${itemsPerPage}`;
      
      // The API now handles role-based filtering automatically
      // Only add assignedTo filter if explicitly viewing own resources
      if (viewMode === 'own' && user) {
        url += `&assignedTo=${user.id}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setResources(data.resources || data);
        setTotalResources(data.total || data.length);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const totalPages = Math.ceil(totalResources / itemsPerPage);

  const handleCreateResource = async (resourceData: any) => {
    try {
      const response = await fetch('/api/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resourceData),
      });

      console.log("response: ", response);

      if (response.ok) {
        const newResource = await response.json();
        setResources([newResource, ...resources]);
        setShowForm(false);
      } else {
        const errorData = await response.json();
        console.error('Failed to create resource:', errorData);
        alert(`Failed to create resource: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating resource:', error);
      alert('Error creating resource. Please try again.');
    }
  };

  const handleViewDetails = (resource: Resource) => {
    setSelectedResource(resource);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setSelectedResource(null);
    setShowDetails(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      case 'ASSIGNED':
        return 'bg-blue-100 text-blue-800';
      case 'REVOKED':
        return 'bg-red-100 text-red-800';
      case 'EXPIRED':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PHYSICAL':
        return 'bg-purple-100 text-purple-800';
      case 'SOFTWARE':
        return 'bg-blue-100 text-blue-800';
      case 'CLOUD':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPermissionColor = (level: string) => {
    switch (level) {
      case 'READ':
        return 'bg-green-100 text-green-800';
      case 'WRITE':
        return 'bg-blue-100 text-blue-800';
      case 'EDIT':
        return 'bg-orange-100 text-orange-800';
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading resources...</div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">
              {permissions?.canViewAllResources ? 'Resource Management' : 'My Resources'}
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              {permissions?.canViewAllResources 
                ? 'Manage company resources including physical assets, software, and cloud services.'
                : 'View your assigned resources and request access to additional resources.'
              }
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-2">
            {permissions?.canViewAllResources && (
              <div className="inline-flex rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode('all')}
                  className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                    viewMode === 'all'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  All Resources
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('own')}
                  className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                    viewMode === 'own'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  My Resources
                </button>
              </div>
            )}
            {permissions?.canAddResource && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
              >
                Add Resource
              </button>
            )}
          </div>
        </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {resources.map((resource) => (
          <div key={resource.id} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(resource.type)}`}>
                    {resource.type}
                  </span>
                  {resource.permissionLevel && (
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPermissionColor(resource.permissionLevel)}`}>
                      {resource.permissionLevel.toUpperCase()}
                    </span>
                  )}
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(resource.status)}`}>
                  {resource.status}
                </span>
              </div>
              
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {resource.name}
                </h3>
                {resource.category && (
                  <p className="text-sm text-gray-500 mt-1">{resource.category}</p>
                )}
                {resource.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{resource.description}</p>
                )}
                
                {/* Assignment Information - Role-based display */}
                {resource.type === 'PHYSICAL' && resource.assignedTo && (
                  <div className="mt-3 p-2 bg-blue-50 rounded-md">
                    {user && (user.role === 'CEO' || user.role === 'CTO') ? (
                      // CEO/CTO see full assignment details
                      <>
                        <p className="text-sm text-blue-800 font-medium">
                          👤 Assigned to: {resource.assignedTo.name}
                        </p>
                        <p className="text-xs text-blue-600">
                          {resource.assignedTo.role.replace(/_/g, ' ')} • {resource.assignedTo.department}
                        </p>
                      </>
                    ) : resource.assignedTo.id === user?.id ? (
                      // Regular employees only see if it's assigned to them
                      <p className="text-sm text-blue-800 font-medium">
                        👤 Assigned to you
                      </p>
                    ) : (
                      // Other employees see generic message
                      <p className="text-sm text-gray-600">
                        📋 Currently assigned
                      </p>
                    )}
                  </div>
                )}
                
                {(resource.type === 'SOFTWARE' || resource.type === 'CLOUD') && resource.assignedEmployees && resource.assignedEmployees.length > 0 && (
                  <div className="mt-3 p-2 bg-blue-50 rounded-md">
                    {user && (user.role === 'CEO' || user.role === 'CTO') ? (
                      // CEO/CTO see full assignment details
                      <>
                        <p className="text-sm text-blue-800 font-medium">
                          👥 Assigned to {resource.assignedEmployees.length} employee{resource.assignedEmployees.length > 1 ? 's' : ''}:
                        </p>
                        <div className="mt-1 space-y-1">
                          {resource.assignedEmployees.slice(0, 3).map((employee) => (
                            <p key={employee.id} className="text-xs text-blue-600">
                              • {employee.name} ({employee.role.replace(/_/g, ' ')})
                            </p>
                          ))}
                          {resource.assignedEmployees.length > 3 && (
                            <p className="text-xs text-blue-500 italic">
                              +{resource.assignedEmployees.length - 3} more...
                            </p>
                          )}
                        </div>
                      </>
                    ) : resource.assignedEmployees.some(emp => emp.id === user?.id) ? (
                      // Regular employees only see if they're assigned
                      <p className="text-sm text-blue-800 font-medium">
                        👤 Assigned to you{resource.assignedEmployees.length > 1 ? ` and ${resource.assignedEmployees.length - 1} other${resource.assignedEmployees.length > 2 ? 's' : ''}` : ''}
                      </p>
                    ) : (
                      // Other employees see generic message
                      <p className="text-sm text-gray-600">
                        📋 Assigned to {resource.assignedEmployees.length} employee{resource.assignedEmployees.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Fallback for single assignment on software/cloud (backward compatibility) */}
                {(resource.type === 'SOFTWARE' || resource.type === 'CLOUD') && resource.assignedTo && (!resource.assignedEmployees || resource.assignedEmployees.length === 0) && (
                  <div className="mt-3 p-2 bg-blue-50 rounded-md">
                    {user && (user.role === 'CEO' || user.role === 'CTO') ? (
                      // CEO/CTO see full assignment details
                      <>
                        <p className="text-sm text-blue-800 font-medium">
                          👤 Assigned to: {resource.assignedTo.name}
                        </p>
                        <p className="text-xs text-blue-600">
                          {resource.assignedTo.role.replace(/_/g, ' ')} • {resource.assignedTo.department}
                        </p>
                      </>
                    ) : resource.assignedTo.id === user?.id ? (
                      // Regular employees only see if it's assigned to them
                      <p className="text-sm text-blue-800 font-medium">
                        👤 Assigned to you
                      </p>
                    ) : (
                      // Other employees see generic message
                      <p className="text-sm text-gray-600">
                        📋 Currently assigned
                      </p>
                    )}
                  </div>
                )}
                
                {resource.owner && (
                  <p className="mt-2 text-sm text-gray-500">
                    🔧 Managed by: {resource.owner.name} ({resource.owner.department})
                  </p>
                )}
              </div>

              {/* Resource-specific Information */}
              <div className="mt-4 space-y-2">
                {resource.type === 'PHYSICAL' && (
                  <>
                    {resource.serialNumber && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Serial:</span>
                        <span className="text-gray-900 font-mono">{resource.serialNumber}</span>
                      </div>
                    )}
                    {resource.brand && resource.modelNumber && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Model:</span>
                        <span className="text-gray-900">{resource.brand} {resource.modelNumber}</span>
                      </div>
                    )}
                    {resource.location && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Location:</span>
                        <span className="text-gray-900">{resource.location}</span>
                      </div>
                    )}
                    {resource.value && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Value:</span>
                        <span className="text-gray-900 font-semibold">
                          ${resource.value.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {resource.type === 'SOFTWARE' && (
                  <>
                    {resource.softwareVersion && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Version:</span>
                        <span className="text-gray-900">{resource.softwareVersion}</span>
                      </div>
                    )}
                    {resource.provider && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Provider:</span>
                        <span className="text-gray-900">{resource.provider}</span>
                      </div>
                    )}
                    {resource.annualRate && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Annual Cost:</span>
                        <span className="text-gray-900 font-semibold">
                          ${resource.annualRate.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {resource.type === 'CLOUD' && (
                  <>
                    {resource.provider && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Provider:</span>
                        <span className="text-gray-900">{resource.provider}</span>
                      </div>
                    )}
                    {resource.serviceLevel && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Service Tier:</span>
                        <span className="text-gray-900">{resource.serviceLevel}</span>
                      </div>
                    )}
                    {resource.monthlyRate && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Monthly Cost:</span>
                        <span className="text-gray-900 font-semibold">
                          ${resource.monthlyRate.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Date Information */}
              <div className="mt-4 space-y-2">
                {resource.assignedDate && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Assigned:</span>
                    <span className="text-gray-900">{new Date(resource.assignedDate).toLocaleDateString()}</span>
                  </div>
                )}
                {resource.expiryDate && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Expires:</span>
                    <span className={`${new Date(resource.expiryDate) < new Date() ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                      {new Date(resource.expiryDate).toLocaleDateString()}
                      {new Date(resource.expiryDate) < new Date() && ' (Expired)'}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-between items-center pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  Created: {new Date(resource.createdAt).toLocaleDateString()}
                </div>
                {/* Only CEO and CTO can view resource details */}
                {user && (user.role === 'CEO' || user.role === 'CTO') && (
                  <button 
                    onClick={() => handleViewDetails(resource)}
                    className="text-blue-600 hover:text-blue-500 text-sm font-medium transition-colors"
                  >
                    View Details
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalResources}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </div>
      )}

      {resources.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No resources</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a new resource.</p>
        </div>
      )}

      {showForm && permissions?.canAddResource && (
        <ResourceForm
          onSubmit={handleCreateResource}
          onCancel={() => setShowForm(false)}
        />
      )}

      {showDetails && selectedResource && (
        <ResourceDetails
          resource={selectedResource}
          isOpen={showDetails}
          onClose={handleCloseDetails}
        />
      )}
    </div>
    </ProtectedRoute>
  );
}