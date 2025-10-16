# Notebookr - AI-Powered Engineering Notebooks

## Overview

Notebookr is a free AI-powered engineering notebook application that uses a conversational interface to help engineers write technical documentation. Users chat with AI, and it writes all the notebook content for them. The application features Replit Auth for secure user authentication and uses Replit AI Integrations for free AI content generation (billed to Replit credits, no API key needed).

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (October 16, 2025)

### Advanced AI System with Three-Phase Workflow (Latest)
- **OpenRouter Multi-Model Fallback:** Free AI using 9 OpenRouter models (meta-llama/llama-3.3-70b, nvidia/llama-3.1-nemotron-70b, deepseek/deepseek-chat, etc.) across 3 API keys with graceful degradation to OpenAI
- **Three-Phase AI Workflow:** Autonomous Plan → Execute → Review phases that run automatically in single request
  - Phase 1 (Planning): AI analyzes instruction and creates comprehensive document plan
  - Phase 2 (Execution): AI executes tasks, creates/updates sections based on plan
  - Phase 3 (Review): AI reviews work quality and suggests improvements
- **AI Memory System:** Hidden notebook.aiMemory field stores TODO list, goals, and document plan for context persistence
- **Progress Indicators:** Real-time UI shows current AI phase (📋 Plan, ⚡ Execute, 🔍 Review) and confidence level (high/medium/low)
- **Version History:** Automatic version snapshots saved before each section update with restore functionality
- **Version API Endpoints:** GET /api/sections/:id/versions, POST /api/sections/:id/restore/:versionId

### Standalone Authentication System (October 15, 2025)
- Replaced Replit Auth with standalone username/password authentication
- Users create accounts with username, password, and optional profile info
- Secure password hashing using scrypt
- Session management via PostgreSQL (connect-pg-simple)
- Auth page at /auth with login and registration forms
- Password hashes are sanitized from all API responses for security
- Logout button in sidebar for easy sign out

### Chat-Based UI Redesign (October 15, 2025)
- Replaced textarea-based editing with conversational chat interface
- AI writes all notebook content based on user conversation
- Chapters panel on right side for viewing AI-generated sections
- Real-time content updates with automatic section assignment

### Database Schema Updates (October 15, 2025)
- Added username and password fields to users table for standalone auth
- Added users and sessions tables for authentication
- Added userId foreign key to notebooks for user ownership
- Added aiMemory (jsonb) and documentType fields to notebooks for AI context
- Added section_versions table for version history (sectionId, content, createdAt)
- All routes now enforce user-scoped data access for security

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **Framework:** React with TypeScript
- **Build Tool:** Vite for fast development and optimized production builds
- **Routing:** Wouter for lightweight client-side routing
- **State Management:** TanStack Query (React Query) for server state management and caching
- **UI Library:** Radix UI primitives with shadcn/ui component system
- **Styling:** Tailwind CSS with custom design tokens following Material Design 3 / Fluent Design hybrid approach

**Design System:**
- Custom color palette with warm beige theme for light mode and warm dark for dark mode
- Typography using Inter for UI/content and JetBrains Mono for code
- Comprehensive component library built on Radix UI primitives
- Theme switching capability with persistent user preferences
- Responsive design with mobile-first approach

**Key Features:**
- User authentication with standalone username/password system
- Secure password hashing and session management
- Chat-based interface where AI writes all notebook content
- Conversational AI understands context and updates appropriate sections
- Notebook creation and management with emoji support
- Chapters navigation panel for viewing AI-generated content
- Template system for common engineering document types (Lab Reports, Design Documents, Project Logs, etc.)
- Real-time content updates with automatic cache invalidation
- Secure user-scoped data access with ownership validation

### Backend Architecture

**Technology Stack:**
- **Runtime:** Node.js with Express.js framework
- **Language:** TypeScript with ES modules
- **Database ORM:** Drizzle ORM with PostgreSQL dialect
- **Session Management:** connect-pg-simple for PostgreSQL session storage
- **AI Integration:** OpenAI API for content generation

**API Design:**
- RESTful API structure with resource-based endpoints
- Authentication endpoints: POST /api/register, POST /api/login, POST /api/logout, GET /api/user
- Password hashing using scrypt before storage
- User responses sanitized to exclude password hashes
- Notebooks endpoints (protected): GET /api/notebooks, POST /api/notebooks, GET /api/notebooks/:id, PATCH /api/notebooks/:id, DELETE /api/notebooks/:id
- Sections endpoints (protected): GET /api/notebooks/:id/sections, POST /api/sections, PATCH /api/sections/:id, DELETE /api/sections/:id
- AI generation endpoint (protected): POST /api/ai/generate with prompt and context support
- All protected routes use isAuthenticated middleware and validate user ownership
- Request validation using Zod schemas with drizzle-zod integration

**Data Models:**
- **Users:** id, username (unique), password (hashed), email, firstName, lastName, profileImageUrl, createdAt, updatedAt
- **Sessions:** sid, sess (jsonb), expire (for PostgreSQL session storage)
- **Notebooks:** id, userId (foreign key with cascade delete), title, emoji, documentType, aiMemory (jsonb for storing TODO/plan), createdAt, updatedAt
- **Sections:** id, notebookId (foreign key with cascade delete), title, content, orderIndex (text field for ordering)
- **Section Versions:** id, sectionId (foreign key with cascade delete), content, createdAt (automatic version snapshots)
- Schema-first approach with Drizzle ORM and automatic type inference
- insertNotebookSchema omits id, userId, createdAt, updatedAt (userId added by server from auth)
- Password field is omitted from all API responses for security

**Development Approach:**
- PostgreSQL database with Drizzle ORM for persistent storage
- Standalone authentication with passport-local strategy
- Secure password hashing using scrypt
- PostgreSQL session storage using connect-pg-simple
- Hot module replacement in development via Vite middleware integration
- Custom logging middleware for API request tracking
- Error handling middleware for consistent error responses
- User ownership validation on all protected routes

### External Dependencies

**AI Services:**
- **OpenRouter Multi-Model Fallback System:** Primary AI provider using free models
  - 9 text models: meta-llama/llama-3.3-70b, nvidia/llama-3.1-nemotron-70b, deepseek/deepseek-chat, qwen/qwen-2.5-72b, google/gemini-2.0-flash, anthropic/claude-3.5-sonnet, x-ai/grok-2-1212, microsoft/phi-4, cohere/command-r-plus
  - 4 vision models: meta-llama/llama-3.2-90b-vision, google/gemini-2.0-flash, anthropic/claude-3.5-sonnet, x-ai/grok-2-vision-1212
  - 3 API keys (OPENROUTER_KEY1, KEY2, KEY3) with automatic rotation for load balancing
  - Graceful degradation to OpenAI if all OpenRouter combinations fail
- **OpenAI API:** Fallback provider for content generation
  - Configurable via AI_INTEGRATIONS_OPENAI_API_KEY environment variable
  - Supports custom base URL via AI_INTEGRATIONS_OPENAI_BASE_URL for alternative providers
- **Three-Phase AI Workflow:**
  - Phase 1 (Planning): Analyzes instruction, creates comprehensive document plan stored in aiMemory
  - Phase 2 (Execution): Executes plan tasks, creates/updates sections with content
  - Phase 3 (Review): Reviews work quality, identifies gaps, suggests improvements
  - All phases run automatically in single API call via recursive phase progression
  - Context-aware generation using notebook sections and aiMemory as reference

**Database:**
- **PostgreSQL:** Primary data store (configured via Drizzle)
  - Connection via DATABASE_URL environment variable
  - Managed through Neon serverless driver (@neondatabase/serverless)
  - Session storage using connect-pg-simple
  - Schema migrations in ./migrations directory

**Third-Party UI Libraries:**
- **Radix UI:** Complete suite of accessible, unstyled UI primitives (accordion, dialog, dropdown, popover, sidebar, etc.)
- **shadcn/ui:** Pre-built component patterns on top of Radix UI
- **Lucide React:** Icon library for consistent iconography
- **cmdk:** Command palette component
- **Embla Carousel:** Carousel/slider functionality
- **React Day Picker:** Calendar/date picker component
- **Recharts:** Chart and visualization library

**Development Tools:**
- **Replit-specific plugins:** Runtime error modal, cartographer, dev banner for Replit environment
- **TypeScript:** Strict type checking with path aliases (@/, @shared/, @assets/)
- **ESBuild:** Production bundling for server code
- **Drizzle Kit:** Database schema management and migrations

**Fonts:**
- Google Fonts: Inter (UI/content), JetBrains Mono (code blocks)