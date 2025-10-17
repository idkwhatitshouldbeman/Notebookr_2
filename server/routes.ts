import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertNotebookSchema, insertSectionSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./auth";
import { generateWithFallback } from "./ai-service";

export function registerRoutes(app: Express): Server {
  // Setup authentication - now includes /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Notebooks (protected)
  app.get("/api/notebooks", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const notebooks = await storage.getNotebooks(userId);
    res.json(notebooks);
  });

  app.get("/api/notebooks/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const notebook = await storage.getNotebook(req.params.id);
    if (!notebook) {
      return res.status(404).json({ error: "Notebook not found" });
    }
    if (notebook.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(notebook);
  });

  app.post("/api/notebooks", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const result = insertNotebookSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const notebook = await storage.createNotebook({ ...result.data, userId });
    res.json(notebook);
  });

  app.patch("/api/notebooks/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const notebook = await storage.getNotebook(req.params.id);
    if (!notebook || notebook.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const result = insertNotebookSchema.partial().safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const updated = await storage.updateNotebook(req.params.id, result.data);
    res.json(updated);
  });

  app.delete("/api/notebooks/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const notebook = await storage.getNotebook(req.params.id);
    if (!notebook || notebook.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await storage.deleteNotebook(req.params.id);
    res.status(204).send();
  });

  // Sections
  app.get("/api/notebooks/:notebookId/sections", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const notebook = await storage.getNotebook(req.params.notebookId);
    if (!notebook || notebook.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const sections = await storage.getSectionsByNotebookId(req.params.notebookId);
    res.json(sections);
  });

  app.post("/api/sections", isAuthenticated, async (req: any, res) => {
    const result = insertSectionSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const notebook = await storage.getNotebook(result.data.notebookId);
    const userId = req.user.id;
    if (!notebook || notebook.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const section = await storage.createSection(result.data);
    res.json(section);
  });

  app.patch("/api/sections/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const section = await storage.getSection(req.params.id);
    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }
    const notebook = await storage.getNotebook(section.notebookId);
    if (!notebook || notebook.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const schema = z.object({ content: z.string() });
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const updated = await storage.updateSection(req.params.id, result.data.content);
    res.json(updated);
  });

  // Section Version History
  app.get("/api/sections/:id/versions", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const section = await storage.getSection(req.params.id);
    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }
    const notebook = await storage.getNotebook(section.notebookId);
    if (!notebook || notebook.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const versions = await storage.getSectionVersions(req.params.id);
    res.json(versions);
  });

  app.post("/api/sections/:id/restore/:versionId", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const section = await storage.getSection(req.params.id);
    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }
    const notebook = await storage.getNotebook(section.notebookId);
    if (!notebook || notebook.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const restored = await storage.restoreSectionVersion(req.params.id, req.params.versionId);
    if (!restored) {
      return res.status(404).json({ error: "Version not found" });
    }
    res.json(restored);
  });

  // AI Generation - Three-phase workflow with planning
  app.post("/api/ai/generate", isAuthenticated, async (req: any, res) => {
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
    const userId = req.user.id;

    try {
      // Get notebook to check ownership and retrieve AI memory
      const notebook = await storage.getNotebook(notebookId);
      if (!notebook || notebook.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Use three-phase generation - prefer passed aiMemory over stored
      const threePhaseResult = await import("./ai-service").then(m => 
        m.threePhaseGeneration({
          instruction,
          sections,
          aiMemory: aiMemory || notebook.aiMemory,
          notebookId
        })
      );

      // Update notebook AI memory
      await storage.updateNotebookAiMemory(notebookId, threePhaseResult.aiMemory);

      // Return full response with all fields the frontend needs
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
    } catch (error) {
      console.error("AI generation error:", error);
      res.status(500).json({ error: "Failed to generate content" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
