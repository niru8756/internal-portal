import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      department: decoded.department
    };
  } catch (error) {
    return null;
  }
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        status: true,
        password: true
      }
    });

    if (!employee) {
      return null;
    }

    if (employee.status !== 'ACTIVE') {
      throw new Error('Account is not active');
    }

    if (!employee.password) {
      throw new Error('Password not set. Please contact administrator.');
    }

    const isValidPassword = await verifyPassword(password, employee.password);
    if (!isValidPassword) {
      return null;
    }

    return {
      id: employee.id,
      email: employee.email,
      name: employee.name,
      role: employee.role,
      department: employee.department
    };
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

export async function createEmployee(userData: {
  name: string;
  email: string;
  password: string;
  role: string;
  department: string;
  phone?: string;
  managerId?: string;
}): Promise<AuthUser> {
  try {
    const hashedPassword = await hashPassword(userData.password);
    
    const employee = await prisma.employee.create({
      data: {
        name: userData.name,
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        role: userData.role as any,
        department: userData.department,
        status: 'ACTIVE',
        joiningDate: new Date(),
        phone: userData.phone,
        managerId: userData.managerId
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true
      }
    });

    return {
      id: employee.id,
      email: employee.email,
      name: employee.name,
      role: employee.role,
      department: employee.department
    };
  } catch (error) {
    console.error('Employee creation error:', error);
    throw error;
  }
}

export async function getUserFromToken(token: string): Promise<AuthUser | null> {
  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }

  // Verify user still exists and is active
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        status: true
      }
    });

    if (!employee || employee.status !== 'ACTIVE') {
      return null;
    }

    return {
      id: employee.id,
      email: employee.email,
      name: employee.name,
      role: employee.role,
      department: employee.department
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}