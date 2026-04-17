-- V3: Add multi-provider OAuth token columns to users table

ALTER TABLE users ADD COLUMN gitlab_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN gitlab_access_token TEXT;
ALTER TABLE users ADD COLUMN bitbucket_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN bitbucket_access_token TEXT;
