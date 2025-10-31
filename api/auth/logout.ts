import { VercelRequest, VercelResponse } from "@vercel/node";
import { setCorsHeaders, handleOptions } from "../_shared/cors";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    return handleOptions(res);
  }

  setCorsHeaders(res);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // With JWT, logout is handled client-side by removing the token
  // This endpoint just confirms the logout
  res.status(200).json({ message: "Logged out successfully" });
}

