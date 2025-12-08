# Deploying BookPost API to Fly.io

## Prerequisites

1. Install Fly CLI:
   ```bash
   # macOS
   brew install flyctl

   # or via curl
   curl -L https://fly.io/install.sh | sh
   ```

2. Login to Fly.io:
   ```bash
   fly auth login
   ```

## First-time Deployment

1. Navigate to the API directory:
   ```bash
   cd packages/api
   ```

2. Launch the app (creates the app on Fly.io):
   ```bash
   fly launch --no-deploy
   ```
   - When prompted, accept the defaults or customize the region
   - App name: `bookpost-api`
   - Region: `nrt` (Tokyo) recommended for low latency

3. Set environment secrets:
   ```bash
   fly secrets set DATABASE_URL="your-supabase-connection-string"
   fly secrets set JWT_SECRET="your-production-jwt-secret"
   ```

4. Deploy:
   ```bash
   fly deploy
   ```

## Subsequent Deployments

```bash
cd packages/api
fly deploy
```

## Useful Commands

```bash
# View logs
fly logs

# SSH into container
fly ssh console

# Check app status
fly status

# Open app in browser
fly open

# View secrets (names only)
fly secrets list

# Scale the app
fly scale count 2  # Run 2 instances
```

## Environment Variables

Required secrets for production:
- `DATABASE_URL` - Supabase PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT token signing

Auto-configured:
- `PORT=8080` - Set in fly.toml
- `NODE_ENV=production` - Set in fly.toml

## Monitoring

- Dashboard: https://fly.io/apps/bookpost-api
- Logs: `fly logs -a bookpost-api`
- Metrics: Available in Fly.io dashboard

## Troubleshooting

1. **App not starting**: Check logs with `fly logs`
2. **Database connection issues**: Verify DATABASE_URL secret is set correctly
3. **SSL errors**: Supabase requires SSL - ensure connection string is correct
