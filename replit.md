# Notebookr - AI-Powered Engineering Notebooks

## Overview
Notebookr is a free, AI-powered engineering notebook application designed to help engineers write technical documentation through a conversational interface. Users interact with an AI to generate all notebook content. The application features a standalone authentication system and utilizes free OpenRouter AI models with OpenAI as a fallback for content generation. Its ambition is to streamline technical writing, making it accessible and efficient for engineers.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (October 29, 2025)
- **Real-Time AI Streaming with Heartbeats:** Implemented Server-Sent Events (SSE) for streaming AI responses. Prevents 504 Gateway Timeout errors by emitting heartbeat events every 5 seconds during long AI operations. Backend uses `threePhaseGenerationStream` generator that yields progress updates while waiting for AI completion. Frontend uses `generateAIStreaming` with buffered SSE parsing to handle incomplete messages. Backward-compatible non-streaming endpoint maintained for fallback.
- **Streaming Bug Fixes:** Fixed TypeError when `vars.targetLength` is a number (now converted to string before regex matching). Added comprehensive null checks on frontend before accessing `result` properties to prevent "Cannot read properties of null" crashes when SSE emits error events.
- **SSE Event Types:** Supports phase_update, progress (heartbeats), action, content_chunk, complete, and error event types for comprehensive streaming feedback.

## Previous Changes (October 28, 2025)
- **Cleaner Status Messages:** Removed all emojis from completion messages. Format now consistently shows "Completed X in Y time", "Reviewed content in Y time", "Revised content in Y time". Always displays specific section names instead of generic "Completed" messages.
- **Accurate Length Targeting:** AI now calculates precise word count targets based on Times New Roman 12pt, double-spaced format (~250 words per page). If user requests "5 pages", AI generates ~1250 words distributed across sections to match actual page count when copied to Word.
- **One-at-a-Time Questions:** Changed conversational flow to ask ONE SHORT question at a time instead of joining all questions into giant message. Creates natural back-and-forth dialogue. After all questions answered, AI says "ok, making it now" before starting.
- **Settings Navigation:** Added sidebar section navigation for Settings page (Premium Features, Billing, Account, Preferences) with smooth scrolling to each section.
- **Removed Upgrade Banner:** Removed always-visible upgrade header banner. Upgrade/credit purchase functionality now accessible only through Settings page for cleaner interface.
- **Premium Credit System:** Implemented complete credit-based monetization with 100% markup on OpenAI costs (1000 credits = $1). Free users access free OpenRouter models, premium users purchase credits for faster OpenAI models.
- **Bulk Purchase Tiers:** Added scaling bonus structure: $5→5k credits, $10→11k (+10%), $25→30k (+20%), $50→65k (+30% best value).
- **Stripe Integration:** Full Stripe checkout and webhook implementation with graceful degradation when Stripe is not configured. Server starts successfully with or without Stripe secrets.
- **AI Model Selection:** Users choose between Free (OpenRouter), Fast (GPT-4o-mini), and Ultra (GPT-4o) tiers. Auto-switches to free tier when credits reach zero.
- **Transaction Logging:** Comprehensive transaction history in Settings page showing credit purchases, AI usage costs, and balance changes for transparent testing/debugging.
- **Settings Page Enhancement:** Added credit balance display, AI model selector with cost preview, purchase buttons with tier bonuses, and detailed transaction log.
- **Optional Stripe:** Made Stripe initialization conditional to prevent server crashes during development. Endpoints return 503 when Stripe is not configured.

## Previous Changes (October 27, 2025)
- **Conversational AI Planning:** Completely revamped planning phase to be more conversational and exploratory. AI now acts like a helpful friend, asking open-ended questions to understand true goals and context before proceeding. Can have multi-turn conversations with follow-up questions until it has crystal clear understanding.
- **Descriptive Timing Messages:** Timing logs now show what AI actually did (e.g., "⏱️ Planned document structure in 4.12s", "⏱️ Wrote Conclusion in 3.07s") instead of generic "API request completed" messages.

## Previous Changes (October 24, 2025)
- **Smarter Question Logic (3/4 Rule):** Changed from requiring ALL 4 checkpoints to requiring AT LEAST 3 of 4 (FORMAT, LENGTH, SCOPE, AUDIENCE). Expanded keyword recognition - now "10 page paper on cats for AP" proceeds without questions.
- **Meaningful Chapter Names:** Added strict section naming rules forbidding generic titles like "Body", "Introduction", "Chapter 1". AI now generates descriptive names like "Adorable Physical Features", "Endearing Feline Behaviors".
- **Multiple Paragraphs Per Chapter:** Each chapter now contains 2-5 paragraphs minimum with proper separation (\n\n). Creates more natural, book-like content instead of single paragraphs.
- **Original Instruction Display:** Added `originalInstruction` to plan variables for UI display of user's request.
- **Simplified Signup:** Removed confusing optional email/firstName/lastName fields. Now just username + password for cleaner UX.
- **Friendly Working Message:** Beautiful gradient banner with Sparkles icon showing "Feel free to step away - I'll keep working in the background" with elapsed time badge.
- **Schema Fix:** Updated `insertUserSchema` with `.optional().nullable()` for profile fields (email, firstName, lastName, profileImageUrl) to properly handle NULL database values and prevent registration failures.
- **Chapter Progress Messages:** During execution phase, chat now displays specific progress messages like "✍️ Writing Adorable Physical Features... (3/8 completed)" instead of generic "Writing content..." status.
- **Improved Timing Display:** Added ⏱️ emoji to timing messages for better visual distinction.
- **Status Dot Implementation:** Verified green/yellow/red status dots update correctly on section refetch (red <100 chars, yellow 100-499 chars, green ≥500 chars).

## Previous Changes (October 23, 2025)
- **Aggressive Clarifying Questions System:** Planning uses 4 pattern-matching checkpoints to decide whether to ask clarifying questions.
- **Safety Guards for Missing Tasks:** Added null checks for `plan.tasks` array with fallback task generation.
- **Enhanced Question Handling:** Default questions provided if AI fails to generate questions.
- **Improved Awaiting Answers:** Explicit prompt for AI to generate `requiredSections` and `tasks` arrays.
- **Comprehensive Logging:** Detailed logs throughout planning process.

## Previous Changes (October 20, 2025)
- **Green Completion Messages:** Section completion messages now show as "✅ Finished making: [Section]" with expandable content. Messages persist in database and load on page reload. Chat only shows summary - actual content visible via click to expand.
- **Fixed Chapter Counter:** Shows completed chapters/total (e.g., 8/12) instead of task progress. Counts chapters with >500 chars as complete.
- **Colored Status Indicators:** Each chapter displays status dot: 🔴 red (<100 chars), 🟡 yellow (100-500 chars), 🟢 green (>500 chars).
- **Removed Iteration Limit:** AI runs indefinitely until marking work complete, with early exit when all sections are green (>500 chars).
- **Responsive Chapter Panel:** Expands on larger screens: base 320px (w-80), lg 384px, xl 448px, 2xl 512px.
- **Specific Task Messages:** Shows "✍️ Writing [Section]... (X/Y completed)" instead of generic "Executing tasks...".
- **Detailed Timing Logs:** Each API request duration displayed in chat (e.g., "⏱️ API request completed in 5.23s") and persisted to database.

## System Architecture

### Frontend Architecture
- **Technology Stack:** React with TypeScript, Vite, Wouter for routing, TanStack Query for state management, Radix UI primitives with shadcn/ui components, and Tailwind CSS for styling.
- **Design System:** Custom color palette (warm beige/dark), Inter and JetBrains Mono fonts, comprehensive component library, theme switching, and responsive design.
- **Key Features:** Standalone username/password authentication, chat-based AI content generation, conversational AI context understanding, notebook management (create, rename, delete, emoji support), chapters navigation, template system for document types, real-time content updates, and secure user-scoped data access.
- **UI/UX Decisions:** Full-screen document view, real-time chat progress updates (planning, executing, reviewing, post-processing phases), visual feedback for section updates (flashing animation), dynamic variables accordion, smart progress indicators, live section completion updates, and enhanced visual separation in expanded view.

### Backend Architecture
- **Technology Stack:** Node.js with Express.js, TypeScript, Drizzle ORM (PostgreSQL), connect-pg-simple for session management, and OpenAI API integration.
- **API Design:** RESTful API, secure authentication endpoints (register, login, logout), protected notebook and section endpoints, AI generation endpoint, Zod for request validation, and user ownership validation.
- **Data Models:** PostgreSQL database storing Users, Sessions, Notebooks (including `aiMemory` for AI context), Sections, Section Versions (for history), and Messages (chat history with role and content). All sensitive data, like password hashes, are sanitized from API responses.
- **Development Approach:** PostgreSQL with Drizzle ORM, standalone authentication with scrypt hashing, PostgreSQL session storage, hot module replacement, custom logging, and error handling middleware.

### AI System
- **Four-Phase AI Workflow:** Plan → Execute → Review → Post-Process.
    - **Planning:** Uses conversational approach to deeply understand user intent. AI acts like a helpful friend, asking open-ended questions about goals, context, audience, and requirements. Supports multi-turn conversations with follow-up questions until it has crystal clear understanding. Only proceeds to execution when confident about user's vision. Extracts variables (topic, length, tone, criteria) and creates document plan with meaningful section names and tasks.
    - **Execution:** Processes one task per call, generating/updating sections with 2-5 paragraphs minimum. Each chapter has descriptive names (not "Body" or "Introduction"). Safety guards ensure tasks array always exists, with fallback generation from requiredSections.
    - **Review:** Evaluates content quality and completeness.
    - **Post-Process:** Transparently checks and fixes content to avoid AI detection patterns, enhancing human-like qualities.
- **AI Memory System:** `notebook.aiMemory` stores TODO lists, document plans, and original user instructions for persistent context.
- **AI Detection Avoidance:** Post-processing phase specifically targets and mitigates AI detection patterns.
- **Version History:** Automatic snapshots of sections before updates with restore functionality.
- **Question Handling:** Default questions provided if AI fails to generate questions. Awaiting answers phase regenerates full plan with tasks and sections.

## External Dependencies

### AI Services
- **OpenRouter Multi-Model Fallback System:** Primary AI provider, using 9 text and 4 vision models (e.g., Llama-3.3-70B, Gemini-2.0-Flash, Claude-3.5-Sonnet) with API key rotation and graceful degradation.
- **OpenAI API:** Fallback AI provider.

### Database
- **PostgreSQL:** Primary data store, connected via Drizzle ORM and Neon serverless driver. Used for session storage with `connect-pg-simple`.

### Third-Party UI Libraries
- **Radix UI:** Accessible, unstyled UI primitives.
- **shadcn/ui:** Pre-built components based on Radix UI.
- **Lucide React:** Icon library.
- **cmdk:** Command palette.
- **Embla Carousel:** Carousel/slider functionality.
- **React Day Picker:** Calendar/date picker.
- **Recharts:** Charting library.

### Fonts
- **Google Fonts:** Inter (UI/content) and JetBrains Mono (code blocks).