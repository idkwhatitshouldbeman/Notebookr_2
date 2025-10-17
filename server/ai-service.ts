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
  iterationCount?: number;
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
  suggestedTitle?: string;
  isComplete?: boolean;
  shouldContinue?: boolean;
  plan?: any;
}

export async function threePhaseGeneration(
  request: ThreePhaseRequest
): Promise<ThreePhaseResponse> {
  const { instruction, sections, aiMemory, notebookId, iterationCount = 0 } = request;
  
  // Safety limit: prevent infinite loops (high limit - let AI decide when done)
  const MAX_ITERATIONS = 100;
  if (iterationCount >= MAX_ITERATIONS) {
    console.log(`⚠️ Reached maximum iteration limit (${MAX_ITERATIONS}), stopping.`);
    return {
      phase: "review",
      actions: [],
      message: "Document generation complete (reached iteration limit)",
      aiMemory: { ...aiMemory, currentPhase: "complete" },
      confidence: "medium",
      shouldContinue: false,
      isComplete: true
    };
  }

  // Phase 1: Planning (if no plan exists)
  if (!aiMemory || !aiMemory.plan) {
    console.log("📋 Phase 1: Planning document structure...");
    
    const planningPrompt = `You are an AI document architect. Analyze this instruction and extract key variables, then create a comprehensive plan.

INSTRUCTION: ${instruction}

CURRENT SECTIONS: ${sections.map(s => s.title).join(", ") || "None"}

Extract variables and create a plan in JSON format:
{
  "variables": {
    "topic": "the main subject (REQUIRED)",
    "targetLength": "extract from instruction: '5 pages', '20 pages', 'short', 'detailed', etc. If not specified, use 'comprehensive'",
    "estimatedSections": "calculate based on length: 5 pages=5-8 sections, 10 pages=10-15, 20 pages=15-20, comprehensive=8-12",
    "documentType": "research paper | lab report | design document | essay | report | guide",
    "tone": "academic | casual | technical | professional (use 'academic' if unsure)",
    "focusAreas": ["key topics extracted from instruction"],
    "criteria": "special instructions like 'write as if [person] was writing it', 'don't use [letter]', 'use [word] often', etc. Extract from instruction or leave empty if none",
    "hasQuestions": false
  },
  "questions": [],
  "suggestedTitle": "clear, concise title",
  "requiredSections": ["section titles based on topic and type"],
  "tasks": [
    { "action": "create" | "update", "section": "section name", "description": "what to write", "done": false }
  ],
  "overallGoal": "clear purpose"
}

IMPORTANT: 
- Extract page/length info from instruction (e.g., "20 page" → targetLength: "20 pages", estimatedSections: 15-20)
- If unsure about anything, set hasQuestions: true and add to questions array
- Create tasks for ALL sections, aiming for comprehensive coverage
- Default to creating LONGER, DETAILED documents unless specified otherwise`;

    const planResult = await generateWithFallback({
      messages: [
        { role: "system", content: "You are a document planning expert. You MUST respond with ONLY valid JSON, no markdown, no explanations, no code blocks. Just pure JSON." },
        { role: "user", content: planningPrompt + "\n\nIMPORTANT: Return ONLY the JSON object, nothing else. No markdown code blocks, no explanations." }
      ],
      temperature: 0.5,
      max_tokens: 1500,
    });

    let plan;
    try {
      // Try to parse directly
      plan = JSON.parse(planResult.content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = planResult.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          plan = JSON.parse(jsonMatch[1]);
        } catch {
          console.error("Failed to parse plan JSON from markdown:", planResult.content);
          plan = {
            suggestedTitle: "Untitled Document",
            documentType: "document",
            requiredSections: [],
            tasks: [{ action: "create", section: "Content", description: instruction, done: false }],
            overallGoal: instruction
          };
        }
      } else {
        console.error("Failed to parse plan response:", planResult.content);
        plan = {
          suggestedTitle: "Untitled Document",
          documentType: "document",
          requiredSections: [],
          tasks: [{ action: "create", section: "Content", description: instruction, done: false }],
          overallGoal: instruction
        };
      }
    }

    // Check if AI has questions for the user
    if (plan.variables?.hasQuestions && plan.questions?.length > 0) {
      const updatedMemory = { plan, currentPhase: "awaiting_answers" };
      return {
        phase: "plan",
        actions: [],
        message: plan.questions.join(" "),
        aiMemory: updatedMemory,
        confidence: "high",
        suggestedTitle: plan.suggestedTitle,
        plan: plan,
        shouldContinue: false, // Wait for user to answer
        isComplete: false
      };
    }

    const updatedMemory = { plan, currentPhase: "execute" };

    // Return the plan without executing - let frontend call again
    return {
      phase: "plan",
      actions: [],
      message: "Document plan created",
      aiMemory: updatedMemory,
      confidence: "high",
      suggestedTitle: plan.suggestedTitle,
      plan: plan,
      shouldContinue: true, // Frontend should call again to execute
      isComplete: false
    };
  }

  // Handle user answering questions
  if (aiMemory.currentPhase === "awaiting_answers") {
    console.log("💬 User answered questions, updating plan...");
    
    const plan = aiMemory.plan;
    const updatePrompt = `The user was asked questions and responded with: "${instruction}"

CURRENT PLAN VARIABLES:
${JSON.stringify(plan.variables, null, 2)}

Update the variables with the user's response and set hasQuestions to false. Return the updated plan in the same JSON format.`;

    const updateResult = await generateWithFallback({
      messages: [
        { role: "system", content: "You are a document planning expert. Update the plan variables based on user input. You MUST respond with ONLY valid JSON." },
        { role: "user", content: updatePrompt }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    let updatedPlan;
    try {
      updatedPlan = JSON.parse(updateResult.content);
    } catch {
      const jsonMatch = updateResult.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        updatedPlan = JSON.parse(jsonMatch[1]);
      } else {
        updatedPlan = { ...plan, variables: { ...plan.variables, hasQuestions: false } };
      }
    }

    const updatedMemory = { plan: updatedPlan, currentPhase: "execute" };
    return {
      phase: "plan",
      actions: [],
      message: "Got it! Continuing with document generation...",
      aiMemory: updatedMemory,
      confidence: "high",
      suggestedTitle: updatedPlan.suggestedTitle,
      plan: updatedPlan,
      shouldContinue: true,
      isComplete: false
    };
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
        aiMemory: updatedMemory,
        iterationCount: iterationCount + 1
      });
    }

    const vars = plan.variables || {};
    const executionPrompt = `You are executing a document creation plan. Write COMPREHENSIVE, DETAILED, and SUBSTANTIAL content.

DOCUMENT CONTEXT:
- Topic: ${vars.topic || 'Not specified'}
- Target Length: ${vars.targetLength || 'comprehensive'}
- Document Type: ${plan.documentType || vars.documentType}
- Tone: ${vars.tone || 'academic'}
- Focus Areas: ${vars.focusAreas?.join(', ') || 'general coverage'}
${vars.criteria ? `- Special Criteria: ${vars.criteria}` : ''}

OVERALL GOAL: ${plan.overallGoal}

CURRENT SECTIONS:
${sections.map(s => `## ${s.title}\n${s.content || '(empty)'}`).join('\n\n')}

NEXT TASK: ${nextTask.action} "${nextTask.section}" - ${nextTask.description}

IMPORTANT GUIDELINES:
- Write LONG, THOROUGH content matching the target length (${vars.targetLength})
- Use ${vars.tone} tone throughout
- Include specific details, examples, and comprehensive explanations
- Make content professional and well-structured
- Aim for 300-600 words per section for comprehensive documents
- For "20 page" documents, write extensive, detailed content (500+ words per section)

Respond with JSON:
{
  "actions": [
    {
      "type": "update" | "create",
      "sectionId": "section-id-or-new-title",
      "content": "COMPREHENSIVE, DETAILED section content (multiple paragraphs)"
    }
  ],
  "message": "what you did"
}`;

    const execResult = await generateWithFallback({
      messages: [
        { role: "system", content: "You are a technical writing assistant. Be detailed, comprehensive, and precise. Write LONG, thorough content. You MUST respond with ONLY valid JSON, no markdown, no explanations, no code blocks. Just pure JSON." },
        { role: "user", content: executionPrompt + "\n\nCRITICAL: Return ONLY the JSON object with your actions, nothing else. No markdown code blocks, no explanations." }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    let execResponse;
    try {
      // Try to parse directly
      execResponse = JSON.parse(execResult.content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = execResult.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          execResponse = JSON.parse(jsonMatch[1]);
        } catch {
          console.error("Failed to parse JSON from markdown:", execResult.content);
          execResponse = { actions: [], message: "AI response was not valid JSON" };
        }
      } else {
        console.error("Failed to parse AI response:", execResult.content);
        execResponse = { actions: [], message: "AI response was not valid JSON" };
      }
    }

    // Mark task as done
    const updatedTasks = plan.tasks.map((t: any) =>
      t === nextTask ? { ...t, done: true } : t
    );

    const updatedMemory = {
      ...aiMemory,
      plan: { ...plan, tasks: updatedTasks }
    };

    // Check if all tasks are done
    const allTasksDone = updatedTasks.every((t: any) => t.done);

    // If all tasks done, move to review phase
    if (allTasksDone) {
      updatedMemory.currentPhase = "review";
    }

    return {
      phase: "execute",
      actions: execResponse.actions || [],
      message: execResponse.message || "Executed task",
      aiMemory: updatedMemory,
      confidence: "high",
      isComplete: false, // Not complete until review approves
      shouldContinue: true, // Frontend should keep calling
      plan: plan // Include plan for frontend
    };
  }

  // Phase 3: Review
  console.log("🔍 Phase 3: Reviewing work...");
  
  const reviewPrompt = `You are a CRITICAL and THOROUGH reviewer of a ${aiMemory.plan.documentType}.

GOAL: ${aiMemory.plan.overallGoal}

CURRENT SECTIONS:
${sections.map(s => `## ${s.title}\n${s.content || '(empty)'}`).join('\n\n')}

REVIEW CRITERIA:
- Is the content COMPREHENSIVE and DETAILED? (Minimum 150-300 words per section)
- Are there any empty sections?
- Does each section have substantial, meaningful content?
- Is the document complete according to the plan?
- Could any section be significantly improved or expanded?

Be STRICT in your assessment. Only mark as complete if the document is truly comprehensive and well-developed.

Review the document and respond with JSON:
{
  "quality": "excellent" | "good" | "needs_improvement",
  "improvements": ["specific improvement 1", "specific improvement 2", ...],
  "nextTasks": [
    { "action": "update" | "create", "section": "section name", "description": "specific improvements needed", "done": false }
  ],
  "isComplete": true | false,
  "message": "honest review summary"
}`;

  const reviewResult = await generateWithFallback({
    messages: [
      { role: "system", content: "You are a STRICT, critical reviewer. Set HIGH standards. Only approve truly excellent work. You MUST respond with ONLY valid JSON, no markdown, no explanations, no code blocks. Just pure JSON." },
      { role: "user", content: reviewPrompt + "\n\nIMPORTANT: Return ONLY the JSON object, nothing else. No markdown code blocks, no explanations." }
    ],
    temperature: 0.5,
    max_tokens: 1500,
  });

  let review;
  try {
    // Try to parse directly
    review = JSON.parse(reviewResult.content);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = reviewResult.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        review = JSON.parse(jsonMatch[1]);
      } catch {
        console.error("Failed to parse review JSON from markdown:", reviewResult.content);
        review = { quality: "needs_improvement", improvements: [], nextTasks: [], isComplete: false, message: "Review failed, needs more work" };
      }
    } else {
      console.error("Failed to parse review response:", reviewResult.content);
      review = { quality: "needs_improvement", improvements: [], nextTasks: [], isComplete: false, message: "Review failed, needs more work" };
    }
  }

  // If work is incomplete, add new tasks and switch to execute phase
  if (!review.isComplete && review.nextTasks && review.nextTasks.length > 0) {
    console.log(`🔄 Review found improvements needed. Adding ${review.nextTasks.length} new tasks...`);
    const updatedMemory = { 
      ...aiMemory, 
      currentPhase: "execute", 
      plan: { ...aiMemory.plan, tasks: [...aiMemory.plan.tasks, ...review.nextTasks] }
    };
    
    return {
      phase: "review",
      actions: [],
      message: review.message || "Needs improvement",
      aiMemory: updatedMemory,
      confidence: review.quality === "excellent" ? "high" : review.quality === "good" ? "medium" : "low",
      plan: updatedMemory.plan,
      shouldContinue: true,
      isComplete: false
    };
  }

  // Work is complete
  console.log("✅ Review complete - document is finished!");
  return {
    phase: "review",
    actions: [],
    message: review.message || "Document complete",
    aiMemory: { ...aiMemory, currentPhase: "complete" },
    confidence: review.quality === "excellent" ? "high" : review.quality === "good" ? "medium" : "low",
    plan: aiMemory.plan,
    shouldContinue: false,
    isComplete: true
  };
}
