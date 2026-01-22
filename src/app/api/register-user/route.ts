import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';

const registerSchema = z.object({
  adminEmail: z.string().email('Invalid admin email address'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  customerId: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Check if username already exists in users table
    const existingUser = await prisma.user.findFirst({
      where: {
        username: validatedData.username
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Username already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user in users table with pending approval status
    const user = await prisma.user.create({
      data: {
        manager_id: validatedData.customerId,
        username: validatedData.username,
        password: hashedPassword,
        isActive: 0, // Pending approval
        isPasswordRequest: 0,
      },
      select: {
        id: true,
        username: true,
        manager_id: true,
        isActive: true,
      },
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'Registration successful! Account pending approval.',
        user 
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to register user' },
      { status: 500 }
    );
  }
}
