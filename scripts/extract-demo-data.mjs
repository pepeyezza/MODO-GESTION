// Herramienta de una sola vez (de desarrollo, no corre en producción/deploy): en vez
// de reescribir en TypeScript los ~450 líneas de generación de datos de demostración
// que ya existen en app.html (seedDatabase/buildCompanyData/buildStrategy, con su
// PRNG propio para que los datos sean realistas y reproducibles), corremos ese mismo
// código JS directamente en un contexto de Node mínimo y volcamos el resultado a
// db/demo-data.json. Ese archivo se commitea y es lo que usa db/seed.ts para poblar
// una base nueva -- así los datos de ejemplo del backend son exactamente los mismos
// que los que ya se revisaron con capturas de pantalla en el proyecto original.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_HTML = path.join(__dirname, '..', 'src', 'static', 'app.html');

function extractScriptBlocks(html) {
  const blocks = [];
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) blocks.push(m[1]);
  return blocks;
}

function main() {
  const html = readFileSync(APP_HTML, 'utf8');
  const blocks = extractScriptBlocks(html);

  // Los primeros 5 bloques son: namespace init, Parte 2, Parte 3, Parte 4, Parte 5
  // (esta última termina justo después de `G.crud = {...}`). Es exactamente el
  // código necesario para poder llamar a seedDatabase() -- nada de lo que sigue
  // (renderizado de páginas, listeners del DOM) se ejecuta nunca a nivel de módulo,
  // sólo dentro de funciones disparadas por eventos del navegador.
  const neededBlocks = blocks.slice(0, 5);
  if (neededBlocks.length < 5) {
    throw new Error(`Se esperaban al menos 5 bloques <script>, se encontraron ${blocks.length}. ¿Cambió la estructura de app.html?`);
  }

  const sandbox = {
    window: {},
    document: {
      readyState: 'complete',
      addEventListener() {},
      getElementById() { return null; },
      createElement() { return { style: {}, addEventListener() {}, appendChild() {}, classList: { add() {}, remove() {} } }; },
      querySelector() { return null; },
      querySelectorAll() { return []; },
    },
    localStorage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {},
    },
    console,
    Date,
    Math,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Map,
    Set,
    Intl,
  };
  vm.createContext(sandbox);

  for (const code of neededBlocks) {
    vm.runInContext(code, sandbox, { filename: 'app.html-extracted-part.js' });
  }

  const G = sandbox.window.GESTIONA;
  if (!G || typeof G.seedDatabase !== 'function') {
    throw new Error('No se pudo encontrar GESTIONA.seedDatabase() después de evaluar los bloques extraídos.');
  }

  const demoDb = G.seedDatabase();
  const outPath = path.join(__dirname, '..', 'db', 'demo-data.json');
  writeFileSync(outPath, JSON.stringify(demoDb, null, 2));
  console.log('Datos de demostración escritos en', outPath);
  console.log('Empresas:', demoDb.companies.map(c => `${c.id} (${c.name})`).join(', '));
  console.log('Usuarios:', demoDb.users.length);
}

main();
