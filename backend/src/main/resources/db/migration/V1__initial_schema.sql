-- V1: Initial database schema for ChangelogAI

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    password_hash VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    plan_type VARCHAR(50) DEFAULT 'FREE',
    stripe_customer_id VARCHAR(255),
    github_id VARCHAR(255) UNIQUE,
    github_access_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Repositories table
CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(500) NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'GITHUB',
    provider_repo_id VARCHAR(255) NOT NULL,
    provider_repo_url TEXT NOT NULL,
    default_branch VARCHAR(100) DEFAULT 'main',
    description TEXT,
    webhook_id VARCHAR(255),
    webhook_secret VARCHAR(255),
    slug VARCHAR(255) UNIQUE,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider, provider_repo_id)
);

CREATE INDEX idx_repositories_user ON repositories(user_id);
CREATE INDEX idx_repositories_slug ON repositories(slug);

-- Changelogs table
CREATE TABLE changelogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    version VARCHAR(100) NOT NULL,
    title VARCHAR(500),
    summary TEXT,
    content TEXT,
    raw_commits JSONB,
    ai_metadata JSONB,
    published_at TIMESTAMP WITH TIME ZONE,
    is_draft BOOLEAN DEFAULT TRUE,
    slug VARCHAR(255),
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(repository_id, version)
);

CREATE INDEX idx_changelogs_repo_published ON changelogs(repository_id, published_at DESC);
CREATE INDEX idx_changelogs_slug ON changelogs(slug);

-- Changelog categories table
CREATE TABLE changelog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    changelog_id UUID NOT NULL REFERENCES changelogs(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    items JSONB NOT NULL DEFAULT '[]',
    sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_changelog_categories_changelog ON changelog_categories(changelog_id);

-- Commits table
CREATE TABLE commits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    changelog_id UUID REFERENCES changelogs(id) ON DELETE SET NULL,
    sha VARCHAR(40) NOT NULL,
    message TEXT NOT NULL,
    author_name VARCHAR(255),
    author_email VARCHAR(255),
    committed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    files_changed JSONB,
    ai_transformed_text TEXT,
    category VARCHAR(50),
    impact_score VARCHAR(20) DEFAULT 'MEDIUM',
    is_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(repository_id, sha)
);

CREATE INDEX idx_commits_repo_date ON commits(repository_id, committed_at DESC);
CREATE INDEX idx_commits_changelog ON commits(changelog_id);
CREATE INDEX idx_commits_unprocessed ON commits(repository_id, is_processed) WHERE is_processed = FALSE;

-- Changelog views (analytics)
CREATE TABLE changelog_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    changelog_id UUID NOT NULL REFERENCES changelogs(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET,
    referrer TEXT,
    country_code VARCHAR(2)
);

CREATE INDEX idx_views_changelog_date ON changelog_views(changelog_id, viewed_at DESC);

-- Widget installations
CREATE TABLE widget_installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    domain VARCHAR(255) NOT NULL,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_widget_api_key ON widget_installations(api_key);

-- Refresh tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
