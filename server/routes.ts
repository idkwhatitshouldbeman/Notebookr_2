import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertNotebookSchema, insertSectionSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./auth";
import { generateWithFallback } from "./ai-service";
import Stripe from "stripe";

// Initialize Stripe only if secret is available
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-09-30.clover",
    })
  : null;

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

  // Messages (chat history)
  app.get("/api/notebooks/:notebookId/messages", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const notebook = await storage.getNotebook(req.params.notebookId);
    if (!notebook || notebook.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const messages = await storage.getMessagesByNotebookId(req.params.notebookId);
    res.json(messages);
  });

  app.post("/api/messages", isAuthenticated, async (req: any, res) => {
    const result = insertMessageSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const notebook = await storage.getNotebook(result.data.notebookId);
    const userId = req.user.id;
    if (!notebook || notebook.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const message = await storage.createMessage(result.data);
    res.json(message);
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
      console.error("❌ AI generation error (full details):", error);
      console.error("Error stack:", (error as Error)?.stack);
      res.status(500).json({ error: "Failed to generate content" });
    }
  });

  // Stripe: Create checkout session for credit packages
  app.post("/api/stripe/create-checkout", isAuthenticated, async (req: any, res) => {
    if (!stripe) {
      return res.status(503).json({ error: "Stripe is not configured" });
    }

    try {
      const schema = z.object({
        package: z.enum(["5", "10", "25", "50"]),
      });
      
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      const { package: pkg } = result.data;
      
      // Credit packages with bonuses
      const packages: Record<string, { price: number; credits: number; name: string }> = {
        "5": { price: 500, credits: 5000, name: "Starter - 5,000 credits" },
        "10": { price: 1000, credits: 11000, name: "Popular - 11,000 credits (+10% bonus)" },
        "25": { price: 2500, credits: 30000, name: "Pro - 30,000 credits (+20% bonus)" },
        "50": { price: 5000, credits: 65000, name: "Best Value - 65,000 credits (+30% bonus)" },
      };

      const selectedPackage = packages[pkg];
      
      // Construct proper URLs with scheme
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "http://localhost:5000";
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: selectedPackage.name,
                description: `Purchase ${selectedPackage.credits.toLocaleString()} credits for Notebookr premium AI features`,
              },
              unit_amount: selectedPackage.price,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${baseUrl}/settings?payment=success`,
        cancel_url: `${baseUrl}/settings?payment=cancelled`,
        metadata: {
          userId: req.user.id,
          credits: selectedPackage.credits.toString(),
          package: pkg,
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Stripe: Webhook to handle successful payments
  app.post("/api/stripe/webhook", async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ error: "Stripe is not configured" });
    }

    const sig = req.headers["stripe-signature"];
    
    if (!sig) {
      return res.status(400).send("Missing stripe-signature header");
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const credits = parseInt(session.metadata?.credits || "0");

      if (userId && credits > 0) {
        try {
          await storage.addCredits(userId, credits, session.id, `Purchased ${session.metadata?.package} package`);
          console.log(`✅ Added ${credits} credits to user ${userId}`);
        } catch (error) {
          console.error("Error adding credits:", error);
        }
      }
    }

    res.json({ received: true });
  });

  // User: Get current user's credits
  app.get("/api/user/credits", isAuthenticated, async (req: any, res) => {
    const user = await storage.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ credits: user.credits, selectedAiModel: user.selectedAiModel });
  });

  // User: Update AI model selection
  app.patch("/api/user/ai-model", isAuthenticated, async (req: any, res) => {
    const schema = z.object({
      model: z.enum(["free", "fast", "ultra"]),
    });
    
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const { model } = result.data;
    const user = await storage.getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent selecting paid models without credits
    if ((model === "fast" || model === "ultra") && user.credits <= 0) {
      return res.status(403).json({ error: "Insufficient credits for premium models" });
    }

    await storage.updateUserAiModel(req.user.id, model);
    res.json({ success: true, model });
  });

  // User: Get transaction history
  app.get("/api/user/transactions", isAuthenticated, async (req: any, res) => {
    const transactions = await storage.getUserTransactions(req.user.id);
    res.json(transactions);
  });

  const httpServer = createServer(app);

  return httpServer;
}
