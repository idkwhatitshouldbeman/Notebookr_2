import { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../_shared/storage";
import { z } from "zod";
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

  if (req.method === "PATCH") {
    const schema = z.object({
      model: z.enum(["free", "fast", "ultra"]),
    });
    
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const { model } = result.data;
    const fullUser = await storage.getUserById(user.id);
    
    if (!fullUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent selecting paid models without credits
    if ((model === "fast" || model === "ultra") && fullUser.credits <= 0) {
      return res.status(403).json({ error: "Insufficient credits for premium models" });
    }

    await storage.updateUserAiModel(user.id, model);
    res.json({ success: true, model });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

