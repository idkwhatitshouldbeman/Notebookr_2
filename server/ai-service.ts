import OpenAI from "openai";

// OpenRouter text models (free)
const TEXT_MODELS = [
  "alibaba/tongyi-deepresearch-30b-a3b:free",
  "meta-llama/llama-3.3-8b-instruct:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "meta-llama/llama-4-maverick:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "tngtech/deepseek-r1t2-chimera:free",
  "z-ai/glm-4.5-air:free",
  "tngtech/deepseek-r1t-chimera:free",
  "deepseek/deepseek-chat-v3-0324:free",
];

// OpenRouter API keys
const OPENROUTER_KEYS = [
  process.env.OPENROUTER_KEY1,
  process.env.OPENROUTER_KEY2,
  process.env.OPENROUTER_KEY3,
].filter(Boolean) as string[];

// OpenAI fallback client
const openaiClient = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface AIRequest {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

interface AIResponse {
  content: string;
  model: string;
  provider: "openrouter" | "openai";
}

export async function generateWithFallback(
  request: AIRequest
): Promise<AIResponse> {
  console.log("🤖 Starting AI generation with fallback system...");

  // Try OpenRouter with all combinations
  for (let keyIndex = 0; keyIndex < OPENROUTER_KEYS.length; keyIndex++) {
    const apiKey = OPENROUTER_KEYS[keyIndex];
    console.log(`🔑 Trying OpenRouter key ${keyIndex + 1}...`);

    for (let modelIndex = 0; modelIndex < TEXT_MODELS.length; modelIndex++) {
      const model = TEXT_MODELS[modelIndex];
      
      try {
        console.log(`  📡 Attempting model: ${model}`);
        
        const openrouter = new OpenAI({
          apiKey,
          baseURL: "https://openrouter.ai/api/v1",
        });

        const completion = await openrouter.chat.completions.create({
          model,
          messages: request.messages as any,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.max_tokens ?? 2000,
        });

        const content = completion.choices[0]?.message?.content || "";
        
        if (content) {
          console.log(`✅ Success with ${model} (key ${keyIndex + 1})`);
          return {
            content,
            model,
            provider: "openrouter",
          };
        }
      } catch (error: any) {
        console.warn(`  ⚠️ Failed ${model}: ${error.message}`);
        // Continue to next model
      }
    }
  }

  // All OpenRouter attempts failed, use OpenAI fallback
  console.log("⚠️ All OpenRouter attempts failed, using OpenAI fallback...");
  
  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: request.messages as any,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 2000,
    });

    const content = completion.choices[0]?.message?.content || "";
    console.log("✅ OpenAI fallback successful");
    
    return {
      content,
      model: "gpt-4o-mini",
      provider: "openai",
    };
  } catch (error: any) {
    console.error("❌ OpenAI fallback failed:", error.message);
    throw new Error("All AI providers failed");
  }
}

interface ThreePhaseRequest {
  instruction: string;
  sections: Array<{ id: string; title: string; content: string }>;
  aiMemory?: any;
  notebookId: string;
}

interface ThreePhaseResponse {
  phase: "plan" | "execute" | "review";
  actions: Array<{
    type: "update" | "create";
    sectionId: string;
    content: string;
  }>;
  message: string;
  aiMemory: any;
  confidence: "high" | "medium" | "low";
}

export async function threePhaseGeneration(
  request: ThreePhaseRequest
): Promise<ThreePhaseResponse> {
  const { instruction, sections, aiMemory, notebookId } = request;

  // Phase 1: Planning (if no plan exists)
  if (!aiMemory || !aiMemory.plan) {
    console.log("📋 Phase 1: Planning document structure...");
    
    const planningPrompt = `You are an AI document architect. Analyze this instruction and create a comprehensive plan.

INSTRUCTION: ${instruction}

CURRENT SECTIONS: ${sections.map(s => s.title).join(", ") || "None"}

Create a detailed plan in JSON format:
{
  "documentType": "research paper" | "lab report" | "design document" | "project log",
  "requiredSections": ["Title", "Abstract", "Introduction", ...],
  "tasks": [
    { "action": "create" | "update", "section": "section name", "description": "what to write", "done": false }
  ],
  "overallGoal": "clear statement of the document's purpose"
}`;

    const planResult = await generateWithFallback({
      messages: [
        { role: "system", content: "You are a document planning expert. Respond with JSON only." },
        { role: "user", content: planningPrompt }
      ],
      temperature: 0.5,
      max_tokens: 1500,
    });

    let plan;
    try {
      plan = JSON.parse(planResult.content);
    } catch {
      plan = {
        documentType: "document",
        requiredSections: [],
        tasks: [{ action: "create", section: "Content", description: instruction, done: false }],
        overallGoal: instruction
      };
    }

    const updatedMemory = { plan, currentPhase: "execute" };

    // After planning, immediately proceed to execution
    return await threePhaseGeneration({
      ...request,
      aiMemory: updatedMemory
    });
  }

  // Phase 2: Execution
  if (aiMemory.currentPhase === "execute") {
    console.log("⚡ Phase 2: Executing tasks...");
    
    const plan = aiMemory.plan;
    const incompleteTasks = plan.tasks.filter((t: any) => !t.done);
    const nextTask = incompleteTasks[0];

    if (!nextTask) {
      // All tasks done, proceed to review automatically
      const updatedMemory = { ...aiMemory, currentPhase: "review" };
      return await threePhaseGeneration({
        ...request,
        aiMemory: updatedMemory
      });
    }

    const executionPrompt = `You are executing a document creation plan.

DOCUMENT TYPE: ${plan.documentType}
OVERALL GOAL: ${plan.overallGoal}

CURRENT SECTIONS:
${sections.map(s => `## ${s.title}\n${s.content || '(empty)'}`).join('\n\n')}

NEXT TASK: ${nextTask.action} "${nextTask.section}" - ${nextTask.description}

Respond with JSON:
{
  "actions": [
    {
      "type": "update" | "create",
      "sectionId": "section-id-or-new-title",
      "content": "full section content"
    }
  ],
  "message": "what you did"
}`;

    const execResult = await generateWithFallback({
      messages: [
        { role: "system", content: "You are a technical writing assistant. Be detailed and precise. Respond with JSON only." },
        { role: "user", content: executionPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    let execResponse;
    try {
      execResponse = JSON.parse(execResult.content);
    } catch {
      execResponse = { actions: [], message: "Failed to parse response" };
    }

    // Mark task as done
    const updatedTasks = plan.tasks.map((t: any) =>
      t === nextTask ? { ...t, done: true } : t
    );

    return {
      phase: "execute",
      actions: execResponse.actions || [],
      message: execResponse.message || "Executed task",
      aiMemory: {
        ...aiMemory,
        plan: { ...plan, tasks: updatedTasks }
      },
      confidence: "high"
    };
  }

  // Phase 3: Review
  console.log("🔍 Phase 3: Reviewing work...");
  
  const reviewPrompt = `You are reviewing a ${aiMemory.plan.documentType}.

GOAL: ${aiMemory.plan.overallGoal}

CURRENT SECTIONS:
${sections.map(s => `## ${s.title}\n${s.content || '(empty)'}`).join('\n\n')}

Review the document and respond with JSON:
{
  "quality": "excellent" | "good" | "needs_improvement",
  "improvements": ["suggestion 1", "suggestion 2", ...],
  "nextTasks": [
    { "action": "update", "section": "section name", "description": "what to improve", "done": false }
  ],
  "isComplete": true | false,
  "message": "review summary"
}`;

  const reviewResult = await generateWithFallback({
    messages: [
      { role: "system", content: "You are a critical reviewer. Be constructive but thorough." },
      { role: "user", content: reviewPrompt }
    ],
    temperature: 0.5,
    max_tokens: 1500,
  });

  let review;
  try {
    review = JSON.parse(reviewResult.content);
  } catch {
    review = { quality: "good", improvements: [], nextTasks: [], isComplete: true, message: "Review complete" };
  }

  const updatedMemory = review.isComplete 
    ? { ...aiMemory, currentPhase: "complete" }
    : { ...aiMemory, currentPhase: "execute", plan: { ...aiMemory.plan, tasks: [...aiMemory.plan.tasks, ...review.nextTasks] }};

  return {
    phase: "review",
    actions: [],
    message: review.message,
    aiMemory: updatedMemory,
    confidence: review.quality === "excellent" ? "high" : review.quality === "good" ? "medium" : "low"
  };
}
