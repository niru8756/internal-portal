'use client';

import { useState } from 'react';
import Timeline from '@/components/Timeline';
import Pagination from '@/components/Pagination';

export default function TimelinePage() {
  const [selectedEntityType, setSelectedEntityType] = useState<string>('');
  const [limit, setLimit] = useState(50);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setLimit(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const entityTypes = [
    { value: '', label: 'All Activities' },
    { value: 'EMPLOYEE', label: 'Employee Activities' },
    { value: 'POLICY', label: 'Policy Activities' },
    { value: 'DOCUMENT', label: 'Document Activities' },
    { value: 'ASSET', label: 'Asset Activities' },
    { value: 'APPROVAL_WORKFLOW', label: 'Workflow Activities' },
    { value: 'ACCESS', label: 'Access Activities' },
    { value: 'RESOURCE', label: 'Resource Activities' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Activity Timeline</h1>
          <p className="mt-2 text-sm text-gray-700">
            Track all activities and changes across your organization's policies, documents, assets, and workflows.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="entityType" className="block text-sm font-medium text-gray-700">
              Filter by Type
            </label>
            <select
              id="entityType"
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              {entityTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="limit" className="block text-sm font-medium text-gray-700">
              Number of Activities
            </label>
            <select
              id="limit"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value={50}>50 activities</option>
              <option value={100}>100 activities</option>
              <option value={200}>200 activities</option>
              <option value={500}>500 activities</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedEntityType('');
                setLimit(100);
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="mt-8 bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {selectedEntityType ? 
              entityTypes.find(t => t.value === selectedEntityType)?.label : 
              'All Activities'
            }
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Showing the latest {limit} activities
          </p>
        </div>
        <div className="p-6">
          <Timeline 
            entityType={selectedEntityType || undefined}
            limit={limit}
            showEntityInfo={!selectedEntityType}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </div>
      </div>

      {/* Activity Statistics */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-sm">🆕</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Created Today
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    -
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm">✏️</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Updated Today
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    -
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 text-sm">🔄</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Status Changes
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    -
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 text-sm">📁</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Files Uploaded
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    -
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}