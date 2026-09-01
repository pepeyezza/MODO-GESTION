// Siembra una base recién creada con los datos de demostración (3 empresas, 7
// usuarios) extraídos del propio app.html por scripts/extract-demo-data.mjs.
// Pensado para correr UNA sola vez contra una base vacía -- si ya hay empresas
// cargadas, se aborta en vez de duplicar/corromper datos (correr de nuevo sobre una
// base ya sembrada no es un caso soportado; para "resetear" hay que vaciar las
// tablas a mano primero).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { hashPassword } from '../lib/auth';
import { extractOperationalData } from '../lib/db-shape';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface DemoCompany {
  id: string; name: string; legalName: string; cuit: string; activity: string;
  sector: string; city: string; founded: number; website: string; logoColor: string;
  initials: string; responsible: string; modules: string[]; status: string;
  billingEstimate: number; description: string; social: Record<string, string>;
  contacts: Array<Record<string, string>>; lastUpdated: string; managementProgress: number;
  createdAt: string; targetMarginPct: number;
}
interface DemoUser {
  id: string; name: string; email: string; role: string; companyId: string | null;
  avatarColor: string; active: boolean; allowedModules: string[];
  permissions: Record<string, string[]>; title: string;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Falta DATABASE_URL.');

  const raw = readFileSync(path.join(__dirname, 'demo-data.json'), 'utf8');
  const demoDb = JSON.parse(raw) as {
    companies: DemoCompany[]; users: DemoUser[]; homeContent: Record<string, unknown>;
    activityLog: Array<{ companyId: string | null }>;
    [key: string]: any;
  };

  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT COUNT(*)::int AS n FROM companies');
    if (existing.rows[0].n > 0) {
      console.error(
        'Ya hay empresas cargadas en esta base -- no se vuelve a sembrar para no duplicar/corromper datos.\n' +
        'Si querés reiniciar con datos de demostración desde cero, vaciá las tablas primero (TRUNCATE companies, users, global_data;) y volvé a correr este script.',
      );
      process.exit(1);
    }

    await client.query('BEGIN');

    const credentials: Array<{ email: string; password: string; role: string; company: string }> = [];

    for (const c of demoDb.companies) {
      const operationalData = extractOperationalData(demoDb, c.id);
      await client.query(
        `INSERT INTO companies
          (id, name, legal_name, cuit, activity, sector, city, founded, website, logo_color,
           initials, responsible, modules, status, billing_estimate, description, social,
           contacts, last_updated, management_progress, created_at, target_margin_pct,
           operational_data, data_version)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,0)`,
        [
          c.id, c.name, c.legalName, c.cuit, c.activity, c.sector, c.city, c.founded ?? null,
          c.website || '', c.logoColor, c.initials, c.responsible, JSON.stringify(c.modules || []),
          c.status, c.billingEstimate || 0, c.description || '', JSON.stringify(c.social || {}),
          JSON.stringify(c.contacts || []), c.lastUpdated, c.managementProgress || 0, c.createdAt,
          c.targetMarginPct || 45, JSON.stringify(operationalData),
        ],
      );
    }

    for (const u of demoDb.users) {
      // Contraseña de demostración distinta por usuario (no una única contraseña
      // universal hardcodeada) -- se imprime una sola vez al final de este script.
      const password = `Demo-${u.id}-2026`;
      const passwordHash = await hashPassword(password);
      await client.query(
        `INSERT INTO users
          (id, email, password_hash, name, role, company_id, avatar_color, active,
           allowed_modules, permissions, title)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          u.id, u.email, passwordHash, u.name, u.role, u.companyId, u.avatarColor,
          u.active, JSON.stringify(u.allowedModules || []), JSON.stringify(u.permissions || {}),
          u.title || '',
        ],
      );
      const companyName = u.companyId ? demoDb.companies.find(c => c.id === u.companyId)?.name || u.companyId : '(consultor, todas las empresas)';
      credentials.push({ email: u.email, password, role: u.role, company: companyName });
    }

    const globalActivityLog = (demoDb.activityLog || []).filter(a => a.companyId === null);
    await client.query(
      `INSERT INTO global_data (id, home_content, activity_log, data_version)
       VALUES (1, $1, $2, 0)
       ON CONFLICT (id) DO UPDATE SET home_content = EXCLUDED.home_content, activity_log = EXCLUDED.activity_log`,
      [JSON.stringify(demoDb.homeContent || {}), JSON.stringify(globalActivityLog)],
    );

    await client.query('COMMIT');

    console.log('\n✅ Base sembrada:', demoDb.companies.length, 'empresas,', demoDb.users.length, 'usuarios.\n');
    console.log('⚠️  CONTRASEÑAS DE DEMOSTRACIÓN -- cambialas antes de dar acceso real a alguien:\n');
    console.table(credentials);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Error al sembrar la base:', err);
  process.exit(1);
});
