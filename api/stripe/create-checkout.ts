import { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import Stripe from "stripe";
import { requireAuth, setCorsHeaders, handleOptions } from "../../_shared/auth";

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-09-30.clover",
    })
  : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    return handleOptions(res);
  }

  setCorsHeaders(res);

  if (!stripe) {
    return res.status(503).json({ error: "Stripe is not configured" });
  }

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
    
    // Construct proper URLs - use Vercel URL if available, otherwise localhost
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.VERCEL 
        ? `https://${process.env.VERCEL}`
        : "http://localhost:3000";
    
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
        userId: user.id,
        credits: selectedPackage.credits.toString(),
        package: pkg,
      },
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
}

