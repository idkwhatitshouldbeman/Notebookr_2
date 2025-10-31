import { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../_shared/storage";
import { comparePasswords, sanitizeUser, generateToken } from "../_shared/auth";
import { setCorsHeaders, handleOptions } from "../_shared/cors";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("[LOGIN] Request received", {
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  if (req.method === "OPTIONS") {
    console.log("[LOGIN] Handling OPTIONS request");
    return handleOptions(res);
  }

  setCorsHeaders(res);

  if (req.method !== "POST") {
    console.warn("[LOGIN] Invalid method:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password } = req.body;
    console.log("[LOGIN] Attempting login", {
      email: email ? email.toLowerCase().trim() : null,
      hasPassword: !!password,
      passwordLength: password?.length || 0,
    });

    if (!email || !password) {
      console.warn("[LOGIN] Missing credentials", {
        hasEmail: !!email,
        hasPassword: !!password,
      });
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log("[LOGIN] Looking up user by email:", normalizedEmail);

    // Find user
    const user = await storage.getUserByEmail(normalizedEmail);
    if (!user) {
      console.warn("[LOGIN] User not found:", normalizedEmail);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log("[LOGIN] User found", {
      userId: user.id,
      email: user.email,
    });

    // Verify password
    console.log("[LOGIN] Verifying password");
    const isValid = await comparePasswords(password, user.password);
    if (!isValid) {
      console.warn("[LOGIN] Invalid password for user:", normalizedEmail);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log("[LOGIN] Password verified successfully");

    // Generate token
    console.log("[LOGIN] Generating token for user:", user.id);
    const token = generateToken(user.id);

    console.log("[LOGIN] Login successful", {
      userId: user.id,
      email: user.email,
      tokenGenerated: !!token,
    });

    // Return user and token
    res.status(200).json({
      user: sanitizeUser(user),
      token,
    });
  } catch (error: any) {
    console.error("[LOGIN] Error occurred:", {
      message: error?.message || "Unknown error",
      stack: error?.stack,
      name: error?.name,
      error: error,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: "Internal server error" });
  }
}

