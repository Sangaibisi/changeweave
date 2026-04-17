ALTER TABLE repositories ADD COLUMN visibility VARCHAR(20) NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE repositories ADD COLUMN access_token VARCHAR(64);

CREATE INDEX idx_repositories_access_token ON repositories(access_token);
