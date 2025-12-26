import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { token, email, newPassword } = await request.json();

    if (!token || !email || !newPassword) {
      return NextResponse.json(
        { error: 'Token, email, and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Find user with valid reset token
    const employee = await prisma.employee.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!employee || !employee.resetToken || !employee.resetTokenExpiry) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (new Date() > employee.resetTokenExpiry) {
      // Clean up expired token
      await prisma.employee.update({
        where: { id: employee.id },
        data: {
          resetToken: null,
          resetTokenExpiry: null
        }
      });

      return NextResponse.json(
        { error: 'Reset token has expired' },
        { status: 400 }
      );
    }

    // Verify the reset token
    const isValidToken = await bcrypt.compare(token, employee.resetToken);
    if (!isValidToken) {
      return NextResponse.json(
        { error: 'Invalid reset token' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        status: 'ACTIVE' // Ensure user is active after password reset
      }
    });

    return NextResponse.json(
      { message: 'Password has been reset successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}