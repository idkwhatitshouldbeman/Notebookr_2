# Notebookr - AI-Powered Engineering Notebooks

## Overview
Notebookr is a free, AI-powered engineering notebook application that enables engineers to generate technical documentation through a conversational AI interface. It features a standalone authentication system and utilizes OpenRouter AI models, with OpenAI as a fallback. The project aims to streamline technical writing, making it efficient and accessible.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Technology Stack:** React with TypeScript, Vite, Wouter for routing, TanStack Query, Radix UI primitives with shadcn/ui components, and Tailwind CSS.
- **Design System:** Custom color palette, Inter and JetBrains Mono fonts, comprehensive component library, theme switching, and responsive design.
- **Key Features:** Standalone email/password authentication with Gmail verification, chat-based AI content generation, conversational AI context understanding, notebook management (create, rename, delete, emoji support), chapters navigation, template system, real-time content updates, and secure user-scoped data access.
- **UI/UX Decisions:** Full-screen document view, real-time chat progress updates (planning, executing, reviewing, post-processing), visual feedback for section updates, dynamic variables accordion, smart progress indicators, and live section completion updates.
- **Messaging & Interaction:** Smart message grouping with collapsible "Activity log" blocks for status messages, visible "completion" messages, one-at-a-time conversational questions for natural dialogue, and enhanced context display.

### Backend Architecture
- **Technology Stack:** Node.js with Express.js, TypeScript, Drizzle ORM (PostgreSQL), connect-pg-simple for session management, and OpenAI API integration.
- **API Design:** RESTful API, secure authentication endpoints, protected notebook and section endpoints, AI generation endpoint, Zod for request validation, and user ownership validation.
- **Data Models:** PostgreSQL database storing Users, Sessions, Notebooks (including `aiMemory`), Sections, Section Versions, and Messages.
- **Development Approach:** PostgreSQL with Drizzle ORM, standalone authentication with scrypt hashing, PostgreSQL session storage, hot module replacement, custom logging, and error handling middleware.
- **AI Streaming:** Implemented Server-Sent Events (SSE) for streaming AI responses with heartbeat events to prevent timeouts, using a `threePhaseGenerationStream` generator.

### AI System
- **Four-Phase AI Workflow:** Plan → Execute → Review → Post-Process.
    - **Planning:** Conversational approach to understand user intent, asking open-ended and task-focused questions until clarity is achieved. Extracts variables (topic, length, tone, criteria) and creates a document plan with meaningful section names and tasks. Autonomous planning extracts explicit details and makes reasonable structural decisions, asking questions only when genuinely critical information is missing.
    - **Execution:** Processes tasks one per call, generating/updating sections with 2-5 paragraphs minimum and descriptive chapter names. Supports precise word count targeting based on requested page counts.
    - **Review:** Evaluates content quality and completeness.
    - **Post-Process:** Checks and fixes content to avoid AI detection patterns.
- **AI Memory System:** `notebook.aiMemory` stores TODO lists, document plans, and original user instructions for persistent context.
- **Version History:** Automatic snapshots of sections before updates with restore functionality.
- **Monetization:** Credit-based system with OpenRouter models for free users and purchased credits for faster OpenAI models. Features bulk purchase tiers and Stripe integration for payments.

## External Dependencies

### AI Services
- **OpenRouter Multi-Model Fallback System:** Primary AI provider (e.g., Llama-3.3-70B, Gemini-2.0-Flash, Claude-3.5-Sonnet) with API key rotation and graceful degradation.
- **OpenAI API:** Fallback AI provider.

### Database
- **PostgreSQL:** Primary data store, connected via Drizzle ORM and Neon serverless driver. Used for session storage with `connect-pg-simple`.

### Payment Gateway
- **Stripe:** For credit purchases and webhook integration.

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