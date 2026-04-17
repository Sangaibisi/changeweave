-- V4: Change ip_address from INET to VARCHAR to avoid Hibernate type mismatch
ALTER TABLE changelog_views ALTER COLUMN ip_address TYPE VARCHAR(45) USING ip_address::VARCHAR;
