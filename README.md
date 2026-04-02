# fake-email

Production-ready crates deployment with:
- Rust HTTP API
- Rust SMTP receiver on port `587`
- Postgres
- Nginx reverse proxy in front of the API

## Production deployment

1. Build and run:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```
2. Verify:
   - API via Nginx: `http://localhost/healthz`
  - SMTP: host `localhost`, port `587`

## Important production notes

- Port `587` is the modern SMTP submission port and is often allowed where `25` is blocked.
- Update `DATABASE_URL`, `DOMAIN`, and `CORS_ALLOWED_ORIGINS` for your real domain/clients.
- The server runs DB migrations automatically at startup.
