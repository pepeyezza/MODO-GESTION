// Acceso a datos: consultas SQL parametrizadas directas contra Postgres vía `pg`.
// Sin ORM -- para 3 tablas no hace falta, y evita depender de un binario nativo
// descargado en build time (ver nota en el runbook sobre por qué no se usó Prisma).
import { getPool } from './db';
import type { CompanyRow, GlobalDataRow, UserRow } from './types';

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const { rows } = await getPool().query(
    `SELECT id, email, password_hash, name, role, company_id, avatar_color, active,
            allowed_modules, permissions, title
     FROM users WHERE email = $1`,
    [email],
  );
  return (rows[0] as UserRow) || null;
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const { rows } = await getPool().query(
    `SELECT id, email, password_hash, name, role, company_id, avatar_color, active,
            allowed_modules, permissions, title
     FROM users WHERE id = $1`,
    [id],
  );
  return (rows[0] as UserRow) || null;
}

export async function getAllUsers(): Promise<UserRow[]> {
  const { rows } = await getPool().query(
    `SELECT id, email, password_hash, name, role, company_id, avatar_color, active,
            allowed_modules, permissions, title
     FROM users ORDER BY created_at ASC`,
  );
  return rows as UserRow[];
}

export async function getUsersByCompany(companyId: string): Promise<UserRow[]> {
  const { rows } = await getPool().query(
    `SELECT id, email, password_hash, name, role, company_id, avatar_color, active,
            allowed_modules, permissions, title
     FROM users WHERE company_id = $1 ORDER BY created_at ASC`,
    [companyId],
  );
  return rows as UserRow[];
}

const COMPANY_COLUMNS = `
  id, name, legal_name, cuit, activity, sector, city, founded, website, logo_color,
  initials, responsible, modules, status, billing_estimate, description, social,
  contacts, last_updated, management_progress, created_at, target_margin_pct,
  operational_data, data_version
`;

export async function getCompanyById(id: string): Promise<CompanyRow | null> {
  const { rows } = await getPool().query(`SELECT ${COMPANY_COLUMNS} FROM companies WHERE id = $1`, [id]);
  return (rows[0] as CompanyRow) || null;
}

export async function getAllCompanies(): Promise<CompanyRow[]> {
  const { rows } = await getPool().query(`SELECT ${COMPANY_COLUMNS} FROM companies ORDER BY created_row_at ASC`);
  return rows as CompanyRow[];
}

export async function getGlobalData(): Promise<GlobalDataRow> {
  const { rows } = await getPool().query(
    `INSERT INTO global_data (id) VALUES (1)
     ON CONFLICT (id) DO UPDATE SET id = EXCLUDED.id
     RETURNING id, home_content, activity_log, data_version`,
  );
  return rows[0] as GlobalDataRow;
}
