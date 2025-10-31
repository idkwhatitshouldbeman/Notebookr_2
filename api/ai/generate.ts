import { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../_shared/storage";
import { z } from "zod";
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

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const schema = z.object({
      instruction: z.string(),
      notebookId: z.string(),
      sections: z.array(z.object({
        id: z.string(),
        title: z.string(),
        content: z.string(),
      })),
      aiMemory: z.any().optional(),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const { instruction, notebookId, sections, aiMemory } = result.data;

    // Get notebook to check ownership
    const notebook = await storage.getNotebook(notebookId);
    if (!notebook || notebook.userId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Use three-phase generation
    const { threePhaseGeneration } = await import("../../server/ai-service");
    const threePhaseResult = await threePhaseGeneration({
      instruction,
      sections,
      aiMemory: aiMemory || notebook.aiMemory,
      notebookId
    });

    // Update notebook AI memory
    await storage.updateNotebookAiMemory(notebookId, threePhaseResult.aiMemory);

    // Return full response
    res.json({
      actions: threePhaseResult.actions,
      message: threePhaseResult.message,
      phase: threePhaseResult.phase,
      confidence: threePhaseResult.confidence,
      plan: threePhaseResult.plan,
      shouldContinue: threePhaseResult.shouldContinue,
      isComplete: threePhaseResult.isComplete,
      aiMemory: threePhaseResult.aiMemory,
      suggestedTitle: threePhaseResult.suggestedTitle
    });
  } catch (error: any) {
    console.error("❌ AI generation error:", error);
    res.status(500).json({ error: "Failed to generate content" });
  }
}

