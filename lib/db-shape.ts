// Transformaciones entre las filas de Postgres (snake_case, un documento JSON por
// empresa) y la forma "G.DB" que espera app.html (camelCase, arrays planos con
// companyId en cada item) — y su inversa, usada por el endpoint de guardado.
//
// Esta es la pieza de más riesgo de todo el backend: si algo se filtra mal acá, una
// empresa podría llegar a ver datos de otra. Ver GET /api/bootstrap y
// PUT /api/companies/[id]/sync para cómo se usa.

import type { CompanyRow, GlobalDataRow, OperationalData, Role, UserRow } from './types';
import { emptyOperationalData } from './types';

export interface ClientCompany {
  id: string;
  name: string;
  legalName: string;
  cuit: string;
  activity: string;
  sector: string;
  city: string;
  founded: number | null;
  website: string;
  logoColor: string;
  initials: string;
  responsible: string;
  modules: string[];
  status: string;
  billingEstimate: number;
  description: string;
  social: Record<string, string>;
  contacts: Array<Record<string, string>>;
  lastUpdated: string;
  managementProgress: number;
  createdAt: string;
  targetMarginPct: number;
}

export interface ClientUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string | null;
  avatarColor: string;
  active: boolean;
  allowedModules: string[];
  permissions: Record<string, string[]>;
  title: string;
}

export function companyRowToClient(row: CompanyRow): ClientCompany {
  return {
    id: row.id,
    name: row.name,
    legalName: row.legal_name,
    cuit: row.cuit,
    activity: row.activity,
    sector: row.sector,
    city: row.city,
    founded: row.founded,
    website: row.website,
    logoColor: row.logo_color,
    initials: row.initials,
    responsible: row.responsible,
    modules: row.modules || [],
    status: row.status,
    billingEstimate: row.billing_estimate,
    description: row.description,
    social: row.social || {},
    contacts: row.contacts || [],
    lastUpdated: row.last_updated,
    managementProgress: row.management_progress,
    createdAt: row.created_at,
    targetMarginPct: row.target_margin_pct,
  };
}

export function userRowToClient(row: UserRow): ClientUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    companyId: row.company_id,
    avatarColor: row.avatar_color,
    active: row.active,
    allowedModules: row.allowed_modules || [],
    permissions: row.permissions || {},
    title: row.title,
  };
  // Deliberadamente sin password_hash: esta función es el único punto por el que
  // pasan los usuarios antes de salir hacia el cliente.
}

function stamp<T extends object>(arr: T[] | undefined, companyId: string): Array<T & { companyId: string }> {
  return (arr || []).map(item => ({ ...item, companyId }));
}

function unstamp<T extends { companyId?: string }>(arr: T[] | undefined, companyId: string): Omit<T, 'companyId'>[] {
  return (arr || [])
    .filter(item => item.companyId === companyId)
    .map(({ companyId: _drop, ...rest }) => rest);
}

// La forma completa que espera el cliente (mismas claves que emptyDB() en app.html).
export interface DbShape {
  companies: ClientCompany[];
  users: ClientUser[];
  finance: { incomes: any[]; expenses: any[] };
  financeCategories: Record<string, { income: string[]; expense: string[] }>;
  costsFixed: any[];
  costsVariable: any[];
  products: any[];
  clients: any[];
  sales: any[];
  pipeline: any[];
  employees: any[];
  evaluations: any[];
  innovation: any[];
  objectives: any[];
  indicators: any[];
  modoDiagnostics: any[];
  modoWeights: Record<string, Record<string, number>>;
  consulting: { diagnostics: any[]; actions: any[]; meetings: any[]; notes: any[] };
  helpRequests: any[];
  videoCalls: any[];
  chatMessages: any[];
  homeContent: Record<string, unknown>;
  activityLog: any[];
  livestockInventory: any[];
  rainfallLog: any[];
  agroLots: any[];
  agroTasks: any[];
  agroLivestockMovements: any[];
  agroMachinery: any[];
  agroMachineryLog: any[];
  turismoUnits: any[];
  turismoBookings: any[];
  companyLogos: Record<string, string>;
}

function emptyDbShape(): DbShape {
  return {
    companies: [],
    users: [],
    finance: { incomes: [], expenses: [] },
    financeCategories: {},
    costsFixed: [],
    costsVariable: [],
    products: [],
    clients: [],
    sales: [],
    pipeline: [],
    employees: [],
    evaluations: [],
    innovation: [],
    objectives: [],
    indicators: [],
    modoDiagnostics: [],
    modoWeights: {},
    consulting: { diagnostics: [], actions: [], meetings: [], notes: [] },
    helpRequests: [],
    videoCalls: [],
    chatMessages: [],
    homeContent: {},
    activityLog: [],
    livestockInventory: [],
    rainfallLog: [],
    agroLots: [],
    agroTasks: [],
    agroLivestockMovements: [],
    agroMachinery: [],
    agroMachineryLog: [],
    turismoUnits: [],
    turismoBookings: [],
    companyLogos: {},
  };
}

const FLAT_KEYS = [
  'costsFixed', 'costsVariable', 'products', 'clients', 'sales', 'pipeline',
  'employees', 'evaluations', 'innovation', 'objectives', 'indicators',
  'modoDiagnostics', 'helpRequests', 'videoCalls', 'chatMessages',
  'activityLog', 'livestockInventory', 'rainfallLog',
  'agroLots', 'agroTasks', 'agroLivestockMovements', 'agroMachinery', 'agroMachineryLog',
  'turismoUnits', 'turismoBookings',
] as const;

// Arma la respuesta de GET /api/bootstrap a partir de las filas ya autorizadas para
// esta sesión (el caller decide QUÉ filas pasar acá -- ver la nota de seguridad en
// el route handler). `role` sólo se usa para la redacción de notas privadas de
// consultoría y del activityLog global.
export function mergeIntoDbShape(
  companies: CompanyRow[],
  users: UserRow[],
  globalData: GlobalDataRow,
  role: Role,
): DbShape {
  const db = emptyDbShape();
  db.companies = companies.map(companyRowToClient);
  db.users = users.map(userRowToClient);
  db.homeContent = globalData.home_content || {};

  for (const company of companies) {
    const od: OperationalData = { ...emptyOperationalData(), ...company.operational_data };
    const cid = company.id;

    db.finance.incomes.push(...stamp(od.finance?.incomes, cid));
    db.finance.expenses.push(...stamp(od.finance?.expenses, cid));
    db.financeCategories[cid] = od.financeCategories || { income: [], expense: [] };
    db.modoWeights[cid] = od.modoWeights || {};
    db.companyLogos[cid] = od.companyLogo || '';

    for (const key of FLAT_KEYS) {
      (db as any)[key].push(...stamp((od as any)[key], cid));
    }

    db.consulting.diagnostics.push(...stamp(od.consulting?.diagnostics, cid));
    db.consulting.actions.push(...stamp(od.consulting?.actions, cid));
    db.consulting.meetings.push(...stamp(od.consulting?.meetings, cid));
    // Notas privadas del consultor: SOLO viajan si la sesión es SUPER_ADMIN. Un
    // ADMIN_EMPRESA o USUARIO_EMPRESA de la propia empresa nunca las recibe, ni
    // siquiera de su propia empresa -- son notas del consultor para sí mismo.
    if (role === 'SUPER_ADMIN') {
      db.consulting.notes.push(...stamp(od.consulting?.notes, cid));
    }
  }

  // El log de actividad "global" (companyId: null, acciones de nivel consultor)
  // sólo tiene sentido para quien ve todas las empresas.
  if (role === 'SUPER_ADMIN' && Array.isArray(globalData.activity_log)) {
    db.activityLog.push(...globalData.activity_log);
  }

  return db;
}

// La inversa: dado el G.DB (o la porción que el cliente decide enviar) y el id de
// una empresa puntual, arma el operational_data que se guarda para ESA empresa.
// Usada por PUT /api/companies/[id]/sync. Todo lo que no pertenezca a companyId se
// descarta silenciosamente -- es una limpieza defensiva, no se confía en que el
// cliente sólo mande lo suyo.
export function extractOperationalData(dbSlice: {
  finance?: { incomes?: any[]; expenses?: any[] };
  financeCategories?: Record<string, { income: string[]; expense: string[] }>;
  modoWeights?: Record<string, Record<string, number>>;
  companyLogos?: Record<string, string>;
  consulting?: { diagnostics?: any[]; actions?: any[]; meetings?: any[]; notes?: any[] };
  [key: string]: any;
}, companyId: string): OperationalData {
  const od = emptyOperationalData();
  od.finance.incomes = unstamp(dbSlice.finance?.incomes, companyId) as any[];
  od.finance.expenses = unstamp(dbSlice.finance?.expenses, companyId) as any[];
  od.financeCategories = (dbSlice.financeCategories && dbSlice.financeCategories[companyId]) || { income: [], expense: [] };
  od.modoWeights = (dbSlice.modoWeights && dbSlice.modoWeights[companyId]) || {};
  od.companyLogo = (dbSlice.companyLogos && dbSlice.companyLogos[companyId]) || '';

  for (const key of FLAT_KEYS) {
    (od as any)[key] = unstamp(dbSlice[key], companyId);
  }

  od.consulting.diagnostics = unstamp(dbSlice.consulting?.diagnostics, companyId) as any[];
  od.consulting.actions = unstamp(dbSlice.consulting?.actions, companyId) as any[];
  od.consulting.meetings = unstamp(dbSlice.consulting?.meetings, companyId) as any[];
  od.consulting.notes = unstamp(dbSlice.consulting?.notes, companyId) as any[];

  return od;
}
