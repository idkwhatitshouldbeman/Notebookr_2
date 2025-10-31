import { VercelRequest, VercelResponse } from "@vercel/node";
import { getUserFromRequest, sanitizeUser } from "../_shared/auth";
import { setCorsHeaders, handleOptions } from "../_shared/cors";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("[SERVERLESS_USER] Request received", {
    method: req.method,
    url: req.url,
    path: req.url,
    hasAuthHeader: !!req.headers.authorization,
    timestamp: new Date().toISOString(),
  });

  if (req.method === "OPTIONS") {
    console.log("[SERVERLESS_USER] Handling OPTIONS request");
    return handleOptions(res);
  }

  setCorsHeaders(res);

  if (req.method !== "GET") {
    console.warn("[SERVERLESS_USER] Invalid method:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    console.log("[SERVERLESS_USER] Getting user from request", {
      hasAuthHeader: !!authHeader,
      authHeaderPrefix: authHeader?.substring(0, 20) || "none",
    });

    const user = await getUserFromRequest(authHeader);

    if (!user) {
      console.log("[SERVERLESS_USER] No user found - returning null");
      return res.status(200).json(null);
    }

    console.log("[SERVERLESS_USER] User found:", {
      userId: user.id,
      email: user.email,
    });

    res.status(200).json(sanitizeUser(user));
  } catch (error: any) {
    console.error("[SERVERLESS_USER] Error occurred:", {
      message: error?.message || "Unknown error",
      stack: error?.stack,
      name: error?.name,
      error: error,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: "Internal server error" });
  }
}

