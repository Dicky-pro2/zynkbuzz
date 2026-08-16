# 🚀 Local Development Setup for ZynkBuzz

## Quick Start (Two Terminals)

### Terminal 1: Start the API Server

```bash
npm run dev:api
```

Expected output:

```
🔧 Starting local API development server...
✅ API handlers loaded
✅ API server listening on http://localhost:3001

📍 Routes:
   POST /api/send-verification        (requires auth)
   POST /api/verify-email              (public)
   POST /api/auth/resend-verification  (public)

⚙️  Environment check:
   RESEND_API_KEY: ✅ set
   COCOBASE_API_KEY: ✅ set
   COCOBASE_PROJECT_ID: ✅ set

🔗 Frontend proxies /api/* to this server (configured in vite.config.ts)
```

### Terminal 2: Start the Frontend

```bash
npm run dev
```

Expected output:

```
VITE v8.0.16  ready in 234 ms

➜  Local:   http://localhost:5173/
```

## Architecture

```
Frontend (Vite)                 Backend (Serverless Functions)
http://localhost:5173     →     http://localhost:3001
   ↓                                ↓
Browser                      Development API Server
   ↓                                ↓
fetch("/api/send-verification") → tsx loads handlers → Cocobase/Resend
```

**How it works:**

1. Vite frontend runs on `localhost:5173`
2. When browser makes `POST /api/send-verification`, Vite's proxy intercepts it
3. Proxy forwards to development API server on `localhost:3001`
4. Dev server imports the TypeScript handler files (using `tsx`)
5. Handler processes request and returns response
6. Frontend receives response and handles it

## Environment Variables

**Server-side ONLY** (never expose to browser):

```env
# Cocobase
COCOBASE_API_KEY=your_key_here
COCOBASE_PROJECT_ID=your_project_id_here
COCOBASE_BASE_URL=https://api.cocobase.cc

# Email (Resend)
RESEND_API_KEY=your_resend_key_here

# Payments (Paystack)
PAYSTACK_SECRET_KEY=your_paystack_secret_key_here
```

**Frontend-only** (safe to expose):

```env
VITE_APP_NAME=Zynk
VITE_APP_URL=http://localhost:5173
VITE_PAYSTACK_PUBLIC_KEY=your_public_key_here
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

**⚠️ SECURITY:** Never add `VITE_` prefix to Cocobase, Resend, or Paystack secret keys. They must remain server-side only.

## Testing the API Manually

### Test 1: Send Verification Email (Authenticated)

```bash
curl -X POST http://localhost:3001/api/send-verification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{}'
```

Expected response (user already verified):

```json
{ "success": true, "message": "This email is already verified." }
```

Or (rate limited):

```json
{
  "error": "Too many verification emails sent. Please wait before requesting another one."
}
```

### Test 2: Verify Email Token (Public)

```bash
curl -X POST http://localhost:3001/api/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"VERIFICATION_TOKEN_FROM_EMAIL"}'
```

Expected response (successful):

```json
{ "success": true, "message": "Email verified successfully." }
```

### Test 3: Public Resend (Logged-Out)

```bash
curl -X POST http://localhost:3001/api/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

Expected response (generic, doesn't leak account info):

```json
{
  "success": true,
  "message": "If an account with that email requires verification, a new verification email has been sent."
}
```

## Files Modified

### 1. `dev-api-server.js` (NEW)

- Simple HTTP server that loads and runs serverless function handlers
- Uses `tsx` to import TypeScript files
- Proxies `/api/*` requests to handlers
- Loads environment variables from `.env`, `.env.local`, `.env.development`

### 2. `vite.config.ts` (MODIFIED)

- Added `/api` proxy configuration
- Forwards `/api/*` requests from frontend to `http://localhost:3001`

### 3. `package.json` (MODIFIED)

- Added `npm run dev:api` script → `tsx dev-api-server.js`
- Added `tsx` as a dev dependency (TypeScript executor)
- Added `dotenv` to dependencies (loads .env files)

### 4. `.env` (MODIFIED)

- Reorganized environment variables
- Added server-side credentials (without `VITE_` prefix)
- Documented which variables are server-side only

## Troubleshooting

### API Server Won't Start

**Error: `Cannot find package 'dotenv'`**

```bash
npm install
```

**Error: `Cannot find module './api/send-verification.ts'`**
Make sure you're running with `tsx`:

```bash
npm run dev:api
# NOT: node dev-api-server.js
```

### API Requests Return 404

1. Verify dev API server is running (should see output from `npm run dev:api`)
2. Check that Vite is running (`npm run dev`)
3. Check browser Network tab - requests should go to `http://localhost:3001`
4. Confirm `vite.config.ts` has `/api` proxy configured

### Environment Variables Not Loading

1. Check `.env` file exists in project root
2. Restart `npm run dev:api` after changing `.env`
3. Verify variables are set: `COCOBASE_API_KEY`, `COCOBASE_PROJECT_ID`, `RESEND_API_KEY`

### Verification Email Not Sent

1. Confirm `RESEND_API_KEY` is valid
2. Confirm sender domain is configured in Resend
3. Check server logs for Resend error messages
4. Verify user is authenticated (for `/api/send-verification`)
5. Check rate limiting hasn't blocked request

### Cocobase Errors

1. Confirm `COCOBASE_API_KEY` and `COCOBASE_PROJECT_ID` are valid
2. Confirm `COCOBASE_BASE_URL` is set correctly
3. Verify network connectivity to Cocobase API
4. Check Cocobase collections exist: `email_verifications`, `users`

## Production Deployment

For Vercel production deployment:

1. No changes needed to code
2. Environment variables are managed in Vercel dashboard
3. Vercel automatically runs Vercel serverless functions
4. No local dev server needed

Simply push to your Vercel-connected branch, and the functions deploy automatically.

## Architecture Notes

### Why This Approach?

Instead of using `vercel dev`, we created a lightweight local API server because:

1. **No Vercel CLI auth required** - Works without `vercel login`
2. **Simpler setup** - Just `npm install` then two `npm run` commands
3. **TypeScript support** - `tsx` handles `.ts` files transparently
4. **Full control** - We own the dev server code
5. **Production parity** - Same handler code runs locally and on Vercel

### How Verification Works Locally

1. Frontend calls `fetch("/api/send-verification", { headers: { Authorization: "Bearer TOKEN" } })`
2. Vite intercepts and proxies to `http://localhost:3001/api/send-verification`
3. Dev server receives request, validates Bearer token
4. Server creates verification token (32 random bytes, hashed with SHA-256)
5. Stores in Cocobase `email_verifications` collection with expiry
6. Calls Resend API to send email with verification link
7. Frontend displays success message

### Rate Limiting

**Local limitation:** In-memory rate limiter resets when dev server restarts

**Production:** Each Vercel function instance has its own rate limiter. Consider migrating to Redis or a persistent store for global rate limiting.

## Next Steps

After local testing works:

1. **Test email delivery** - Verify emails actually arrive (requires valid Resend domain)
2. **Test verification flow** - Click email link, confirm verification works
3. **Test rate limiting** - Send >3 requests, confirm 429 response
4. **Deploy to staging** - Push to Vercel and test production environment
5. **Production testing** - Smoke test on live Vercel deployment
