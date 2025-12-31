'use client';

import { useState, useEffect } from 'react';
import { WorkflowType } from '@/types';

interface ApprovalWorkflowFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  policies?: Array<{ id: string; title: string; category: string }>;
  documents?: Array<{ id: string; title: string; category: string }>;
  resources?: Array<{ id: string; name: string; type: string }>;
}

export default function ApprovalWorkflowForm({ 
  onSubmit, 
  onCancel, 
  policies = [], 
  documents = [], 
  resources = [] 
}: ApprovalWorkflowFormProps) {
  const [employees, setEmployees] = useState<Array<{ id: string; name: string; email: string; department: string }>>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [formData, setFormData] = useState({
    type: WorkflowType.ACCESS_REQUEST,
    requesterId: '',
    data: {},
    policyId: '',
    documentId: '',
    resourceId: '',
    description: '',
    justification: ''
  });

  useEffect(() => {
    fetchAccessibleEmployees();
  }, []);

  useEffect(() => {
    // Set default requester to first available employee when employees are loaded
    if (employees.length > 0 && !formData.requesterId) {
      setFormData(prev => ({ ...prev, requesterId: employees[0].id }));
    }
  }, [employees]);

  const fetchAccessibleEmployees = async () => {
    try {
      const response = await fetch('/api/employees/accessible');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      } else {
        console.error('Failed to fetch accessible employees');
      }
    } catch (error) {
      console.error('Error fetching accessible employees:', error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const workflowData = {
      type: formData.type,
      requesterId: formData.requesterId,
      data: {
        description: formData.description,
        justification: formData.justification,
        ...formData.data
      },
      policyId: formData.policyId || null,
      documentId: formData.documentId || null,
      resourceId: formData.resourceId || null
    };

    onSubmit(workflowData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const renderRelatedEntitySelect = () => {
    switch (formData.type) {
      case WorkflowType.POLICY_APPROVAL:
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700">Policy</label>
            <select
              name="policyId"
              value={formData.policyId}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Policy</option>
              {policies.map((policy) => (
                <option key={policy.id} value={policy.id}>
                  {policy.title} ({policy.category})
                </option>
              ))}
            </select>
          </div>
        );
      case WorkflowType.DOCUMENT_APPROVAL:
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700">Document</label>
            <select
              name="documentId"
              value={formData.documentId}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Document</option>
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.title} ({document.category})
                </option>
              ))}
            </select>
          </div>
        );
      case WorkflowType.IT_EQUIPMENT_REQUEST:
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700">Resource</label>
            <select
              name="resourceId"
              value={formData.resourceId}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Resource</option>
              {resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name} ({resource.type})
                </option>
              ))}
            </select>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Create Approval Workflow</h3>
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Workflow Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.values(WorkflowType).map((type) => (
                    <option key={type} value={type}>
                      {type.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Requester</label>
                <select
                  name="requesterId"
                  value={formData.requesterId}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Requester</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} ({employee.department})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {renderRelatedEntitySelect()}

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe what is being requested..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Justification</label>
              <textarea
                name="justification"
                value={formData.justification}
                onChange={handleChange}
                required
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Provide justification for this request..."
              />
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
                Create Workflow
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}