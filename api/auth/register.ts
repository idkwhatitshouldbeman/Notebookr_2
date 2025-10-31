import { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../_shared/storage";
import { hashPassword, sanitizeUser, generateToken, setCorsHeaders, handleOptions } from "../_shared/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("[REGISTER] Request received", {
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  if (req.method === "OPTIONS") {
    console.log("[REGISTER] Handling OPTIONS request");
    return handleOptions(res);
  }

  setCorsHeaders(res);

  if (req.method !== "POST") {
    console.warn("[REGISTER] Invalid method:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password } = req.body;
    console.log("[REGISTER] Attempting registration", {
      email: email ? email.toLowerCase().trim() : null,
      hasPassword: !!password,
      passwordLength: password?.length || 0,
    });

    if (!email || !password) {
      console.warn("[REGISTER] Missing credentials", {
        hasEmail: !!email,
        hasPassword: !!password,
      });
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Validate Gmail address
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
    const normalizedEmail = email.toLowerCase().trim();
    console.log("[REGISTER] Validating Gmail address:", normalizedEmail);
    
    if (!gmailRegex.test(normalizedEmail)) {
      console.warn("[REGISTER] Invalid Gmail address:", normalizedEmail);
      return res.status(400).json({ error: "Please use a Gmail address (@gmail.com)" });
    }

    console.log("[REGISTER] Gmail address validated");

    // Check if user already exists
    console.log("[REGISTER] Checking if user already exists:", normalizedEmail);
    const existingUser = await storage.getUserByEmail(normalizedEmail);
    if (existingUser) {
      console.warn("[REGISTER] User already exists:", normalizedEmail);
      return res.status(400).json({ error: "Email already exists" });
    }

    console.log("[REGISTER] User does not exist, proceeding with creation");

    // Hash password
    console.log("[REGISTER] Hashing password");
    const hashedPassword = await hashPassword(password);

    // Create user
    console.log("[REGISTER] Creating user with email:", normalizedEmail);
    const user = await storage.createUser({
      email: normalizedEmail,
      password: hashedPassword,
      credits: 0,
      selectedAiModel: "free",
    });

    console.log("[REGISTER] User created successfully", {
      userId: user.id,
      email: user.email,
    });

    // Generate token
    console.log("[REGISTER] Generating token for user:", user.id);
    const token = generateToken(user.id);

    console.log("[REGISTER] Registration successful", {
      userId: user.id,
      email: user.email,
      tokenGenerated: !!token,
    });

    // Return user and token
    res.status(201).json({
      user: sanitizeUser(user),
      token,
    });
  } catch (error: any) {
    console.error("[REGISTER] Error occurred:", {
      message: error?.message || "Unknown error",
      stack: error?.stack,
      name: error?.name,
      error: error,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: "Internal server error" });
  }
}

