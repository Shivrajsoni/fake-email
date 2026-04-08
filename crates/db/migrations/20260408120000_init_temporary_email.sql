CREATE TABLE temporary_email (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    temp_email_addr TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE received_email (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    temporary_email_id UUID NOT NULL REFERENCES temporary_email (id) ON DELETE CASCADE,
    from_addr TEXT,
    to_addr TEXT,
    subject TEXT,
    body_text TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_received_email_temporary_email_id ON received_email (temporary_email_id);
