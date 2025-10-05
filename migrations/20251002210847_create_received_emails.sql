CREATE TABLE received_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    temp_email_id UUID NOT NULL REFERENCES temporary_emails(id) ON DELETE CASCADE,
    from_address VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    body_plain TEXT,
    body_html TEXT,
    headers JSONB,
    received_at TIMESTAMP NOT NULL DEFAULT NOW(),
    size_bytes INTEGER,
    
    -- Prevent email bombing
    CONSTRAINT reasonable_size CHECK (size_bytes <= 10485760) -- 10MB max
);

CREATE INDEX idx_received_emails_temp_id ON received_emails(temp_email_id, received_at DESC);
CREATE INDEX idx_received_emails_received ON received_emails(received_at); -- Add migration script here
