// lib/roleAuthClient.ts - Client-safe role authorization functions

// Define operational approval hierarchy
export const EXECUTIVE_ROLES = ['CEO', 'CTO', 'CFO', 'COO'];
export const DEPARTMENT_HEAD_ROLES = ['ENGINEERING_MANAGER', 'PRODUCT_MANAGER', 'SALES_MANAGER', 'HR_MANAGER', 'MARKETING_MANAGER'];
export const OPERATIONAL_MANAGER_ROLES = ['SYSTEM_ADMINISTRATOR', 'SECURITY_ENGINEER'];
export const ALL_MANAGER_ROLES = [...EXECUTIVE_ROLES, ...DEPARTMENT_HEAD_ROLES, ...OPERATIONAL_MANAGER_ROLES];

// Operational approval functions (client-safe)
export function canApproveExecutiveLevel(role: string): boolean {
  return EXECUTIVE_ROLES.includes(role);
}

export function canApproveDepartmentLevel(role: string): boolean {
  return [...EXECUTIVE_ROLES, ...DEPARTMENT_HEAD_ROLES].includes(role);
}

export function canApproveOperationalLevel(role: string): boolean {
  return ALL_MANAGER_ROLES.includes(role);
}

export function canApproveITRequests(role: string): boolean {
  return ['CTO', 'SYSTEM_ADMINISTRATOR', 'ENGINEERING_MANAGER'].includes(role);
}

export function canApproveFinancialRequests(role: string): boolean {
  return ['CEO', 'CFO'].includes(role);
}

export function canApproveHRRequests(role: string): boolean {
  return ['CEO', 'HR_MANAGER'].includes(role);
}

export function canApproveSecurityRequests(role: string): boolean {
  return ['CTO', 'SECURITY_ENGINEER'].includes(role);
}

// Get financial approval limits by role (client-safe)
export function getFinancialApprovalLimit(role: string): number {
  switch (role) {
    case 'CEO': return Infinity;
    case 'CFO': return 50000;
    case 'CTO': return 25000;
    case 'ENGINEERING_MANAGER': return 10000;
    case 'SALES_MANAGER': return 10000;
    case 'MARKETING_MANAGER': return 10000;
    case 'HR_MANAGER': return 5000;
    default: return 1000;
  }
}

// Get approval chain for complex workflows (client-safe)
export function getApprovalChainRoles(workflowType: string, amount: number = 0): string[] {
  const chain: string[] = [];

  switch (workflowType) {
    case 'IT_EQUIPMENT_REQUEST':
      if (amount > 2000) {
        chain.push('SYSTEM_ADMINISTRATOR', 'ENGINEERING_MANAGER', 'CTO');
      } else if (amount > 500) {
        chain.push('SYSTEM_ADMINISTRATOR', 'ENGINEERING_MANAGER');
      } else {
        chain.push('SYSTEM_ADMINISTRATOR');
      }
      break;

    case 'HIRING_REQUEST':
      chain.push('ENGINEERING_MANAGER', 'HR_MANAGER', 'CEO');
      break;

    case 'VENDOR_CONTRACT_REQUEST':
      if (amount > 10000) {
        chain.push('CFO', 'CEO');
      } else {
        chain.push('CFO');
      }
      break;

    default:
      // Single approver for most workflows
      if (amount > 2000) {
        chain.push('CTO');
      } else if (amount > 500) {
        chain.push('ENGINEERING_MANAGER');
      } else {
        chain.push('SYSTEM_ADMINISTRATOR');
      }
  }

  return chain;
}