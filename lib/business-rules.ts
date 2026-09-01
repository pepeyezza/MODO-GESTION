// Reglas de negocio que hoy sólo existían del lado del cliente (app.html) y que la
// creación de empresas/usuarios en el servidor tiene que replicar exactamente, para
// que una empresa creada desde la API se comporte igual que una creada a mano en la
// UI. Mantener esto en sync con las funciones equivalentes de app.html si cambian.

export const DEFAULT_EXPENSE_CATEGORIES = ['Alquiler', 'Sueldos', 'Servicios', 'Impuestos', 'Insumos', 'Marketing', 'Transporte', 'Tecnología', 'Honorarios', 'Otros'];
export const DEFAULT_INCOME_CATEGORIES = ['Ventas', 'Honorarios', 'Servicios', 'Intereses', 'Otros ingresos'];

export const COMPANY_LOGO_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#4a3aa7'];
// Misma paleta que usa app.html para el color de avatar de un usuario nuevo
// (AVATAR_COLORS) -- son literalmente los mismos 6 valores, con otro nombre acá
// sólo para que se lea bien en el contexto de usuarios.
export const AVATAR_COLORS = COMPANY_LOGO_COLORS;
export function randomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

export function isAgroCompany(sector: string, activity: string): boolean {
  const s = `${sector || ''} ${activity || ''}`.toLowerCase();
  return /agro|agropecuari|ganader|agr[ií]cola|campo|rural|tambo|forraj/.test(s);
}

export function isGastroCompany(sector: string, activity: string): boolean {
  const s = `${sector || ''} ${activity || ''}`.toLowerCase();
  return /gastronom|restaur|gourmet/.test(s);
}

export function initialsFor(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
}

export function randomLogoColor(): string {
  return COMPANY_LOGO_COLORS[Math.floor(Math.random() * COMPANY_LOGO_COLORS.length)];
}
