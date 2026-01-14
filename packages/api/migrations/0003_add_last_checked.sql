-- D1 MIGRATION: 0003_add_last_checked.sql
ALTER TABLE discovery_agents ADD COLUMN last_checked INTEGER;
