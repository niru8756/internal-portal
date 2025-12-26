'use client';

import { useState, useEffect } from 'react';

interface ResourceFormProps {
  resource?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function ResourceForm({ resource, onSubmit, onCancel }: ResourceFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    category: '',
    description: '',
    ownerId: '',
    assignedToId: '', // Who this resource is for (single for PHYSICAL)
    assignedToIds: [] as string[], // Who this resource is for (multiple for SOFTWARE/CLOUD)
    permissionLevel: 'READ', // Default permission level
    status: 'ACTIVE',
    
    // Physical asset fields
    serialNumber: '',
    modelNumber: '',
    brand: '',
    location: '',
    purchaseDate: '',
    warrantyExpiry: '',
    value: '',
    
    // Technical specifications
    operatingSystem: '',
    osVersion: '',
    processor: '',
    memory: '',
    storage: '',
    
    // Network and connectivity
    ipAddress: '',
    macAddress: '',
    hostname: '',
    
    // Software and licensing
    softwareVersion: '',
    licenseKey: '',
    licenseExpiry: '',
    
    // Cloud and subscription details
    subscriptionId: '',
    subscriptionExpiry: '',
    monthlyRate: '',
    annualRate: '',
    provider: '',
    serviceLevel: '',
    
    // Access and usage
    assignedDate: '',
    expiryDate: '',
    
    // Maintenance
    lastMaintenance: '',
    nextMaintenance: '',
    lastUpdate: '',
    updateVersion: ''
  });

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
    if (resource) {
      setFormData({
        ...formData,
        ...resource,
        purchaseDate: resource.purchaseDate ? new Date(resource.purchaseDate).toISOString().split('T')[0] : '',
        warrantyExpiry: resource.warrantyExpiry ? new Date(resource.warrantyExpiry).toISOString().split('T')[0] : '',
        licenseExpiry: resource.licenseExpiry ? new Date(resource.licenseExpiry).toISOString().split('T')[0] : '',
        subscriptionExpiry: resource.subscriptionExpiry ? new Date(resource.subscriptionExpiry).toISOString().split('T')[0] : '',
        assignedDate: resource.assignedDate ? new Date(resource.assignedDate).toISOString().split('T')[0] : '',
        expiryDate: resource.expiryDate ? new Date(resource.expiryDate).toISOString().split('T')[0] : '',
        lastMaintenance: resource.lastMaintenance ? new Date(resource.lastMaintenance).toISOString().split('T')[0] : '',
        nextMaintenance: resource.nextMaintenance ? new Date(resource.nextMaintenance).toISOString().split('T')[0] : '',
        lastUpdate: resource.lastUpdate ? new Date(resource.lastUpdate).toISOString().split('T')[0] : '',
        value: resource.value || '',
        monthlyRate: resource.monthlyRate || '',
        annualRate: resource.annualRate || '',
        assignedToId: resource.assignedToId || '',
        assignedToIds: resource.assignedToIds || [],
        permissionLevel: resource.permissionLevel || 'READ'
      });
    }
  }, [resource]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees/accessible');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error('Error fetching accessible employees:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate assignment based on resource type
    if (formData.type === 'PHYSICAL' && !formData.assignedToId) {
      alert('Physical resources must be assigned to a single employee.');
      setLoading(false);
      return;
    }

    if ((formData.type === 'SOFTWARE' || formData.type === 'CLOUD') && formData.assignedToIds.length === 0) {
      alert('Software and Cloud resources must be assigned to at least one employee.');
      setLoading(false);
      return;
    }

    try {
      const submitData = {
        ...formData,
        value: formData.value ? parseFloat(formData.value) : null,
        monthlyRate: formData.monthlyRate ? parseFloat(formData.monthlyRate) : null,
        annualRate: formData.annualRate ? parseFloat(formData.annualRate) : null,
        purchaseDate: formData.purchaseDate || null,
        warrantyExpiry: formData.warrantyExpiry || null,
        licenseExpiry: formData.licenseExpiry || null,
        subscriptionExpiry: formData.subscriptionExpiry || null,
        assignedDate: formData.assignedDate || null,
        expiryDate: formData.expiryDate || null,
        lastMaintenance: formData.lastMaintenance || null,
        nextMaintenance: formData.nextMaintenance || null,
        lastUpdate: formData.lastUpdate || null,
        // Handle assignment based on resource type
        assignedToId: formData.type === 'PHYSICAL' ? formData.assignedToId : null,
        assignedToIds: formData.type !== 'PHYSICAL' ? formData.assignedToIds : [],
        permissionLevel: formData.permissionLevel
      };

      console.log('Submitting resource data:', submitData);
      onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMultiSelectChange = (employeeId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedToIds: prev.assignedToIds.includes(employeeId)
        ? prev.assignedToIds.filter(id => id !== employeeId)
        : [...prev.assignedToIds, employeeId]
    }));
  };

  // Permission level descriptions
  const permissionDescriptions = {
    READ: 'View and read data only',
    WRITE: 'Create and modify data',
    EDIT: 'Full editing capabilities including delete',
    ADMIN: 'Administrative access with user management'
  };

  const isFieldDisabled = !formData.type;

  const renderFieldsByType = () => {
    if (!formData.type) {
      return (
        <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-blue-600 text-lg mb-2">🔒</div>
          <p className="text-blue-800 font-medium">Select a resource type to unlock additional fields</p>
          <p className="text-blue-600 text-sm">Different resource types have different configuration options</p>
          <p className="text-blue-500 text-xs mt-2">⚠️ You must also specify who this resource is for (Assigned To field)</p>
        </div>
      );
    }

    switch (formData.type) {
      case 'PHYSICAL':
        return (
          <>
            <h3 className="col-span-2 text-lg font-medium text-gray-900 border-b pb-2">Physical Asset Details</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Serial Number</label>
              <input
                type="text"
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., SN123456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Model Number</label>
              <input
                type="text"
                name="modelNumber"
                value={formData.modelNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., MacBook Pro 16-inch"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Apple, Dell, HP"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Office Floor 2, Desk 15"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Date</label>
              <input
                type="date"
                name="purchaseDate"
                value={formData.purchaseDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Warranty Expiry</label>
              <input
                type="date"
                name="warrantyExpiry"
                value={formData.warrantyExpiry}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Value ($)</label>
              <input
                type="number"
                name="value"
                value={formData.value}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 2500"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Processor</label>
              <input
                type="text"
                name="processor"
                value={formData.processor}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Intel i7-12700H"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Memory (RAM)</label>
              <input
                type="text"
                name="memory"
                value={formData.memory}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 16GB DDR4"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Storage</label>
              <input
                type="text"
                name="storage"
                value={formData.storage}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 512GB SSD"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Operating System</label>
              <input
                type="text"
                name="operatingSystem"
                value={formData.operatingSystem}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., macOS, Windows 11"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">OS Version</label>
              <input
                type="text"
                name="osVersion"
                value={formData.osVersion}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 14.2.1, 22H2"
              />
            </div>
          </>
        );

      case 'SOFTWARE':
        return (
          <>
            <h3 className="col-span-2 text-lg font-medium text-gray-900 border-b pb-2">Software License Details</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Software Version</label>
              <input
                type="text"
                name="softwareVersion"
                value={formData.softwareVersion}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., v2.1.3, 2024.1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">License Key</label>
              <input
                type="text"
                name="licenseKey"
                value={formData.licenseKey}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="License key or activation code"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">License Expiry</label>
              <input
                type="date"
                name="licenseExpiry"
                value={formData.licenseExpiry}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Annual Cost ($)</label>
              <input
                type="number"
                name="annualRate"
                value={formData.annualRate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 299"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Provider/Vendor</label>
              <input
                type="text"
                name="provider"
                value={formData.provider}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Adobe, Microsoft, Slack"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Service Level</label>
              <select
                name="serviceLevel"
                value={formData.serviceLevel}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select service level</option>
                <option value="Basic">Basic</option>
                <option value="Professional">Professional</option>
                <option value="Enterprise">Enterprise</option>
                <option value="Premium">Premium</option>
              </select>
            </div>
          </>
        );

      case 'CLOUD':
        return (
          <>
            <h3 className="col-span-2 text-lg font-medium text-gray-900 border-b pb-2">Cloud Service Details</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cloud Provider</label>
              <select
                name="provider"
                value={formData.provider}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select provider</option>
                <option value="AWS">Amazon Web Services (AWS)</option>
                <option value="Azure">Microsoft Azure</option>
                <option value="GCP">Google Cloud Platform</option>
                <option value="DigitalOcean">DigitalOcean</option>
                <option value="Heroku">Heroku</option>
                <option value="Vercel">Vercel</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Service Level/Tier</label>
              <input
                type="text"
                name="serviceLevel"
                value={formData.serviceLevel}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., t3.medium, Standard_D2s_v3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subscription ID</label>
              <input
                type="text"
                name="subscriptionId"
                value={formData.subscriptionId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Cloud subscription or instance ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Cost ($)</label>
              <input
                type="number"
                name="monthlyRate"
                value={formData.monthlyRate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 45.50"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Annual Cost ($)</label>
              <input
                type="number"
                name="annualRate"
                value={formData.annualRate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 500"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subscription Expiry</label>
              <input
                type="date"
                name="subscriptionExpiry"
                value={formData.subscriptionExpiry}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-6">
            {resource ? 'Edit Resource' : 'Add New Resource'}
          </h3>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <h3 className="col-span-2 text-lg font-medium text-gray-900 border-b pb-2">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resource Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., MacBook Pro, Slack Workspace, AWS EC2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resource Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">🔒 Select resource type to unlock fields</option>
                  <option value="PHYSICAL">🖥️ Physical Asset (Hardware, Equipment)</option>
                  <option value="SOFTWARE">📦 Software License (Applications, Tools)</option>
                  <option value="CLOUD">☁️ Cloud Service (AWS, Azure, SaaS)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  disabled={isFieldDisabled}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isFieldDisabled ? 'bg-gray-100 text-gray-500' : ''}`}
                  placeholder="e.g., Laptop, Development Tool, Infrastructure"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Owner (Who manages this resource)</label>
                <select
                  name="ownerId"
                  value={formData.ownerId}
                  onChange={handleChange}
                  disabled={isFieldDisabled}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isFieldDisabled ? 'bg-gray-100 text-gray-500' : ''}`}
                >
                  <option value="">Select owner</option>
                  {employees.map((employee: any) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} ({employee.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* Assigned To Field - Single select for PHYSICAL, Multi-select for SOFTWARE/CLOUD */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned To <span className="text-red-500">*</span>
                  <span className="text-sm text-gray-500 block">
                    {formData.type === 'PHYSICAL' 
                      ? 'Who needs/uses this device (single assignment)' 
                      : 'Who needs/uses this resource (can select multiple people)'
                    }
                  </span>
                </label>
                
                {formData.type === 'PHYSICAL' ? (
                  // Single select for physical devices
                  <select
                    name="assignedToId"
                    value={formData.assignedToId}
                    onChange={handleChange}
                    required
                    disabled={isFieldDisabled}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isFieldDisabled ? 'bg-gray-100 text-gray-500' : ''}`}
                  >
                    <option value="">Select who needs this device</option>
                    {employees.map((employee: any) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} - {employee.role.replace(/_/g, ' ')} ({employee.department})
                      </option>
                    ))}
                  </select>
                ) : (
                  // Multi-select for software and cloud resources
                  <div className="border border-gray-300 rounded-md max-h-40 overflow-y-auto">
                    {employees.length === 0 ? (
                      <div className="p-3 text-gray-500">Loading employees...</div>
                    ) : (
                      employees.map((employee: any) => (
                        <div key={employee.id} className="flex items-center p-2 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            id={`employee-${employee.id}`}
                            checked={formData.assignedToIds.includes(employee.id)}
                            onChange={() => handleMultiSelectChange(employee.id)}
                            disabled={isFieldDisabled}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label 
                            htmlFor={`employee-${employee.id}`} 
                            className="ml-2 text-sm text-gray-700 cursor-pointer flex-1"
                          >
                            {employee.name} - {employee.role.replace(/_/g, ' ')} ({employee.department})
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                )}
                
                {formData.type && formData.type !== 'PHYSICAL' && formData.assignedToIds.length > 0 && (
                  <p className="mt-1 text-xs text-blue-600">
                    Selected: {formData.assignedToIds.length} employee(s)
                  </p>
                )}
              </div>

              {/* Permission Level Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permission Level <span className="text-red-500">*</span>
                  <span className="text-sm text-gray-500 block">What level of access will be granted</span>
                </label>
                <div className="space-y-2">
                  {Object.entries(permissionDescriptions).map(([level, description]) => (
                    <div key={level} className="flex items-start">
                      <input
                        type="radio"
                        id={`permission-${level}`}
                        name="permissionLevel"
                        value={level}
                        checked={formData.permissionLevel === level}
                        onChange={handleChange}
                        disabled={isFieldDisabled}
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  disabled={isFieldDisabled}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isFieldDisabled ? 'bg-gray-100 text-gray-500' : ''}`}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={isFieldDisabled}
                  rows={3}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isFieldDisabled ? 'bg-gray-100 text-gray-500' : ''}`}
                  placeholder="Detailed description of the resource..."
                />
              </div>

              {/* Dynamic fields based on resource type */}
              {renderFieldsByType()}
            </div>
            
            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
              <button
                type="button"
                onClick={onCancel}
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
                {loading ? 'Saving...' : (resource ? 'Update Resource' : 'Create Resource')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}