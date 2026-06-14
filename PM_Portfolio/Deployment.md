# Deployment

## Infrastructure

| Component | Details |
|-----------|---------|
| **Domain** | `prasunanand.com` (Cloudflare) |
| **VPS** | Vultr — 1 vCPU, 1 GB RAM, $5/mo + $1 backup |
| **VPS IP** | `66.42.118.111` |
| **VPS user** | `root` |
| **Deploy path** | `/opt/pm_portfolio` |
| **DNS** | Cloudflare A record `@` → `66.42.118.111`, Proxied |
| **SSL** | Cloudflare Full mode (Cloudflare terminates HTTPS, proxies HTTP to Nginx on port 80) |
| **GitHub repo** | `https://github.com/data-monk/pm_portfolio` |

## Branch Strategy

See `git_strategy.md` for the full workflow. Summary:

- **`dev`** — default branch, all development
- **`prod`** — push here to trigger auto-deploy

Promotion command:
```bash
git push origin dev:prod
```

**Never push directly to `prod` without local validation.**

## CI/CD Flow

Push to `prod` → GitHub Actions (`.github/workflows/deploy.yaml`) →
SCP files to `/opt/pm_portfolio` on VPS → SSH `docker compose down && docker compose up -d --build`

GitHub secrets required: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`

## SSH Access

```bash
# Personal (direct access)
ssh -i ~/.ssh/vultr_personal root@66.42.118.111

# Deploy key (used by GitHub Actions)
# Private key stored in GitHub secret VPS_SSH_KEY
# Public key at ~/.ssh/vultr_deploy.pub
```

## Docker

- Client (Nginx): `client/Dockerfile` — Vite build → served by Nginx on port 80
- Server (Node): `server/Dockerfile` — build context is monorepo root (copies `database/` files)
- Postgres: official Docker image, data in named volume `db_data` at `/data/portfolio.db`
- Server exposes port 5001 internally; Nginx proxies `/api/*` to it

## Cloudflare Notes

- Proxied mode: traffic goes Cloudflare → VPS. VPS sees Cloudflare IPs, not real client IPs.
- Nginx listens on port 80 (HTTP). Cloudflare handles HTTPS termination.
- DNS propagation is near-instant with Cloudflare.

## Checking Deployment Status

```bash
# Check GitHub Actions run
gh run list --repo data-monk/pm_portfolio --limit 1
gh run view <run_id> --log-failed

# Check Docker containers on VPS
ssh -i ~/.ssh/vultr_personal root@66.42.118.111 "docker ps"

# Test live site
curl -s -o /dev/null -w "%{http_code}" https://prasunanand.com
```

## Common Issues

| Issue | Fix |
|-------|-----|
| Port 80 already in use | `fuser -k 80/tcp \|\| true` before `docker compose up` |
| Docker not found on VPS | `curl -fsSL https://get.docker.com \| sh` |
| SSH permission denied | Check public key in `~/.ssh/authorized_keys`; `chmod 600` |
| SCP fails | `mkdir -p /opt/pm_portfolio` on VPS first |
| Build fails (TypeScript) | Ensure devDeps installed before build, pruned after |
