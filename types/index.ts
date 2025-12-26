// Core types for Internal Portal
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  status: Status;
}

export interface ApprovalWorkflow {
  id: string;
  type: WorkflowType;
  requesterId: string;
  approverId?: string;
  status: ApprovalStatus;
  data: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  title: string;
  category: DocumentCategory;
  content: string;
  ownerId: string;
  version: number;
  status: DocumentStatus;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  serialNumber?: string;
  ownerId?: string;
  status: AssetStatus;
  location?: string;
  purchaseDate?: Date;
  warrantyExpiry?: Date;
  value?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimelineActivity {
  id: string;
  entityType: string;
  entityId: string;
  activityType: ActivityType;
  title: string;
  description?: string;
  metadata?: any;
  timestamp: Date;
  performedBy: string;
  performer: {
    id: string;
    name: string;
    email: string;
    department: string;
  };
}

export enum Role {
  // Executive Roles
  CEO = 'CEO',
  CTO = 'CTO',
  CFO = 'CFO',
  COO = 'COO',
  
  // Management Roles
  ENGINEERING_MANAGER = 'ENGINEERING_MANAGER',
  PRODUCT_MANAGER = 'PRODUCT_MANAGER',
  SALES_MANAGER = 'SALES_MANAGER',
  HR_MANAGER = 'HR_MANAGER',
  MARKETING_MANAGER = 'MARKETING_MANAGER',
  
  // Development Roles
  FRONTEND_DEVELOPER = 'FRONTEND_DEVELOPER',
  BACKEND_DEVELOPER = 'BACKEND_DEVELOPER',
  FULLSTACK_DEVELOPER = 'FULLSTACK_DEVELOPER',
  MOBILE_DEVELOPER = 'MOBILE_DEVELOPER',
  DEVOPS_ENGINEER = 'DEVOPS_ENGINEER',
  QA_ENGINEER = 'QA_ENGINEER',
  
  // Other Technical Roles
  DATA_SCIENTIST = 'DATA_SCIENTIST',
  UI_UX_DESIGNER = 'UI_UX_DESIGNER',
  SYSTEM_ADMINISTRATOR = 'SYSTEM_ADMINISTRATOR',
  SECURITY_ENGINEER = 'SECURITY_ENGINEER',
  
  // Business Roles
  SALES_REPRESENTATIVE = 'SALES_REPRESENTATIVE',
  BUSINESS_ANALYST = 'BUSINESS_ANALYST',
  MARKETING_SPECIALIST = 'MARKETING_SPECIALIST',
  HR_SPECIALIST = 'HR_SPECIALIST',
  ACCOUNTANT = 'ACCOUNTANT',
  
  // Entry Level
  INTERN = 'INTERN',
  JUNIOR_DEVELOPER = 'JUNIOR_DEVELOPER',
  TRAINEE = 'TRAINEE',
  
  // General
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE'
}

export enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  RESIGNED = 'RESIGNED',
  ON_LEAVE = 'ON_LEAVE'
}

export enum WorkflowType {
  ACCESS_REQUEST = 'ACCESS_REQUEST',
  POLICY_APPROVAL = 'POLICY_APPROVAL',
  DOCUMENT_APPROVAL = 'DOCUMENT_APPROVAL',
  IT_EQUIPMENT_REQUEST = 'IT_EQUIPMENT_REQUEST',
  LEAVE_REQUEST = 'LEAVE_REQUEST'
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum DocumentCategory {
  POLICY = 'POLICY',
  PROCEDURE = 'PROCEDURE',
  GUIDELINE = 'GUIDELINE',
  TEMPLATE = 'TEMPLATE',
  MANUAL = 'MANUAL'
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

export enum AssetType {
  // Hardware
  LAPTOP = 'LAPTOP',
  DESKTOP = 'DESKTOP',
  SERVER = 'SERVER',
  MONITOR = 'MONITOR',
  KEYBOARD = 'KEYBOARD',
  MOUSE = 'MOUSE',
  PRINTER = 'PRINTER',
  SCANNER = 'SCANNER',
  PROJECTOR = 'PROJECTOR',
  WEBCAM = 'WEBCAM',
  HEADSET = 'HEADSET',
  DOCKING_STATION = 'DOCKING_STATION',
  
  // Mobile Devices
  SMARTPHONE = 'SMARTPHONE',
  TABLET = 'TABLET',
  SMARTWATCH = 'SMARTWATCH',
  
  // Network Equipment
  ROUTER = 'ROUTER',
  SWITCH = 'SWITCH',
  FIREWALL = 'FIREWALL',
  ACCESS_POINT = 'ACCESS_POINT',
  MODEM = 'MODEM',
  
  // Cloud Services
  CLOUD_STORAGE = 'CLOUD_STORAGE',
  CLOUD_COMPUTE = 'CLOUD_COMPUTE',
  CLOUD_DATABASE = 'CLOUD_DATABASE',
  CLOUD_PLATFORM = 'CLOUD_PLATFORM',
  
  // Software
  SOFTWARE_LICENSE = 'SOFTWARE_LICENSE',
  OPERATING_SYSTEM = 'OPERATING_SYSTEM',
  ANTIVIRUS = 'ANTIVIRUS',
  PRODUCTIVITY_SUITE = 'PRODUCTIVITY_SUITE',
  DEVELOPMENT_TOOL = 'DEVELOPMENT_TOOL',
  
  // Other
  FURNITURE = 'FURNITURE',
  VEHICLE = 'VEHICLE',
  OTHER = 'OTHER'
}

export enum AssetCategory {
  HARDWARE = 'HARDWARE',
  SOFTWARE = 'SOFTWARE',
  CLOUD_SERVICE = 'CLOUD_SERVICE',
  SUBSCRIPTION = 'SUBSCRIPTION',
  FURNITURE = 'FURNITURE',
  VEHICLE = 'VEHICLE',
  OTHER = 'OTHER'
}

export enum AssetStatus {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  IN_USE = 'IN_USE',
  MAINTENANCE = 'MAINTENANCE',
  REPAIR = 'REPAIR',
  RETIRED = 'RETIRED',
  LOST = 'LOST',
  STOLEN = 'STOLEN',
  DISPOSED = 'DISPOSED'
}

export enum ActivityType {
  // General CRUD operations
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  
  // Status changes
  STATUS_CHANGED = 'STATUS_CHANGED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  
  // Access and permissions
  ACCESS_GRANTED = 'ACCESS_GRANTED',
  ACCESS_REVOKED = 'ACCESS_REVOKED',
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',
  
  // File operations
  FILE_UPLOADED = 'FILE_UPLOADED',
  FILE_UPDATED = 'FILE_UPDATED',
  FILE_DELETED = 'FILE_DELETED',
  
  // Policy specific
  POLICY_REVIEWED = 'POLICY_REVIEWED',
  POLICY_EXPIRED = 'POLICY_EXPIRED',
  POLICY_RENEWED = 'POLICY_RENEWED',
  
  // Asset specific
  ASSET_ASSIGNED = 'ASSET_ASSIGNED',
  ASSET_UNASSIGNED = 'ASSET_UNASSIGNED',
  ASSET_MAINTENANCE = 'ASSET_MAINTENANCE',
  SOFTWARE_UPDATED = 'SOFTWARE_UPDATED',
  
  // Workflow specific
  WORKFLOW_STARTED = 'WORKFLOW_STARTED',
  WORKFLOW_COMPLETED = 'WORKFLOW_COMPLETED',
  WORKFLOW_CANCELLED = 'WORKFLOW_CANCELLED',
  
  // Employee specific
  EMPLOYEE_HIRED = 'EMPLOYEE_HIRED',
  EMPLOYEE_PROMOTED = 'EMPLOYEE_PROMOTED',
  EMPLOYEE_RESIGNED = 'EMPLOYEE_RESIGNED',
  
  // Document specific
  DOCUMENT_REVIEWED = 'DOCUMENT_REVIEWED',
  DOCUMENT_SIGNED = 'DOCUMENT_SIGNED',
  
  // General
  COMMENT_ADDED = 'COMMENT_ADDED',
  NOTE_ADDED = 'NOTE_ADDED'
}