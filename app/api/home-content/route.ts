import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getGlobalData, getUserById } from '@/lib/repo';
import { getPool } from '@/lib/db';

// GET es público: la pantalla de login necesita el branding (tagline, imagen, etc.)
// antes de que exista una sesión.
export async function GET() {
  const globalData = await getGlobalData();
  return NextResponse.json({ homeContent: globalData.home_content || {} });
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sessionUser = await getUserById(session.userId);
  if (!sessionUser || !sessionUser.active || sessionUser.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: { homeContent?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (!body.homeContent || typeof body.homeContent !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  await getGlobalData(); // asegura que la fila singleton exista antes del UPDATE
  await getPool().query(
    `UPDATE global_data SET home_content = $1, data_version = data_version + 1 WHERE id = 1`,
    [JSON.stringify(body.homeContent)],
  );
  return NextResponse.json({ homeContent: body.homeContent });
}
