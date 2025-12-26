'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

interface Resource {
  id: string;
  name: string;
  type: 'PHYSICAL' | 'SOFTWARE' | 'CLOUD';
  category: string;
  description?: string;
  permissionLevel: string;
  status: string;
  assignedToId?: string;
  assignedToIds?: string[];
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
}

export default function AssignResourcesPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResources, setSelectedResources] = useState<{
    physical: string[];
    software: string[];
    cloud: string[];
  }>({
    physical: [],
    software: [],
    cloud: []
  });
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (employeeId) {
      fetchEmployeeAndResources();
    }
  }, [employeeId]);

  const fetchEmployeeAndResources = async () => {
    try {
      // Fetch employee details
      const employeeResponse = await fetch(`/api/employees?id=${employeeId}`);
      if (employeeResponse.ok) {
        const employeeData = await employeeResponse.json();
        setEmployee(employeeData);
      }

      // Fetch all available resources
      const resourcesResponse = await fetch('/api/resources?limit=100');
      if (resourcesResponse.ok) {
        const resourcesData = await resourcesResponse.json();
        const allResources = resourcesData.resources || resourcesData;
        setResources(allResources);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResourceToggle = (resourceId: string, type: 'physical' | 'software' | 'cloud') => {
    setSelectedResources(prev => ({
      ...prev,
      [type]: prev[type].includes(resourceId)
        ? prev[type].filter(id => id !== resourceId)
        : [...prev[type], resourceId]
    }));
  };

  const handleAssignResources = async () => {
    if (!employee) return;

    setAssigning(true);
    const allSelectedIds = [
      ...selectedResources.physical,
      ...selectedResources.software,
      ...selectedResources.cloud
    ];

    if (allSelectedIds.length === 0) {
      alert('Please select at least one resource to assign');
      setAssigning(false);
      return;
    }

    try {
      const assignmentPromises = allSelectedIds.map(async (resourceId) => {
        const resource = resources.find(r => r.id === resourceId);
        if (!resource) return;

        const assignmentData = {
          resourceId,
          employeeId: employee.id,
          assignmentType: resource.type === 'PHYSICAL' ? 'single' : 'multiple'
        };

        return fetch('/api/resources/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assignmentData)
        });
      });

      const results = await Promise.all(assignmentPromises);
      const successCount = results.filter(r => r?.ok).length;
      const failureCount = results.length - successCount;

      if (successCount > 0) {
        alert(`Successfully assigned ${successCount} resources to ${employee.name}${failureCount > 0 ? `. ${failureCount} assignments failed.` : '.'}`);
        
        // Redirect back to employees page
        router.push('/employees');
      } else {
        alert('Failed to assign resources. Please try again.');
      }
    } catch (error) {
      console.error('Error assigning resources:', error);
      alert('Error assigning resources');
    } finally {
      setAssigning(false);
    }
  };

  const handleSkip = () => {
    router.push('/employees');
  };

  const getResourcesByType = (type: 'PHYSICAL' | 'SOFTWARE' | 'CLOUD') => {
    return resources.filter(resource => resource.type === type);
  };

  const getSelectedCount = (type: 'physical' | 'software' | 'cloud') => {
    return selectedResources[type].length;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading employee and resources...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!employee) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Employee Not Found</h2>
            <p className="mt-2 text-gray-600">The employee you're looking for doesn't exist.</p>
            <button
              onClick={() => router.push('/employees')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Back to Employees
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Assign Resources</h1>
                <p className="mt-1 text-gray-600">
                  Assign physical, software, and cloud resources to <strong>{employee.name}</strong>
                </p>
                <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                  <span>📧 {employee.email}</span>
                  <span>👤 {employee.role}</span>
                  <span>🏢 {employee.department}</span>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Skip for Now
                </button>
                <button
                  onClick={handleAssignResources}
                  disabled={assigning || (getSelectedCount('physical') + getSelectedCount('software') + getSelectedCount('cloud')) === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assigning ? 'Assigning...' : `Assign ${getSelectedCount('physical') + getSelectedCount('software') + getSelectedCount('cloud')} Resources`}
                </button>
              </div>
            </div>
          </div>

          {/* Resource Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Physical Resources */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">Physical Assets</h3>
                      <p className="text-sm text-gray-500">Hardware and equipment</p>
                    </div>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {getSelectedCount('physical')} selected
                  </span>
                </div>
              </div>
              <div className="p-6 max-h-96 overflow-y-auto">
                <div className="space-y-3">
                  {getResourcesByType('PHYSICAL').map((resource) => (
                    <div key={resource.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`physical-${resource.id}`}
                        checked={selectedResources.physical.includes(resource.id)}
                        onChange={() => handleResourceToggle(resource.id, 'physical')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`physical-${resource.id}`} className="ml-3 flex-1 cursor-pointer">
                        <div className="text-sm font-medium text-gray-900">{resource.name}</div>
                        <div className="text-xs text-gray-500">{resource.category} • {resource.permissionLevel}</div>
                        {resource.description && (
                          <div className="text-xs text-gray-400 mt-1">{resource.description}</div>
                        )}
                      </label>
                    </div>
                  ))}
                  {getResourcesByType('PHYSICAL').length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No physical resources available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Software Resources */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">Software Licenses</h3>
                      <p className="text-sm text-gray-500">Applications and tools</p>
                    </div>
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {getSelectedCount('software')} selected
                  </span>
                </div>
              </div>
              <div className="p-6 max-h-96 overflow-y-auto">
                <div className="space-y-3">
                  {getResourcesByType('SOFTWARE').map((resource) => (
                    <div key={resource.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`software-${resource.id}`}
                        checked={selectedResources.software.includes(resource.id)}
                        onChange={() => handleResourceToggle(resource.id, 'software')}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`software-${resource.id}`} className="ml-3 flex-1 cursor-pointer">
                        <div className="text-sm font-medium text-gray-900">{resource.name}</div>
                        <div className="text-xs text-gray-500">{resource.category} • {resource.permissionLevel}</div>
                        {resource.description && (
                          <div className="text-xs text-gray-400 mt-1">{resource.description}</div>
                        )}
                      </label>
                    </div>
                  ))}
                  {getResourcesByType('SOFTWARE').length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No software resources available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Cloud Resources */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">Cloud Services</h3>
                      <p className="text-sm text-gray-500">Online platforms and services</p>
                    </div>
                  </div>
                  <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {getSelectedCount('cloud')} selected
                  </span>
                </div>
              </div>
              <div className="p-6 max-h-96 overflow-y-auto">
                <div className="space-y-3">
                  {getResourcesByType('CLOUD').map((resource) => (
                    <div key={resource.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`cloud-${resource.id}`}
                        checked={selectedResources.cloud.includes(resource.id)}
                        onChange={() => handleResourceToggle(resource.id, 'cloud')}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`cloud-${resource.id}`} className="ml-3 flex-1 cursor-pointer">
                        <div className="text-sm font-medium text-gray-900">{resource.name}</div>
                        <div className="text-xs text-gray-500">{resource.category} • {resource.permissionLevel}</div>
                        {resource.description && (
                          <div className="text-xs text-gray-400 mt-1">{resource.description}</div>
                        )}
                      </label>
                    </div>
                  ))}
                  {getResourcesByType('CLOUD').length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No cloud resources available</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          {(getSelectedCount('physical') + getSelectedCount('software') + getSelectedCount('cloud')) > 0 && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">Assignment Summary</h4>
                  <div className="mt-1 text-sm text-blue-700">
                    You're about to assign <strong>{getSelectedCount('physical') + getSelectedCount('software') + getSelectedCount('cloud')} resources</strong> to <strong>{employee.name}</strong>:
                    <ul className="mt-2 space-y-1">
                      {getSelectedCount('physical') > 0 && (
                        <li>• {getSelectedCount('physical')} Physical Asset{getSelectedCount('physical') > 1 ? 's' : ''}</li>
                      )}
                      {getSelectedCount('software') > 0 && (
                        <li>• {getSelectedCount('software')} Software License{getSelectedCount('software') > 1 ? 's' : ''}</li>
                      )}
                      {getSelectedCount('cloud') > 0 && (
                        <li>• {getSelectedCount('cloud')} Cloud Service{getSelectedCount('cloud') > 1 ? 's' : ''}</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}