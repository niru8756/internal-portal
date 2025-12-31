'use client';

import { useState } from 'react';
import { getDepartments, getExpenseCategories } from '@/lib/config/company';

interface OperationalRequestFormProps {
  currentUserId: string;
  requestType: 'IT_EQUIPMENT' | 'SOFTWARE_LICENSE' | 'EXPENSE_APPROVAL' | 'HIRING';
  onClose: () => void;
  onSuccess: () => void;
}

export default function OperationalRequestForm({ 
  currentUserId, 
  requestType, 
  onClose, 
  onSuccess 
}: OperationalRequestFormProps) {
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const workflowType = `${requestType}_REQUEST`;
      
      const response = await fetch('/api/workflows/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: workflowType,
          requesterId: currentUserId,
          data: formData
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert('Request submitted successfully!');
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        alert(`Failed to submit request: ${error.error}`);
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => {
    switch (requestType) {
      case 'IT_EQUIPMENT':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Equipment Name
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.name || ''}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Equipment Type
              </label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.type || ''}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
              >
                <option value="">Select type</option>
                <option value="laptop">Laptop</option>
                <option value="desktop">Desktop</option>
                <option value="monitor">Monitor</option>
                <option value="mobile">Mobile Device</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Cost ($)
              </label>
              <input
                type="number"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.cost || ''}
                onChange={(e) => setFormData({...formData, cost: parseFloat(e.target.value)})}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Justification
              </label>
              <textarea
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.justification || ''}
                onChange={(e) => setFormData({...formData, justification: e.target.value})}
              />
            </div>
          </>
        );

      case 'SOFTWARE_LICENSE':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Software Name
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.name || ''}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                License Type
              </label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.licenseType || ''}
                onChange={(e) => setFormData({...formData, licenseType: e.target.value})}
              >
                <option value="">Select type</option>
                <option value="individual">Individual License</option>
                <option value="team">Team License</option>
                <option value="enterprise">Enterprise License</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Annual Cost ($)
              </label>
              <input
                type="number"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.cost || ''}
                onChange={(e) => setFormData({...formData, cost: parseFloat(e.target.value)})}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Justification
              </label>
              <textarea
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.justification || ''}
                onChange={(e) => setFormData({...formData, justification: e.target.value})}
              />
            </div>
          </>
        );

      case 'EXPENSE_APPROVAL':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expense Category
              </label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.category || ''}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                <option value="">Select category</option>
                {getExpenseCategories().map(category => (
                  <option key={category} value={category}>
                    {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount ($)
              </label>
              <input
                type="number"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.amount || ''}
                onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.description || ''}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Justification
              </label>
              <textarea
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.justification || ''}
                onChange={(e) => setFormData({...formData, justification: e.target.value})}
              />
            </div>
          </>
        );

      case 'HIRING':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Position Title
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.position || ''}
                onChange={(e) => setFormData({...formData, position: e.target.value})}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.department || ''}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
              >
                <option value="">Select department</option>
                {getDepartments().map(department => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employment Type
              </label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.employmentType || ''}
                onChange={(e) => setFormData({...formData, employmentType: e.target.value})}
              >
                <option value="">Select type</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Justification
              </label>
              <textarea
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.justification || ''}
                onChange={(e) => setFormData({...formData, justification: e.target.value})}
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (requestType) {
      case 'IT_EQUIPMENT': return 'Request IT Equipment';
      case 'SOFTWARE_LICENSE': return 'Request Software License';
      case 'EXPENSE_APPROVAL': return 'Request Expense Approval';
      case 'HIRING': return 'Request New Hire';
      default: return 'Submit Request';
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">{getTitle()}</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            {renderForm()}
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}