import { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../_shared/storage";
import { requireAuth } from "../_shared/auth";
import { setCorsHeaders, handleOptions } from "../_shared/cors";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    return handleOptions(res);
  }

  setCorsHeaders(res);

  const authResult = await requireAuth(req.headers.authorization);
  if ("error" in authResult) {
    return res.status(authResult.status).json({ error: authResult.error });
  }
  const { user } = authResult;

  if (req.method === "GET") {
    // Get user credits
    const fullUser = await storage.getUserById(user.id);
    if (!fullUser) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ credits: fullUser.credits, selectedAiModel: fullUser.selectedAiModel });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

