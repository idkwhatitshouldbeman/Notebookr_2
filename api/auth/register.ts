import { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../_shared/storage";
import { hashPassword, sanitizeUser, generateToken } from "../_shared/auth";
import { setCorsHeaders, handleOptions } from "../_shared/cors";
import { sendEmail, generateVerificationEmailHtml } from "../_shared/email";
import { randomBytes } from "crypto";
import { promisify } from "util";

const randomBytesAsync = promisify(randomBytes);

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

    // Generate verification token
    console.log("[REGISTER] Generating verification token");
    const tokenBytes = await randomBytesAsync(32);
    const verificationToken = tokenBytes.toString("hex");

    // Create user
    console.log("[REGISTER] Creating user with email:", normalizedEmail);
    const user = await storage.createUser({
      email: normalizedEmail,
      password: hashedPassword,
      emailVerified: "false",
      emailVerificationToken: verificationToken,
      credits: 0,
      selectedAiModel: "free",
    });

    console.log("[REGISTER] User created successfully", {
      userId: user.id,
      email: user.email,
    });

    // Generate auth token
    console.log("[REGISTER] Generating auth token for user:", user.id);
    const authToken = generateToken(user.id);

    // Generate verification URL
    const baseUrl = process.env.FRONTEND_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:5173";
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

    // Send verification email
    try {
      console.log("[REGISTER] Sending verification email to:", normalizedEmail);
      await sendEmail({
        to: normalizedEmail,
        subject: "Verify your Notebookr account",
        html: generateVerificationEmailHtml(verificationUrl),
      });
      console.log("[REGISTER] Verification email sent successfully");
    } catch (emailError) {
      console.error("[REGISTER] Failed to send verification email:", emailError);
      // Continue even if email fails - user can request resend later
    }

    console.log("[REGISTER] Registration successful", {
      userId: user.id,
      email: user.email,
      tokenGenerated: !!authToken,
    });

    // Return user and token
    res.status(201).json({
      user: sanitizeUser(user),
      token: authToken,
      emailVerificationSent: true,
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

