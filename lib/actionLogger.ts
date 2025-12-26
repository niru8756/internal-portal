// lib/actionLogger.ts
import { logAudit } from './audit';
import { logTimelineActivity } from './timeline';

interface ActionLogData {
  entityType: 'EMPLOYEE' | 'RESOURCE' | 'ACCESS' | 'POLICY' | 'DOCUMENT' | 'APPROVAL_WORKFLOW';
  entityId: string;
  action: string;
  details?: string;
  metadata?: any;
  performedBy: string;
  success: boolean;
  errorMessage?: string;
}

export async function logUserAction(data: ActionLogData) {
  try {
    // Log to audit trail
    await logAudit({
      entityType: data.entityType,
      entityId: data.entityId,
      changedById: data.performedBy,
      fieldChanged: data.action,
      oldValue: data.success ? null : 'FAILED',
      newValue: data.success ? 'SUCCESS' : (data.errorMessage || 'UNKNOWN_ERROR')
    });

    // Log to timeline
    await logTimelineActivity({
      entityType: data.entityType,
      entityId: data.entityId,
      activityType: data.success ? 'UPDATED' : 'WORKFLOW_CANCELLED',
      title: `${data.action}: ${data.success ? 'Success' : 'Failed'}`,
      description: data.details || `User ${data.success ? 'successfully' : 'unsuccessfully'} performed ${data.action}`,
      metadata: {
        action: data.action,
        success: data.success,
        errorMessage: data.errorMessage,
        ...data.metadata
      },
      performedBy: data.performedBy
    });

  } catch (error) {
    console.error('Failed to log user action:', error);
  }
}

// Helper functions for common actions
export async function logFormSubmission(
  entityType: ActionLogData['entityType'],
  entityId: string,
  formType: string,
  success: boolean,
  performedBy: string,
  errorMessage?: string,
  metadata?: any
) {
  return logUserAction({
    entityType,
    entityId,
    action: `form_submission_${formType}`,
    details: `User submitted ${formType} form`,
    success,
    performedBy,
    errorMessage,
    metadata
  });
}

export async function logButtonClick(
  entityType: ActionLogData['entityType'],
  entityId: string,
  buttonAction: string,
  success: boolean,
  performedBy: string,
  errorMessage?: string,
  metadata?: any
) {
  return logUserAction({
    entityType,
    entityId,
    action: `button_click_${buttonAction}`,
    details: `User clicked ${buttonAction} button`,
    success,
    performedBy,
    errorMessage,
    metadata
  });
}

export async function logPageView(
  entityType: ActionLogData['entityType'],
  entityId: string,
  pageName: string,
  performedBy: string,
  metadata?: any
) {
  return logUserAction({
    entityType,
    entityId,
    action: `page_view_${pageName}`,
    details: `User viewed ${pageName} page`,
    success: true,
    performedBy,
    metadata
  });
}