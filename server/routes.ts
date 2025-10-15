import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertNotebookSchema, insertSectionSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";
import { setupAuth, isAuthenticated } from "./replitAuth";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.claims?.sub) {
        return res.json(null);
      }
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Notebooks (protected)
  app.get("/api/notebooks", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const notebooks = await storage.getNotebooks(userId);
    res.json(notebooks);
  });

  app.get("/api/notebooks/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
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
    const userId = req.user.claims.sub;
    const result = insertNotebookSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const notebook = await storage.createNotebook({ ...result.data, userId });
    res.json(notebook);
  });

  app.patch("/api/notebooks/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
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
    const userId = req.user.claims.sub;
    const notebook = await storage.getNotebook(req.params.id);
    if (!notebook || notebook.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await storage.deleteNotebook(req.params.id);
    res.status(204).send();
  });

  // Sections
  app.get("/api/notebooks/:notebookId/sections", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
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
    const userId = req.user.claims.sub;
    if (!notebook || notebook.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const section = await storage.createSection(result.data);
    res.json(section);
  });

  app.patch("/api/sections/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
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

  // AI Generation
  app.post("/api/ai/generate", isAuthenticated, async (req, res) => {
    const schema = z.object({
      prompt: z.string(),
      context: z.array(z.object({
        title: z.string(),
        content: z.string(),
      })).optional(),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const { prompt, context = [] } = result.data;

    try {
      // Build context from previous sections
      const contextText = context
        .filter(c => c.content)
        .map(c => `${c.title}: ${c.content}`)
        .join('\n\n');

      const systemPrompt = `You are an AI assistant helping to write engineering notebooks. 
Generate clear, professional, technical content based on the user's request.
${contextText ? `\nPrevious sections for context:\n${contextText}` : ''}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const generatedContent = completion.choices[0]?.message?.content || "";
      res.json({ content: generatedContent });
    } catch (error) {
      console.error("AI generation error:", error);
      res.status(500).json({ error: "Failed to generate content" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
