import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, generateToken } from '@/lib/auth';
import { logTimelineActivity } from '@/lib/timeline';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { email, password, confirmPassword } = await request.json();

    // Validation - only email, password, and confirmPassword are required
    if (!email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'Email, password, and confirm password are required' },
        { status: 400 }
      );
    }

    // Password confirmation validation
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if employee with this email already exists in the database
    const existingEmployee = await prisma.employee.findUnique({
      where: { email: email.toLowerCase() },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        status: true, 
        password: true 
      }
    });

    // If email doesn't exist in database, user is not allowed to signup
    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Email address not found. Please contact your administrator to create your account first.' },
        { status: 403 }
      );
    }

    // If employee already has a password set, they cannot signup again
    if (existingEmployee.password) {
      return NextResponse.json(
        { error: 'Account already activated. Please use the login page.' },
        { status: 409 }
      );
    }

    // If employee status is already ACTIVE, they cannot signup again
    if (existingEmployee.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'Account is already active. Please use the login page.' },
        { status: 409 }
      );
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Update the existing employee record with password and set status to ACTIVE
    const updatedEmployee = await prisma.employee.update({
      where: { id: existingEmployee.id },
      data: {
        password: hashedPassword,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        status: true
      }
    });

    const token = generateToken(updatedEmployee);

    // Log account activation
    try {
      await logTimelineActivity({
        entityType: 'EMPLOYEE',
        entityId: updatedEmployee.id,
        activityType: 'ACCOUNT_ACTIVATED',
        title: 'Employee account activated',
        description: `${updatedEmployee.name} activated their account and set up their password`,
        metadata: {
          activationTime: new Date().toISOString(),
          role: updatedEmployee.role,
          department: updatedEmployee.department,
          previousStatus: existingEmployee.status,
          newStatus: 'ACTIVE',
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
        },
        performedBy: updatedEmployee.id,
        employeeId: updatedEmployee.id
      });
    } catch (logError) {
      console.error('Failed to log account activation:', logError);
    }

    // Set HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      message: 'Account activated successfully! Welcome to the portal.',
      user: {
        id: updatedEmployee.id,
        email: updatedEmployee.email,
        name: updatedEmployee.name,
        role: updatedEmployee.role,
        department: updatedEmployee.department
      }
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Signup error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Account activation failed' },
      { status: 500 }
    );
  }
}