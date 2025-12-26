// lib/systemUser.ts
import { prisma } from './prisma';

let systemUserId: string | null = null;

export async function getSystemUserId(): Promise<string> {
  // Only run on server side
  if (typeof window !== 'undefined') {
    throw new Error('getSystemUserId can only be called on the server side');
  }

  if (systemUserId) {
    return systemUserId;
  }

  try {
    const systemUser = await prisma.employee.findUnique({
      where: { email: 'system@internal-portal.com' },
      select: { id: true }
    });

    if (!systemUser) {
      console.error('System user not found. Attempting to create...');
      // Try to create system user if it doesn't exist
      const newSystemUser = await prisma.employee.create({
        data: {
          name: 'System',
          email: 'system@internal-portal.com',
          role: 'ADMIN',
          department: 'System',
          status: 'ACTIVE',
          joiningDate: new Date(),
          phone: 'N/A',
          address: 'System Generated',
          salary: 0,
          emergencyContact: 'N/A',
          emergencyPhone: 'N/A'
        }
      });
      systemUserId = newSystemUser.id;
      console.log('System user created with ID:', systemUserId);
      return systemUserId;
    }

    systemUserId = systemUser.id;
    console.log('System user found with ID:', systemUserId);
    return systemUserId;
  } catch (error) {
    console.error('Error getting system user ID:', error);
    throw error;
  }
}

export async function ensureSystemUser(): Promise<string> {
  // Only run on server side
  if (typeof window !== 'undefined') {
    throw new Error('ensureSystemUser can only be called on the server side');
  }

  try {
    return await getSystemUserId();
  } catch (error) {
    // If system user doesn't exist, create it
    console.log('Creating system user...');
    const systemUser = await prisma.employee.create({
      data: {
        name: 'System',
        email: 'system@internal-portal.com',
        role: 'ADMIN',
        department: 'System',
        status: 'ACTIVE',
        joiningDate: new Date(),
        phone: 'N/A',
        address: 'System Generated',
        salary: 0,
        emergencyContact: 'N/A',
        emergencyPhone: 'N/A'
      }
    });

    systemUserId = systemUser.id;
    return systemUserId;
  }
}