import { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "./_shared/storage";
import { insertSectionSchema } from "@shared/schema";
import { requireAuth } from "./_shared/auth";
import { setCorsHeaders, handleOptions } from "./_shared/cors";

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

  if (req.method === "POST") {
    // Create section
    const result = insertSectionSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const notebook = await storage.getNotebook(result.data.notebookId);
    if (!notebook || notebook.userId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const section = await storage.createSection(result.data);
    return res.json(section);
  }

  return res.status(405).json({ error: "Method not allowed" });
}

