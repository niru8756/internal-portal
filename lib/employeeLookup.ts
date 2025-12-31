// lib/employeeLookup.ts
import { prisma } from './prisma';

// Simple cache without intervals to avoid client-side issues
const employeeCache = new Map<string, { name: string; email: string; department: string } | null>();

export async function getEmployeeInfo(employeeId: string): Promise<{ name: string; email: string; department: string } | null> {
  if (!employeeId) return null;

  // Only run on server side
  if (typeof window !== 'undefined') {
    return null;
  }

  // Check cache first
  if (employeeCache.has(employeeId)) {
    return employeeCache.get(employeeId) || null;
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        name: true,
        email: true,
        department: true
      }
    });

    // Cache the result (including null for deleted employees)
    employeeCache.set(employeeId, employee);
    
    // Clear cache if it gets too large (simple memory management)
    if (employeeCache.size > 1000) {
      employeeCache.clear();
    }
    
    return employee;
  } catch (error) {
    console.error('Error looking up employee:', error);
    employeeCache.set(employeeId, null);
    return null;
  }
}

export async function formatManagerChange(oldManagerId: string | null, newManagerId: string | null): Promise<string> {
  const oldManager = oldManagerId ? await getEmployeeInfo(oldManagerId) : null;
  const newManager = newManagerId ? await getEmployeeInfo(newManagerId) : null;

  const oldName = oldManager ? oldManager.name : 'Unknown Manager';
  const newName = newManager ? newManager.name : 'Unknown Manager';

  if (!oldManagerId && newManagerId) {
    return `Manager assigned: ${newName}`;
  }

  if (oldManagerId && !newManagerId) {
    return `Manager removed (was: ${oldName})`;
  }

  if (oldManagerId && newManagerId) {
    return `Manager changed from ${oldName} to ${newName}`;
  }

  return 'Manager unchanged';
}