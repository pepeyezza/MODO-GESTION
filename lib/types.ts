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
  // Inversiones: línea aparte de los egresos operativos (a pedido explícito del
  // consultor), para poder analizarlas por separado en el Flujo de Fondos.
  investments: any[];
  // Escenarios de Flujo de Fondos: simulaciones "qué pasaría si" para analizar
  // inversiones a futuro -- cada uno con su propio saldo inicial, horizonte en
  // meses y lista de supuestos (items). Documento por escenario, no por empresa
  // (una empresa puede tener varios), por eso es un array y no un dict.
  cashFlowScenarios: any[];
  // Saldo inicial que usa el Flujo de Fondos REAL (el que arma solo, a partir de
  // los ingresos/egresos ya cargados) para empezar a acumular -- editable porque
  // el sistema no tiene forma de saber el saldo bancario real de la empresa al
  // día en que se empezó a cargar información.
  cashFlowOpeningBalance: number;
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
  // Matriz FODA estructurada (listas por cuadrante) y Canvas de Modelo de Negocio
  // (9 bloques) que se editan desde la página de Diagnóstico -- un único documento
  // vigente por empresa, no un historial (a diferencia de modoDiagnostics).
  swot: { fortalezas: string[]; oportunidades: string[]; debilidades: string[]; amenazas: string[] };
  canvas: {
    segmentos: string; propuesta: string; canales: string; relacion: string; ingresos: string;
    recursos: string; actividades: string; socios: string; costos: string;
  };
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
  clubMembers: any[];
  clubCategories: string[];
  clubEvents: any[];
  contentProductions: any[];
  contentProductionCosts: any[];
  contentEvents: any[];
}

export function emptyOperationalData(): OperationalData {
  return {
    finance: { incomes: [], expenses: [] },
    financeCategories: { income: [], expense: [] },
    investments: [],
    cashFlowScenarios: [],
    cashFlowOpeningBalance: 0,
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
    swot: { fortalezas: [], oportunidades: [], debilidades: [], amenazas: [] },
    canvas: { segmentos: '', propuesta: '', canales: '', relacion: '', ingresos: '', recursos: '', actividades: '', socios: '', costos: '' },
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
    clubMembers: [],
    clubCategories: [],
    clubEvents: [],
    contentProductions: [],
    contentProductionCosts: [],
    contentEvents: [],
  };
}
