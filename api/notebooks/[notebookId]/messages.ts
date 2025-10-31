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

  const notebookId = req.query.notebookId as string;

  if (req.method === "GET") {
    // Get messages for a notebook
    const notebook = await storage.getNotebook(notebookId);
    if (!notebook || notebook.userId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const messages = await storage.getMessagesByNotebookId(notebookId);
    return res.json(messages);
  }

  return res.status(405).json({ error: "Method not allowed" });
}

