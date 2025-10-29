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

type StreamChunk = {
  type: "chunk";
  content: string;
} | {
  type: "done";
  fullContent: string;
  model: string;
  provider: "openrouter" | "openai";
} | {
  type: "error";
  error: string;
};

// Streaming version of AI generation
export async function* generateWithFallbackStream(
  request: AIRequest
): AsyncGenerator<StreamChunk> {
  console.log("🤖 Starting AI streaming with fallback system...");

  // Try OpenRouter with all combinations
  for (let keyIndex = 0; keyIndex < OPENROUTER_KEYS.length; keyIndex++) {
    const apiKey = OPENROUTER_KEYS[keyIndex];
    console.log(`🔑 Trying OpenRouter key ${keyIndex + 1} (streaming)...`);

    for (let modelIndex = 0; modelIndex < TEXT_MODELS.length; modelIndex++) {
      const model = TEXT_MODELS[modelIndex];
      
      try {
        console.log(`  📡 Attempting streaming model: ${model}`);
        
        const openrouter = new OpenAI({
          apiKey,
          baseURL: "https://openrouter.ai/api/v1",
        });

        const stream = await openrouter.chat.completions.create({
          model,
          messages: request.messages as any,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.max_tokens ?? 2000,
          stream: true,
        });

        let fullContent = "";
        let hasContent = false;

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            hasContent = true;
            fullContent += content;
            yield { type: "chunk", content };
          }
        }
        
        if (hasContent) {
          console.log(`✅ Streaming success with ${model} (key ${keyIndex + 1})`);
          yield { 
            type: "done", 
            fullContent, 
            model, 
            provider: "openrouter" 
          };
          return;
        }
      } catch (error: any) {
        console.warn(`  ⚠️ Failed streaming ${model}: ${error.message}`);
        // Continue to next model
      }
    }
  }

  // All OpenRouter attempts failed, use OpenAI fallback
  console.log("⚠️ All OpenRouter streaming failed, using OpenAI fallback...");
  
  try {
    const stream = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: request.messages as any,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 2000,
      stream: true,
    });

    let fullContent = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullContent += content;
        yield { type: "chunk", content };
      }
    }
    
    console.log("✅ OpenAI streaming successful");
    yield { 
      type: "done", 
      fullContent, 
      model: "gpt-4o-mini", 
      provider: "openai" 
    };
  } catch (error: any) {
    console.error("❌ OpenAI streaming fallback failed:", error.message);
    yield { type: "error", error: "All AI providers failed" };
  }
}

// Non-streaming version (kept for backward compatibility)
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
  phase: "plan" | "create" | "execute" | "review" | "postprocess" | "finalreview";
  actions: Array<{
    type: "update" | "create";
    sectionId: string;
    content: string;
  }>;
  message: string;
  progressMessage?: string; // Optional progress message for execution phase
  aiMemory: any;
  confidence: "high" | "medium" | "low";
  suggestedTitle?: string;
  isComplete?: boolean;
  shouldContinue?: boolean;
  plan?: any;
}

// Streaming event types
type ThreePhaseStreamEvent = 
  | { type: "content_chunk"; content: string }
  | { type: "phase_update"; phase: string; message: string }
  | { type: "action"; action: any }
  | { type: "progress"; message: string }
  | { type: "complete"; result: ThreePhaseResponse }
  | { type: "error"; error: string };

// Streaming version of three-phase generation with heartbeats to prevent 504s
export async function* threePhaseGenerationStream(
  request: ThreePhaseRequest
): AsyncGenerator<ThreePhaseStreamEvent> {
  const { instruction, sections, aiMemory, notebookId, iterationCount = 0 } = request;
  
  // Emit initial status
  yield { type: "phase_update", phase: "processing", message: "Starting AI generation..." };
  
  try {
    // Start the AI generation in the background
    let generationComplete = false;
    let generationResult: ThreePhaseResponse | null = null;
    let generationError: any = null;
    
    // Run generation in background
    threePhaseGeneration(request).then(
      result => {
        generationComplete = true;
        generationResult = result;
      },
      error => {
        generationComplete = true;
        generationError = error;
      }
    );
    
    // Send heartbeat events every 5 seconds while waiting
    let heartbeatCount = 0;
    while (!generationComplete) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      heartbeatCount++;
      yield { type: "progress", message: `Processing... (${heartbeatCount * 5}s elapsed)` };
    }
    
    // Check if there was an error
    if (generationError) {
      throw generationError;
    }
    
    const result = generationResult!;
    
    // Stream the result content if there are actions
    if (result.actions && result.actions.length > 0) {
      for (const action of result.actions) {
        yield { type: "action", action };
        
        // Stream the content in chunks
        const content = action.content;
        const chunkSize = 50; // characters per chunk
        for (let i = 0; i < content.length; i += chunkSize) {
          const chunk = content.substring(i, i + chunkSize);
          yield { type: "content_chunk", content: chunk };
          // Small delay to simulate real-time streaming
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
    }
    
    yield { type: "complete", result };
  } catch (error: any) {
    console.error("Error in streaming generation:", error);
    yield { type: "error", error: error.message || "Generation failed" };
  }
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
    
    const planningPrompt = `You're helping someone create a document. Have a natural conversation to understand what they really need.

THEIR REQUEST: "${instruction}"

YOUR APPROACH:
1. Be CONVERSATIONAL and CURIOUS - talk like a helpful friend, not a robot
2. Ask open-ended questions to understand their TRUE goals and context
3. Dig deeper into WHY they need this and WHAT they're trying to achieve
4. Only proceed when you have a clear picture of their vision

WHEN TO ASK QUESTIONS (hasQuestions = true):
- The request is vague or unclear about what they want
- You don't understand the PURPOSE or GOAL behind what they're asking for
- You're missing critical context about their audience, use case, or requirements
- You want to explore different angles or possibilities they might not have considered

Example questions to ask (keep it SHORT - just 1-2 questions):
- "Who will be reading this?"
- "What's the main angle - historical figures, scientific principles, or something else?"
- "How detailed should this be?"

WHEN TO PROCEED (hasQuestions = false):
- You have a CRYSTAL CLEAR understanding of what they want
- You know the purpose, audience, scope, and level of detail
- They gave you extremely specific instructions with all the context you need

Return JSON:
{
  "variables": {
    "topic": "main subject",
    "targetLength": "5 pages OR 3 sections OR null if not specified",
    "documentType": "research paper OR guide OR null",
    "focusAreas": ["specific topics OR empty"],
    "targetAudience": "who this is for OR null",
    "originalInstruction": "${instruction}",
    "hasQuestions": true/false
  },
  "questions": ["conversational question 1", "conversational question 2"],
  "suggestedTitle": "title",
  "requiredSections": ["Meaningful Chapter Name 1", "Meaningful Chapter Name 2"],
  "tasks": [{"action": "create", "section": "Meaningful Chapter Name 1", "description": "write about X", "done": false}]
}

CRITICAL SECTION NAMING RULES:
- DO NOT use generic names like "Introduction", "Body", "Conclusion", "Chapter 1", "Section 1"
- DO use DESCRIPTIVE names that tell what the chapter is about
- Examples for "why cats are cute": "Adorable Physical Features", "Endearing Behaviors", "The Science of Cuteness"
- Examples for "React hooks": "Understanding useState", "Working with useEffect", "Custom Hook Patterns"

If hasQuestions is true, include ONLY 1-2 SHORT conversational questions (we'll ask them one at a time).
If hasQuestions is false, questions must be empty array [] and you MUST populate requiredSections and tasks with MEANINGFUL names.`;

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
      console.log("✅ Successfully parsed plan JSON");
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = planResult.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          plan = JSON.parse(jsonMatch[1]);
          console.log("✅ Extracted and parsed plan from markdown code block");
        } catch {
          console.error("❌ Failed to parse plan JSON from markdown. Raw response:", planResult.content.substring(0, 500));
          plan = {
            variables: { hasQuestions: false },
            suggestedTitle: "Untitled Document",
            documentType: "document",
            requiredSections: [],
            tasks: [{ action: "create", section: "Content", description: instruction, done: false }],
            overallGoal: instruction
          };
        }
      } else {
        console.error("❌ No JSON found in plan response. Raw response:", planResult.content.substring(0, 500));
        plan = {
          variables: { hasQuestions: false },
          suggestedTitle: "Untitled Document",
          documentType: "document",
          requiredSections: [],
          tasks: [{ action: "create", section: "Content", description: instruction, done: false }],
          overallGoal: instruction
        };
      }
    }

    console.log("📋 Plan parsed:", {
      hasQuestions: plan.variables?.hasQuestions,
      questionCount: plan.questions?.length || 0,
      suggestedTitle: plan.suggestedTitle
    });

    // Check if AI has questions for the user
    if (plan.variables?.hasQuestions) {
      // Edge case: hasQuestions=true but no questions array
      if (!plan.questions || plan.questions.length === 0) {
        console.warn("⚠️ AI set hasQuestions=true but provided no questions - using default questions");
        plan.questions = [
          "What format would you like? (e.g., research paper, blog post, guide)",
          "How long should this be? (e.g., number of pages or sections)",
          "What specific aspect should I focus on?",
          "Who is the target audience?"
        ];
      }
      
      console.log("❓ AI has questions - pausing for user input");
      console.log("Questions:", plan.questions);
      
      // Ask ONE question at a time for more conversational flow
      const currentQuestionIndex = 0;
      const updatedMemory = { 
        plan, 
        currentPhase: "awaiting_answers",
        questionIndex: currentQuestionIndex,
        allQuestions: plan.questions,
        answers: []
      };
      
      return {
        phase: "plan",
        actions: [],
        message: plan.questions[currentQuestionIndex],
        aiMemory: updatedMemory,
        confidence: "high",
        suggestedTitle: plan.suggestedTitle,
        plan,
        shouldContinue: false
      };
    }

    // Safety: Ensure tasks array exists
    if (!plan.tasks || plan.tasks.length === 0) {
      console.warn("⚠️ Plan has no tasks - generating from requiredSections");
      plan.tasks = (plan.requiredSections || []).map((section: string) => ({
        action: "create",
        section,
        description: `Write content for ${section}`,
        done: false
      }));
      
      // If still no tasks, create a default one
      if (plan.tasks.length === 0) {
        plan.tasks = [{ action: "create", section: "Content", description: instruction, done: false }];
      }
    }

    // No questions - proceed directly to execution
    const updatedMemory = { plan, currentPhase: "execute" };
    
    return {
      phase: "plan",
      actions: [],
      message: "ok, making it now",
      aiMemory: updatedMemory,
      confidence: "high",
      suggestedTitle: plan.suggestedTitle,
      plan,
      shouldContinue: true
    };
  }

  // Handle awaiting answers phase
  if (aiMemory.currentPhase === "awaiting_answers") {
    const { allQuestions, answers, questionIndex } = aiMemory;
    
    // If we have more questions to ask
    if (questionIndex + 1 < allQuestions.length) {
      console.log(`❓ Asking question ${questionIndex + 2}/${allQuestions.length}`);
      const updatedMemory = { 
        ...aiMemory,
        questionIndex: questionIndex + 1
      };
      
      return {
        phase: "plan",
        actions: [],
        message: allQuestions[questionIndex + 1],
        aiMemory: updatedMemory,
        confidence: "high",
        shouldContinue: false
      };
    }

    // All questions answered - generate actual plan
    console.log("✅ All questions answered - generating final plan");
    const answersText = answers.map((a: string, i: number) => 
      `Q: ${allQuestions[i]}\nA: ${a}`
    ).join("\n\n");

    const finalPlanPrompt = `Based on the conversation with the user, create a detailed document plan.

ORIGINAL REQUEST: "${instruction}"

CONVERSATION:
${answersText}

Generate a complete plan with meaningful section names and tasks. Return JSON:
{
  "variables": {
    "topic": "main subject",
    "targetLength": "extracted from answers",
    "documentType": "extracted from answers",
    "targetAudience": "extracted from answers",
    "tone": "extracted from answers OR professional",
    "originalInstruction": "${instruction}"
  },
  "suggestedTitle": "document title",
  "requiredSections": ["Meaningful Chapter Name 1", "Meaningful Chapter Name 2"],
  "tasks": [{"action": "create", "section": "Meaningful Chapter Name 1", "description": "write about X", "done": false}]
}

CRITICAL: Use DESCRIPTIVE section names, not "Introduction", "Body", "Conclusion", etc.`;

    const finalPlanResult = await generateWithFallback({
      messages: [
        { role: "system", content: "You are a document planning expert. You MUST respond with ONLY valid JSON, no markdown, no explanations, no code blocks. Just pure JSON." },
        { role: "user", content: finalPlanPrompt }
      ],
      temperature: 0.5,
      max_tokens: 1500,
    });

    let finalPlan;
    try {
      finalPlan = JSON.parse(finalPlanResult.content);
    } catch {
      const jsonMatch = finalPlanResult.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        finalPlan = JSON.parse(jsonMatch[1]);
      } else {
        finalPlan = {
          ...aiMemory.plan,
          requiredSections: ["Content"],
          tasks: [{ action: "create", section: "Content", description: instruction, done: false }]
        };
      }
    }

    // Safety: Ensure tasks exist
    if (!finalPlan.tasks || finalPlan.tasks.length === 0) {
      finalPlan.tasks = (finalPlan.requiredSections || []).map((section: string) => ({
        action: "create",
        section,
        description: `Write content for ${section}`,
        done: false
      }));
    }

    const updatedMemory = { plan: finalPlan, currentPhase: "execute" };
    
    return {
      phase: "plan",
      actions: [],
      message: "ok, making it now",
      aiMemory: updatedMemory,
      confidence: "high",
      suggestedTitle: finalPlan.suggestedTitle,
      plan: finalPlan,
      shouldContinue: true
    };
  }

  // Phase 2: Execution
  if (aiMemory.currentPhase === "execute") {
    const plan = aiMemory.plan;
    
    // Safety: Ensure plan.tasks exists
    if (!plan.tasks || plan.tasks.length === 0) {
      console.warn("⚠️ Execute phase but no tasks - generating from requiredSections");
      plan.tasks = (plan.requiredSections || []).map((section: string) => ({
        action: "create",
        section,
        description: `Write content for ${section}`,
        done: false
      }));
      
      if (plan.tasks.length === 0) {
        console.error("❌ No tasks and no requiredSections - moving to review");
        return {
          phase: "review",
          actions: [],
          message: "No tasks to execute",
          aiMemory: { ...aiMemory, currentPhase: "review" },
          confidence: "low",
          shouldContinue: true
        };
      }
    }

    // Find next undone task
    const nextTask = plan.tasks.find((t: any) => !t.done);
    
    if (!nextTask) {
      console.log("✅ All tasks done - moving to review phase");
      const updatedMemory = { ...aiMemory, currentPhase: "review" };
      return await threePhaseGeneration({
        ...request,
        aiMemory: updatedMemory,
        iterationCount: iterationCount + 1
      });
    }

    console.log(`📝 Executing task: ${nextTask.action} "${nextTask.section}"`);
    
    const vars = plan.variables || {};
    const completedSections = sections.filter((s: any) => s.content && s.content.length >= 500);
    const totalSections = plan.requiredSections?.length || plan.tasks.length;
    
    // Calculate target word count per section
    let targetWordsPerSection = 250; // Default
    if (vars.targetLength) {
      const lengthStr = String(vars.targetLength); // Ensure it's a string
      const lengthMatch = lengthStr.match(/(\d+)\s*(page|pages)/i);
      if (lengthMatch) {
        const totalPages = parseInt(lengthMatch[1]);
        const totalWords = totalPages * 250; // 250 words per page
        targetWordsPerSection = Math.ceil(totalWords / totalSections);
      }
    }

    const executionPrompt = `You are writing a document section by section.

DOCUMENT PLAN:
Topic: ${vars.topic || "General"}
Target Length: ${vars.targetLength || "Not specified"}
Type: ${vars.documentType || "document"}
Tone: ${vars.tone || "professional"}
Target Audience: ${vars.targetAudience || "general"}

PROGRESS: ${completedSections.length}/${totalSections} sections completed

CURRENT SECTIONS:
${sections.map(s => `## ${s.title}\n${s.content || '(empty)'}`).join('\n\n')}

NEXT TASK: ${nextTask.action} "${nextTask.section}" - ${nextTask.description}

CRITICAL LENGTH REQUIREMENTS:
- TARGET WORD COUNT FOR THIS SECTION: ~${targetWordsPerSection} words
- This ensures the final document matches "${vars.targetLength}" when formatted in Times New Roman 12pt, double-spaced
- Standard academic format: ~250 words = 1 page in Times New Roman 12pt, double-spaced
- Write ENOUGH content to hit this word count target
- Do NOT write less - users expect the full length when they copy to Word

IMPORTANT GUIDELINES:
- Write LONG, THOROUGH content matching the word count target (~${targetWordsPerSection} words)
- Use ${vars.tone} tone throughout
- Include specific details, examples, and comprehensive explanations
- Make content professional and well-structured
- EACH CHAPTER MUST HAVE MULTIPLE PARAGRAPHS (3-6 paragraphs to hit word count)
- Separate paragraphs with double newlines (\n\n)
- Each paragraph should be 50-100 words (substantial, not short)
- Think like a book: each chapter has multiple paragraphs covering different aspects in depth

Respond with JSON:
{
  "actions": [
    {
      "type": "update" | "create",
      "sectionId": "section-id-or-new-title",
      "content": "Paragraph 1 with details.\n\nParagraph 2 expanding on the topic.\n\nParagraph 3 with examples."
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

    // Generate progress message for UI
    const progressMessage = `Writing ${nextTask.section}... (${completedSections.length + 1}/${totalSections} completed)`;

    return {
      phase: "execute",
      actions: execResponse.actions || [],
      message: execResponse.message || `Completed ${nextTask.section}`,
      progressMessage,
      aiMemory: updatedMemory,
      confidence: "high",
      plan: updatedMemory.plan,
      shouldContinue: !allTasksDone
    };
  }

  // Phase 3: Review
  if (aiMemory.currentPhase === "review") {
    console.log("🔍 Phase 3: Reviewing content quality...");
    
    const reviewPrompt = `Review the document content for quality and completeness.

ORIGINAL REQUEST: "${instruction}"

DOCUMENT PLAN:
${JSON.stringify(aiMemory.plan.variables, null, 2)}

SECTIONS:
${sections.map(s => `## ${s.title}\nLength: ${s.content.length} chars\nContent: ${s.content.substring(0, 200)}...`).join('\n\n')}

Evaluate:
1. Does each section have substantial content (500+ characters)?
2. Is the content high-quality and relevant?
3. Does it match the user's requirements?
4. Are there any improvements needed?

Return JSON:
{
  "quality": "excellent" | "good" | "needs_improvement",
  "isComplete": true/false,
  "message": "brief summary",
  "nextTasks": [{"action": "update", "section": "section name", "description": "what to improve", "done": false}]
}

If content is good and complete, return isComplete: true with empty nextTasks.
If improvements needed, specify tasks in nextTasks array.`;

    const reviewResult = await generateWithFallback({
      messages: [
        { role: "system", content: "You are a content quality reviewer. You MUST respond with ONLY valid JSON, no markdown, no explanations, no code blocks. Just pure JSON." },
        { role: "user", content: reviewPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    let review;
    try {
      review = JSON.parse(reviewResult.content);
    } catch {
      const jsonMatch = reviewResult.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        review = JSON.parse(jsonMatch[1]);
      } else {
        review = { quality: "good", isComplete: true, message: "Review complete", nextTasks: [] };
      }
    }

    // Early exit: Check if all sections are green (>500 chars)
    const allSectionsGreen = sections.every((s: any) => s.content && s.content.length >= 500);
    if (allSectionsGreen) {
      console.log("✅ All sections are green (>500 chars) - work is complete!");
      review.isComplete = true;
      review.nextTasks = [];
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

    // Work is complete - move to post-processing phase
    console.log("✅ Review complete - moving to post-processing for AI detection avoidance");
    const updatedMemory = { ...aiMemory, currentPhase: "postprocess" };
    
    return await threePhaseGeneration({
      ...request,
      aiMemory: updatedMemory,
      iterationCount: iterationCount + 1
    });
  }

  // Phase 4: Post-processing for AI detection avoidance
  if (aiMemory.currentPhase === "postprocess") {
    console.log("🎨 Phase 4: Post-processing to enhance human-like qualities...");
    
    const postProcessPrompt = `You are a content humanizer. Review each section and make subtle improvements to avoid AI detection.

SECTIONS:
${sections.map(s => `## ${s.title}\n${s.content}`).join('\n\n')}

Make these improvements:
1. Vary sentence structure and length
2. Add more natural transitions
3. Include subtle imperfections (not errors, just human touches)
4. Ensure varied vocabulary
5. Make the writing feel more conversational where appropriate

Return JSON with updated sections:
{
  "actions": [
    {"type": "update", "sectionId": "section-id", "content": "improved content"}
  ],
  "message": "summary of changes"
}

Only include actions for sections that need changes. If content is already good, return empty actions.`;

    const postProcessResult = await generateWithFallback({
      messages: [
        { role: "system", content: "You are a content enhancement specialist. You MUST respond with ONLY valid JSON, no markdown, no explanations, no code blocks. Just pure JSON." },
        { role: "user", content: postProcessPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    let postProcessResponse;
    try {
      postProcessResponse = JSON.parse(postProcessResult.content);
    } catch {
      const jsonMatch = postProcessResult.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        postProcessResponse = JSON.parse(jsonMatch[1]);
      } else {
        postProcessResponse = { actions: [], message: "No changes needed" };
      }
    }

    // Mark as complete
    const updatedMemory = { ...aiMemory, currentPhase: "complete" };

    return {
      phase: "postprocess",
      actions: postProcessResponse.actions || [],
      message: postProcessResponse.message || "Document finalized",
      aiMemory: updatedMemory,
      confidence: "high",
      shouldContinue: false,
      isComplete: true
    };
  }

  // Fallback: Unknown phase
  console.error("❌ Unknown phase:", aiMemory.currentPhase);
  return {
    phase: "review",
    actions: [],
    message: "Unknown phase - restarting",
    aiMemory: { currentPhase: "execute" },
    confidence: "low",
    shouldContinue: false
  };
}
