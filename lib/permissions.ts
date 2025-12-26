// Role-based permission system
export type UserRole = 'CEO' | 'CTO' | 'CFO' | 'COO' | 'ENGINEERING_MANAGER' | 'PRODUCT_MANAGER' | 'SALES_MANAGER' | 'HR_MANAGER' | 'MARKETING_MANAGER' | 'FRONTEND_DEVELOPER' | 'BACKEND_DEVELOPER' | 'FULLSTACK_DEVELOPER' | 'MOBILE_DEVELOPER' | 'DEVOPS_ENGINEER' | 'QA_ENGINEER' | 'DATA_SCIENTIST' | 'UI_UX_DESIGNER' | 'SYSTEM_ADMINISTRATOR' | 'SECURITY_ENGINEER' | 'SALES_REPRESENTATIVE' | 'BUSINESS_ANALYST' | 'MARKETING_SPECIALIST' | 'HR_SPECIALIST' | 'ACCOUNTANT' | 'INTERN' | 'JUNIOR_DEVELOPER' | 'TRAINEE' | 'ADMIN' | 'EMPLOYEE';

// Admin roles with full access
export const ADMIN_ROLES: UserRole[] = ['CEO', 'CTO'];

// Manager roles with some administrative access
export const MANAGER_ROLES: UserRole[] = ['CEO', 'CTO', 'CFO', 'COO', 'ENGINEERING_MANAGER', 'PRODUCT_MANAGER', 'SALES_MANAGER', 'HR_MANAGER', 'MARKETING_MANAGER'];

// Regular employee roles
export const EMPLOYEE_ROLES: UserRole[] = [
  'FRONTEND_DEVELOPER', 'BACKEND_DEVELOPER', 'FULLSTACK_DEVELOPER', 'MOBILE_DEVELOPER',
  'DEVOPS_ENGINEER', 'QA_ENGINEER', 'DATA_SCIENTIST', 'UI_UX_DESIGNER',
  'SYSTEM_ADMINISTRATOR', 'SECURITY_ENGINEER', 'SALES_REPRESENTATIVE',
  'BUSINESS_ANALYST', 'MARKETING_SPECIALIST', 'HR_SPECIALIST', 'ACCOUNTANT',
  'INTERN', 'JUNIOR_DEVELOPER', 'TRAINEE', 'ADMIN', 'EMPLOYEE'
];

export interface UserPermissions {
  // Employee Management
  canViewAllEmployees: boolean;
  canAddEmployee: boolean;
  canEditEmployee: boolean;
  canDeleteEmployee: boolean;
  canViewOwnProfile: boolean;
  canEditOwnProfile: boolean;
  
  // Resource Management
  canViewAllResources: boolean;
  canViewOwnResources: boolean;
  canAddResource: boolean;
  canEditResource: boolean;
  canDeleteResource: boolean;
  
  // Access Management
  canRequestAccess: boolean;
  canApproveAccess: boolean;
  canViewAllAccessRequests: boolean;
  canViewOwnAccessRequests: boolean;
  
  // Policy Management
  canViewPolicies: boolean;
  canAddPolicy: boolean;
  canEditPolicy: boolean;
  canDeletePolicy: boolean;
  
  // Document Management
  canViewDocuments: boolean;
  canAddDocument: boolean;
  canEditDocument: boolean;
  canDeleteDocument: boolean;
  
  // Approval Workflows
  canViewAllApprovals: boolean;
  canViewOwnApprovals: boolean;
  canApproveWorkflows: boolean;
  
  // Audit & Timeline
  canViewAudit: boolean;
  canViewTimeline: boolean;
}

export function getUserPermissions(role: UserRole): UserPermissions {
  const isAdmin = ADMIN_ROLES.includes(role);
  const isManager = MANAGER_ROLES.includes(role);
  
  return {
    // Employee Management - Only CEO/CTO can manage employees
    canViewAllEmployees: isAdmin,
    canAddEmployee: isAdmin,
    canEditEmployee: isAdmin,
    canDeleteEmployee: isAdmin,
    canViewOwnProfile: true, // Everyone can view their own profile
    canEditOwnProfile: true, // Everyone can edit their own profile
    
    // Resource Management - Only CEO/CTO can manage resources
    canViewAllResources: isAdmin,
    canViewOwnResources: true, // Everyone can view their assigned resources
    canAddResource: isAdmin,
    canEditResource: isAdmin,
    canDeleteResource: isAdmin,
    
    // Access Management - Everyone can request, only CEO/CTO can approve
    canRequestAccess: true, // Everyone can request access
    canApproveAccess: isAdmin,
    canViewAllAccessRequests: isAdmin,
    canViewOwnAccessRequests: true,
    
    // Policy Management - Everyone can add policies, only CEO/CTO can edit/delete
    canViewPolicies: true,
    canAddPolicy: true, // Everyone can add policies
    canEditPolicy: isAdmin,
    canDeletePolicy: isAdmin,
    
    // Document Management - Limited access for regular employees
    canViewDocuments: true,
    canAddDocument: isManager, // Managers and above can add documents
    canEditDocument: isAdmin,
    canDeleteDocument: isAdmin,
    
    // Approval Workflows - Only CEO/CTO can approve
    canViewAllApprovals: isAdmin,
    canViewOwnApprovals: true,
    canApproveWorkflows: isAdmin,
    
    // Audit & Timeline - Only CEO/CTO can view
    canViewAudit: isAdmin,
    canViewTimeline: isAdmin,
  };
}

export function hasPermission(userRole: UserRole, permission: keyof UserPermissions): boolean {
  const permissions = getUserPermissions(userRole);
  return permissions[permission];
}

export function isAdmin(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function isManager(role: UserRole): boolean {
  return MANAGER_ROLES.includes(role);
}

// Helper function to check if user can access a specific page
export function canAccessPage(userRole: UserRole, page: string): boolean {
  const permissions = getUserPermissions(userRole);
  
  switch (page) {
    case '/employees':
      return permissions.canViewAllEmployees;
    case '/resources':
      return permissions.canViewAllResources || permissions.canViewOwnResources;
    case '/access':
      return permissions.canViewAllAccessRequests || permissions.canViewOwnAccessRequests;
    case '/policies':
      return permissions.canViewPolicies;
    case '/documents':
      return permissions.canViewDocuments;
    case '/approvals':
      return permissions.canViewAllApprovals || permissions.canViewOwnApprovals;
    case '/audit':
      return permissions.canViewAudit;
    case '/timeline':
      return permissions.canViewTimeline;
    case '/profile':
      return permissions.canViewOwnProfile;
    default:
      return true; // Allow access to dashboard and other general pages
  }
}