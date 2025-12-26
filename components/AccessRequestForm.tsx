'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AccessRequestFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  resources: Array<{ id: string; name: string; type: string }>;
}

export default function AccessRequestForm({ onSubmit, onCancel, resources }: AccessRequestFormProps) {
  const { user } = useAuth();
  const [accessibleEmployees, setAccessibleEmployees] = useState<Array<{ 
    id: string; 
    name: string; 
    email: string; 
    department: string; 
    role: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    employeeId: user?.id || '', // Default to current user
    resourceId: '',
    hardwareRequest: '', // New field for hardware requests
    permissionLevel: 'READ', // Default permission level
    justification: ''
  });

  useEffect(() => {
    fetchAccessibleEmployees();
  }, []);

  useEffect(() => {
    // Set default employee to current user when user data is available
    if (user && !formData.employeeId) {
      setFormData(prev => ({ ...prev, employeeId: user.id }));
    }
  }, [user]);

  const fetchAccessibleEmployees = async () => {
    try {
      const response = await fetch('/api/employees/accessible');
      if (response.ok) {
        const employees = await response.json();
        setAccessibleEmployees(employees);
      } else {
        console.error('Failed to fetch accessible employees');
      }
    } catch (error) {
      console.error('Error fetching accessible employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least one resource type is selected
    if (!formData.resourceId && !formData.hardwareRequest) {
      alert('Please select either a software/cloud service or hardware item to request.');
      return;
    }
    
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Get selected employee info for display
  const selectedEmployee = accessibleEmployees.find(emp => emp.id === formData.employeeId);
  const isCurrentUser = selectedEmployee?.id === user?.id;

  // Filter resources to show only SOFTWARE and CLOUD types
  const accessibleResources = resources.filter(resource => 
    resource.type === 'SOFTWARE' || resource.type === 'CLOUD'
  );

  // Get physical/hardware resources for the dropdown
  const hardwareResources = resources.filter(resource => 
    resource.type === 'PHYSICAL'
  );

  // Use actual hardware resources from database, with fallback to predefined options if none exist
  const hardwareOptions = hardwareResources.length > 0 
    ? hardwareResources.map(resource => resource.name)
    : [
        'Laptop (MacBook Pro)',
        'Laptop (Dell XPS)',
        'Desktop Computer',
        'External Monitor',
        'Wireless Mouse',
        'Wireless Keyboard',
        'Webcam',
        'Headset',
        'iPad/Tablet',
        'iPhone/Mobile Device',
        'Docking Station',
        'USB Hub',
        'External Hard Drive',
        'Printer Access',
        'Other (specify in justification)'
      ];

  // Get selected resource info
  const selectedResource = accessibleResources.find(res => res.id === formData.resourceId);

  // Permission level descriptions
  const permissionDescriptions = {
    READ: 'View and read data only',
    WRITE: 'Create and modify data',
    EDIT: 'Full editing capabilities including delete',
    ADMIN: 'Administrative access with user management'
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Request Access</h3>
          
          {/* Automated Approval Notice */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">Automated Approval Process</h4>
                <p className="text-sm text-blue-700 mt-1">
                  {isCurrentUser 
                    ? 'Your access request will be automatically sent to your manager for approval.'
                    : 'This access request will be sent to the appropriate manager for approval.'
                  }
                </p>
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Employee <span className="text-red-500">*</span>
                </label>
                {loading ? (
                  <div className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50">
                    Loading employees...
                  </div>
                ) : (
                  <select
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Employee</option>
                    {accessibleEmployees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} ({employee.department})
                        {employee.id === user?.id ? ' - You' : ''}
                      </option>
                    ))}
                  </select>
                )}
                {accessibleEmployees.length === 1 && accessibleEmployees[0]?.id === user?.id && (
                  <p className="mt-1 text-xs text-gray-500">
                    You can only request access for yourself
                  </p>
                )}
                {accessibleEmployees.length > 1 && (
                  <p className="mt-1 text-xs text-gray-500">
                    You can request access for yourself and your team members
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Software/Cloud Service
                </label>
                <select
                  name="resourceId"
                  value={formData.resourceId}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Service (Optional)</option>
                  {accessibleResources.map((resource) => (
                    <option key={resource.id} value={resource.id}>
                      {resource.name} ({resource.type})
                    </option>
                  ))}
                </select>
                {accessibleResources.length === 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    No software or cloud services available for access requests
                  </p>
                )}
                {accessibleResources.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    Select a software or cloud service if needed
                  </p>
                )}
              </div>
            </div>

            {/* Hardware Request Section */}
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Hardware Request
                </div>
              </label>
              <select
                name="hardwareRequest"
                value={formData.hardwareRequest}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Hardware (Optional)</option>
                {hardwareOptions.map((hardware) => (
                  <option key={hardware} value={hardware}>
                    {hardware}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-600">
                Request physical hardware from available inventory. 
                {hardwareResources.length > 0 
                  ? `${hardwareResources.length} hardware items available in database.`
                  : 'Using default hardware options - no physical resources found in database.'
                }
                {formData.hardwareRequest === 'Other (specify in justification)' && ' Please specify details in the justification field.'}
              </p>
            </div>

            {/* Permission Level Selection - Only show when a resource is selected */}
            {formData.resourceId && selectedResource && (
              <div className="bg-gray-50 p-4 rounded-lg border">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Access Level for {selectedResource.name} <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  {Object.entries(permissionDescriptions).map(([level, description]) => (
                    <div key={level} className="flex items-start">
                      <input
                        type="radio"
                        id={`permission-${level}`}
                        name="permissionLevel"
                        value={level}
                        checked={formData.permissionLevel === level}
                        onChange={handleChange}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div className="ml-3">
                        <label htmlFor={`permission-${level}`} className="text-sm font-medium text-gray-700 cursor-pointer">
                          {level}
                        </label>
                        <p className="text-xs text-gray-500">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Contextual help based on resource type */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex items-start">
                    <svg className="h-4 w-4 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-2">
                      <p className="text-xs text-blue-700">
                        <strong>For {selectedResource.type} services:</strong>
                        {selectedResource.type === 'SOFTWARE' && (
                          <span> Choose READ for viewing data, WRITE for creating content, EDIT for full modification rights, or ADMIN for user management.</span>
                        )}
                        {selectedResource.type === 'CLOUD' && (
                          <span> Choose READ for monitoring/viewing, WRITE for deploying/creating resources, EDIT for modifying configurations, or ADMIN for account management.</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Justification <span className="text-red-500">*</span>
              </label>
              <textarea
                name="justification"
                value={formData.justification}
                onChange={handleChange}
                required
                rows={4}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Please provide a detailed justification for this request. Include:
${formData.resourceId ? `- Why you need ${formData.permissionLevel.toLowerCase()} access to ${selectedResource?.name}` : ''}
${formData.hardwareRequest ? `- Why you need ${formData.hardwareRequest}` : ''}
- How long you'll need it
- What you plan to do with it...`}
              />
              <div className="mt-2 text-xs text-gray-500">
                {formData.resourceId && formData.permissionLevel && (
                  <p>• Requesting <strong>{formData.permissionLevel}</strong> access to <strong>{selectedResource?.name}</strong></p>
                )}
                {formData.hardwareRequest && (
                  <p>• Requesting hardware: <strong>{formData.hardwareRequest}</strong></p>
                )}
                {!formData.resourceId && !formData.hardwareRequest && (
                  <p>Please select either a software/cloud service or hardware item above</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Submit Request
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}