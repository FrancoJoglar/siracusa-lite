-- ═══════════════════════════════════════════════════════════
-- Migración de datos reales: Equipos y Sectores
-- Fuente: Listado del campo del usuario
-- ═══════════════════════════════════════════════════════════

-- 1. Limpiar datos de prueba anteriores
DELETE FROM siracusa.solicitudes_riego;
DELETE FROM siracusa.recetas_sector;
DELETE FROM siracusa.sectores;
DELETE FROM siracusa.equipos;

-- 2. Insertar 25 equipos (sin el 8)
INSERT INTO siracusa.equipos (id, name, active) VALUES
(1, 'Equipo 1', true),
(2, 'Equipo 2', true),
(3, 'Equipo 3', true),
(4, 'Equipo 4', true),
(5, 'Equipo 5', true),
(6, 'Equipo 6', true),
(7, 'Equipo 7', true),
(9, 'Equipo 9', true),
(10, 'Equipo 10', true),
(11, 'Equipo 11', true),
(12, 'Equipo 12', true),
(13, 'Equipo 13', true),
(14, 'Equipo 14', true),
(15, 'Equipo 15', true),
(16, 'Equipo 16', true),
(17, 'Equipo 17', true),
(18, 'Equipo 18', true),
(19, 'Equipo 19', true),
(20, 'Equipo 20', true),
(21, 'Equipo 21', true),
(22, 'Equipo 22', true),
(23, 'Equipo 23', true),
(24, 'Equipo 24', true),
(25, 'Equipo 25', true),
(26, 'Equipo 26', true);

-- Resetear secuencia de equipos
SELECT setval('siracusa.equipos_id_seq', 26);

-- 3. Insertar todos los sectores con datos reales
-- Caudal es m3/h total del sector, se divide por has para obtener m3_ha_hr
INSERT INTO siracusa.sectores (name, id_equipo, has_hectareas, variedad, m3_ha_hr, active) VALUES
-- Equipo 1
('Sector 1', 1, 16.97, 'Korinenki', 9.31, true),
('Sector 2', 1, 17.37, 'Arbequina', 9.29, true),
('Sector 3', 1, 16.99, 'Arbequina', 9.31, true),
('Sector 4', 1, 17.88, 'Arbosana', 9.31, true),
('Sector 5', 1, 18.61, 'Arbosana', 9.31, true),
-- Equipo 2
('Sector 1', 2, 24.19, 'Arbosana', 9.31, true),
('Sector 2', 2, 24.41, 'Arbequina', 9.31, true),
('Sector 3', 2, 24.27, 'Arbequina', 9.31, true),
('Sector 4', 2, 23.35, 'Arbequina', 9.31, true),
('Sector 5', 2, 23.19, 'Arbosana', 9.31, true),
-- Equipo 3
('Sector 1', 3, 18.42, 'Arbosana', 9.22, true),
('Sector 2', 3, 17.49, 'Arbequina', 9.31, true),
('Sector 3', 3, 8.77, 'Giffoni', 18.95, true),
('Sector 4', 3, 8.77, 'Giffoni', 18.80, true),
('Sector 5', 3, 17.33, 'Arbequina', 9.31, true),
-- Equipo 4
('Sector 1', 4, 10.19, 'Arbosana', 9.22, true),
('Sector 2', 4, 14.54, 'Arbequina', 9.31, true),
('Sector 3', 4, 14.27, 'Arbosana', 9.31, true),
('Sector 4', 4, 14.25, 'Arbequina', 9.31, true),
('Sector 5', 4, 13.12, 'Arbosana', 9.31, true),
-- Equipo 5
('Sector 1', 5, 9.09, 'Giffoni', 19.05, true),
('Sector 2', 5, 9.08, 'Giffoni', 19.03, true),
('Sector 3', 5, 9.08, 'Giffoni', 19.03, true),
('Sector 4', 5, 9.09, 'Giffoni', 19.01, true),
('Sector 5', 5, 18.64, 'Arbosana', 9.22, true),
-- Equipo 6
('Sector 1', 6, 13.60, 'Arbosana', 9.21, true),
('Sector 2', 6, 13.66, 'Arbosana', 9.16, true),
('Sector 3', 6, 6.13, 'Giffoni', 19.02, true),
('Sector 4', 6, 6.15, 'Giffoni', 19.06, true),
('Sector 5', 6, 6.16, 'Giffoni', 18.85, true),
-- Equipo 7
('Sector 1', 7, 5.12, 'Arbosana', 8.91, true),
('Sector 2', 7, 4.78, 'Arbosana', 8.91, true),
('Sector 3', 7, 4.91, 'Arbosana', 8.90, true),
('Sector 4', 7, 5.34, 'Arbosana', 8.90, true),
('Sector 5', 7, 5.24, 'Arbosana', 8.89, true),
-- Equipo 9 (no existe equipo 8)
('Sector 1', 9, 11.51, 'Arbequina', 6.66, true),
('Sector 2', 9, 9.72, 'Arbequina', 6.67, true),
('Sector 3', 9, 11.30, 'Arbequina', 6.66, true),
('Sector 4', 9, 14.47, 'Arbequina', 6.66, true),
-- Equipo 10 (tiene sector 6, no tiene 5)
('Sector 1', 10, 11.02, 'Arbequina', 9.34, true),
('Sector 2', 10, 7.01, 'Giffoni', 18.39, true),
('Sector 3', 10, 13.90, 'Arbequina', 9.34, true),
('Sector 4', 10, 12.82, 'Arbosana', 9.34, true),
('Sector 6', 10, 6.20, 'Giffoni', 18.39, true),
-- Equipo 11
('Sector 1', 11, 13.44, 'Arbosana', 9.34, true),
('Sector 2', 11, 11.87, 'Arbequina', 9.33, true),
('Sector 3', 11, 12.14, 'Arbosana', 9.33, true),
('Sector 4', 11, 12.20, 'Arbequina', 9.34, true),
('Sector 5', 11, 12.90, 'Arbequina', 9.33, true),
-- Equipo 12 (tiene 7 sectores: 1,2,3,5,6,7,8)
('Sector 1', 12, 8.64, 'Giffoni', 18.39, true),
('Sector 2', 12, 10.47, 'Giffoni', 18.39, true),
('Sector 3', 12, 10.30, 'Giffoni', 18.39, true),
('Sector 5', 12, 17.19, 'Arbequina', 9.19, true),
('Sector 6', 12, 8.46, 'Giffoni', 18.39, true),
('Sector 7', 12, 7.89, 'Giffoni', 18.39, true),
('Sector 8', 12, 8.37, 'Giffoni', 18.40, true),
-- Equipo 13
('Sector 1', 13, 8.91, 'Giffoni', 15.33, true),
('Sector 2', 13, 15.80, 'Arbosana', 9.21, true),
('Sector 3', 13, 12.61, 'Arbosana', 9.17, true),
('Sector 4', 13, 13.58, 'Arbequina', 9.21, true),
('Sector 5', 13, 13.10, 'Arbosana', 9.17, true),
('Sector 6', 13, 8.91, 'Giffoni', 15.33, true),
-- Equipo 14 (tiene 3 sectores: 1,2,5)
('Sector 1', 14, 10.96, 'Arbequina', 9.17, true),
('Sector 2', 14, 12.70, 'Arbequina', 9.20, true),
('Sector 5', 14, 8.46, 'Arbequina', 9.13, true),
-- Equipo 15 (tiene 6 sectores: 1,2,3,4,5,6)
('Sector 1', 15, 12.56, 'Arbequina', 9.40, true),
('Sector 2', 15, 5.34, 'Sweet Aryana', 19.66, true),
('Sector 3', 15, 10.57, 'Arbequina', 9.36, true),
('Sector 4', 15, 5.30, 'Pacific Red', 19.57, true),
('Sector 5', 15, 12.08, 'Arbequina', 9.21, true),
('Sector 6', 15, 5.30, 'Pacific Red', 19.81, true),
-- Equipo 16
('Sector 1', 16, 11.49, 'Arbosana', 9.22, true),
('Sector 2', 16, 11.29, 'Arbosana', 9.21, true),
('Sector 3', 16, 11.42, 'Arbosana', 9.19, true),
('Sector 4', 16, 5.08, 'Arbequina', 19.78, true),
('Sector 5', 16, 10.57, 'Arbosana', 9.18, true),
-- Equipo 17
('Sector 1', 17, 10.26, 'Arbosana', 9.21, true),
('Sector 2', 17, 6.51, 'Arbosana', 9.22, true),
('Sector 3', 17, 5.91, 'Lapins', 17.76, true),
('Sector 4', 17, 5.79, 'Lapins', 17.77, true),
('Sector 5', 17, 7.49, 'Korinenki', 9.20, true),
-- Equipo 18
('Sector 1', 18, 6.46, 'Santina', 20.00, true),
('Sector 2', 18, 6.26, 'Sweet Aryana', 17.76, true),
('Sector 3', 18, 5.27, 'Santina', 20.00, true),
('Sector 4', 18, 5.75, 'Santina', 20.00, true),
('Sector 5', 18, 3.01, 'Santina', 20.00, true),
-- Equipo 19 (tiene 6 sectores)
('Sector 1', 19, 19.41, 'Arbosana', 9.31, true),
('Sector 2', 19, 8.84, 'Giffoni', 18.40, true),
('Sector 3', 19, 19.72, 'Arbosana', 9.31, true),
('Sector 4', 19, 20.25, 'Arbosana', 9.22, true),
('Sector 5', 19, 19.54, 'Arbosana', 9.21, true),
('Sector 6', 19, 8.79, 'Giffoni', 18.39, true),
-- Equipo 20
('Sector 1', 20, 6.97, 'Lapins', 17.77, true),
('Sector 2', 20, 5.72, 'Lapins', 17.77, true),
('Sector 3', 20, 7.03, 'Lapins', 17.77, true),
('Sector 4', 20, 5.07, 'Lapins', 17.77, true),
-- Equipo 21
('Sector 1', 21, 7.88, 'Santina', 17.77, true),
('Sector 2', 21, 7.90, 'Santina', 17.77, true),
('Sector 3', 21, 8.16, 'Santina', 17.77, true),
('Sector 4', 21, 8.07, 'Santina', 17.77, true),
-- Equipo 22
('Sector 1', 22, 5.29, 'Giffoni', 15.33, true),
('Sector 2', 22, 6.06, 'Giffoni', 15.33, true),
('Sector 3', 22, 5.02, 'Giffoni', 15.32, true),
('Sector 4', 22, 4.93, 'Santina', 19.17, true),
('Sector 5', 22, 4.27, 'Santina', 19.16, true),
-- Equipo 23
('Sector 1', 23, 5.61, 'Giffoni', 19.18, true),
('Sector 2', 23, 5.61, 'Giffoni', 18.97, true),
('Sector 3', 23, 5.61, 'Giffoni', 19.02, true),
('Sector 4', 23, 6.14, 'Giffoni', 18.88, true),
('Sector 5', 23, 6.11, 'Giffoni', 19.17, true),
-- Equipo 24
('Sector 1', 24, 6.36, 'Giffoni', 18.90, true),
('Sector 2', 24, 6.36, 'Giffoni', 18.88, true),
('Sector 3', 24, 5.49, 'Giffoni', 19.13, true),
('Sector 4', 24, 5.49, 'Giffoni', 19.03, true),
('Sector 5', 24, 5.50, 'Giffoni', 19.09, true),
-- Equipo 25
('Sector 1', 25, 4.20, 'Giffoni', 19.05, true),
('Sector 2', 25, 4.21, 'Giffoni', 18.99, true),
('Sector 3', 25, 5.31, 'Giffoni', 18.83, true),
('Sector 4', 25, 4.58, 'Giffoni', 19.28, true),
('Sector 5', 25, 4.57, 'Giffoni', 19.04, true),
-- Equipo 26
('Sector 1', 26, 6.11, 'Hi wan', 22.27, true),
('Sector 2', 26, 6.11, 'Giffoni', 22.06, true),
('Sector 3', 26, 5.97, 'Giffoni', 22.04, true),
('Sector 4', 26, 5.41, 'Giffoni', 21.87, true);

-- Resetear secuencia de sectores al máximo
SELECT setval('siracusa.sectores_id_seq', (SELECT MAX(id) FROM siracusa.sectores) + 1);
