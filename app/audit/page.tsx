'use client';

import { useState, useEffect } from 'react';
import { formatChange, parseChangesFromAuditLog, formatMultipleChanges, formatValue as formatValueFromLib } from '@/lib/changeFormatter';
import Pagination from '@/components/Pagination';

interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  fieldChanged: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
  changedBy: {
    id: string;
    name: string;
    email: string;
    department: string;
  } | null; // Allow null for deleted employees
}

export default function AuditPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    entityType: '',
    limit: 50
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalAuditLogs, setTotalAuditLogs] = useState(0);

  useEffect(() => {
    fetchAuditLogs();
  }, [filters, currentPage, itemsPerPage]);

  const fetchAuditLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.entityType) params.append('entityType', filters.entityType);
      params.append('limit', itemsPerPage.toString());
      params.append('page', currentPage.toString());

      const response = await fetch(`/api/audit?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.auditLogs || data);
        setTotalAuditLogs(data.total || data.length);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setFilters({ ...filters, limit: newItemsPerPage });
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const totalPages = Math.ceil(totalAuditLogs / itemsPerPage);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const getEntityTypeColor = (entityType: string) => {
    switch (entityType) {
      case 'EMPLOYEE':
        return 'bg-blue-100 text-blue-800';
      case 'ASSET':
        return 'bg-green-100 text-green-800';
      case 'POLICY':
        return 'bg-purple-100 text-purple-800';
      case 'DOCUMENT':
        return 'bg-yellow-100 text-yellow-800';
      case 'ACCESS':
        return 'bg-red-100 text-red-800';
      case 'APPROVAL_WORKFLOW':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatValue = (value: string | null) => {
    if (!value) return '-';
    
    // Try to parse and format the value using our improved formatter
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object') {
        // Use our improved formatValue function
        return formatValueFromLib(parsed, 'object');
      }
      return value;
    } catch {
      return value.length > 100 ? value.substring(0, 100) + '...' : value;
    }
  };

  const formatChangeDescription = (log: AuditLog) => {
    const changes = parseChangesFromAuditLog(log.oldValue || null, log.newValue || null, log.fieldChanged);
    const description = formatMultipleChanges(changes);
    
    // Add context based on entity type
    const entityContext = getEntityContext(log.entityType, log.entityId);
    
    return `${description}${entityContext}`;
  };

  const getEntityContext = (entityType: string, entityId: string) => {
    const shortId = entityId.substring(0, 8);
    switch (entityType) {
      case 'EMPLOYEE':
        return ` (Employee ${shortId})`;
      case 'POLICY':
        return ` (Policy ${shortId})`;
      case 'ASSET':
        return ` (Asset ${shortId})`;
      case 'DOCUMENT':
        return ` (Document ${shortId})`;
      case 'ACCESS':
        return ` (Access Request ${shortId})`;
      case 'APPROVAL_WORKFLOW':
        return ` (Workflow ${shortId})`;
      default:
        return ` (${shortId})`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading audit logs...</div>
      </div>
    );
  }

  console.log("auditLogs: ", auditLogs);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Audit Logs</h1>
          <p className="mt-2 text-sm text-gray-700">
            Track all system changes and activities across the platform.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Entity Type</label>
            <select
              name="entityType"
              value={filters.entityType}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="EMPLOYEE">Employee</option>
              <option value="ASSET">Asset</option>
              <option value="POLICY">Policy</option>
              <option value="DOCUMENT">Document</option>
              <option value="ACCESS">Access</option>
              <option value="APPROVAL_WORKFLOW">Approval Workflow</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Limit</label>
            <select
              name="limit"
              value={filters.limit}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={50}>50 records</option>
              <option value={100}>100 records</option>
              <option value={200}>200 records</option>
              <option value={500}>500 records</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Field Changed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Changed By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Changes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEntityTypeColor(log.entityType)} mb-1`}>
                            {log.entityType}
                          </span>
                          <span className="text-xs text-gray-500 font-mono">
                            {log.entityId.substring(0, 8)}...
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {log.fieldChanged}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {log.changedBy ? log.changedBy.name : 'Deleted Employee'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {log.changedBy ? log.changedBy.department : 'Unknown Department'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-md">
                          {/* Main change description */}
                          <div className="text-sm font-medium text-gray-900 mb-2">
                            {formatChangeDescription(log)}
                          </div>
                          
                          {/* Visual indicator for change type */}
                          <div className="flex items-center space-x-2 mb-2">
                            {log.fieldChanged === 'created' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ✓ Created
                              </span>
                            )}
                            {log.fieldChanged === 'deleted' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                ✗ Deleted
                              </span>
                            )}
                            {log.fieldChanged.includes('status') && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                ↻ Status Change
                              </span>
                            )}
                            {!['created', 'deleted'].includes(log.fieldChanged) && !log.fieldChanged.includes('status') && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                ✎ Updated
                              </span>
                            )}
                          </div>
                          
                          {/* Show detailed old/new values in a collapsible format */}
                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-500 hover:text-gray-700 flex items-center">
                              <span className="mr-1">📋</span>
                              View technical details
                            </summary>
                            <div className="mt-2 space-y-2 border-l-2 border-gray-200 pl-3">
                              {log.oldValue && (
                                <div>
                                  <span className="font-medium text-red-600">Before:</span>
                                  <div className="bg-red-50 p-2 rounded mt-1 overflow-hidden font-mono text-xs border border-red-200">
                                    {formatValue(log.oldValue).substring(0, 300)}
                                    {formatValue(log.oldValue).length > 300 && '...'}
                                  </div>
                                </div>
                              )}
                              {log.newValue && (
                                <div>
                                  <span className="font-medium text-green-600">After:</span>
                                  <div className="bg-green-50 p-2 rounded mt-1 overflow-hidden font-mono text-xs border border-green-200">
                                    {formatValue(log.newValue).substring(0, 300)}
                                    {formatValue(log.newValue).length > 300 && '...'}
                                  </div>
                                </div>
                              )}
                              <div className="text-xs text-gray-500 mt-2">
                                Field: <code className="bg-gray-100 px-1 rounded">{log.fieldChanged}</code>
                              </div>
                            </div>
                          </details>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalAuditLogs}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            )}
          </div>
        </div>
      </div>

      {auditLogs.length === 0 && (
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No audit logs</h3>
          <p className="mt-1 text-sm text-gray-500">
            Audit logs will appear here as changes are made to the system.
          </p>
        </div>
      )}
    </div>
  );
}