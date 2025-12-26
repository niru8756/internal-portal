import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserPermissions } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const currentUser = await getUserFromToken(token);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const permissions = getUserPermissions(currentUser.role as any);
    
    let employees;

    if (permissions.canViewAllEmployees) {
      // CEO/CTO can see all employees
      employees = await prisma.employee.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          status: true,
        },
        where: {
          status: 'ACTIVE'
        },
        orderBy: {
          name: 'asc'
        }
      });
    } else {
      // Check if user is a manager and can see subordinates
      const userWithSubordinates = await prisma.employee.findUnique({
        where: { id: currentUser.id },
        include: {
          subordinates: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              department: true,
              status: true,
            },
            where: {
              status: 'ACTIVE'
            }
          }
        }
      });

      if (userWithSubordinates?.subordinates && userWithSubordinates.subordinates.length > 0) {
        // Manager can see themselves + their subordinates
        employees = [
          {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
            department: currentUser.department,
            status: 'ACTIVE'
          },
          ...userWithSubordinates.subordinates
        ];
      } else {
        // Regular employee can only see themselves
        employees = [{
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
          department: currentUser.department,
          status: 'ACTIVE'
        }];
      }
    }

    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching accessible employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}