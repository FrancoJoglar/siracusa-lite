-- Agregar campo role a users para control de permisos
ALTER TABLE siracusa.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Marcar como admin a todos los usuarios existentes (por ahora todos son admins)
UPDATE siracusa.users SET role = 'admin' WHERE role = 'user';

-- Permisos
GRANT ALL ON ALL TABLES IN SCHEMA siracusa TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA siracusa TO anon;
