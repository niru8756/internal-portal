import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        subordinates: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, role, department, managerId } = body;

    const employee = await prisma.employee.create({
      data: {
        name,
        email,
        role,
        department,
        managerId: managerId || null,
        status: 'ACTIVE',
        joiningDate: new Date()
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Log audit trail
    await logAudit({
      entityType: 'EMPLOYEE',
      entityId: employee.id,
      changedById: 'system', // Replace with actual user ID from session
      fieldChanged: 'created',
      oldValue: null,
      newValue: JSON.stringify(employee)
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}
