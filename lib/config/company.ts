// lib/config/company.ts
export const COMPANY_CONFIG = {
  name: 'Unisouk',
  domain: 'unisouk.com',
  defaultCEO: {
    name: 'Nihil Parmar',
    email: 'nihil@unisouk.com',
    phone: '+91 7905049280',
  },
  departments: [
    'Engineering',
    'Product',
    'Sales', 
    'Marketing',
    'HR',
    'Finance',
    'Operations',
    'Legal',
    'Executive',
    'IT',
    'Technology',
    'Data Science',
    'Accounting',
    'Customer Success',
    'Design'
  ],
  expenseCategories: [
    'travel',
    'training', 
    'office_supplies',
    'marketing',
    'software',
    'hardware',
    'other'
  ]
};

export function getCompanyName(): string {
  return COMPANY_CONFIG.name;
}

export function getCompanyDomain(): string {
  return COMPANY_CONFIG.domain;
}

export function getDepartments(): string[] {
  return COMPANY_CONFIG.departments;
}

export function getExpenseCategories(): string[] {
  return COMPANY_CONFIG.expenseCategories;
}

export function getDefaultCEO() {
  return COMPANY_CONFIG.defaultCEO;
}