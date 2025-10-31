import { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../_shared/storage";
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

  if (req.method === "GET") {
    // Get user transactions
    const transactions = await storage.getUserTransactions(user.id);
    res.json(transactions);
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

