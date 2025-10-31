import { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "./_shared/storage";
import { insertMessageSchema } from "@shared/schema";
import { requireAuth, setCorsHeaders, handleOptions } from "./_shared/auth";

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
    // Create message
    const result = insertMessageSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const notebook = await storage.getNotebook(result.data.notebookId);
    if (!notebook || notebook.userId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const message = await storage.createMessage(result.data);
    return res.json(message);
  }

  return res.status(405).json({ error: "Method not allowed" });
}

