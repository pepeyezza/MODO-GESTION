import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, todayIso } from '@/lib/auth';
import { getCompanyById, getUserById } from '@/lib/repo';
import { extractOperationalData } from '@/lib/db-shape';
import { getPool } from '@/lib/db';

// Guarda los datos operativos de UNA empresa. Concurrencia optimista: el cliente
// manda la versión que tenía cuando cargó los datos (baseVersion); si alguien más
// ya guardó una versión más nueva mientras tanto, se rechaza con 409 en vez de
// pisar silenciosamente el cambio ajeno.
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await ctx.params;
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sessionUser = await getUserById(session.userId);
  if (!sessionUser || !sessionUser.active) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const isSuperAdmin = sessionUser.role === 'SUPER_ADMIN';
  if (!isSuperAdmin && sessionUser.company_id !== companyId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: { baseVersion?: number; data?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (typeof body.baseVersion !== 'number' || !body.data || typeof body.data !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const current = await getCompanyById(companyId);
  if (!current) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const operationalData = extractOperationalData(body.data as any, companyId);

  // Defensa en profundidad: un usuario que no sea SUPER_ADMIN nunca puede escribir
  // (ni borrar) las notas privadas de consultoría, incluso si su payload viene con
  // ese arreglo vacío o modificado -- se conserva lo que ya había en la base.
  if (!isSuperAdmin) {
    operationalData.consulting.notes = (current.operational_data?.consulting?.notes) || [];
  }

  const { rows } = await getPool().query(
    `UPDATE companies
     SET operational_data = $1, data_version = data_version + 1, last_updated = $2, updated_at = now()
     WHERE id = $3 AND data_version = $4
     RETURNING data_version`,
    [JSON.stringify(operationalData), todayIso(), companyId, body.baseVersion],
  );

  if (rows.length === 0) {
    // O no existe (ya lo chequeamos arriba) o la versión base ya está vieja.
    const fresh = await getCompanyById(companyId);
    return NextResponse.json({ error: 'version_conflict', currentVersion: fresh?.data_version ?? null }, { status: 409 });
  }

  return NextResponse.json({ newVersion: rows[0].data_version });
}
