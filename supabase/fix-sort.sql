CREATE OR REPLACE FUNCTION siracusa.get_equipos_con_variedades()
RETURNS TABLE(equipo_id INTEGER, equipo_name TEXT, variedad TEXT, cantidad_sectores BIGINT) AS $$
  SELECT DISTINCT 
    e.id as equipo_id, 
    e.name as equipo_name, 
    s.variedad,
    COUNT(*) OVER (PARTITION BY e.id, s.variedad) as cantidad_sectores
  FROM siracusa.equipos e
  JOIN siracusa.sectores s ON e.id = s.id_equipo
  WHERE e.active = true AND s.active = true AND s.variedad IS NOT NULL
  ORDER BY e.id, s.variedad;
$$ LANGUAGE sql STABLE;
