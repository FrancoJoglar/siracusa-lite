-- ═══════════════════════════════════════════════════════════
-- Migración: Rediseño del sistema de recetas
-- Fecha: 2026-08-12
-- ═══════════════════════════════════════════════════════════

-- 0. Backup de datos actuales de recetas_sector (por si acaso)
CREATE TABLE IF NOT EXISTS siracusa._recetas_sector_backup AS
SELECT * FROM siracusa.recetas_sector;

-- 1. Agregar campo caseta a sectores
ALTER TABLE siracusa.sectores ADD COLUMN IF NOT EXISTS caseta TEXT DEFAULT '';

-- 2. Crear tabla recetas (catálogo de recetas)
CREATE TABLE siracusa.recetas (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo_cultivo TEXT NOT NULL,        -- olivos, cerezos, avellanos, kiwi
  temporada TEXT NOT NULL,            -- "2026-2027"
  descripcion TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Crear tabla receta_detalle (plan mensual por receta)
CREATE TABLE siracusa.receta_detalle (
  id SERIAL PRIMARY KEY,
  id_receta INTEGER NOT NULL REFERENCES siracusa.recetas(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  id_fertilizante INTEGER NOT NULL REFERENCES siracusa.fertilizantes(id),
  kilos_plan REAL DEFAULT 0,
  UNIQUE(id_receta, mes, id_fertilizante)
);

-- 4. Crear tabla sector_receta (asignación sector → receta)
CREATE TABLE siracusa.sector_receta (
  id SERIAL PRIMARY KEY,
  id_sector INTEGER NOT NULL REFERENCES siracusa.sectores(id),
  id_receta INTEGER NOT NULL REFERENCES siracusa.recetas(id),
  fecha_asignacion DATE NOT NULL DEFAULT CURRENT_DATE,
  activo BOOLEAN DEFAULT true,
  UNIQUE(id_sector, id_receta, activo)
);

-- 5. Crear tabla receta_change_log
CREATE TABLE siracusa.receta_change_log (
  id SERIAL PRIMARY KEY,
  id_sector INTEGER NOT NULL REFERENCES siracusa.sectores(id),
  id_receta_anterior INTEGER REFERENCES siracusa.recetas(id),
  id_receta_nueva INTEGER NOT NULL REFERENCES siracusa.recetas(id),
  receta_anterior_nombre TEXT,
  receta_nueva_nombre TEXT NOT NULL,
  fecha_cambio TIMESTAMPTZ DEFAULT now(),
  usuario_id INTEGER REFERENCES siracusa.users(id),
  motivo TEXT DEFAULT ''
);

-- 6. Borrar tabla vieja
DROP TABLE IF EXISTS siracusa.recetas_sector;

-- 7. Indices para performance
CREATE INDEX idx_receta_detalle_receta ON siracusa.receta_detalle(id_receta);
CREATE INDEX idx_sector_receta_sector ON siracusa.sector_receta(id_sector);
CREATE INDEX idx_sector_receta_activo ON siracusa.sector_receta(id_sector, activo);
CREATE INDEX idx_change_log_sector ON siracusa.receta_change_log(id_sector);

-- 8. Permisos
GRANT ALL ON ALL TABLES IN SCHEMA siracusa TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA siracusa TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA siracusa TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA siracusa TO authenticated;

-- ═══ FIN MIGRACIÓN ═══
