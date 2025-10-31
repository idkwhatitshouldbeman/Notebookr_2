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

  const sectionId = req.query.id as string;

  if (req.method === "PATCH") {
    // Update section
    const section = await storage.getSection(sectionId);
    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }
    const notebook = await storage.getNotebook(section.notebookId);
    if (!notebook || notebook.userId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const schema = z.object({ content: z.string() });
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const updated = await storage.updateSection(sectionId, result.data.content);
    return res.json(updated);
  }

  return res.status(405).json({ error: "Method not allowed" });
}

