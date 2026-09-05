import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, todayIso } from '@/lib/auth';
import { getCompanyById, getUserById } from '@/lib/repo';
import { getPool } from '@/lib/db';
import { companyRowToClient } from '@/lib/db-shape';
import { autoModulesFor } from '@/lib/business-rules';

interface PatchCompanyBody {
  name?: string; legalName?: string; cuit?: string; activity?: string; sector?: string;
  city?: string; founded?: number | null; responsible?: string; website?: string; status?: string;
  billingEstimate?: number; description?: string;
}

const EDITABLE_COLUMNS: Record<keyof PatchCompanyBody, string> = {
  name: 'name', legalName: 'legal_name', cuit: 'cuit', activity: 'activity', sector: 'sector',
  city: 'city', founded: 'founded', responsible: 'responsible', website: 'website', status: 'status',
  billingEstimate: 'billing_estimate', description: 'description',
};

// Editar los datos generales de una empresa -- lo puede hacer el consultor
// (cualquier empresa) o el ADMIN_EMPRESA de esa misma empresa (coincide con quién
// puede abrir "Editar empresa" / "Perfil de empresa" hoy en la UI).
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sessionUser = await getUserById(session.userId);
  if (!sessionUser || !sessionUser.active) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const isSuperAdmin = sessionUser.role === 'SUPER_ADMIN';
  const isOwnAdmin = sessionUser.role === 'ADMIN_EMPRESA' && sessionUser.company_id === id;
  if (!isSuperAdmin && !isOwnAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: PatchCompanyBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const existing = await getCompanyById(id);
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, column] of Object.entries(EDITABLE_COLUMNS)) {
    const value = (body as any)[key];
    if (value !== undefined) {
      setClauses.push(`${column} = $${i++}`);
      values.push(value);
    }
  }
  // Si el rubro/actividad quedó agropecuario, turístico, etc. después de este
  // cambio, activar el módulo correspondiente (nunca lo desactiva solo, igual
  // que G.ensureAutoModules del lado del cliente).
  const nextSector = body.sector ?? existing.sector;
  const nextActivity = body.activity ?? existing.activity;
  const autoModules = autoModulesFor(nextSector, nextActivity, existing.modules);
  let nextModules = existing.modules;
  if (autoModules.length > 0) {
    nextModules = [...existing.modules, ...autoModules.map(r => r.module)];
    setClauses.push(`modules = $${i++}`);
    values.push(JSON.stringify(nextModules));
  }

  if (setClauses.length === 0) {
    return NextResponse.json({ company: companyRowToClient(existing) });
  }

  setClauses.push(`last_updated = $${i++}`);
  values.push(todayIso());
  setClauses.push(`updated_at = now()`);
  values.push(id);

  const { rows } = await getPool().query(
    `UPDATE companies SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`,
    values,
  );

  return NextResponse.json({ company: companyRowToClient(rows[0]), autoEnabledModules: autoModules.map(r => r.label) });
}
