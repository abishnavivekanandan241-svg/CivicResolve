import { NextResponse } from 'next/server';
import { getCurrentUser, setSessionUser, clearSession } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { role, action } = body;

    if (action === 'logout') {
      await clearSession();
      return NextResponse.json({ success: true, user: null });
    }

    if (role === 'CITIZEN' || role === 'ADMIN') {
      const user = await setSessionUser(role);
      return NextResponse.json({ success: true, user });
    }

    return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
  } catch (error) {
    console.error('Auth API error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

