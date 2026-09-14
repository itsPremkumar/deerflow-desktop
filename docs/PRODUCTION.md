# DeerFlow Production Runbook

How to run DeerFlow as a hardened, observable production service. Development
setup lives in [README.md](../README.md); this guide assumes you have already
completed `make setup` / `make config` once.

## 1. Pre-flight

```bash
cp .env.production.example .env   # then fill in real secrets (never commit .env)
make config                       # if config.yaml / extensions_config.json are missing
python scripts/prod_check.py      # failures block, warnings advise
```

`prod_check.py --strict` turns warnings into failures for CI gates. Re-run it
after every config change and before every deploy.

## 2. Harden

| Item | Setting | Why |
| ---- | ------- | --- |
| Docs off | `GATEWAY_ENABLE_DOCS=false` in `.env` | Hides Swagger/ReDoc/`/openapi.json` |
| Secrets | `BETTER_AUTH_SECRET` from `openssl rand -hex 32` | Session signing; logins break without it |
| Bind address | default `BIND_HOST=127.0.0.1` | Loopback-only; use `0.0.0.0` only behind your own TLS/auth front door |
| TLS | Terminate at your reverse proxy; forward `X-Forwarded-Proto: https` | Gateway emits HSTS only for HTTPS requests |
| CORS | leave `GATEWAY_CORS_ORIGINS` unset for same-origin nginx | Exact-origin allowlist otherwise |
| Database | `database.backend: postgres` for shared/multi-worker use | Memory/SQLite cannot coordinate workers |
| Config files | `config.yaml` stays read-only in containers | Only `extensions_config.json` is API-writable |

## 3. Deploy

```bash
make up     # build images, wait for Gateway /health, print access URL
make down   # stop and remove containers
```

Kubernetes: see `deploy/helm/deer-flow/`. Keep Gateway at one replica unless
you also enable Postgres, the Redis stream bridge, run-ownership heartbeats,
and `run_events.backend: db` (see README.md multi-worker requirements).

## 4. Monitor

| Signal | Endpoint | Auth | Use |
| ------ | -------- | ---- | --- |
| Liveness | `GET /health` (Gateway), `/api/health` (frontend) | no | Container/orchestrator probes |
| Readiness | `GET /health/ready` | no | 200 only when persistence backends are reachable; 503 otherwise |
| Version | `GET /api/ops/version` | yes | Deploy verification (what build is live?) |
| Status | `GET /api/ops/status` | yes | Uptime, server time, docs flag |
| Usage | `GET /api/console/*` | yes | Runs/threads/tokens/cost reporting (SQL backend only) |
| Traces | `X-Trace-Id` response header | — | Correlate one id across logs, runs, and traces |

Every Gateway response also carries baseline security headers
(`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
`Permissions-Policy`, plus HSTS for HTTPS requests); the frontend sends the
same set via `next.config.js`.

## 5. Operate

- **Backups**: persist `DEER_FLOW_HOME` (threads, memory, SQLite files when
  used), dump Postgres on a schedule, and version-control `config.yaml` /
  `extensions_config.json` contents (redacted) outside the host.
- **Upgrades**: align versions with `scripts/bump_version.sh <ver>`, verify
  with `scripts/verify_versions.sh`, re-run `prod_check.py`, then `make up`.
- **Config drift**: `make config-upgrade` merges new template fields into
  `config.yaml` after pulling a newer release.
- **Troubleshooting**: `make doctor` for setup diagnosis, `make support-bundle`
  for a redacted issue bundle, `make docker-logs` for service logs.

## 6. Incident triage (5 minutes)

1. `curl -f http://localhost:2026/api/health` — frontend up?
2. Gateway `GET /health/ready` — 200 (ready) or 503 with
   `{"database": ..., "checkpointer": ...}` naming the unreachable backend?
3. Authenticated `GET /api/ops/status` — process alive, uptime sane?
4. `make docker-logs --gateway` (or `docker compose logs gateway`) — recent
   tracebacks; correlate with the failing request's `X-Trace-Id`.
5. Database reachable from the Gateway host/network? Disk full? Then recover
   per your Postgres/SQLite runbook and re-check readiness before reopening
   traffic.
