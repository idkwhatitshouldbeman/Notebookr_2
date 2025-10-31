import { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../_shared/storage";
import { insertNotebookSchema } from "@shared/schema";
import { requireAuth, setCorsHeaders, handleOptions } from "../_shared/auth";

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

  const notebookId = req.query.id as string;

  if (req.method === "GET") {
    // Get notebook
    const notebook = await storage.getNotebook(notebookId);
    if (!notebook) {
      return res.status(404).json({ error: "Notebook not found" });
    }
    if (notebook.userId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.json(notebook);
  }

  if (req.method === "PATCH") {
    // Update notebook
    const notebook = await storage.getNotebook(notebookId);
    if (!notebook || notebook.userId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const result = insertNotebookSchema.partial().safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const updated = await storage.updateNotebook(notebookId, result.data);
    return res.json(updated);
  }

  if (req.method === "DELETE") {
    // Delete notebook
    const notebook = await storage.getNotebook(notebookId);
    if (!notebook || notebook.userId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await storage.deleteNotebook(notebookId);
    return res.status(204).send();
  }

  return res.status(405).json({ error: "Method not allowed" });
}

