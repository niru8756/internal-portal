'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PolicyForm from '@/components/PolicyForm';
import PolicyChangeHistory from '@/components/PolicyChangeHistory';
import Pagination from '@/components/Pagination';

interface Policy {
  id: string;
  title: string;
  category: 'HR' | 'IT' | 'SECURITY' | 'COMPLIANCE';
  version: number;
  status: 'DRAFT' | 'IN_PROGRESS' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
  content?: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  effectiveDate?: string;
  expiryDate?: string;
  reviewDate?: string;
  lastReviewDate?: string;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    name: string;
    email: string;
    department: string;
  };
}

export default function PoliciesPage() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; name: string; email: string; department: string }>>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12); // 12 for grid layout
  const [totalPolicies, setTotalPolicies] = useState(0);

  useEffect(() => {
    fetchPolicies();
    fetchEmployees();
  }, [currentPage, itemsPerPage]);

  const fetchPolicies = async () => {
    try {
      const response = await fetch(`/api/policies?page=${currentPage}&limit=${itemsPerPage}`);
      if (response.ok) {
        const data = await response.json();
        setPolicies(data.policies || data);
        setTotalPolicies(data.total || data.length);
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
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

  const totalPages = Math.ceil(totalPolicies / itemsPerPage);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleCreatePolicy = async (policyData: any) => {
    try {
      if (editingPolicy) {
        // Update existing policy
        const response = await fetch(`/api/policies?id=${editingPolicy.id}&updatedBy=system`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(policyData),
        });

        if (response.ok) {
          const updatedPolicy = await response.json();
          setPolicies(policies.map(policy => policy.id === editingPolicy.id ? updatedPolicy : policy));
          setShowForm(false);
          setEditingPolicy(null);
        } else {
          const errorData = await response.json();
          alert(`Failed to update policy: ${errorData.error}`);
        }
      } else {
        // Create new policy
        const response = await fetch('/api/policies', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(policyData),
        });

        if (response.ok) {
          const newPolicy = await response.json();
          setPolicies([newPolicy, ...policies]);
          setShowForm(false);
        } else {
          const errorData = await response.json();
          alert(`Failed to create policy: ${errorData.error}`);
        }
      }
    } catch (error) {
      console.error('Error saving policy:', error);
      alert('Error saving policy');
    }
  };

  const handleEditPolicy = (policy: Policy) => {
    // Don't allow editing of rejected policies
    if (policy.status === 'REJECTED') {
      alert('Rejected policies cannot be edited. Use "Create New Version" to create a new policy based on this one.');
      return;
    }
    
    setEditingPolicy(policy);
    setShowForm(true);
  };

  const handleCreateNewVersion = (policy: Policy) => {
    // Create a new policy based on the rejected one
    const newPolicyData = {
      title: `${policy.title} (v${policy.version + 1})`,
      category: policy.category,
      content: policy.content,
      status: 'DRAFT' as const,
      ownerId: policy.owner?.id || '',
      effectiveDate: policy.effectiveDate,
      expiryDate: policy.expiryDate,
      reviewDate: policy.reviewDate,
      lastReviewDate: policy.lastReviewDate
    };
    
    setEditingPolicy(newPolicyData as any);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingPolicy(null);
  };

  const handleDeletePolicy = async (id: string) => {
    try {
      const response = await fetch(`/api/policies?id=${id}&deletedBy=system`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPolicies(policies.filter(policy => policy.id !== id));
        setDeleteConfirm(null);
      } else {
        const errorData = await response.json();
        alert(`Failed to delete policy: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error deleting policy:', error);
      alert('Error deleting policy');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'REVIEW':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'PUBLISHED':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'Policy is being drafted';
      case 'IN_PROGRESS':
        return 'Policy is being actively worked on';
      case 'REVIEW':
        return 'Policy is under review - approval workflow active';
      case 'APPROVED':
        return 'Policy has been approved and can be published';
      case 'REJECTED':
        return 'Policy was rejected - create new version to revise';
      case 'PUBLISHED':
        return 'Policy is live and in effect';
      default:
        return '';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'HR':
        return 'bg-purple-100 text-purple-800';
      case 'IT':
        return 'bg-blue-100 text-blue-800';
      case 'SECURITY':
        return 'bg-red-100 text-red-800';
      case 'COMPLIANCE':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading policies...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Policy Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            {user && (user.role === 'CEO' || user.role === 'CTO') 
              ? 'Create, manage, and publish company policies across different categories.'
              : 'Create and manage your own policies. CEO and CTO can view all policies.'
            }
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            Create Policy
          </button>
        </div>
      </div>

      {/* Policy Workflow Information */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">Policy Workflow Process</h4>
            <div className="mt-2 text-sm text-blue-700">
              <p className="mb-2">
                <strong>Workflow:</strong> DRAFT → IN_PROGRESS → REVIEW → [APPROVED/REJECTED] → PUBLISHED
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>DRAFT/IN_PROGRESS:</strong> You can edit and modify policies</li>
                <li><strong>REVIEW:</strong> Automatically creates approval workflow - no manual editing</li>
                <li><strong>APPROVED/REJECTED:</strong> Set automatically by approval workflow</li>
                <li><strong>REJECTED:</strong> Cannot be edited - use "Create New Version" to revise</li>
                <li><strong>PUBLISHED:</strong> Live policy - contact administrator for changes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {policies.map((policy) => (
          <div key={policy.id} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(policy.category)}`}>
                  {policy.category}
                </span>
                <div className="flex flex-col items-end">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(policy.status)}`}>
                    {policy.status}
                  </span>
                  {/* <span className="text-xs text-gray-500 mt-1" title={getStatusDescription(policy.status)}>
                    {getStatusDescription(policy.status)}
                  </span> */}
                </div>
              </div>
              
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {policy.title}
                </h3>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Version {policy.version} • by {policy.owner?.name || 'Unknown'}
                  </p>
                  {/* Show ownership indicator for non-CEO/CTO users */}
                  {user && user.role !== 'CEO' && user.role !== 'CTO' && policy.owner?.id === user.id && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Your Policy
                    </span>
                  )}
                </div>
                {/* Show workflow status for policies in review */}
                {policy.status === 'REVIEW' && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-yellow-800 font-medium">Under Review</span>
                    </div>
                    <p className="text-xs text-yellow-700 mt-1">
                      Approval workflow is active. Waiting for manager approval.
                    </p>
                  </div>
                )}

                {/* Show rejection notice for rejected policies */}
                {policy.status === 'REJECTED' && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm text-red-800 font-medium">Policy Rejected</span>
                    </div>
                    <p className="text-xs text-red-700 mt-1">
                      This policy was rejected during review. Create a new version to make revisions.
                    </p>
                  </div>
                )}

                {/* Show approval notice for approved policies */}
                {policy.status === 'APPROVED' && (
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-green-800 font-medium">Policy Approved</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      Ready to be published. Contact administrator to publish.
                    </p>
                  </div>
                )}
              </div>

              {/* File Information */}
              {policy.filePath && (
                <div className="mt-3 p-2 bg-blue-50 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-xs text-blue-700">
                        {policy.fileName}
                      </span>
                    </div>
                    <a
                      href={policy.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Download
                    </a>
                  </div>
                  {policy.fileSize && (
                    <p className="text-xs text-blue-600 mt-1">
                      {(policy.fileSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                  )}
                </div>
              )}

              {/* Timeframe Information */}
              <div className="mt-4 space-y-2">
                {policy.effectiveDate && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Effective:</span>
                    <span className="text-gray-900">{new Date(policy.effectiveDate).toLocaleDateString()}</span>
                  </div>
                )}
                {policy.expiryDate && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Expires:</span>
                    <span className={`${new Date(policy.expiryDate) < new Date() ? 'text-red-600' : 'text-gray-900'}`}>
                      {new Date(policy.expiryDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {policy.reviewDate && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Next Review:</span>
                    <span className={`${new Date(policy.reviewDate) < new Date() ? 'text-orange-600' : 'text-gray-900'}`}>
                      {new Date(policy.reviewDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {policy.lastReviewDate && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Last Reviewed:</span>
                    <span className="text-gray-900">{new Date(policy.lastReviewDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Content Preview (only if no file) */}
              {!policy.filePath && policy.content && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {policy.content.substring(0, 150)}...
                  </p>
                </div>
              )}

              <div className="mt-6 flex justify-between items-center pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  Updated: {new Date(policy.updatedAt).toLocaleDateString()}
                </div>
                <div className="flex space-x-2">
                  {/* Only CEO and CTO can view policy details */}
                  {user && (user.role === 'CEO' || user.role === 'CTO') && (
                    <button
                      onClick={() => setSelectedPolicy(policy)}
                      className="text-blue-600 hover:text-blue-500 text-sm font-medium transition-colors"
                    >
                      View Details
                    </button>
                  )}
                  
                  {(policy.status === "IN_PROGRESS" || policy.status === "DRAFT" ||  policy.status === "REVIEW") && (
                    <button
                      onClick={() => handleEditPolicy(policy)}
                      className="text-green-600 hover:text-green-500 text-sm font-medium transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  
                  {/* Only allow deletion of DRAFT, IN_PROGRESS, and REJECTED policies */}
                  {['DRAFT', 'IN_PROGRESS', 'REJECTED'].includes(policy.status) && (
                    <button
                      onClick={() => setDeleteConfirm(policy.id)}
                      className="text-red-600 hover:text-red-500 text-sm font-medium transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
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
            totalItems={totalPolicies}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </div>
      )}

      {policies.length === 0 && (
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {user && (user.role === 'CEO' || user.role === 'CTO') 
              ? 'No policies in the system'
              : 'No policies created by you'
            }
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {user && (user.role === 'CEO' || user.role === 'CTO') 
              ? 'Get started by creating the first company policy.'
              : 'Get started by creating your first policy.'
            }
          </p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-2">Delete Policy</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this policy? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePolicy(deleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <PolicyForm
          onSubmit={handleCreatePolicy}
          onCancel={handleCancelForm}
          editingPolicy={editingPolicy}
          isEditing={!!editingPolicy}
        />
      )}

      {selectedPolicy && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-4/5 xl:w-3/4 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="mt-3">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{selectedPolicy.title}</h3>
                  <p className="text-sm text-gray-500">
                    Version {selectedPolicy.version} • by {selectedPolicy.owner?.name || 'Unknown'} • {selectedPolicy.owner?.department || 'No Department'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPolicy(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex space-x-2 mb-4">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(selectedPolicy.category)}`}>
                  {selectedPolicy.category}
                </span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedPolicy.status)}`}>
                  {selectedPolicy.status}
                </span>
              </div>

              {/* Main content in two columns */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column - Policy details */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Version and Change Summary */}
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-800 mb-2">Version Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Current Version:</span>
                        <span className="ml-2 text-gray-900 font-semibold">v{selectedPolicy.version}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedPolicy.status)}`}>
                          {selectedPolicy.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      💡 View the Activity Timeline on the right to see detailed change history, including what was modified, when, and by whom.
                    </div>
                  </div>

                  {/* Timeframe Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-800 mb-2">Policy Timeline</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Created:</span>
                        <span className="ml-2 text-gray-900">{new Date(selectedPolicy.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Last Updated:</span>
                        <span className="ml-2 text-gray-900">{new Date(selectedPolicy.updatedAt).toLocaleDateString()}</span>
                      </div>
                      {selectedPolicy.effectiveDate && (
                        <div>
                          <span className="text-gray-500">Effective Date:</span>
                          <span className="ml-2 text-gray-900">{new Date(selectedPolicy.effectiveDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {selectedPolicy.expiryDate && (
                        <div>
                          <span className="text-gray-500">Expiry Date:</span>
                          <span className={`ml-2 ${new Date(selectedPolicy.expiryDate) < new Date() ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                            {new Date(selectedPolicy.expiryDate).toLocaleDateString()}
                            {new Date(selectedPolicy.expiryDate) < new Date() && ' (Expired)'}
                          </span>
                        </div>
                      )}
                      {selectedPolicy.reviewDate && (
                        <div>
                          <span className="text-gray-500">Next Review:</span>
                          <span className={`ml-2 ${new Date(selectedPolicy.reviewDate) < new Date() ? 'text-orange-600 font-medium' : 'text-gray-900'}`}>
                            {new Date(selectedPolicy.reviewDate).toLocaleDateString()}
                            {new Date(selectedPolicy.reviewDate) < new Date() && ' (Due)'}
                          </span>
                        </div>
                      )}
                      {selectedPolicy.lastReviewDate && (
                        <div>
                          <span className="text-gray-500">Last Reviewed:</span>
                          <span className="ml-2 text-gray-900">{new Date(selectedPolicy.lastReviewDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* File Information */}
                  {selectedPolicy.filePath ? (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-800 mb-2">Policy Document</h4>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-blue-900">{selectedPolicy.fileName}</p>
                            {selectedPolicy.fileSize && (
                              <p className="text-xs text-blue-700">
                                {(selectedPolicy.fileSize / 1024 / 1024).toFixed(2)} MB
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <a
                            href={selectedPolicy.filePath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100"
                          >
                            View
                          </a>
                          <a
                            href={selectedPolicy.filePath}
                            download={selectedPolicy.fileName}
                            className="inline-flex items-center px-3 py-1 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : selectedPolicy.content && (
                    <div className="prose max-w-none">
                      <h4 className="text-sm font-medium text-gray-800 mb-2">Policy Content</h4>
                      <div className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                        {selectedPolicy.content}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right column - Activity Timeline */}
                <div className="lg:col-span-1">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-800 mb-4 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Activity Timeline
                    </h4>
                    <div className="max-h-96 overflow-y-auto">
                      <PolicyChangeHistory 
                        policyId={selectedPolicy.id}
                        policyTitle={selectedPolicy.title}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}