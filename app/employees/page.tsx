'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import EmployeeForm from '@/components/EmployeeForm';
import EmployeeResources from '@/components/EmployeeResources';
import ProtectedRoute from '@/components/ProtectedRoute';
import Pagination from '@/components/Pagination';
import { Role, Status } from '@/types';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  status: Status;
  joiningDate: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  manager?: {
    id: string;
    name: string;
    email: string;
  };
  subordinates?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingDependencies, setViewingDependencies] = useState<string | null>(null);
  const [viewingResources, setViewingResources] = useState<{ id: string; name: string } | null>(null);
  const [dependencies, setDependencies] = useState<any>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalEmployees, setTotalEmployees] = useState(0);

  useEffect(() => {
    fetchEmployees();
  }, [currentPage, itemsPerPage]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`/api/employees?page=${currentPage}&limit=${itemsPerPage}`);
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || data);
        setTotalEmployees(data.total || data.length);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
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

  const totalPages = Math.ceil(totalEmployees / itemsPerPage);

  const handleCreateEmployee = async (employeeData: any) => {
    if (submitting) return; // Prevent double submissions
    
    setSubmitting(true);
    try {
      if (editingEmployee) {
        // Update existing employee
        const response = await fetch(`/api/employees?id=${editingEmployee.id}&updatedBy=system`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(employeeData),
        });

        if (response.ok) {
          const updatedEmployee = await response.json();
          setEmployees(employees.map(emp => emp.id === editingEmployee.id ? updatedEmployee : emp));
          setShowForm(false);
          setEditingEmployee(null);
        } else {
          const errorData = await response.json();
          alert(`Failed to update employee: ${errorData.error}`);
        }
      } else {
        // Create new employee
        const response = await fetch('/api/employees', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(employeeData),
        });

        if (response.ok) {
          const newEmployee = await response.json();
          setEmployees([newEmployee, ...employees]);
          setShowForm(false);
          
          // Redirect to resource assignment page for the new employee
          router.push(`/employees/${newEmployee.id}/assign-resources`);
        } else {
          const errorData = await response.json();
          alert(`Failed to create employee: ${errorData.error}`);
        }
      }
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Error saving employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingEmployee(null);
  };

  const handleReassignOwnership = async (fromEmployeeId: string) => {
    // Get list of other employees for selection
    const availableEmployees = employees.filter(emp => emp.id !== fromEmployeeId);
    
    if (availableEmployees.length === 0) {
      alert('No other employees available for reassignment');
      return;
    }

    // Create a simple selection dialog
    const employeeOptions = availableEmployees.map(emp => `${emp.name} (${emp.email})`).join('\n');
    const selectedName = prompt(`Select employee to reassign ownership to:\n\n${employeeOptions}\n\nEnter the full name:`);
    
    if (!selectedName) return;

    const selectedEmployee = availableEmployees.find(emp => emp.name === selectedName);
    if (!selectedEmployee) {
      alert('Employee not found. Please enter the exact name.');
      return;
    }

    try {
      const response = await fetch('/api/employees/reassign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromEmployeeId,
          toEmployeeId: selectedEmployee.id,
          reassignBy: 'system'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully reassigned ownership to ${result.toEmployee}:\n• ${result.reassigned.policies} policies\n• ${result.reassigned.documents} documents\n• ${result.reassigned.resources} resources\n• ${result.reassigned.subordinates} subordinates`);
        // Refresh dependencies
        handleViewDependencies(fromEmployeeId);
      } else {
        const errorData = await response.json();
        alert(`Failed to reassign ownership: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error reassigning ownership:', error);
      alert('Error reassigning ownership');
    }
  };

  const handleViewDependencies = async (id: string) => {
    try {
      const response = await fetch(`/api/employees/dependencies?id=${id}`);
      if (response.ok) {
        const data = await response.json();
        setDependencies(data);
        setViewingDependencies(id);
      } else {
        alert('Failed to load employee dependencies');
      }
    } catch (error) {
      console.error('Error loading dependencies:', error);
      alert('Error loading dependencies');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      const response = await fetch(`/api/employees?id=${id}&deletedBy=system`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setEmployees(employees.filter(emp => emp.id !== id));
        setDeleteConfirm(null);
      } else {
        const errorData = await response.json();
        
        // Show detailed error message if available
        if (errorData.details) {
          const details = errorData.details;
          let detailMessage = 'This employee has the following associated records:\n';
          if (details.policies > 0) detailMessage += `• ${details.policies} policies\n`;
          if (details.documents > 0) detailMessage += `• ${details.documents} documents\n`;
          if (details.resources > 0) detailMessage += `• ${details.resources} resources\n`;
          if (details.accessRequests > 0) detailMessage += `• ${details.accessRequests} access requests\n`;
          if (details.approvals > 0) detailMessage += `• ${details.approvals} approvals\n`;
          if (details.workflows > 0) detailMessage += `• ${details.workflows} workflows\n`;
          detailMessage += '\nPlease reassign or remove these records before deleting the employee.';
          
          alert(`${errorData.error}\n\n${detailMessage}`);
        } else {
          alert(`Failed to delete employee: ${errorData.error}`);
        }
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Error deleting employee. Please try again.');
    }
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case Status.ACTIVE:
        return 'bg-green-100 text-green-800';
      case Status.INACTIVE:
        return 'bg-gray-100 text-gray-800';
      case Status.RESIGNED:
        return 'bg-red-100 text-red-800';
      case Status.ON_LEAVE:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: Role) => {
    // Handle the new role types
    if (role.toString().includes('MANAGER')) {
      return 'bg-indigo-100 text-indigo-800';
    }
    if (role.toString().includes('DEVELOPER')) {
      return 'bg-blue-100 text-blue-800';
    }
    if (role.toString().includes('CEO') || role.toString().includes('CTO') || role.toString().includes('CFO')) {
      return 'bg-purple-100 text-purple-800';
    }
    
    switch (role) {
      case Role.ADMIN:
        return 'bg-purple-100 text-purple-800';
      case Role.EMPLOYEE:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading employees...</div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredRoles={['CEO', 'CTO']}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Employee Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage employee records, roles, and organizational hierarchy.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            Add Employee
          </button>
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
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Manager
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joining Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map((employee) => (
                    <tr key={employee.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {employee.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                            <div className="text-sm text-gray-500">{employee.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(employee.role)}`}>
                          {employee.role.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.manager ? employee.manager.name : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(employee.status)}`}>
                          {employee.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(employee.joiningDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleEditEmployee(employee)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => setViewingResources({ id: employee.id, name: employee.name })}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            Resources
                          </button>
                          <button 
                            onClick={() => handleViewDependencies(employee.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Dependencies
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm(employee.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalEmployees}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </div>
        </div>
      </div>

      {employees.length === 0 && (
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
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No employees</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a new employee.</p>
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
              <h3 className="text-lg font-medium text-gray-900 mt-2">Delete Employee</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this employee? This action cannot be undone.
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
                  onClick={() => handleDeleteEmployee(deleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dependencies Modal */}
      {viewingDependencies && dependencies && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Employee Dependencies</h3>
                <div className="flex space-x-2">
                  {(dependencies.policies || dependencies.documents || dependencies.resources || dependencies.subordinates) && (
                    <button
                      onClick={() => handleReassignOwnership(viewingDependencies)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Reassign All
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setViewingDependencies(null);
                      setDependencies(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dependencies.policies?.length > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Policies ({dependencies.policies.length})</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      {dependencies.policies.map((policy: any) => (
                        <li key={policy.id}>• {policy.title}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {dependencies.documents?.length > 0 && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Documents ({dependencies.documents.length})</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      {dependencies.documents.map((doc: any) => (
                        <li key={doc.id}>• {doc.title}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {dependencies.resources?.length > 0 && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-2">Resources ({dependencies.resources.length})</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      {dependencies.resources.map((resource: any) => (
                        <li key={resource.id}>• {resource.name} ({resource.type})</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {dependencies.subordinates?.length > 0 && (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-medium text-red-900 mb-2">Subordinates ({dependencies.subordinates.length})</h4>
                    <ul className="text-sm text-red-800 space-y-1">
                      {dependencies.subordinates.map((sub: any) => (
                        <li key={sub.id}>• {sub.name} ({sub.email})</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {dependencies.accessRequests?.length > 0 && (
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <h4 className="font-medium text-indigo-900 mb-2">Access Requests ({dependencies.accessRequests.length})</h4>
                    <ul className="text-sm text-indigo-800 space-y-1">
                      {dependencies.accessRequests.map((access: any) => (
                        <li key={access.id}>• {access.resource?.name} ({access.status})</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              {Object.keys(dependencies).every(key => !dependencies[key]?.length) && (
                <div className="text-center py-8">
                  <div className="text-green-600 mb-2">
                    <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">No Dependencies</h3>
                  <p className="text-gray-500">This employee can be safely deleted.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <EmployeeForm
          onSubmit={handleCreateEmployee}
          onCancel={handleCancelForm}
          employees={employees}
          editingEmployee={editingEmployee}
          isEditing={!!editingEmployee}
          submitting={submitting}
        />
      )}

      {viewingResources && (
        <EmployeeResources
          employeeId={viewingResources.id}
          employeeName={viewingResources.name}
          isOpen={!!viewingResources}
          onClose={() => setViewingResources(null)}
        />
      )}
    </div>
    </ProtectedRoute>
  );
}