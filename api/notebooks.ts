import { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "./_shared/storage";
import { insertNotebookSchema } from "@shared/schema";
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

  if (req.method === "GET") {
    // Get all notebooks
    const notebooks = await storage.getNotebooks(user.id);
    return res.json(notebooks);
  }

  if (req.method === "POST") {
    // Create notebook
    const result = insertNotebookSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const notebook = await storage.createNotebook({ ...result.data, userId: user.id });
    return res.json(notebook);
  }

  return res.status(405).json({ error: "Method not allowed" });
}

