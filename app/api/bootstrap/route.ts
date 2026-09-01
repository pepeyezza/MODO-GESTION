import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getAllCompanies, getAllUsers, getCompanyById, getGlobalData, getUserById, getUsersByCompany } from '@/lib/repo';
import { mergeIntoDbShape, userRowToClient } from '@/lib/db-shape';

// El único endpoint que arma el "G.DB" que ve el cliente. Un SUPER_ADMIN (el
// consultor) recibe todas las empresas -- así funciona hoy y es lo que necesita
// para sus tableros comparativos. Un usuario de una empresa recibe SOLO su propia
// empresa: ni una fila de otro cliente sale de este servidor hacia su navegador.
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sessionUser = await getUserById(session.userId);
  if (!sessionUser || !sessionUser.active) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const globalData = await getGlobalData();

  if (sessionUser.role === 'SUPER_ADMIN') {
    const [companies, users] = await Promise.all([getAllCompanies(), getAllUsers()]);
    const db = mergeIntoDbShape(companies, users, globalData, 'SUPER_ADMIN');
    const companyVersions = Object.fromEntries(companies.map(c => [c.id, c.data_version]));
    return NextResponse.json({ db, currentUser: userRowToClient(sessionUser), companyVersions });
  }

  // ADMIN_EMPRESA / USUARIO_EMPRESA: acotado a su propia empresa.
  if (!sessionUser.company_id) {
    // No debería poder pasar (un usuario no-SUPER_ADMIN siempre tiene company_id),
    // pero si la fila quedó en un estado inconsistente, no le mandamos nada.
    return NextResponse.json({ error: 'company_unavailable' }, { status: 403 });
  }
  const company = await getCompanyById(sessionUser.company_id);
  if (!company || company.status === 'Pausada') {
    return NextResponse.json({ error: 'company_unavailable' }, { status: 403 });
  }
  const users = await getUsersByCompany(company.id);
  const db = mergeIntoDbShape([company], users, globalData, sessionUser.role);
  const companyVersions = { [company.id]: company.data_version };
  return NextResponse.json({ db, currentUser: userRowToClient(sessionUser), companyVersions });
}
