import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const employee = await prisma.employee.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!employee) {
      // Don't reveal if email exists or not for security
      return NextResponse.json(
        { message: 'If an account with that email exists, password reset instructions have been sent.' },
        { status: 200 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Hash the reset token before storing
    const hashedResetToken = await bcrypt.hash(resetToken, 12);

    // Store reset token in database
    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        resetToken: hashedResetToken,
        resetTokenExpiry: resetTokenExpiry
      }
    });

    // In a real application, you would send an email here
    // For demo purposes, we'll just log the reset token
    console.log(`Password reset token for ${email}: ${resetToken}`);
    console.log(`Reset URL would be: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`);

    // TODO: Implement email sending
    // await sendPasswordResetEmail(email, resetToken);

    return NextResponse.json(
      { message: 'If an account with that email exists, password reset instructions have been sent.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}