import { Pool } from 'pg';

// Un único pool de conexiones reutilizado entre invocaciones de funciones serverless
// (Next.js reutiliza el módulo mientras la instancia de la función siga "caliente").
declare global {
  // eslint-disable-next-line no-var
  var __gestionaPgPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!global.__gestionaPgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('Falta la variable de entorno DATABASE_URL.');
    }
    global.__gestionaPgPool = new Pool({
      connectionString,
      // Vercel Postgres / Neon requieren TLS; en desarrollo local contra un Postgres
      // sin TLS esto simplemente no se usa.
      ssl: connectionString.includes('sslmode=require') || process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : undefined,
      max: 5,
    });
  }
  return global.__gestionaPgPool;
}
