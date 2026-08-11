/**
 * Siracusa Lite — Servidor
 * ========================
 * Ejecutar: node server.js
 * Abrir: http://localhost:3000
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = 3000;

// ─── Database ───────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'siracusa.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Crear tablas
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS equipos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS sectores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    id_equipo INTEGER NOT NULL,
    has_hectareas REAL DEFAULT 0,
    variedad TEXT DEFAULT '',
    m3_ha_hr REAL DEFAULT 9.31,
    active INTEGER DEFAULT 1,
    FOREIGN KEY (id_equipo) REFERENCES equipos(id)
  );

  CREATE TABLE IF NOT EXISTS fertilizantes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    formula TEXT DEFAULT '',
    N REAL DEFAULT 0,
    P2O5 REAL DEFAULT 0,
    K2O REAL DEFAULT 0,
    CaO REAL DEFAULT 0,
    MgO REAL DEFAULT 0,
    Zn REAL DEFAULT 0,
    B2O3 REAL DEFAULT 0,
    S REAL DEFAULT 0,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS recetas_sector (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_sector INTEGER NOT NULL,
    id_fertilizante INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    anio INTEGER NOT NULL,
    kilos_maximo REAL DEFAULT 0,
    FOREIGN KEY (id_sector) REFERENCES sectores(id),
    FOREIGN KEY (id_fertilizante) REFERENCES fertilizantes(id),
    UNIQUE(id_sector, id_fertilizante, mes, anio)
  );

  CREATE TABLE IF NOT EXISTS solicitudes_riego (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_sector INTEGER NOT NULL,
    id_usuario INTEGER,
    fecha_riego TEXT NOT NULL,
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
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (id_sector) REFERENCES sectores(id)
  );
`);

// ─── Seed data ──────────────────────────────────────────────
const eqCount = db.prepare('SELECT COUNT(*) as c FROM equipos').get().c;
if (eqCount === 0) {
  const insertEq = db.prepare('INSERT INTO equipos (name) VALUES (?)');
  const insertSec = db.prepare('INSERT INTO sectores (name, id_equipo, has_hectareas, variedad, m3_ha_hr) VALUES (?, ?, ?, ?, ?)');
  
  const equipos = [
    { name: 'Equipo 1', sectores: [
      { s: 1, has: 16.97, var: 'Korinenki', m3: 9.31 },
      { s: 2, has: 17.37, var: 'Arbequina', m3: 9.31 },
      { s: 3, has: 16.99, var: 'Arbequina', m3: 9.31 },
      { s: 4, has: 17.88, var: 'Arbosana', m3: 9.31 },
      { s: 5, has: 18.61, var: 'Arbequina', m3: 9.31 },
    ]},
    { name: 'Equipo 2', sectores: [
      { s: 1, has: 24.19, var: 'Arbosana', m3: 9.31 },
      { s: 2, has: 24.41, var: 'Arbequina', m3: 9.31 },
      { s: 3, has: 24.27, var: 'Arbequina', m3: 9.31 },
      { s: 4, has: 23.35, var: 'Arbequina', m3: 9.31 },
      { s: 5, has: 23.19, var: 'Arbosana', m3: 9.31 },
    ]},
    { name: 'Equipo 3', sectores: [
      { s: 1, has: 18.42, var: 'Arbosana', m3: 9.22 },
      { s: 2, has: 17.49, var: 'Arbequina', m3: 9.31 },
      { s: 3, has: 8.77, var: 'Giffoni', m3: 18.4 },
      { s: 4, has: 8.75, var: 'Giffoni', m3: 18.4 },
      { s: 5, has: 17.33, var: 'Arbequina', m3: 9.31 },
    ]},
    { name: 'Equipo 4', sectores: [
      { s: 1, has: 10.19, var: 'Arbosana', m3: 9.22 },
      { s: 2, has: 14.54, var: 'Arbequina', m3: 9.31 },
      { s: 3, has: 14.27, var: 'Arbosana', m3: 9.31 },
      { s: 4, has: 14.25, var: 'Arbequina', m3: 9.31 },
      { s: 5, has: 13.12, var: 'Arbosana', m3: 9.31 },
    ]},
    { name: 'Equipo 5', sectores: [
      { s: 1, has: 0, var: 'Giffoni', m3: 18.4 },
      { s: 2, has: 0, var: 'Giffoni', m3: 18.4 },
      { s: 3, has: 0, var: 'Giffoni', m3: 18.4 },
      { s: 4, has: 0, var: 'Giffoni', m3: 18.4 },
      { s: 5, has: 18.64, var: 'Arbosana', m3: 9.22 },
    ]},
  ];
  
  const seedAll = db.transaction(() => {
    for (const eq of equipos) {
      const result = insertEq.run(eq.name);
      for (const sec of eq.sectores) {
        insertSec.run('Sector ' + sec.s, result.lastInsertRowid, sec.has, sec.var, sec.m3);
      }
    }
  });
  seedAll();
}

// Always ensure all fertilizantes exist (upsert by name)
const fertCount = db.prepare('SELECT COUNT(*) as c FROM fertilizantes').get().c;
if (fertCount < 20) {
  const upsertFert = db.prepare(`
    INSERT OR IGNORE INTO fertilizantes (name, formula, N, P2O5, K2O, CaO, MgO, Zn, B2O3, S) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const fertSeed = db.transaction(() => {
    upsertFert.run('Sulfato Zinc', 'ZnSO4·7H2O', 0, 0, 0, 0, 0, 0.22, 0, 0.11);
    upsertFert.run('Nitrato Amonio', 'NH4NO3', 0.33, 0, 0, 0, 0, 0, 0, 0);
    upsertFert.run('Nitrato Calcio', 'Ca(NO3)2·4H2O', 0.155, 0, 0, 0.26, 0, 0, 0, 0);
    upsertFert.run('Cloruro Potasio', 'KCl', 0, 0, 0.6, 0, 0, 0, 0, 0);
    upsertFert.run('Acido Borico', 'H3BO3', 0, 0, 0, 0, 0, 0, 0.56, 0.15);
    upsertFert.run('Sulfato Magnesio', 'MgSO4·7H2O', 0, 0, 0, 0, 0.16, 0, 0, 0.11);
    upsertFert.run('FMA', 'Fosfato Monoamonico', 0.12, 0.61, 0, 0.024, 0.001, 0, 0, 0.02);
    upsertFert.run('Urea', 'CO(NH2)2', 0.46, 0, 0, 0, 0, 0, 0, 0);
    upsertFert.run('Acido Nitrico', 'HNO3', 0.22, 0, 0, 0, 0, 0, 0, 0);
    upsertFert.run('Nitrato Potasio', 'KNO3', 0.135, 0, 0.46, 0, 0, 0, 0, 0);
    upsertFert.run('Sulfato Potasio', 'K2SO4', 0, 0, 0.5, 0, 0, 0, 0, 0.18);
    upsertFert.run('Carbonato Calcio', 'CaCO3', 0, 0, 0, 0.32, 0, 0, 0, 0);
    upsertFert.run('Cloruro Amonio', 'NH4Cl', 0.24, 0, 0, 0, 0, 0, 0, 0);
    upsertFert.run('Sulfato Amonio', '(NH4)2SO4', 0.21, 0, 0, 0, 0, 0, 0, 0.24);
    upsertFert.run('Fosfato Diamonico', '(NH4)HPO4', 0.18, 0.46, 0, 0, 0, 0, 0, 0);
    upsertFert.run('Superfosfato Triple', 'Ca(H2PO4)2', 0, 0.46, 0, 0.2, 0, 0, 0, 0.1);
    upsertFert.run('Superfosfato Simple', 'Ca(H2PO4)2+CaSO4', 0, 0.2, 0, 0.266, 0, 0, 0, 0.13);
    upsertFert.run('Nitrato Magnesio', 'Mg(NO3)2', 0.11, 0, 0, 0, 0.16, 0, 0, 0);
    upsertFert.run('Yeso', 'CaSO4·2H2O', 0, 0, 0, 0.23, 0, 0, 0, 0.17);
    upsertFert.run('Humicfol', '', 0, 0.2, 0.25, 0, 0, 0, 0, 0);
    upsertFert.run('UAN 32', '', 0.42, 0, 0, 0, 0, 0, 0, 0);
    upsertFert.run('Entec 21', '', 0.21, 0, 0.6, 0, 0, 0, 0, 0);
    upsertFert.run('Cloruro Calcio', 'CaCl2', 0, 0, 0, 0.77, 0, 0, 0, 0);
    upsertFert.run('Novatec 9-0-43', '', 0.09, 0, 0.43, 0, 0, 0, 0, 0);
    upsertFert.run('Mezcla Cuaja', '', 0.21, 0.07, 0.07, 0, 0.013, 0, 0, 0);
    upsertFert.run('Mezcla Crecimiento', '', 0.2, 0, 0.21, 0, 0, 0, 0, 0);
    upsertFert.run('Mezcla Brotacion', '', 0.11, 0.09, 0.19, 0, 0.025, 0, 0.017, 0);
  });
  fertSeed();
}

// ─── Middleware ──────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes ─────────────────────────────────────────────

// Equipos
app.get('/api/equipos', (req, res) => {
  const equipos = db.prepare('SELECT * FROM equipos WHERE active = 1 ORDER BY name').all();
  res.json(equipos);
});

// Sectores
app.get('/api/sectores', (req, res) => {
  const { id_equipo } = req.query;
  let query = `SELECT s.*, e.name as equipo_name 
               FROM sectores s 
               JOIN equipos e ON s.id_equipo = e.id 
               WHERE s.active = 1`;
  const params = [];
  if (id_equipo) {
    query += ' AND s.id_equipo = ?';
    params.push(id_equipo);
  }
  query += ' ORDER BY e.name, s.name';
  res.json(db.prepare(query).all(...params));
});

// Fertilizantes
app.get('/api/fertilizantes', (req, res) => {
  res.json(db.prepare('SELECT * FROM fertilizantes WHERE active = 1 ORDER BY name').all());
});

// Recetas
app.get('/api/recetas', (req, res) => {
  const { id_sector, mes, anio } = req.query;
  let query = `SELECT r.*, f.name as fert_name, f.N, f.P2O5, f.K2O, f.CaO, f.MgO, f.Zn, f.B2O3, f.S
               FROM recetas_sector r
               JOIN fertilizantes f ON r.id_fertilizante = f.id
               WHERE 1=1`;
  const params = [];
  if (id_sector) { query += ' AND r.id_sector = ?'; params.push(id_sector); }
  if (mes) { query += ' AND r.mes = ?'; params.push(mes); }
  if (anio) { query += ' AND r.anio = ?'; params.push(anio); }
  res.json(db.prepare(query).all(...params));
});

app.post('/api/recetas', (req, res) => {
  const { id_sector, id_fertilizante, mes, anio, kilos_maximo } = req.body;
  try {
    const result = db.prepare(
      'INSERT INTO recetas_sector (id_sector, id_fertilizante, mes, anio, kilos_maximo) VALUES (?, ?, ?, ?, ?)'
    ).run(id_sector, id_fertilizante, mes, anio, kilos_maximo);
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      db.prepare('UPDATE recetas_sector SET kilos_maximo = ? WHERE id_sector = ? AND id_fertilizante = ? AND mes = ? AND anio = ?')
        .run(kilos_maximo, id_sector, id_fertilizante, mes, anio);
      res.json({ updated: true });
    } else {
      res.status(400).json({ error: e.message });
    }
  }
});

app.delete('/api/recetas/:id', (req, res) => {
  db.prepare('DELETE FROM recetas_sector WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

app.post('/api/recetas/bulk', (req, res) => {
  const { id_sector, mes, anio, fertilizantes } = req.body;
  // fertilizantes: [{id, kilos_maximo}, ...]
  const upsert = db.prepare(
    'INSERT INTO recetas_sector (id_sector, id_fertilizante, mes, anio, kilos_maximo) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id_sector, id_fertilizante, mes, anio) DO UPDATE SET kilos_maximo = excluded.kilos_maximo'
  );
  const tx = db.transaction(() => {
    for (const f of fertilizantes) {
      upsert.run(id_sector, f.id, mes, anio, f.kilos_maximo || 0);
    }
  });
  tx();
  res.json({ saved: fertilizantes.length });
});

// Grid endpoint: all data for a month view
app.get('/api/grid', (req, res) => {
  const { id_equipo, mes, anio } = req.query;
  if (!id_equipo || !mes || !anio) {
    return res.status(400).json({ error: 'id_equipo, mes, anio required' });
  }
  
  const sectores = db.prepare(
    `SELECT s.*, e.name as equipo_name 
     FROM sectores s JOIN equipos e ON s.id_equipo = e.id 
     WHERE s.id_equipo = ? AND s.active = 1 ORDER BY s.name`
  ).all(id_equipo);
  
  const result = sectores.map(sec => {
    // Get solicitudes for this sector/month
    const solicitudes = db.prepare(
      `SELECT * FROM solicitudes_riego 
       WHERE id_sector = ? AND active = 1
       AND strftime('%m', fecha_riego) = ? 
       AND strftime('%Y', fecha_riego) = ?
       ORDER BY fecha_riego`
    ).all(sec.id, String(mes).padStart(2, '0'), String(anio));
    
    // Get receta for this sector/month
    const recetas = db.prepare(
      `SELECT r.*, f.name as fert_name, f.N, f.P2O5, f.K2O, f.CaO, f.MgO, f.Zn, f.B2O3, f.S
       FROM recetas_sector r
       JOIN fertilizantes f ON r.id_fertilizante = f.id
       WHERE r.id_sector = ? AND r.mes = ? AND r.anio = ?`
    ).all(sec.id, mes, anio);
    
    return {
      ...sec,
      solicitudes,
      recetas
    };
  });
  
  res.json(result);
});

// Solicitudes
app.get('/api/solicitudes', (req, res) => {
  const { fecha, fecha_desde, fecha_hasta, id_equipo } = req.query;
  let query = `SELECT sr.*, s.name as sector_name, e.name as equipo_name, s.has_hectareas, s.variedad
               FROM solicitudes_riego sr
               JOIN sectores s ON sr.id_sector = s.id
               JOIN equipos e ON s.id_equipo = e.id
               WHERE sr.active = 1`;
  const params = [];
  
  if (fecha) {
    query += ' AND sr.fecha_riego = ?';
    params.push(fecha);
  }
  if (fecha_desde) {
    query += ' AND sr.fecha_riego >= ?';
    params.push(fecha_desde);
  }
  if (fecha_hasta) {
    query += ' AND sr.fecha_riego <= ?';
    params.push(fecha_hasta);
  }
  if (id_equipo) {
    query += ' AND s.id_equipo = ?';
    params.push(id_equipo);
  }
  
  query += ' ORDER BY sr.fecha_riego DESC, e.name, s.name';
  res.json(db.prepare(query).all(...params));
});

// Buscar solicitud por fecha + sector (para el modal de fertilizantes)
app.get('/api/solicitudes/buscar', (req, res) => {
  const { fecha, id_sector } = req.query;
  if (!fecha || !id_sector) return res.json(null);
  const sol = db.prepare(
    `SELECT sr.*, s.name as sector_name, e.name as equipo_name, s.has_hectareas, s.variedad
     FROM solicitudes_riego sr
     JOIN sectores s ON sr.id_sector = s.id
     JOIN equipos e ON s.id_equipo = e.id
     WHERE sr.fecha_riego = ? AND sr.id_sector = ? AND sr.active = 1`
  ).get(fecha, id_sector);
  res.json(sol || null);
});

app.post('/api/solicitudes', (req, res) => {
  const {
    id_sector, fecha_riego, horas, hr_reales,
    fert_sulfato_zn, fert_nitrato_amo, fert_nitrato_ca, fert_cloruro_k,
    fert_acido_boro, fert_sulfato_mg, fert_fma, fert_urea,
    solicitante, observaciones
  } = req.body;
  
  // Get sector info for M3 calculation
  const sector = db.prepare('SELECT * FROM sectores WHERE id = ?').get(id_sector);
  if (!sector) return res.status(400).json({ error: 'Sector not found' });
  
  const h = parseFloat(horas) || 0;
  const m3_programados = sector.has_hectareas * h * sector.m3_ha_hr;
  
  const result = db.prepare(`
    INSERT INTO solicitudes_riego (
      id_sector, fecha_riego, horas, hr_reales,
      fert_sulfato_zn, fert_nitrato_amo, fert_nitrato_ca, fert_cloruro_k,
      fert_acido_boro, fert_sulfato_mg, fert_fma, fert_urea,
      m3_programados, solicitante, observaciones
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id_sector, fecha_riego, horas, hr_reales || 0,
    fert_sulfato_zn || 0, fert_nitrato_amo || 0, fert_nitrato_ca || 0, fert_cloruro_k || 0,
    fert_acido_boro || 0, fert_sulfato_mg || 0, fert_fma || 0, fert_urea || 0,
    m3_programados, solicitante || '', observaciones || ''
  );
  
  res.json({ id: result.lastInsertRowid, m3_programados });
});

app.delete('/api/solicitudes/:id', (req, res) => {
  db.prepare('UPDATE solicitudes_riego SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

const FERT_MAX = 999;
function clampFert(v){return Math.min(Math.max(parseFloat(v)||0, 0), FERT_MAX);}

app.put('/api/solicitudes/:id/fertilizantes', (req, res) => {
  const { fert_sulfato_zn, fert_nitrato_amo, fert_nitrato_ca, fert_cloruro_k, fert_acido_boro, fert_sulfato_mg, fert_fma, fert_urea } = req.body;
  db.prepare(`
    UPDATE solicitudes_riego SET
      fert_sulfato_zn = ?, fert_nitrato_amo = ?, fert_nitrato_ca = ?, fert_cloruro_k = ?,
      fert_acido_boro = ?, fert_sulfato_mg = ?, fert_fma = ?, fert_urea = ?
    WHERE id = ?
  `).run(
    clampFert(fert_sulfato_zn), clampFert(fert_nitrato_amo), clampFert(fert_nitrato_ca), clampFert(fert_cloruro_k),
    clampFert(fert_acido_boro), clampFert(fert_sulfato_mg), clampFert(fert_fma), clampFert(fert_urea),
    req.params.id
  );
  res.json({ updated: true });
});

// Resumen
app.get('/api/resumen', (req, res) => {
  const { mes, anio } = req.query;
  if (!mes || !anio) return res.status(400).json({ error: 'mes, anio required' });
  
  const monthStr = String(mes).padStart(2, '0');
  
  const total = db.prepare(`
    SELECT COUNT(*) as total_solicitudes,
           SUM(horas) as total_horas,
           SUM(m3_programados) as total_m3,
           SUM(fert_sulfato_zn + fert_nitrato_amo + fert_nitrato_ca + fert_cloruro_k + 
               fert_acido_boro + fert_sulfato_mg + fert_fma + fert_urea) as total_fert_kg
    FROM solicitudes_riego sr
    JOIN sectores s ON sr.id_sector = s.id
    WHERE sr.active = 1 
    AND strftime('%m', sr.fecha_riego) = ? 
    AND strftime('%Y', sr.fecha_riego) = ?
  `).get(monthStr, String(anio));
  
  const porEquipo = db.prepare(`
    SELECT e.name as equipo, 
           COUNT(*) as solicitudes,
           SUM(sr.horas) as horas,
           SUM(sr.m3_programados) as m3
    FROM solicitudes_riego sr
    JOIN sectores s ON sr.id_sector = s.id
    JOIN equipos e ON s.id_equipo = e.id
    WHERE sr.active = 1
    AND strftime('%m', sr.fecha_riego) = ?
    AND strftime('%Y', sr.fecha_riego) = ?
    GROUP BY e.name ORDER BY e.name
  `).all(monthStr, String(anio));
  
  res.json({ total, porEquipo });
});

// Export CSV
app.get('/api/export', (req, res) => {
  const { fecha } = req.query;
  if (!fecha) return res.status(400).json({ error: 'fecha required' });
  
  const rows = db.prepare(`
    SELECT sr.fecha_riego, e.name as equipo, s.name as sector, sr.horas,
           sr.fert_sulfato_zn, sr.fert_nitrato_amo, sr.fert_nitrato_ca, sr.fert_cloruro_k,
           sr.fert_acido_boro, sr.fert_sulfato_mg, sr.fert_fma, sr.fert_urea,
           sr.m3_programados, sr.solicitante, sr.observaciones
    FROM solicitudes_riego sr
    JOIN sectores s ON sr.id_sector = s.id
    JOIN equipos e ON s.id_equipo = e.id
    WHERE sr.active = 1 AND sr.fecha_riego = ?
    ORDER BY e.name, s.name
  `).all(fecha);
  
  let csv = 'Fecha,Equipo,Sector,Horas,S.Zn,N.Amo,N.Ca,Cl.K,B.Boro,S.Mg,FMA,Urea,M3,Solicitante,Observaciones\n';
  rows.forEach(r => {
    csv += [
      r.fecha_riego, r.equipo, r.sector, r.horas,
      r.fert_sulfato_zn, r.fert_nitrato_amo, r.fert_nitrato_ca, r.fert_cloruro_k,
      r.fert_acido_boro, r.fert_sulfato_mg, r.fert_fma, r.fert_urea,
      r.m3_programados?.toFixed(1), r.solicitante, '"' + (r.observaciones || '') + '"'
    ].join(',') + '\n';
  });
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=rieigos-${fecha}.csv`);
  res.send(csv);
});

// ─── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  🌾 Siracusa Lite corriendo en http://localhost:${PORT}\n`);
});
