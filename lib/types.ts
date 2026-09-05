export type Role = 'SUPER_ADMIN' | 'ADMIN_EMPRESA' | 'USUARIO_EMPRESA';

// Fila cruda tal como sale de la tabla "companies" (columnas en snake_case).
export interface CompanyRow {
  id: string;
  name: string;
  legal_name: string;
  cuit: string;
  activity: string;
  sector: string;
  city: string;
  founded: number | null;
  website: string;
  logo_color: string;
  initials: string;
  responsible: string;
  modules: string[];
  status: string;
  billing_estimate: number;
  description: string;
  social: { instagram?: string; linkedin?: string; web?: string };
  contacts: Array<{ name: string; role: string; phone: string; email: string }>;
  last_updated: string;
  management_progress: number;
  created_at: string;
  target_margin_pct: number;
  operational_data: OperationalData;
  data_version: number;
}

// Fila cruda tal como sale de la tabla "users".
export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: Role;
  company_id: string | null;
  avatar_color: string;
  active: boolean;
  allowed_modules: string[];
  permissions: Record<string, string[]>;
  title: string;
}

export interface GlobalDataRow {
  id: number;
  home_content: Record<string, unknown>;
  activity_log: unknown[];
  data_version: number;
}

// Forma del documento JSON operational_data guardado por empresa — el equivalente
// a las claves per-empresa de emptyDB() en app.html, sin el campo companyId
// (cada item lo recupera al viajar por la red, ver lib/db-shape.ts).
export interface OperationalData {
  finance: { incomes: any[]; expenses: any[] };
  financeCategories: { income: string[]; expense: string[] };
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
  modoWeights: Record<string, number>;
  consulting: { diagnostics: any[]; actions: any[]; meetings: any[]; notes: any[] };
  helpRequests: any[];
  videoCalls: any[];
  chatMessages: any[];
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
  companyLogo: string;
}

export function emptyOperationalData(): OperationalData {
  return {
    finance: { incomes: [], expenses: [] },
    financeCategories: { income: [], expense: [] },
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
    companyLogo: '',
  };
}
