import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertNotebookSchema, insertSectionSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Notebooks
  app.get("/api/notebooks", async (_req, res) => {
    const notebooks = await storage.getNotebooks();
    res.json(notebooks);
  });

  app.get("/api/notebooks/:id", async (req, res) => {
    const notebook = await storage.getNotebook(req.params.id);
    if (!notebook) {
      return res.status(404).json({ error: "Notebook not found" });
    }
    res.json(notebook);
  });

  app.post("/api/notebooks", async (req, res) => {
    const result = insertNotebookSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const notebook = await storage.createNotebook(result.data);
    res.json(notebook);
  });

  app.patch("/api/notebooks/:id", async (req, res) => {
    const result = insertNotebookSchema.partial().safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const notebook = await storage.updateNotebook(req.params.id, result.data);
    if (!notebook) {
      return res.status(404).json({ error: "Notebook not found" });
    }
    res.json(notebook);
  });

  app.delete("/api/notebooks/:id", async (req, res) => {
    await storage.deleteNotebook(req.params.id);
    res.status(204).send();
  });

  // Sections
  app.get("/api/notebooks/:notebookId/sections", async (req, res) => {
    const sections = await storage.getSectionsByNotebookId(req.params.notebookId);
    res.json(sections);
  });

  app.post("/api/sections", async (req, res) => {
    const result = insertSectionSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const section = await storage.createSection(result.data);
    res.json(section);
  });

  app.patch("/api/sections/:id", async (req, res) => {
    const schema = z.object({ content: z.string() });
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const section = await storage.updateSection(req.params.id, result.data.content);
    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }
    res.json(section);
  });

  // AI Generation
  app.post("/api/ai/generate", async (req, res) => {
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
