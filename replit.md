# Notebookr - AI-Powered Engineering Notebooks

## Overview
Notebookr is a free, AI-powered engineering notebook application designed to help engineers write technical documentation through a conversational interface. Users interact with an AI to generate all notebook content. The application features a standalone authentication system and utilizes free OpenRouter AI models with OpenAI as a fallback for content generation. Its ambition is to streamline technical writing, making it accessible and efficient for engineers.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (October 19, 2025)
- **Chat Message Persistence:** All chat messages (user prompts, AI responses, phase updates, errors) now persist across page reloads via Messages table. Loads automatically when revisiting notebooks. Excludes noisy system messages for cleaner chat history.
- **413 Payload Error Fix:** Increased Express body parser limit from 100kb to 50mb to handle large document content during AI post-processing phase without "Payload Too Large" errors.

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
    - **Planning:** Extracts variables (topic, length, tone, criteria) from user instructions and creates a document plan. Can ask clarifying questions.
    - **Execution:** Processes one task per call, generating/updating sections.
    - **Review:** Evaluates content quality and completeness.
    - **Post-Process:** Transparently checks and fixes content to avoid AI detection patterns, enhancing human-like qualities.
- **AI Memory System:** `notebook.aiMemory` stores TODO lists and document plans for persistent context.
- **AI Detection Avoidance:** Post-processing phase specifically targets and mitigates AI detection patterns.
- **Version History:** Automatic snapshots of sections before updates with restore functionality.

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