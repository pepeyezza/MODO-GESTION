import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, newId, todayIso } from '@/lib/auth';
import { getUserById } from '@/lib/repo';
import { getPool } from '@/lib/db';
import { companyRowToClient } from '@/lib/db-shape';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, initialsFor, isAgroCompany, randomLogoColor } from '@/lib/business-rules';
import { emptyOperationalData } from '@/lib/types';
import type { CompanyRow } from '@/lib/types';

interface CreateCompanyBody {
  name?: string; legalName?: string; cuit?: string; activity?: string; sector?: string;
  city?: string; founded?: number | null; responsible?: string; website?: string; status?: string;
}

// Sólo el consultor (SUPER_ADMIN) da de alta empresas -- refleja el flujo de hoy en
// "Empresas" (openCompanyForm, rama de creación).
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sessionUser = await getUserById(session.userId);
  if (!sessionUser || !sessionUser.active || sessionUser.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: CreateCompanyBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const required: Array<keyof CreateCompanyBody> = ['name', 'legalName', 'cuit', 'activity', 'sector', 'city', 'responsible'];
  for (const key of required) {
    if (!body[key] || String(body[key]).trim() === '') {
      return NextResponse.json({ error: 'missing_field', field: key }, { status: 400 });
    }
  }

  const id = newId('c');
  const initials = initialsFor(body.name!);
  const logoColor = randomLogoColor();
  const targetMarginPct = /gastronom|restaur|gourmet/i.test(`${body.sector} ${body.activity}`) ? 65 : 45;
  const modules: string[] = [];
  if (isAgroCompany(body.sector!, body.activity!)) modules.push('agro');
  const today = todayIso();

  const operationalData = emptyOperationalData();
  operationalData.financeCategories = { income: [...DEFAULT_INCOME_CATEGORIES], expense: [...DEFAULT_EXPENSE_CATEGORIES] };

  const { rows } = await getPool().query(
    `INSERT INTO companies
      (id, name, legal_name, cuit, activity, sector, city, founded, website, logo_color,
       initials, responsible, modules, status, billing_estimate, description, social,
       contacts, last_updated, management_progress, created_at, target_margin_pct,
       operational_data, data_version)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,0,'',$15,$16,$17,5,$18,$19,$20,0)
     RETURNING *`,
    [
      id, body.name, body.legalName, body.cuit, body.activity, body.sector, body.city,
      body.founded ?? null, body.website || '', logoColor, initials, body.responsible,
      JSON.stringify(modules), body.status || 'Activa',
      JSON.stringify({ instagram: '', linkedin: '', web: body.website || '' }),
      JSON.stringify([{ name: body.responsible, role: 'Responsable', phone: '', email: '' }]),
      today, today, targetMarginPct, JSON.stringify(operationalData),
    ],
  );

  const created = rowToCompanyRow(rows[0]);
  return NextResponse.json({ company: companyRowToClient(created) }, { status: 201 });
}

// pg devuelve las columnas jsonb ya parseadas como objetos JS; esta función sólo
// normaliza el nombre de campo para reusar companyRowToClient sin duplicarlo.
function rowToCompanyRow(row: any): CompanyRow {
  return row as CompanyRow;
}
