import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { UserSession } from './types';

const COOKIE_NAME = 'civicresolve_session';

export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);

    if (!sessionCookie?.value) {
      // Default to citizen demo if not set for seamless live demo experience
      return await getDemoUser('CITIZEN');
    }

    const parsed = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf-8')) as UserSession;

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: parsed.id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return await getDemoUser('CITIZEN');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as 'CITIZEN' | 'ADMIN',
    };
  } catch (error) {
    console.error('Failed to get current user:', error);
    return await getDemoUser('CITIZEN');
  }
}

export async function setSessionUser(role: 'CITIZEN' | 'ADMIN'): Promise<UserSession> {
  const cookieStore = await cookies();
  const user = await getDemoUser(role);

  const token = Buffer.from(JSON.stringify(user)).toString('base64');
  cookieStore.set(COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return user;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getDemoUser(role: 'CITIZEN' | 'ADMIN'): Promise<UserSession> {
  const email = role === 'ADMIN' ? 'admin@demo.in' : 'citizen@demo.in';
  let user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: role === 'ADMIN' ? 'Selvaraj M. (Erode Municipal Commissioner)' : 'Praveen Kumar',
        role,
      },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as 'CITIZEN' | 'ADMIN',
  };
}

