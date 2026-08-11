-- SiracusaLite — Supabase Migration
-- Generated from SQLite schema and seed data

-- 0. Clean slate
DROP SCHEMA IF EXISTS siracusa CASCADE;

-- 1. Create schema
CREATE SCHEMA IF NOT EXISTS siracusa;

-- 2. Create tables
CREATE TABLE siracusa.users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE siracusa.equipos (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true
);

CREATE TABLE siracusa.sectores (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  id_equipo INTEGER NOT NULL REFERENCES siracusa.equipos(id),
  has_hectareas REAL DEFAULT 0,
  variedad TEXT DEFAULT '',
  m3_ha_hr REAL DEFAULT 9.31,
  active BOOLEAN DEFAULT true
);

CREATE TABLE siracusa.fertilizantes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  formula TEXT DEFAULT '',
  "N" REAL DEFAULT 0,
  "P2O5" REAL DEFAULT 0,
  "K2O" REAL DEFAULT 0,
  "CaO" REAL DEFAULT 0,
  "MgO" REAL DEFAULT 0,
  "Zn" REAL DEFAULT 0,
  "B2O3" REAL DEFAULT 0,
  "S" REAL DEFAULT 0,
  active BOOLEAN DEFAULT true
);

CREATE TABLE siracusa.recetas_sector (
  id SERIAL PRIMARY KEY,
  id_sector INTEGER NOT NULL REFERENCES siracusa.sectores(id),
  id_fertilizante INTEGER NOT NULL REFERENCES siracusa.fertilizantes(id),
  mes INTEGER NOT NULL,
  anio INTEGER NOT NULL,
  kilos_maximo REAL DEFAULT 0,
  UNIQUE(id_sector, id_fertilizante, mes, anio)
);

CREATE TABLE siracusa.solicitudes_riego (
  id SERIAL PRIMARY KEY,
  id_sector INTEGER NOT NULL REFERENCES siracusa.sectores(id),
  id_usuario INTEGER REFERENCES siracusa.users(id),
  fecha_riego DATE NOT NULL,
  horas REAL DEFAULT 0,
  hr_reales REAL DEFAULT 0,
  fert_sulfato_zn REAL DEFAULT 0,
  fert_nitrato_amo REAL DEFAULT 0,
  fert_nitrato_ca REAL DEFAULT 0,
  fert_cloruro_k REAL DEFAULT 0,
  fert_acido_boro REAL DEFAULT 0,
  fert_sulfato_mg REAL DEFAULT 0,
  fert_fma REAL DEFAULT 0,
  fert_urea REAL DEFAULT 0,
  m3_programados REAL DEFAULT 0,
  m3_reales REAL DEFAULT 0,
  solicitante TEXT DEFAULT '',
  observaciones TEXT DEFAULT '',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Index
CREATE INDEX idx_solicitudes_riego_fecha_sector_active
  ON siracusa.solicitudes_riego(fecha_riego, id_sector, active);

-- 4. Seed: Equipos
INSERT INTO siracusa.equipos (id, name) VALUES
  (1, 'Equipo 1'),
  (2, 'Equipo 2'),
  (3, 'Equipo 3'),
  (4, 'Equipo 4'),
  (5, 'Equipo 5');

-- Reset sequence for equipos
SELECT setval('siracusa.equipos_id_seq', 5);

-- 5. Seed: Sectores
INSERT INTO siracusa.sectores (id, name, id_equipo, has_hectareas, variedad, m3_ha_hr) VALUES
  -- Equipo 1
  (1,  'Sector 1', 1, 16.97, 'Korinenki',  9.31),
  (2,  'Sector 2', 1, 17.37, 'Arbequina',  9.31),
  (3,  'Sector 3', 1, 16.99, 'Arbequina',  9.31),
  (4,  'Sector 4', 1, 17.88, 'Arbosana',   9.31),
  (5,  'Sector 5', 1, 18.61, 'Arbequina',  9.31),
  -- Equipo 2
  (6,  'Sector 1', 2, 24.19, 'Arbosana',   9.31),
  (7,  'Sector 2', 2, 24.41, 'Arbequina',  9.31),
  (8,  'Sector 3', 2, 24.27, 'Arbequina',  9.31),
  (9,  'Sector 4', 2, 23.35, 'Arbequina',  9.31),
  (10, 'Sector 5', 2, 23.19, 'Arbosana',   9.31),
  -- Equipo 3
  (11, 'Sector 1', 3, 18.42, 'Arbosana',   9.22),
  (12, 'Sector 2', 3, 17.49, 'Arbequina',  9.31),
  (13, 'Sector 3', 3,  8.77, 'Giffoni',   18.40),
  (14, 'Sector 4', 3,  8.75, 'Giffoni',   18.40),
  (15, 'Sector 5', 3, 17.33, 'Arbequina',  9.31),
  -- Equipo 4
  (16, 'Sector 1', 4, 10.19, 'Arbosana',   9.22),
  (17, 'Sector 2', 4, 14.54, 'Arbequina',  9.31),
  (18, 'Sector 3', 4, 14.27, 'Arbosana',   9.31),
  (19, 'Sector 4', 4, 14.25, 'Arbequina',  9.31),
  (20, 'Sector 5', 4, 13.12, 'Arbosana',   9.31),
  -- Equipo 5
  (21, 'Sector 1', 5,  0.00, 'Giffoni',   18.40),
  (22, 'Sector 2', 5,  0.00, 'Giffoni',   18.40),
  (23, 'Sector 3', 5,  0.00, 'Giffoni',   18.40),
  (24, 'Sector 4', 5,  0.00, 'Giffoni',   18.40),
  (25, 'Sector 5', 5, 18.64, 'Arbosana',   9.22);

-- Reset sequence for sectores
SELECT setval('siracusa.sectores_id_seq', 25);

-- 6. Seed: Fertilizantes (35 unique rows from SQLite)
INSERT INTO siracusa.fertilizantes (id, name, formula, "N", "P2O5", "K2O", "CaO", "MgO", "Zn", "B2O3", "S") VALUES
  (1,  'Sulfato Zinc',       'ZnSO4·7H2O',             0,     0,     0,     0,     0,  0.22,     0,  0.11),
  (2,  'Nitrato Amonio',     'NH4NO3',                 0.33,  0,     0,     0,     0,     0,     0,     0),
  (3,  'Nitrato Calcio',     'Ca(NO3)2·4H2O',          0.155, 0,     0,  0.26,     0,     0,     0,     0),
  (4,  'Cloruro Potasio',    'KCl',                    0,     0,  0.6,     0,     0,     0,     0,     0),
  (5,  'Acido Borico',       'H3BO3',                  0,     0,     0,     0,     0,     0,  0.56,  0.15),
  (6,  'Sulfato Magnesio',   'MgSO4·7H2O',            0,     0,     0,     0,  0.16,     0,     0,  0.11),
  (7,  'FMA',                'Fosfato Monoamonico',    0.12, 0.61,     0,  0.024, 0.001,     0,     0,  0.02),
  (8,  'Urea',               'CO(NH2)2',              0.46,  0,     0,     0,     0,     0,     0,     0),
  (9,  'Acido Nitrico',      'HNO3',                  0.22,  0,     0,     0,     0,     0,     0,     0),
  (10, 'Nitrato Potasio',    'KNO3',                  0.135, 0,  0.46,     0,     0,     0,     0,     0),
  (11, 'Sulfato Potasio',    'K2SO4',                  0,     0,  0.5,     0,     0,     0,     0,  0.18),
  (12, 'Carbonato Calcio',   'CaCO3',                  0,     0,     0,  0.32,     0,     0,     0,     0),
  (13, 'Cloruro Amonio',     'NH4Cl',                 0.24,  0,     0,     0,     0,     0,     0,     0),
  (14, 'Sulfato Amonio',     '(NH4)2SO4',             0.21,  0,     0,     0,     0,     0,     0,  0.24),
  (15, 'Fosfato Diamonico',  '(NH4)HPO4',             0.18, 0.46,     0,     0,     0,     0,     0,     0),
  (16, 'Superfosfato Triple','Ca(H2PO4)2',              0,  0.46,     0,   0.2,     0,     0,     0,   0.1),
  (17, 'Superfosfato Simple','Ca(H2PO4)2+CaSO4',        0,   0.2,     0, 0.266,     0,     0,     0,  0.13),
  (18, 'Nitrato Magnesio',   'Mg(NO3)2',              0.11,  0,     0,     0,  0.16,     0,     0,     0),
  (19, 'Yeso',               'CaSO4·2H2O',              0,     0,     0,  0.23,     0,     0,     0,  0.17),
  (20, 'Humicfol',           '',                        0,   0.2,  0.25,     0,     0,     0,     0,     0),
  (21, 'UAN 32',             '',                       0.42,  0,     0,     0,     0,     0,     0,     0),
  (22, 'Entec 21',           '',                       0.21,  0,   0.6,     0,     0,     0,     0,     0),
  (23, 'Cloruro Calcio',     'CaCl2',                   0,     0,     0,  0.77,     0,     0,     0,     0),
  (24, 'Novatec 9-0-43',     '',                       0.09,  0,  0.43,     0,     0,     0,     0,     0),
  (25, 'Mezcla Cuaja',       '',                       0.21, 0.07, 0.07,     0,  0.013,     0,     0,     0),
  (26, 'Mezcla Crecimiento', '',                        0.2,  0,  0.21,     0,     0,     0,     0,     0),
  (27, 'Mezcla Brotacion',   '',                       0.11, 0.09, 0.19,     0,  0.025,     0, 0.017,     0);

-- Reset sequence for fertilizantes
SELECT setval('siracusa.fertilizantes_id_seq', 27);
