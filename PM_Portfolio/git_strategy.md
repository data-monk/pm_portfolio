# Git Strategy

## Branch Model

| Branch | Purpose |
|--------|---------|
| `dev` | Default branch. All development work goes here. |
| `prod` | Production branch. Pushing here triggers CI/CD and auto-deploys to `prasunanand.com`. |

## Day-to-Day Workflow

1. Make changes locally and test at `http://localhost:3000`
2. Commit to `dev`:
   ```bash
   git add <files>
   git commit -m "your message"
   git push origin dev
   ```
3. Verify changes work as expected
4. Promote to production:
   ```bash
   git push origin dev:prod
   ```

## Rules

- **Never push directly to `prod` without local validation.** Always commit to `dev` first.
- `prod` triggers GitHub Actions → SCP files to VPS → `docker compose down && docker compose up -d --build`
- Feature branches are optional for larger changes; merge to `dev` before promoting.

## Promotion Command (Quick Reference)

```bash
# Promote current dev HEAD to prod (triggers deploy)
git push origin dev:prod
```

## Related

- CI/CD workflow: `.github/workflows/deploy.yaml`
- Deployment details: `Deployment.md`
