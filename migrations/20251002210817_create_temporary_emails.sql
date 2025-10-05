CREATE TABLE temporary_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Index for fast lookups
    CONSTRAINT address_format CHECK (address ~ '^[a-zA-Z0-9_-]+@[a-zA-Z0-9.-]+$')
);

CREATE INDEX idx_temp_emails_address ON temporary_emails(address);
CREATE INDEX idx_temp_emails_expires ON temporary_emails(expires_at) WHERE is_active = TRUE; -- Add migration script here
