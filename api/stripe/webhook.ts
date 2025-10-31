import { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { storage } from "../../_shared/storage";
import { setCorsHeaders } from "../../_shared/auth";

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-09-30.clover",
    })
  : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!stripe) {
    return res.status(503).json({ error: "Stripe is not configured" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sig = req.headers["stripe-signature"];
  
  if (!sig) {
    return res.status(400).send("Missing stripe-signature header");
  }

  // Get raw body for webhook signature verification
  const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
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
}

