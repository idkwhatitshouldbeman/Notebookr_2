import jwt from "jsonwebtoken";
import { type User } from "@shared/schema";
import { storage } from "./storage";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = "7d"; // 7 days

// Helper to sanitize user objects - remove password before sending to frontend
export function sanitizeUser(user: User) {
  const { password, ...sanitized } = user;
  return sanitized;
}

// Hash password for registration
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Compare password for login
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Generate JWT token
export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token and get user
export async function verifyToken(token: string): Promise<User | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await storage.getUserById(decoded.userId);
    return user || null;
  } catch (error) {
    return null;
  }
}

// Get user from request (extract token from Authorization header)
export async function getUserFromRequest(
  authHeader: string | null | undefined
): Promise<User | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  return await verifyToken(token);
}

// Middleware helper for protected routes
export async function requireAuth(
  authHeader: string | null | undefined
): Promise<{ user: User } | { error: string; status: number }> {
  const user = await getUserFromRequest(authHeader);
  if (!user) {
    return { error: "Unauthorized", status: 401 };
  }
  return { user };
}

