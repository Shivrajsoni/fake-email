# fake-email

Production-ready crates deployment with:
- Rust HTTP API
- Rust SMTP receiver on port `25`
- Postgres
- Nginx reverse proxy in front of the API

## Production deployment

1. Build and run:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```
2. Verify:
   - API via Nginx: `http://localhost/healthz`
   - SMTP: host `localhost`, port `25`

## Important production notes

- Port `25` usually requires root/admin privileges on Linux hosts and may be blocked by cloud/network providers.
- Update `DATABASE_URL`, `DOMAIN`, and `CORS_ALLOWED_ORIGINS` for your real domain/clients.
- The server runs DB migrations automatically at startup.
