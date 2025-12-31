// lib/config/resources.ts

export const CLOUD_PROVIDERS = [
  { 
    value: 'AWS', 
    label: 'Amazon Web Services (AWS)',
    description: 'Amazon cloud services'
  },
  { 
    value: 'Azure', 
    label: 'Microsoft Azure',
    description: 'Microsoft cloud platform'
  },
  { 
    value: 'GCP', 
    label: 'Google Cloud Platform',
    description: 'Google cloud services'
  },
  { value: 'DigitalOcean', label: 'DigitalOcean', description: 'Simple cloud hosting' },
  { value: 'Heroku', label: 'Heroku', description: 'Platform as a service' },
  { value: 'Vercel', label: 'Vercel', description: 'Frontend cloud platform' },
  { value: 'Other', label: 'Other', description: 'Other cloud provider' }
];

export const RESOURCE_CATEGORIES = {
  PHYSICAL: [
    'Laptop',
    'Desktop',
    'Monitor',
    'Mobile Device',
    'Tablet',
    'Peripherals',
    'Furniture',
    'Networking',
    'Storage',
    'Other Hardware'
  ],
  SOFTWARE: [
    'Productivity Suite',
    'Design Software',
    'Development IDE',
    'Communication',
    'Design Tool',
    'Video Conferencing',
    'Project Management',
    'Security',
    'Database',
    'Other Software'
  ],
  CLOUD: [
    'Compute',
    'Database',
    'Productivity Cloud',
    'Development Platform',
    'CRM',
    'Code Repository',
    'Storage',
    'Analytics',
    'Security',
    'Other Cloud Service'
  ]
};

export function getResourceCategories(type: 'PHYSICAL' | 'SOFTWARE' | 'CLOUD'): string[] {
  return RESOURCE_CATEGORIES[type] || [];
}

export function getCloudProviders() {
  return CLOUD_PROVIDERS;
}