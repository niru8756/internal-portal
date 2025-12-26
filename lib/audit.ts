// lib/audit.ts
import { prisma } from "./prisma";

interface AuditLogData {
  entityType: 'EMPLOYEE' | 'RESOURCE' | 'ACCESS' | 'POLICY' | 'DOCUMENT' | 'APPROVAL_WORKFLOW';
  entityId: string;
  changedById: string;
  fieldChanged: string;
  oldValue?: string | null;
  newValue?: string | null;
}

export async function logAudit(data: AuditLogData) {
  // Only run on server side
  if (typeof window !== 'undefined') {
    console.warn('logAudit called on client side, skipping');
    return null;
  }

  try {
    const result = await prisma.auditLog.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        changedById: data.changedById,
        fieldChanged: data.fieldChanged,
        oldValue: data.oldValue || null,
        newValue: data.newValue || null,
        timestamp: new Date()
      }
    });
    return result;
  } catch (error) {
    console.error('Failed to log audit:', error);
    // Don't throw error to avoid breaking the main operation
    return null;
  }
}

export async function getAuditLogs(entityType?: string, entityId?: string, limit = 15, page = 1) {
  // Only run on server side
  if (typeof window !== 'undefined') {
    return [];
  }

  try {
    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    const skip = (page - 1) * limit;

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        changedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      skip,
      take: limit
    });

    // Handle cases where changedBy employee might be deleted
    const processedLogs = logs.map(log => {
      if (!log.changedBy) {
        // Try to extract employee info from metadata if available
        let employeeName = 'Deleted Employee';
        let employeeDepartment = 'Unknown Department';
        
        try {
          if (log.oldValue) {
            const oldData = JSON.parse(log.oldValue);
            if (oldData.name) employeeName = `${oldData.name} (Deleted)`;
            if (oldData.department) employeeDepartment = oldData.department;
          }
        } catch (e) {
          // Ignore JSON parse errors
        }

        return {
          ...log,
          changedBy: {
            id: log.changedById,
            name: employeeName,
            email: 'deleted@employee.com',
            department: employeeDepartment
          }
        };
      }
      return log;
    });

    return processedLogs;
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return [];
  }
}

export async function getAuditLogsCount(entityType?: string, entityId?: string) {
  // Only run on server side
  if (typeof window !== 'undefined') {
    return 0;
  }

  try {
    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    return await prisma.auditLog.count({ where });
  } catch (error) {
    console.error('Failed to count audit logs:', error);
    return 0;
  }
}

export async function getEntityAuditTrail(entityType: string, entityId: string) {
  return getAuditLogs(entityType, entityId);
}
