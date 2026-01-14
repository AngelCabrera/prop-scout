-- D1 MIGRATION: 0002_add_operation_type.sql
ALTER TABLE properties ADD COLUMN operation_type TEXT DEFAULT 'Unknown';
