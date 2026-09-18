# Hostinger Business deployment

Rexsun runs as a managed Node.js Web App with a Hostinger MySQL database. The
GitHub `main` branch is the deployment source so future pushes can be
redeployed from hPanel.

## Web app settings

| Setting | Value |
| --- | --- |
| Framework | Next.js |
| Node.js | 22.x |
| Root directory | `.` |
| Install command | `npm install` |
| Build command | `npm run build` |
| Start command | `npm start` |
| Output directory | `.next` (only if requested) |
| Port | `3000` |

The build generates Prisma Client, creates or updates the MySQL schema, seeds
new catalogue records without overwriting admin edits, and builds Next.js.

## Required environment variables

```text
DATABASE_URL=mysql://DB_USER:DB_PASSWORD@localhost:3306/DB_NAME?connection_limit=5
ADMIN_EMAIL=admin@rexsun.in
ADMIN_PASSWORD=use-a-long-unique-password
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://temporary-domain.hostingersite.com
```

Optional Razorpay, WhatsApp, and Resend variables are documented in
`.env.example`. Add secrets in hPanel only; never commit them.

## Smoke checks

- `/` loads the storefront.
- `/admin/login` accepts the configured admin credentials.
- A product page loads its variants from MySQL.
- Cart checkout creates an order.
- `/robots.txt` and `/sitemap.xml` use the deployed temporary domain.

Admin image uploads are stored on the web app filesystem. Hostinger may replace
those files during a versioned redeploy, so use existing repository assets
until durable object storage is connected.
