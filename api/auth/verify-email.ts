import { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../_shared/storage";
import { sanitizeUser, generateToken } from "../_shared/auth";
import { setCorsHeaders, handleOptions } from "../_shared/cors";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    return handleOptions(res);
  }

  setCorsHeaders(res);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Verification token is required" });
    }

    console.log("[VERIFY-EMAIL] Attempting to verify email with token");

    // Find user by verification token
    const user = await storage.getUserByVerificationToken(token);
    if (!user) {
      console.warn("[VERIFY-EMAIL] Invalid or expired token");
      return res.status(400).json({ error: "Invalid or expired verification token" });
    }

    // Check if already verified
    if (user.emailVerified === "true") {
      console.log("[VERIFY-EMAIL] Email already verified");
      return res.status(200).json({
        message: "Email already verified",
        user: sanitizeUser(user),
      });
    }

    // Verify the email
    await storage.verifyUserEmail(user.id);
    console.log("[VERIFY-EMAIL] Email verified successfully for user:", user.id);

    // Generate token for the user
    const authToken = generateToken(user.id);

    // Get updated user
    const updatedUser = await storage.getUser(user.id);

    // Return user and token
    res.status(200).json({
      message: "Email verified successfully",
      user: sanitizeUser(updatedUser!),
      token: authToken,
    });
  } catch (error: any) {
    console.error("[VERIFY-EMAIL] Error occurred:", {
      message: error?.message || "Unknown error",
      stack: error?.stack,
      name: error?.name,
      error: error,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: "Internal server error" });
  }
}

