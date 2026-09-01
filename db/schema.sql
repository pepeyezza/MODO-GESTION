-- MODO Gestión — esquema de base de datos.
--
-- Diseño deliberadamente no normalizado por completo: cada empresa cliente guarda
-- casi todos sus datos operativos (ventas, costos, productos, indicadores, RRHH,
-- consultoría, agro, etc.) en una sola columna JSON ("operational_data"), en vez de
-- una tabla por colección. Es la arquitectura adecuada para una práctica de
-- consultoría con un puñado de empresas cliente; ver lib/db-shape.ts para el detalle
-- de qué claves tiene ese documento JSON y cómo se arma/desarma en cada request.
--
-- "companies" y "users" sí son filas reales: hacen falta para el login rápido por
-- email, para el listado de "Empresas" del consultor sin cargar todo, y para la
-- integridad referencial usuario→empresa.

CREATE TABLE IF NOT EXISTS companies (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  legal_name          TEXT NOT NULL,
  cuit                TEXT NOT NULL,
  activity            TEXT NOT NULL,
  sector              TEXT NOT NULL,
  city                TEXT NOT NULL,
  founded             INTEGER,
  website             TEXT NOT NULL DEFAULT '',
  logo_color          TEXT NOT NULL,
  initials            TEXT NOT NULL,
  responsible         TEXT NOT NULL,
  modules             JSONB NOT NULL DEFAULT '[]',
  status              TEXT NOT NULL DEFAULT 'Activa',
  billing_estimate    DOUBLE PRECISION NOT NULL DEFAULT 0,
  description         TEXT NOT NULL DEFAULT '',
  social              JSONB NOT NULL DEFAULT '{}',
  contacts            JSONB NOT NULL DEFAULT '[]',
  last_updated        TEXT NOT NULL,
  management_progress INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL,
  target_margin_pct   INTEGER NOT NULL DEFAULT 45,

  operational_data    JSONB NOT NULL DEFAULT '{}',
  data_version        INTEGER NOT NULL DEFAULT 0,

  created_row_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')),
  company_id      TEXT REFERENCES companies(id) ON DELETE CASCADE,
  avatar_color    TEXT NOT NULL DEFAULT '#7a7f8c',
  active          BOOLEAN NOT NULL DEFAULT true,
  allowed_modules JSONB NOT NULL DEFAULT '[]',
  permissions     JSONB NOT NULL DEFAULT '{}',
  title           TEXT NOT NULL DEFAULT '',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

-- Fila única (id siempre = 1): contenido de la portada de login (branding, editable
-- desde la app) y el registro de actividad de nivel "consultor" que no pertenece a
-- ninguna empresa en particular.
CREATE TABLE IF NOT EXISTS global_data (
  id           INTEGER PRIMARY KEY DEFAULT 1,
  home_content JSONB NOT NULL DEFAULT '{}',
  activity_log JSONB NOT NULL DEFAULT '[]',
  data_version INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT global_data_singleton CHECK (id = 1)
);
