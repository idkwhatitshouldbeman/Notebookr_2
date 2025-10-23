# Notebookr - AI-Powered Engineering Notebooks

## Overview
Notebookr is a free, AI-powered engineering notebook application designed to help engineers write technical documentation through a conversational interface. Users interact with an AI to generate all notebook content. The application features a standalone authentication system and utilizes free OpenRouter AI models with OpenAI as a fallback for content generation. Its ambition is to streamline technical writing, making it accessible and efficient for engineers.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (October 23, 2025)
- **Aggressive Clarifying Questions System:** Planning now uses 4 clear pattern-matching checkpoints (FORMAT, LENGTH, SCOPE, AUDIENCE) to decide whether to ask clarifying questions. If ANY checkpoint missing from user prompt → ask questions. If ALL present → proceed to execution. Replaces previous vague "evaluate if detailed enough" approach.
- **Safety Guards for Missing Tasks:** Added null checks for `plan.tasks` array with fallback task generation from `requiredSections` or default task. Prevents crashes during execution phase.
- **Enhanced Question Handling:** If AI sets `hasQuestions=true` but provides no questions array, system uses default questions (format, length, focus, audience). Prevents edge case where user gets no questions.
- **Improved Awaiting Answers:** When user answers questions, prompt now explicitly requires AI to generate `requiredSections` and `tasks` arrays before proceeding to execution.
- **Comprehensive Logging:** Added detailed logs throughout planning process for debugging question-asking behavior and task generation.

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
    - **Planning:** Uses 4-checkpoint pattern matching (FORMAT, LENGTH, SCOPE, AUDIENCE) to evaluate user instructions. If all checkpoints present → proceed to execution. If any missing → ask clarifying questions. Extracts variables (topic, length, tone, criteria) and creates document plan with tasks and required sections.
    - **Execution:** Processes one task per call, generating/updating sections. Safety guards ensure tasks array always exists, with fallback generation from requiredSections.
    - **Review:** Evaluates content quality and completeness.
    - **Post-Process:** Transparently checks and fixes content to avoid AI detection patterns, enhancing human-like qualities.
- **AI Memory System:** `notebook.aiMemory` stores TODO lists and document plans for persistent context.
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