import { VercelRequest, VercelResponse } from "@vercel/node";
import { getUserFromRequest, sanitizeUser, setCorsHeaders, handleOptions } from "../_shared/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    return handleOptions(res);
  }

  setCorsHeaders(res);

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    const user = await getUserFromRequest(authHeader);

    if (!user) {
      return res.status(200).json(null);
    }

    res.status(200).json(sanitizeUser(user));
  } catch (error: any) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

