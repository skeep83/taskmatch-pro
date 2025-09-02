-- First, check current constraint structure
SELECT 
    con.conname as constraint_name,
    pg_get_constraintdef(con.oid) as constraint_definition
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public' AND rel.relname = 'user_roles';

-- Check current roles for the user
SELECT ur.role FROM user_roles ur 
JOIN auth.users u ON ur.user_id = u.id 
WHERE u.email = 'skeep83@gmail.com';