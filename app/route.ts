import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Serves the single-file app (src/static/app.html) directly at "/". The app itself
// is a vanilla-JS SPA with its own client-side hash router — this route's only job
// is to hand back that one HTML document; everything else happens in the browser.
const APP_HTML_PATH = path.join(process.cwd(), 'src', 'static', 'app.html');

let cached: string | null = null;

export async function GET() {
  // En desarrollo se lee el archivo en cada request para poder iterar sin
  // reiniciar el servidor; en producción (donde el archivo no cambia entre
  // requests de una misma instancia desplegada) se cachea en memoria.
  if (!cached || process.env.NODE_ENV !== 'production') {
    cached = await readFile(APP_HTML_PATH, 'utf8');
  }
  return new Response(cached, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
