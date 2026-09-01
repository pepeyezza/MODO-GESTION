import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, hashPassword } from '@/lib/auth';
import { getUserById } from '@/lib/repo';
import { getPool } from '@/lib/db';
import { userRowToClient } from '@/lib/db-shape';
import type { Role } from '@/lib/types';

interface PatchUserBody {
  name?: string; email?: string; title?: string; role?: Role; companyId?: string | null;
  active?: boolean; allowedModules?: string[]; permissions?: Record<string, string[]>; password?: string;
}

function canManage(sessionUser: Awaited<ReturnType<typeof getUserById>>, targetCompanyId: string | null) {
  if (!sessionUser) return false;
  if (sessionUser.role === 'SUPER_ADMIN') return true;
  return sessionUser.role === 'ADMIN_EMPRESA' && sessionUser.company_id === targetCompanyId;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sessionUser = await getUserById(session.userId);
  if (!sessionUser || !sessionUser.active) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const target = await getUserById(id);
  if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!canManage(sessionUser, target.company_id)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: PatchUserBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  // Un ADMIN_EMPRESA no puede ascender a nadie a SUPER_ADMIN ni "mudar" el usuario a
  // otra empresa que no sea la suya.
  if (sessionUser.role !== 'SUPER_ADMIN') {
    if (body.role === 'SUPER_ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    if (body.companyId !== undefined && body.companyId !== sessionUser.company_id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  const push = (column: string, value: unknown) => { setClauses.push(`${column} = $${i++}`); values.push(value); };

  if (body.name !== undefined) push('name', body.name);
  if (body.email !== undefined) push('email', body.email.trim().toLowerCase());
  if (body.title !== undefined) push('title', body.title);
  if (body.role !== undefined) push('role', body.role);
  if (body.companyId !== undefined) push('company_id', body.role === 'SUPER_ADMIN' ? null : body.companyId);
  if (body.active !== undefined) push('active', body.active);
  if (body.allowedModules !== undefined) push('allowed_modules', JSON.stringify(body.allowedModules));
  if (body.permissions !== undefined) push('permissions', JSON.stringify(body.permissions));
  if (body.password) {
    if (body.password.length < 8) return NextResponse.json({ error: 'weak_password' }, { status: 400 });
    push('password_hash', await hashPassword(body.password));
  }

  if (setClauses.length === 0) return NextResponse.json({ user: userRowToClient(target) });

  setClauses.push('updated_at = now()');
  values.push(id);

  try {
    const { rows } = await getPool().query(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`,
      values,
    );
    return NextResponse.json({ user: userRowToClient(rows[0]) });
  } catch (err: any) {
    if (err?.code === '23505') return NextResponse.json({ error: 'email_taken' }, { status: 409 });
    throw err;
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sessionUser = await getUserById(session.userId);
  if (!sessionUser || !sessionUser.active) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  if (session.userId === id) {
    return NextResponse.json({ error: 'cannot_delete_self' }, { status: 400 });
  }

  const target = await getUserById(id);
  if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!canManage(sessionUser, target.company_id)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  await getPool().query('DELETE FROM users WHERE id = $1', [id]);
  return NextResponse.json({});
}
