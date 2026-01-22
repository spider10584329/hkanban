import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateToken } from '@/lib/auth';
import { z } from 'zod';
import axios from 'axios';

const signinSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['admin', 'agent']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = signinSchema.parse(body);

    // Handle Admin login (PulsePoint API authentication)
    if (validatedData.role === 'admin') {
      try {
        // Authenticate with PulsePoint API (add timeout to avoid long waits)
        const response = await axios.post(
          'https://api.pulsepoint.clinotag.com/api/user/project/signin',
          {
            username: validatedData.email,
            password: validatedData.password,
            projectId: process.env.PULSEPOINT_PROJECT_ID,
          },
          { timeout: 5000 }
        );

        if (response.data && response.data.status === 1) {
          // Get user details from PulsePoint (add timeout)
          const userDetailsResponse = await axios.get(
            'https://api.pulsepoint.clinotag.com/api/user/allusers',
            {
              auth: {
                username: 'admin',
                password: 'admin',
              },
              timeout: 5000,
            }
          );

          const allUsers = userDetailsResponse.data?.data || userDetailsResponse.data || [];
          const user = allUsers.find((u: { email?: string; id: number; status: number }) =>
            u.email?.toLowerCase() === validatedData.email.toLowerCase()
          );

          if (user) {
            // Generate JWT token with admin role
            const token = generateToken(user.id, 'admin');

            // Return user data and token
            const adminResponse = NextResponse.json(
              {
                success: true,
                message: 'Login successful',
                token,
                user: {
                  customerId: user.id,
                  id: user.id,
                  username: user.email,
                  email: user.email,
                  role: 'admin',
                },
              },
              { status: 200 }
            );

            // Set cookies
            adminResponse.cookies.set('token', token, {
              httpOnly: true,
              secure: false, // Set to false for localhost development
              sameSite: 'lax',
              maxAge: 7 * 24 * 60 * 60, // 7 days
              path: '/',
            });

            adminResponse.cookies.set('userRole', 'admin', {
              httpOnly: false,
              secure: false, // Set to false for localhost development
              sameSite: 'lax',
              maxAge: 7 * 24 * 60 * 60, // 7 days
              path: '/',
            });

            return adminResponse;
          }
        } else if (response.data && response.data.status === -1) {
          return NextResponse.json(
            { success: false, message: 'Account not found' },
            { status: 401 }
          );
        } else if (response.data && response.data.status === 0) {
          return NextResponse.json(
            { success: false, message: 'Incorrect password' },
            { status: 401 }
          );
        }

        return NextResponse.json(
          { success: false, message: 'Login failed: Please check your subscription status' },
          { status: 401 }
        );
      } catch (apiError: any) {
        console.error('PulsePoint API error:', apiError?.message || apiError);

        // Distinguish timeout from other errors for clearer response
        if (apiError?.code === 'ECONNABORTED') {
          return NextResponse.json(
            { success: false, message: 'External authentication service timed out' },
            { status: 504 }
          );
        }

        return NextResponse.json(
          { success: false, message: 'External authentication service unavailable' },
          { status: 503 }
        );
      }
    }

    // Handle Agent login (Local database authentication)
    if (validatedData.role === 'agent') {
      // Find user in users table by username
      const user = await prisma.user.findFirst({
        where: { 
          username: validatedData.email 
        }
      });

      if (!user) {
        return NextResponse.json(
          { success: false, message: 'This account is not registered.' },
          { status: 401 }
        );
      }

      // Check if account is active
      if (!user.isActive || user.isActive === 0) {
        return NextResponse.json(
          { success: false, message: 'Account is not active.' },
          { status: 403 }
        );
      }

      // Verify password using PBKDF2-SHA256
      const isValidPassword = await verifyPassword(
        validatedData.password,
        user.password
      );

      if (!isValidPassword) {
        return NextResponse.json(
          { success: false, message: 'Incorrect password.' },
          { status: 401 }
        );
      }

      // Generate JWT token with agent role
      const token = generateToken(user.id, 'agent');

      // Return user data and token
      const agentResponse = NextResponse.json(
        {
          success: true,
          message: 'Login successful',
          token,
          user: {
            customerId: user.manager_id,
            id: user.id,
            username: user.username,
            role: 'agent'
          },
        },
        { status: 200 }
      );

      // Set cookies
      agentResponse.cookies.set('token', token, {
        httpOnly: true,
        secure: false, // Set to false for localhost development
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });

      agentResponse.cookies.set('userRole', 'agent', {
        httpOnly: false,
        secure: false, // Set to false for localhost development
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });

      return agentResponse;
    }

    return NextResponse.json(
      { success: false, message: 'Invalid role specified' },
      { status: 400 }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Signin error:', error);
    return NextResponse.json(
      { success: false, message: 'Authentication failed' },
      { status: 500 }
    );
  }
}
