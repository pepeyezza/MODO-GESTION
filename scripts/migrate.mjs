// Aplica db/schema.sql contra DATABASE_URL. Usa CREATE TABLE IF NOT EXISTS, así que
// correrlo de nuevo sobre una base ya migrada no rompe nada (no es un sistema de
// migraciones incrementales con historial -- para un esquema de 3 tablas como este,
// alcanza con un único script idempotente).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Falta la variable de entorno DATABASE_URL.');
    process.exit(1);
  }
  const sql = readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(sql);
    console.log('Esquema aplicado correctamente (companies, users, global_data).');
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Error al aplicar el esquema:', err);
  process.exit(1);
});
