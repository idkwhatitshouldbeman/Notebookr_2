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
        message: plan.questions[currentQuestionIndex], // Just ask the first question
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
    const questionIndex = aiMemory.questionIndex || 0;
    const allQuestions = aiMemory.allQuestions || plan.questions || [];
    const answers = aiMemory.answers || [];
    
    // Store the current answer
    answers.push({
      question: allQuestions[questionIndex],
      answer: instruction
    });
    
    // Check if there are more questions to ask
    const nextQuestionIndex = questionIndex + 1;
    if (nextQuestionIndex < allQuestions.length) {
      console.log(`❓ Asking question ${nextQuestionIndex + 1} of ${allQuestions.length}`);
      const updatedMemory = { 
        plan, 
        currentPhase: "awaiting_answers",
        questionIndex: nextQuestionIndex,
        allQuestions,
        answers
      };
      
      return {
        phase: "plan",
        actions: [],
        message: allQuestions[nextQuestionIndex],
        aiMemory: updatedMemory,
        confidence: "high",
        suggestedTitle: plan.suggestedTitle,
        plan: plan,
        shouldContinue: false,
        isComplete: false
      };
    }
    
    // All questions answered, now create the final plan
    console.log("✅ All questions answered, creating final plan");
    const answersText = answers.map((a: any) => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n');
    
    const updatePrompt = `Create the final document plan based on the conversation.

ORIGINAL REQUEST: ${plan.variables?.originalInstruction || 'document'}
CONVERSATION:
${answersText}

Now create the complete document plan with MEANINGFUL section names.

Return complete JSON:
{
  "variables": {
    "topic": "updated topic",
    "targetLength": "extract from answers",
    "documentType": "extract type",
    "targetAudience": "extract audience",
    "focusAreas": ["specific topics"],
    "originalInstruction": "${plan.variables?.originalInstruction || instruction}",
    "hasQuestions": false
  },
  "questions": [],
  "suggestedTitle": "clear title",
  "requiredSections": ["Meaningful Name 1", "Meaningful Name 2", "Meaningful Name 3"],
  "tasks": [
    {"action": "create", "section": "Meaningful Name 1", "description": "write about X", "done": false}
  ]
}

CRITICAL SECTION NAMING RULES:
- DO NOT use generic names like "Introduction", "Body", "Conclusion"
- DO use DESCRIPTIVE names that tell what the chapter is about`;

    const updateResult = await generateWithFallback({
      messages: [
        { role: "system", content: "You are a document planning expert. You MUST respond with ONLY valid JSON with requiredSections and tasks arrays populated." },
        { role: "user", content: updatePrompt }
      ],
      temperature: 0.3,
      max_tokens: 2500,
    });

    let updatedPlan;
    try {
      updatedPlan = JSON.parse(updateResult.content);
      console.log("✅ Successfully parsed updated plan from user answers");
    } catch (parseError) {
      console.warn("⚠️ Failed to parse JSON directly, trying code block extraction...");
      console.log("Raw content:", updateResult.content);
      const jsonMatch = updateResult.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          updatedPlan = JSON.parse(jsonMatch[1]);
          console.log("✅ Successfully parsed plan from code block");
        } catch (codeBlockError) {
          console.error("❌ Failed to parse JSON from code block:", codeBlockError);
          console.log("Using fallback plan");
          updatedPlan = { ...plan, variables: { ...plan.variables, hasQuestions: false } };
        }
      } else {
        console.warn("⚠️ No JSON code block found, using fallback plan");
        updatedPlan = { ...plan, variables: { ...plan.variables, hasQuestions: false } };
      }
    }

    // Plan is complete, proceed to execute
    console.log("✅ Final plan created from answers");

    // AI has all the info it needs, proceed to execute
    const updatedMemory = { plan: updatedPlan, currentPhase: "execute" };
    return {
      phase: "plan",
      actions: [],
      message: "ok, making it now",
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
    
    // Safety check: ensure tasks array exists
    if (!plan.tasks || !Array.isArray(plan.tasks)) {
      console.error("❌ Plan is missing tasks array:", plan);
      // Create default tasks from requiredSections if they exist
      if (plan.requiredSections && Array.isArray(plan.requiredSections) && plan.requiredSections.length > 0) {
        plan.tasks = plan.requiredSections.map((section: string) => ({
          action: "create",
          section,
          description: `Write comprehensive content for ${section}`,
          done: false
        }));
        console.log("✅ Generated tasks from requiredSections:", plan.tasks);
      } else {
        // No tasks and no sections - fallback to generic task
        plan.tasks = [{
          action: "create",
          section: "Content",
          description: instruction,
          done: false
        }];
        console.log("⚠️ Using fallback task");
      }
    }
    
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
    
    // Calculate target word count based on page length
    // Standard: Times New Roman 12pt, double-spaced = ~250 words per page
    let targetWordsPerSection = 300; // default
    const targetLength = vars.targetLength || '';
    const pageMatch = targetLength.match(/(\d+)\s*page/i);
    if (pageMatch) {
      const pageCount = parseInt(pageMatch[1]);
      const totalWords = pageCount * 250; // 250 words per page standard
      const sectionCount = plan.requiredSections?.length || plan.tasks?.length || 1;
      targetWordsPerSection = Math.floor(totalWords / sectionCount);
    }
    
    const executionPrompt = `You are executing a document creation plan. Write COMPREHENSIVE, DETAILED, and SUBSTANTIAL content.

DOCUMENT CONTEXT:
- Topic: ${vars.topic || 'Not specified'}
- Target Length: ${vars.targetLength || 'comprehensive'} (IMPORTANT: When formatted in Times New Roman 12pt, double-spaced, this should match the page count!)
- Document Type: ${plan.documentType || vars.documentType}
- Tone: ${vars.tone || 'academic'}
- Focus Areas: ${vars.focusAreas?.join(', ') || 'general coverage'}
${vars.criteria ? `- Special Criteria: ${vars.criteria}` : ''}

OVERALL GOAL: ${plan.overallGoal}

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

    // Calculate progress for user feedback
    const completedTasks = updatedTasks.filter((t: any) => t.done).length;
    const totalTasks = updatedTasks.length;
    const progressMessage = totalTasks > 0 
      ? `Writing ${nextTask.section}... (${completedTasks}/${totalTasks} completed)`
      : `Writing ${nextTask.section}...`;

    return {
      phase: "execute",
      actions: execResponse.actions || [],
      message: execResponse.message || "Executed task",
      progressMessage, // New field for showing progress in chat
      aiMemory: updatedMemory,
      confidence: "high",
      isComplete: false, // Not complete until review approves
      shouldContinue: true, // Frontend should keep calling
      plan: plan // Include plan for frontend
    };
  }

  // Post-processing phase: AI detection avoidance
  if (aiMemory.currentPhase === "postprocess") {
    console.log("🔧 Post-Processing: Checking for AI detection patterns...");
    
    const detectionPatterns = `AI Detection Patterns to Avoid:
1. Low Perplexity - Predictable, statistically simple language
2. Uniform Sentence Length - Repeated rhythm, little variation  
3. N-gram Repetition - Identical phrases reused
4. Lack of Specific Details - Generic, detached tone
5. Overuse of Em Dashes - Balanced em dash clauses
6. Overuse of Formal Transitions - "Furthermore", "Moreover"
7. Too-Perfect Grammar - No typos or quirks
8. Overuse of Rare Words - Dense, ornate vocabulary
9. Flat or Robotic Tone - Vague, toneless phrasing
10. Lack of Emotional Variance - Emotionless summaries
11. Simplified Syntax - Repetitive structure
12. Logical Inconsistencies - Abrupt transitions
13. Adjective Stacking - "really very extremely"
14. No Questions - AI rarely asks questions
15. Lack of Figurative Language - No metaphor/humor/slang
16. Overuse of Hedges - "may possibly be considered"
17. Generic Examples - Fake, lifeless characters
18. Known AI Phrases - "In today's fast-paced world..."`;

    const postprocessPrompt = `Review all sections and fix any AI detection patterns WITHOUT the generation AI knowing.

CURRENT SECTIONS:
${sections.map((s: any) => `## ${s.title}\n${s.content}`).join('\n\n')}

${detectionPatterns}

Check each section for these patterns. If you find ANY, create update actions to fix them naturally. Make text sound more human:
- Vary sentence length
- Add specific details or examples
- Use natural phrasing
- Include occasional contractions
- Add emotional touches where appropriate
- Use conversational transitions

Respond with JSON:
{
  "actions": [
    { "type": "update", "sectionId": "section-id", "content": "improved content" }
  ],
  "patternsFound": ["list of patterns detected"],
  "message": "summary of changes made"
}`;

    const postprocessResult = await generateWithFallback({
      messages: [
        { role: "system", content: "You are a post-processing editor that makes AI-generated content sound more human and natural. You MUST respond with ONLY valid JSON." },
        { role: "user", content: postprocessPrompt }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    let postprocessResponse;
    try {
      postprocessResponse = JSON.parse(postprocessResult.content);
    } catch {
      const jsonMatch = postprocessResult.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch?.[1]) {
        postprocessResponse = JSON.parse(jsonMatch[1]);
      } else {
        postprocessResponse = { actions: [], patternsFound: [], message: "No changes needed" };
      }
    }

    // If patterns were found and fixed, return actions
    if (postprocessResponse.actions && postprocessResponse.actions.length > 0) {
      console.log(`🔧 Post-processing: Fixed ${postprocessResponse.patternsFound?.length || 0} patterns`);
      return {
        phase: "review",
        actions: postprocessResponse.actions,
        message: postprocessResponse.message || "Improved text naturalness",
        aiMemory: { ...aiMemory, currentPhase: "complete" },
        confidence: "high",
        plan: aiMemory.plan,
        shouldContinue: false,
        isComplete: true
      };
    }

    // No patterns found, document is complete
    console.log("✅ Post-processing complete - no AI patterns detected!");
    return {
      phase: "review",
      actions: [],
      message: "Document complete",
      aiMemory: { ...aiMemory, currentPhase: "complete" },
      confidence: "high",
      plan: aiMemory.plan,
      shouldContinue: false,
      isComplete: true
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

  // Work is complete - move to post-processing phase
  console.log("✅ Review complete - moving to post-processing for AI detection avoidance");
  const updatedMemory = { ...aiMemory, currentPhase: "postprocess" };
  
  return await threePhaseGeneration({
    ...request,
    aiMemory: updatedMemory,
    iterationCount: iterationCount + 1
  });
}
