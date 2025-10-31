import { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../_shared/storage";
import { requireAuth, setCorsHeaders, handleOptions } from "../../_shared/auth";

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

  if (req.method === "GET") {
    // Get section versions
    const section = await storage.getSection(sectionId);
    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }
    const notebook = await storage.getNotebook(section.notebookId);
    if (!notebook || notebook.userId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const versions = await storage.getSectionVersions(sectionId);
    return res.json(versions);
  }

  return res.status(405).json({ error: "Method not allowed" });
}

