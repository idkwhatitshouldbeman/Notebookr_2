import { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../_shared/storage";
import { getUserFromRequest } from "../_shared/auth";
import { setCorsHeaders, handleOptions } from "../_shared/cors";
import { sendEmail, generateVerificationEmailHtml } from "../_shared/email";
import { randomBytes } from "crypto";
import { promisify } from "util";

const randomBytesAsync = promisify(randomBytes);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    return handleOptions(res);
  }

  setCorsHeaders(res);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get user from token
    const authHeader = req.headers.authorization;
    const authResult = await getUserFromRequest(authHeader);
    
    if (!authResult || "error" in authResult) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = authResult;

    // Check if already verified
    if (user.emailVerified === "true") {
      return res.status(400).json({ error: "Email is already verified" });
    }

    console.log("[RESEND-VERIFICATION] Generating new token for user:", user.id);

    // Generate new verification token
    const tokenBytes = await randomBytesAsync(32);
    const verificationToken = tokenBytes.toString("hex");

    // Save token to database
    await storage.updateUserVerificationToken(user.id, verificationToken);

    // Generate verification URL
    const baseUrl = process.env.FRONTEND_URL || (process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:5173");
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

    // Send verification email
    try {
      await sendEmail({
        to: user.email,
        subject: "Verify your Notebookr account",
        html: generateVerificationEmailHtml(verificationUrl),
      });

      console.log("[RESEND-VERIFICATION] Verification email sent to:", user.email);

      res.status(200).json({
        message: "Verification email sent successfully",
      });
    } catch (emailError) {
      console.error("[RESEND-VERIFICATION] Failed to send email:", emailError);
      // Still return success for security (don't reveal email sending issues)
      res.status(200).json({
        message: "Verification email sent successfully",
      });
    }
  } catch (error: any) {
    console.error("[RESEND-VERIFICATION] Error occurred:", {
      message: error?.message || "Unknown error",
      stack: error?.stack,
      name: error?.name,
      error: error,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: "Internal server error" });
  }
}

