import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';

// Rechazo rápido y sin tocar la base: solo valida que la cookie de sesión tenga una
// firma JWT válida y no esté vencida. La autorización de verdad (rol, a qué empresa
// pertenece) se resuelve en cada route handler, que sí consulta la base.
const PUBLIC_API_PATHS = ['/api/auth/login'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_API_PATHS.includes(pathname)) return NextResponse.next();
  if (pathname === '/api/home-content' && req.method === 'GET') return NextResponse.next();

  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
