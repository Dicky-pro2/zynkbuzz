#!/usr/bin/env node
/**
 * Local API development server for ZynkBuzz
 *
 * Runs serverless functions locally without requiring Vercel login.
 *
 * Usage:
 *   npx tsx dev-api-server.js    (Terminal 1)
 *   npm run dev                  (Terminal 2 - runs Vite frontend)
 *
 * Configuration:
 *   - Vite proxies /api/* to http://localhost:3001
 *   - Loads .env, .env.local, .env.development
 *   - Requires RESEND_API_KEY, COCOBASE_API_KEY, COCOBASE_PROJECT_ID
 */

import dotenv from "dotenv";
import fs from "fs";
import http from "http";

// Load environment variables
const envFiles = [".env", ".env.local", ".env.development"];
for (const file of envFiles) {
  if (fs.existsSync(file)) {
    dotenv.config({ path: file });
  }
}

console.log("\n🔧 Starting local API development server...\n");

// Import handlers (assumes tsx is running this file)
let sendVerificationHandler;
let verifyEmailHandler;
let resendVerificationHandler;

try {
  const sendVerif = await import("./api/send-verification.ts");
  const verifyEmail = await import("./api/verify-email.ts");
  const resendVerif = await import("./api/auth/resend-verification.ts");

  sendVerificationHandler = sendVerif.default;
  verifyEmailHandler = verifyEmail.default;
  resendVerificationHandler = resendVerif.default;

  console.log("✅ API handlers loaded\n");
} catch (error) {
  console.error("❌ Failed to load handlers:", error.message);
  console.error("\nMake sure to run this with tsx:");
  console.error("  npx tsx dev-api-server.js\n");
  process.exit(1);
}

// Helper: Parse JSON body
async function parseBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

// Request handler
async function handleRequest(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse body
  req.body = await parseBody(req);

  try {
    // Response wrapper matching Vercel's format
    const mockRes = {
      status: (code) => ({
        json: (payload) => {
          res.writeHead(code, { "Content-Type": "application/json" });
          res.end(JSON.stringify(payload));
        },
      }),
    };

    // Route to handlers
    if (req.url === "/api/send-verification" && req.method === "POST") {
      console.log("→ POST /api/send-verification");
      return await sendVerificationHandler(req, mockRes);
    }

    if (req.url === "/api/verify-email" && req.method === "POST") {
      console.log("→ POST /api/verify-email");
      return await verifyEmailHandler(req, mockRes);
    }

    if (req.url === "/api/auth/resend-verification" && req.method === "POST") {
      console.log("→ POST /api/auth/resend-verification");
      return await resendVerificationHandler(req, mockRes);
    }

    // 404
    console.log(`✗ ${req.method} ${req.url} → 404`);
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

// Start server
const PORT = process.env.DEV_API_PORT || 3001;
const server = http.createServer(handleRequest);

server.listen(PORT, "localhost", () => {
  console.log(`✅ API server listening on http://localhost:${PORT}\n`);
  console.log(`📍 Routes:`);
  console.log(`   POST /api/send-verification        (requires auth)`);
  console.log(`   POST /api/verify-email              (public)`);
  console.log(`   POST /api/auth/resend-verification  (public)\n`);
  console.log(`⚙️  Environment check:`);
  console.log(
    `   RESEND_API_KEY: ${process.env.RESEND_API_KEY ? "✅ set" : "❌ missing"}`,
  );
  console.log(
    `   COCOBASE_API_KEY: ${process.env.COCOBASE_API_KEY ? "✅ set" : "❌ missing"}`,
  );
  console.log(
    `   COCOBASE_PROJECT_ID: ${process.env.COCOBASE_PROJECT_ID ? "✅ set" : "❌ missing"}\n`,
  );
  console.log(
    `🔗 Frontend proxies /api/* to this server (configured in vite.config.ts)\n`,
  );
});

process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down...");
  server.close();
});
