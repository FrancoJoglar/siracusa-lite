-- Módulo de Consumo de Fertilizantes (Versión Corregida)
-- Consumo por Equipo-Variedad, distribuido a Sectores

-- 1. Agregar fertilizantes faltantes
INSERT INTO siracusa.fertilizantes (name, "N", "P2O5", "K2O", "CaO", "MgO", "Zn", "B2O3", "S")
VALUES 
  ('Nitrato Potasio', 0, 0, 0.46, 0, 0, 0, 0, 0),
  ('Sulfato Potasio', 0, 0, 0.50, 0, 0, 0, 0, 0.18),
  ('Novatec', 0, 0, 0, 0, 0, 0, 0, 0)
ON CONFLICT DO NOTHING;

-- 2. Tabla principal: consumo semanal por equipo-variedad
CREATE TABLE IF NOT EXISTS siracusa.consumo_fertilizante (
  id SERIAL PRIMARY KEY,
  id_equipo INTEGER REFERENCES siracusa.equipos(id),
  variedad TEXT NOT NULL,
  semana_numero INTEGER NOT NULL,          -- Número de semana (1-52)
  semana_inicio DATE NOT NULL,             -- Lunes de la semana
  semana_fin DATE NOT NULL,                -- Domingo de la semana
  id_fertilizante INTEGER REFERENCES siracusa.fertilizantes(id),
  kilos_consumidos DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id_equipo, variedad, semana_numero, id_fertilizante)
);

-- 3. Distribución automática por sector
CREATE TABLE IF NOT EXISTS siracusa.consumo_distribucion (
  id SERIAL PRIMARY KEY,
  id_consumo INTEGER REFERENCES siracusa.consumo_fertilizante(id) ON DELETE CASCADE,
  id_sector INTEGER REFERENCES siracusa.sectores(id),
  kilos_asignados DECIMAL(10,2) NOT NULL DEFAULT 0,
  kilos_solicitados DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Log de cambios
CREATE TABLE IF NOT EXISTS siracusa.consumo_log (
  id SERIAL PRIMARY KEY,
  id_consumo INTEGER,
  accion TEXT NOT NULL,                    -- 'create', 'update', 'delete'
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_consumo_equipo_variedad_semana 
  ON siracusa.consumo_fertilizante(id_equipo, variedad, semana_numero);

CREATE INDEX IF NOT EXISTS idx_consumo_distribucion_consumo 
  ON siracusa.consumo_distribucion(id_consumo);

CREATE INDEX IF NOT EXISTS idx_consumo_log_consumo 
  ON siracusa.consumo_log(id_consumo);

-- 6. RLS
ALTER TABLE siracusa.consumo_fertilizante ENABLE ROW LEVEL SECURITY;
ALTER TABLE siracusa.consumo_distribucion ENABLE ROW LEVEL SECURITY;
ALTER TABLE siracusa.consumo_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Consumo readable by authenticated users" 
  ON siracusa.consumo_fertilizante FOR SELECT TO authenticated USING (true);
CREATE POLICY "Consumo writable by authenticated users" 
  ON siracusa.consumo_fertilizante FOR ALL TO authenticated USING (true);

CREATE POLICY "Distribucion readable by authenticated users" 
  ON siracusa.consumo_distribucion FOR SELECT TO authenticated USING (true);
CREATE POLICY "Distribucion writable by authenticated users" 
  ON siracusa.consumo_distribucion FOR ALL TO authenticated USING (true);

CREATE POLICY "Log readable by authenticated users" 
  ON siracusa.consumo_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Log writable by authenticated users" 
  ON siracusa.consumo_log FOR ALL TO authenticated USING (true);

-- 7. Función: Obtener sectores por equipo y variedad
CREATE OR REPLACE FUNCTION siracusa.get_sectores_by_equipo_variedad(
  equipo_id INTEGER,
  variedad_name TEXT
)
RETURNS TABLE(
  id INTEGER, 
  name TEXT, 
  has_hectareas DECIMAL,
  equipo_name TEXT
) AS $$
  SELECT s.id, s.name, s.has_hectareas, e.name
  FROM siracusa.sectores s
  JOIN siracusa.equipos e ON s.id_equipo = e.id
  WHERE s.id_equipo = equipo_id 
    AND s.variedad ILIKE variedad_name
    AND s.active = true
  ORDER BY s.name;
$$ LANGUAGE sql STABLE;

-- 8. Función: Obtener solicitudes por equipo-variedad-semana
CREATE OR REPLACE FUNCTION siracusa.get_solicitudes_by_equipo_variedad_semana(
  equipo_id INTEGER,
  variedad_name TEXT,
  fecha_inicio DATE,
  fecha_fin DATE
)
RETURNS TABLE(
  sector_id INTEGER,
  sector_name TEXT,
  fertilizante_name TEXT,
  kilos_solicitados DECIMAL
) AS $$
  SELECT 
    s.id as sector_id,
    s.name as sector_name,
    f.name as fertilizante_name,
    CASE 
      WHEN f.name = 'Sulfato Zinc' THEN sr.fert_sulfato_zn
      WHEN f.name = 'Nitrato Amonio' THEN sr.fert_nitrato_amo
      WHEN f.name = 'Nitrato Calcio' THEN sr.fert_nitrato_ca
      WHEN f.name = 'Cloruro Potasio' THEN sr.fert_cloruro_k
      WHEN f.name = 'Acido Borico' THEN sr.fert_acido_boro
      WHEN f.name = 'Sulfato Magnesio' THEN sr.fert_sulfato_mg
      WHEN f.name = 'FMA' THEN sr.fert_fma
      WHEN f.name = 'Urea' THEN sr.fert_urea
      WHEN f.name = 'Nitrato Potasio' THEN COALESCE(sr.fert_nitrato_k, 0)
      WHEN f.name = 'Sulfato Potasio' THEN COALESCE(sr.fert_sulfato_k, 0)
      WHEN f.name = 'Novatec' THEN COALESCE(sr.fert_novatec, 0)
      ELSE 0
    END as kilos_solicitados
  FROM siracusa.solicitudes_riego sr
  JOIN siracusa.sectores s ON sr.id_sector = s.id
  CROSS JOIN siracusa.fertilizantes f
  WHERE s.id_equipo = equipo_id
    AND s.variedad ILIKE variedad_name
    AND sr.fecha_riego >= fecha_inicio
    AND sr.fecha_riego <= fecha_fin
    AND sr.active = true
    AND (
      (f.name = 'Sulfato Zinc' AND sr.fert_sulfato_zn > 0) OR
      (f.name = 'Nitrato Amonio' AND sr.fert_nitrato_amo > 0) OR
      (f.name = 'Nitrato Calcio' AND sr.fert_nitrato_ca > 0) OR
      (f.name = 'Cloruro Potasio' AND sr.fert_cloruro_k > 0) OR
      (f.name = 'Acido Borico' AND sr.fert_acido_boro > 0) OR
      (f.name = 'Sulfato Magnesio' AND sr.fert_sulfato_mg > 0) OR
      (f.name = 'FMA' AND sr.fert_fma > 0) OR
      (f.name = 'Urea' AND sr.fert_urea > 0) OR
      (f.name = 'Nitrato Potasio' AND COALESCE(sr.fert_nitrato_k, 0) > 0) OR
      (f.name = 'Sulfato Potasio' AND COALESCE(sr.fert_sulfato_k, 0) > 0) OR
      (f.name = 'Novatec' AND COALESCE(sr.fert_novatec, 0) > 0)
    )
  ORDER BY s.name, f.name;
$$ LANGUAGE sql STABLE;

-- 9. Función: Obtener equipos con variedades
CREATE OR REPLACE FUNCTION siracusa.get_equipos_con_variedades()
RETURNS TABLE(
  equipo_id INTEGER, 
  equipo_name TEXT, 
  variedad TEXT,
  cantidad_sectores BIGINT
) AS $$
  SELECT DISTINCT 
    e.id as equipo_id, 
    e.name as equipo_name, 
    s.variedad,
    COUNT(*) OVER (PARTITION BY e.id, s.variedad) as cantidad_sectores
  FROM siracusa.equipos e
  JOIN siracusa.sectores s ON e.id = s.id_equipo
  WHERE e.active = true AND s.active = true AND s.variedad IS NOT NULL
  ORDER BY e.name, s.variedad;
$$ LANGUAGE sql STABLE;
