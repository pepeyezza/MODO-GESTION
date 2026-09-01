import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, hashPassword, newId } from '@/lib/auth';
import { getUserById } from '@/lib/repo';
import { getPool } from '@/lib/db';
import { userRowToClient } from '@/lib/db-shape';
import { randomAvatarColor } from '@/lib/business-rules';
import type { Role } from '@/lib/types';

interface CreateUserBody {
  name?: string; email?: string; title?: string; role?: Role; companyId?: string | null;
  active?: boolean; allowedModules?: string[]; permissions?: Record<string, string[]>; password?: string;
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sessionUser = await getUserById(session.userId);
  if (!sessionUser || !sessionUser.active) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: CreateUserBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const role = body.role;
  const companyId = role === 'SUPER_ADMIN' ? null : (body.companyId || null);

  if (!body.name || !body.email || !role || !body.password) {
    return NextResponse.json({ error: 'missing_field' }, { status: 400 });
  }
  if (body.password.length < 8) {
    return NextResponse.json({ error: 'weak_password' }, { status: 400 });
  }
  if (role !== 'SUPER_ADMIN' && !companyId) {
    return NextResponse.json({ error: 'missing_company' }, { status: 400 });
  }

  const isSuperAdmin = sessionUser.role === 'SUPER_ADMIN';
  const isOwnAdmin = sessionUser.role === 'ADMIN_EMPRESA' && sessionUser.company_id === companyId;
  // Un ADMIN_EMPRESA sólo puede crear usuarios de SU PROPIA empresa, y nunca puede
  // crear otro SUPER_ADMIN.
  if (!isSuperAdmin) {
    if (!isOwnAdmin || role === 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  const id = newId('u');
  const email = body.email.trim().toLowerCase();
  const passwordHash = await hashPassword(body.password);
  const allowedModules = role === 'USUARIO_EMPRESA' ? (body.allowedModules || []) : [];
  const permissions = role === 'USUARIO_EMPRESA' ? (body.permissions || {}) : {};

  try {
    const { rows } = await getPool().query(
      `INSERT INTO users (id, email, password_hash, name, role, company_id, avatar_color, active, allowed_modules, permissions, title)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [id, email, passwordHash, body.name, role, companyId, randomAvatarColor(), body.active !== false, JSON.stringify(allowedModules), JSON.stringify(permissions), body.title || ''],
    );
    return NextResponse.json({ user: userRowToClient(rows[0]) }, { status: 201 });
  } catch (err: any) {
    if (err?.code === '23505') {
      // unique_violation sobre users.email
      return NextResponse.json({ error: 'email_taken' }, { status: 409 });
    }
    throw err;
  }
}
