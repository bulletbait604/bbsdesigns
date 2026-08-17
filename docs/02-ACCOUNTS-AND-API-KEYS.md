# 02 — Accounts and API Keys

## Required
- [ ] GitHub
- [ ] Shopify
- [ ] Shopify Partner/development access as appropriate
- [ ] Printify
- [ ] MongoDB
- [ ] Vercel
- [ ] AI text provider
- [ ] AI image provider

## Optional
- [ ] Cloudflare R2
- [ ] YouTube Data API
- [ ] Reddit API
- [ ] Other permitted trend-data providers

## Rule
Do not buy multiple AI APIs before the first pipeline works.

Use provider interfaces so models can be swapped later.

## Never put secrets in Git
Secrets belong in:
- local `.env.local`
- Vercel Environment Variables

Never commit API keys.
