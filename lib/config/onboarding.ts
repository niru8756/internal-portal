// lib/config/onboarding.ts

export interface OnboardingResourceTemplate {
  name: string;
  type: 'PHYSICAL' | 'SOFTWARE' | 'CLOUD';
  category: string;
  description?: string;
  permissionLevel?: 'read' | 'WRITE' | 'EDIT' | 'ADMIN';
  required: boolean;
  roleSpecific?: string[]; // Specific roles that get this resource
  departmentSpecific?: string[]; // Specific departments that get this resource
}

// Note: These are just templates for reference. 
// Actual onboarding will use resources from the database.
// If no resources exist, users will be prompted to create them first.

export function getStandardOnboardingResources(): OnboardingResourceTemplate[] {
  return [];
}

export function getRoleSpecificResources(): OnboardingResourceTemplate[] {
  return [];
}

export function getOnboardingResourcesForRole(role: string, department: string): OnboardingResourceTemplate[] {
  return [];
}