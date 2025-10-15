import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertNotebookSchema, insertSectionSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";
import { setupAuth, isAuthenticated } from "./auth";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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

  // AI Generation - Cursor-style direct editing
  app.post("/api/ai/generate", isAuthenticated, async (req, res) => {
    const schema = z.object({
      instruction: z.string(),
      sections: z.array(z.object({
        id: z.string(),
        title: z.string(),
        content: z.string(),
      })),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const { instruction, sections } = result.data;

    try {
      // Build current notebook state
      const notebookState = sections
        .map(s => `## ${s.title}\n${s.content || '(empty)'}`)
        .join('\n\n');

      const systemPrompt = `You are an AI assistant that directly edits engineering notebook sections, similar to how Cursor AI edits code files.

CURRENT NOTEBOOK SECTIONS:
${notebookState}

Your job: Analyze the user's instruction and determine which sections need to be updated, created, or modified.

You must respond with ONLY valid JSON in this exact format:
{
  "actions": [
    {
      "type": "update",
      "sectionId": "section-id-here",
      "content": "new content to SET (not append) for this section"
    }
  ],
  "message": "Brief explanation of what you did"
}

Action types:
- "update": Replace the entire content of an existing section
- "create": Create a new section (use sectionId as the title)

IMPORTANT RULES:
1. Be specific and technical - this is an engineering notebook
2. Write complete, well-structured content for each section
3. When updating a section, provide the FULL new content (not just additions)
4. Keep related information in appropriate sections
5. If content doesn't fit existing sections, create a new one
6. Always return valid JSON only`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: instruction }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const responseText = completion.choices[0]?.message?.content || "{}";
      const aiResponse = JSON.parse(responseText);
      
      console.log("🤖 AI Response:", aiResponse);
      res.json(aiResponse);
    } catch (error) {
      console.error("AI generation error:", error);
      res.status(500).json({ error: "Failed to generate content" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
