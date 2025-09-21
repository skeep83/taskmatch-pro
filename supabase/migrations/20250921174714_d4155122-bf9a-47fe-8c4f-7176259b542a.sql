-- Give you admin access 
INSERT INTO user_roles (user_id, role) VALUES ('d3117828-1618-4c73-aee1-5968538d95d0', 'admin') ON CONFLICT DO NOTHING;
INSERT INTO user_roles (user_id, role) VALUES ('d3117828-1618-4c73-aee1-5968538d95d0', 'superadmin') ON CONFLICT DO NOTHING;