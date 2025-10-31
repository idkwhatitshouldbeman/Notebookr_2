import { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../_shared/storage";
import { z } from "zod";
import { requireAuth } from "../../_shared/auth";
import { setCorsHeaders, handleOptions } from "../../_shared/cors";

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

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for Vercel
    res.flushHeaders();

    // Import streaming function
    const { threePhaseGenerationStream } = await import("../../../server/ai-service");

    // Start streaming generation with heartbeat
    // The stream function already sends heartbeats every 7 seconds
    try {
      for await (const event of threePhaseGenerationStream({
        instruction,
        sections,
        aiMemory: aiMemory || notebook.aiMemory,
        notebookId
      })) {
        // Send event to client - this keeps connection alive
        res.write(`data: ${JSON.stringify(event)}\n\n`);
        
        // Force flush to ensure data is sent immediately (keeps connection alive)
        if (res.flush) {
          res.flush();
        }
      }

      // Close the stream
      res.write('data: {"type":"close"}\n\n');
      res.end();
    } catch (error: any) {
      console.error("❌ AI streaming error:", error);
      res.write(`data: ${JSON.stringify({ type: "error", error: "Failed to generate content" })}\n\n`);
      res.end();
    }
  } catch (error: any) {
    console.error("❌ AI streaming setup error:", error);
    res.status(500).json({ error: "Failed to start streaming" });
  }
}

