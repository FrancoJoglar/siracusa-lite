-- ═══════════════════════════════════════════════════════════
-- Seed: Recetas del Excel (Fert sheet)
-- Temporada 2026-2027
-- ═══════════════════════════════════════════════════════════

-- IDs de fertilizantes en la DB:
-- 1=Sulfato Zn, 2=Nitrato Amonio, 3=Nitrato Calcio, 4=Cloruro Potasio
-- 5=Acido Borico, 6=Sulfato Magnesio, 7=FMA, 8=Urea

-- ═══════════════════════════════════════════════
-- OLIVOS: 5 recetas por nivel de producción
-- ═══════════════════════════════════════════════

-- Receta 1: Olivos 14 ton/ha
INSERT INTO siracusa.recetas (id, nombre, tipo_cultivo, temporada) VALUES (1, 'Olivos 14 ton/ha', 'olivos', '2026-2027');
INSERT INTO siracusa.receta_detalle (id_receta, mes, id_fertilizante, kilos_plan) VALUES
(1, 9, 1, 3.36), (1, 9, 2, 27.66), (1, 9, 4, 26.21), (1, 9, 5, 2.80), (1, 9, 6, 39.09), (1, 9, 7, 49.61),
(1, 10, 2, 26.46), (1, 10, 3, 60.58), (1, 10, 4, 100.39), (1, 10, 5, 2.80), (1, 10, 6, 59.03),
(1, 11, 3, 60.58), (1, 11, 4, 25.13), (1, 11, 6, 39.40), (1, 11, 8, 19.27),
(1, 12, 1, 2.24), (1, 12, 4, 31.31), (1, 12, 6, 58.83), (1, 12, 7, 33.01), (1, 12, 8, 86.06),
(1, 1, 4, 50.13), (1, 1, 8, 68.33),
(1, 2, 4, 18.82);

-- Receta 2: Olivos 12 ton/ha
INSERT INTO siracusa.recetas (id, nombre, tipo_cultivo, temporada) VALUES (2, 'Olivos 12 ton/ha', 'olivos', '2026-2027');
INSERT INTO siracusa.receta_detalle (id_receta, mes, id_fertilizante, kilos_plan) VALUES
(2, 9, 1, 2.88), (2, 9, 2, 23.71), (2, 9, 4, 22.47), (2, 9, 5, 2.40), (2, 9, 6, 33.51), (2, 9, 7, 42.52),
(2, 10, 2, 22.68), (2, 10, 3, 51.92), (2, 10, 4, 86.05), (2, 10, 5, 2.40), (2, 10, 6, 50.60),
(2, 11, 3, 51.92), (2, 11, 4, 21.54), (2, 11, 6, 33.77), (2, 11, 8, 16.52),
(2, 12, 1, 1.92), (2, 12, 4, 26.84), (2, 12, 6, 50.42), (2, 12, 7, 28.30), (2, 12, 8, 73.77),
(2, 1, 4, 43.0), (2, 1, 8, 58.57),
(2, 2, 4, 16.13);

-- Receta 3: Olivos 10 ton/ha
INSERT INTO siracusa.recetas (id, nombre, tipo_cultivo, temporada) VALUES (3, 'Olivos 10 ton/ha', 'olivos', '2026-2027');
INSERT INTO siracusa.receta_detalle (id_receta, mes, id_fertilizante, kilos_plan) VALUES
(3, 9, 1, 2.40), (3, 9, 2, 20.85), (3, 9, 4, 16.47), (3, 9, 5, 2.00), (3, 9, 6, 29.79), (3, 9, 7, 37.40),
(3, 10, 2, 19.73), (3, 10, 3, 46.15), (3, 10, 4, 63.08), (3, 10, 5, 2.00), (3, 10, 6, 45.0),
(3, 11, 3, 46.15), (3, 11, 4, 15.79), (3, 11, 6, 30.02), (3, 11, 8, 14.37),
(3, 12, 1, 1.60), (3, 12, 4, 19.67), (3, 12, 6, 44.82), (3, 12, 7, 24.89), (3, 12, 8, 64.89),
(3, 1, 4, 31.50), (3, 1, 8, 51.52),
(3, 2, 4, 11.83);

-- Receta 4: Olivos 8 ton/ha
INSERT INTO siracusa.recetas (id, nombre, tipo_cultivo, temporada) VALUES (4, 'Olivos 8 ton/ha', 'olivos', '2026-2027');
INSERT INTO siracusa.receta_detalle (id_receta, mes, id_fertilizante, kilos_plan) VALUES
(4, 9, 1, 1.92), (4, 9, 2, 16.68), (4, 9, 4, 13.18), (4, 9, 5, 1.60), (4, 9, 6, 23.83), (4, 9, 7, 29.92),
(4, 10, 2, 15.78), (4, 10, 3, 36.92), (4, 10, 4, 50.46), (4, 10, 5, 1.60), (4, 10, 6, 36.0),
(4, 11, 3, 36.92), (4, 11, 4, 12.63), (4, 11, 6, 24.02), (4, 11, 8, 11.50),
(4, 12, 1, 1.28), (4, 12, 4, 15.74), (4, 12, 6, 35.86), (4, 12, 7, 19.91), (4, 12, 8, 51.91),
(4, 1, 4, 25.20), (4, 1, 8, 41.21),
(4, 2, 4, 9.46);

-- Receta 5: Olivos 6 ton/ha
INSERT INTO siracusa.recetas (id, nombre, tipo_cultivo, temporada) VALUES (5, 'Olivos 6 ton/ha', 'olivos', '2026-2027');
INSERT INTO siracusa.receta_detalle (id_receta, mes, id_fertilizante, kilos_plan) VALUES
(5, 9, 1, 1.92), (5, 9, 2, 14.55), (5, 9, 4, 9.71), (5, 9, 5, 1.60), (5, 9, 6, 15.86), (5, 9, 7, 23.62),
(5, 10, 2, 13.44), (5, 10, 3, 30.77), (5, 10, 4, 37.18), (5, 10, 5, 1.60), (5, 10, 6, 24.0),
(5, 11, 3, 30.77), (5, 11, 4, 9.31), (5, 11, 6, 16.01), (5, 11, 8, 9.79),
(5, 12, 1, 1.28), (5, 12, 4, 11.60), (5, 12, 6, 23.89), (5, 12, 7, 15.72), (5, 12, 8, 43.99),
(5, 1, 4, 18.57), (5, 1, 8, 34.71),
(5, 2, 4, 6.97);

-- Reset secuencias
SELECT setval('siracusa.recetas_id_seq', 5);
SELECT setval('siracusa.receta_detalle_id_seq', (SELECT MAX(id) FROM siracusa.receta_detalle) + 1);
