import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { logTimelineActivity } from '@/lib/timeline';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (token) {
      const user = await getUserFromToken(token);
      
      if (user) {
        // Log logout activity
        try {
          await logTimelineActivity({
            entityType: 'EMPLOYEE',
            entityId: user.id,
            activityType: 'EMPLOYEE_LOGOUT',
            title: 'User logged out',
            description: `${user.name} logged out of the system`,
            metadata: {
              logoutTime: new Date().toISOString(),
              userAgent: request.headers.get('user-agent'),
              ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
            },
            performedBy: user.id,
            employeeId: user.id
          });
        } catch (logError) {
          console.error('Failed to log logout activity:', logError);
        }
      }
    }

    // Clear the auth cookie
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0 // Expire immediately
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}