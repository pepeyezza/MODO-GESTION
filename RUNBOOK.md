# MODO Gestión — Guía de despliegue a Vercel

Esta guía asume que ya tenés cuenta de GitHub y de Vercel. Son pasos para hacer
**una sola vez**, desde tu computadora (no desde este chat, por seguridad: nunca
comparto tus credenciales de GitHub o Vercel con nadie, ni las necesito).

Vas a necesitar tener instalado [Node.js](https://nodejs.org) (versión 22 o
superior) en tu computadora para los dos comandos del Paso 5.

## Paso 1 — Subir el proyecto a GitHub

1. Descomprimí el archivo `gestiona-app.zip` en tu computadora.
2. Abrí una terminal dentro de esa carpeta y corré:

   ```bash
   git init
   git add .
   git commit -m "Versión inicial de MODO Gestión"
   ```

3. Andá a [github.com/new](https://github.com/new) y creá un repositorio nuevo
   (puede ser privado). No marques ninguna casilla de "agregar README" — el
   proyecto ya tiene sus archivos.
4. GitHub te va a mostrar unos comandos para conectar tu carpeta local con ese
   repositorio. Van a ser parecidos a esto (reemplazá `TU-USUARIO` y
   `TU-REPOSITORIO` por los tuyos):

   ```bash
   git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
   git branch -M main
   git push -u origin main
   ```

## Paso 2 — Importar el proyecto en Vercel

1. Entrá a [vercel.com/new](https://vercel.com/new).
2. Elegí "Add New… → Project" y seleccioná el repositorio que acabás de subir.
3. Vercel va a detectar automáticamente que es un proyecto Next.js. No hace
   falta tocar ninguna configuración de build.
4. Todavía no le des a "Deploy" — primero seguí con el Paso 3 (si ya lo
   apretaste, no pasa nada, se puede volver a desplegar después).

## Paso 3 — Crear la base de datos

1. Dentro del proyecto en Vercel, andá a la pestaña **Storage**.
2. Elegí crear una base **Postgres** (Neon, integrado en Vercel) y seguí el
   asistente — un par de clics, sin configuración especial.
3. Cuando termine, Vercel conecta sola la base al proyecto y crea la variable
   de entorno `DATABASE_URL` — no hay que copiarla ni escribirla a mano.

## Paso 4 — Agregar la clave de sesión (`JWT_SECRET`)

1. Andá a **Settings → Environment Variables** del proyecto.
2. Agregá una variable llamada `JWT_SECRET` con un valor largo y al azar (por
   ejemplo, generalo en tu terminal con `openssl rand -hex 32` y pegá el
   resultado). Este valor es lo que firma las sesiones de los usuarios — que
   sea privado y distinto en cada proyecto.
3. Guardá, y si el proyecto ya se había desplegado antes de este paso, hacé un
   **Redeploy** (Deployments → los tres puntos del último deploy → Redeploy).

## Paso 5 — Preparar la base de datos (una sola vez)

Este paso corre las dos únicas veces que hace falta desde tu computadora:
crear las tablas, y cargar las 3 empresas y 7 usuarios de demostración.

1. Instalá la CLI de Vercel si no la tenés: `npm install -g vercel`
2. Desde la carpeta del proyecto en tu computadora:

   ```bash
   vercel link          # conectá la carpeta con el proyecto de Vercel (te va a preguntar cuál es)
   vercel env pull .env # trae DATABASE_URL y JWT_SECRET reales a un archivo .env local
   npm install
   npm run db:migrate   # crea las tablas
   npm run db:seed      # carga las 3 empresas y 7 usuarios de demostración
   ```

3. El último comando (`db:seed`) va a imprimir en la terminal una tabla con
   los emails y las contraseñas de demostración generadas — **copiala y
   guardala en un lugar seguro**, no se vuelve a mostrar. Vas a necesitar
   alguna de esas contraseñas para el Paso 6.

   > Si por error corrés `npm run db:seed` dos veces, el script se frena solo
   > y no duplica nada — avisa que la base ya tiene empresas cargadas.

## Paso 6 — Verificar que funciona

1. Abrí la URL que te dio Vercel para el proyecto.
2. Entrá con el usuario cuyo rol figura como `SUPER_ADMIN` en la tabla que
   imprimió el Paso 5 (es el consultor). Deberías ver el dashboard general
   con las 3 empresas de ejemplo.
3. Cerrá sesión y entrá con el email de un usuario `ADMIN_EMPRESA` de una
   sola empresa (por ejemplo, el de Alfa Servicios). Deberías ver **solo**
   los datos de esa empresa — ni rastro de las otras dos.

Si algo de esto no coincide, revisá que las variables de entorno del Paso 3 y
4 estén configuradas y que el Paso 5 haya corrido sin errores.

## Antes de dar acceso real a alguien

- **Cambiá las contraseñas de demostración.** Entrá como Super Admin →
  Usuarios y permisos, y cambiale la contraseña a cada usuario real (o creá
  usuarios nuevos con contraseñas propias y desactivá o borrá los de
  ejemplo).
- **Reemplazá las 3 empresas de ejemplo** (Alfa Servicios, Beta Retail, Gamma
  Industria) por tus empresas cliente reales cuando estés conforme con cómo
  quedó todo — desde "Empresas → Nueva empresa", o dando de baja
  ("Pausada") las de ejemplo si preferís no borrarlas todavía.

## Qué cambia si en el futuro necesitás tocar código

El archivo `src/static/app.html` sigue siendo donde vive toda la lógica de
negocio y las pantallas (igual que antes). Los archivos nuevos dentro de
`app/api/` son el backend: ahí vive la autenticación, la separación de datos
entre empresas, y el guardado en la base. Cualquier cambio que subas a la
rama `main` de GitHub se despliega solo en Vercel.
