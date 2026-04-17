# Deploying UPF-Connect to connect.upf.ac.ma

## Step 1 — Build the project

```bash
npm run build
```

Output will be generated in the `/dist` folder.

## Step 2 — Choose a hosting provider

Recommended hosts: Vercel, Netlify, Cloudflare Pages, or your own server.

## Step 3 — Deploy

Follow your hosting provider's guide to connect the repository and publish the site. Once deployed, configure your custom domain in the provider's dashboard.

## Step 4 — Configure custom domain (connect.upf.ac.ma)

1. In your hosting provider's dashboard, add a custom domain: `connect.upf.ac.ma`
2. Add the DNS records your provider requests (A/CNAME/TXT) at your university DNS panel.
3. HTTPS certificate is typically provisioned automatically by the host.

## Step 5 — Configure backend for production

1. In your hosting dashboard, set application environment variables and site URL.
2. Set **Site URL**: `https://connect.upf.ac.ma`
3. Add **Redirect URLs** required by your auth provider, for example:
   - `https://connect.upf.ac.ma/**`
   - `https://connect.upf.ac.ma/reset-password`

## Step 6 — Verify production

- Open https://connect.upf.ac.ma
- Check HTTPS padlock in browser
- Test login and signup flows
- Test password reset email delivery
- Verify dark mode works correctly
- Test file uploads (avatar, cover, documents)

## Environment Variables

The following environment variables are required and must be set in your hosting provider or environment manager:

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Backend API URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public API key |
| `VITE_SUPABASE_PROJECT_ID` | Project identifier |

## Security Checklist

- [x] No hardcoded API keys in source code
- [x] RLS enabled on all database tables
- [x] Service role key never exposed to frontend
- [x] CSP headers configured (vercel.json)
- [x] HTTPS enforced via HSTS
- [x] File upload validation (type + size)
- [x] Input sanitization (DOMPurify)
- [x] Rate limiting on login attempts
- [x] Session timeout after 60min inactivity
