# Daytona Webhook TODO

This repo already supports receiving Daytona sandbox lifecycle webhooks at:

- `https://<your-convex-site>/api/daytona/webhook`

Daytona webhook access is not enabled for the organization yet, so keep this as a follow-up task.

## Checklist

1. Ask Daytona to enable the `Webhooks` feature for the organization.
2. Open Daytona Dashboard and go to `Webhooks`.
3. Create an endpoint with URL `https://<your-convex-site>/api/daytona/webhook`.
4. Subscribe to at least `sandbox.created` and `sandbox.state.updated`.
5. Copy the endpoint signing secret and store it in Convex as `DAYTONA_WEBHOOK_SIGNING_SECRET`.
6. Optionally set `DAYTONA_WEBHOOK_ORGANIZATION_ID` as a second allowlist check.
7. Send a test delivery and confirm Repospark accepts it.

## Why This Matters

- Daytona is the source of truth for real sandbox lifecycle changes.
- The webhook lets Convex learn about sandbox state changes sooner instead of waiting for cron reconciliation.
- Faster notice reduces stale sandbox status and shortens the time an orphan Daytona sandbox can exist before cleanup notices it.
- Cron still remains the safety net, so the system works without webhook access, just with slower convergence.