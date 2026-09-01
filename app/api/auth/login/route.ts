import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/repo';
import { sessionCookieOptions, SESSION_COOKIE, signSession, verifyPassword } from '@/lib/auth';
import { userRowToClient } from '@/lib/db-shape';

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  if (!email || !password) {
    return NextResponse.json({ error: 'missing_credentials' }, { status: 400 });
  }

  const user = await getUserByEmail(email);
  // Mismo mensaje de error tanto si el usuario no existe como si la contraseña es
  // incorrecta -- no dar pistas sobre qué emails existen.
  const genericError = () => NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });

  if (!user || !user.active) return genericError();
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return genericError();

  const token = await signSession({ userId: user.id, role: user.role, companyId: user.company_id });
  const res = NextResponse.json({ user: userRowToClient(user) });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
