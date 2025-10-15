# EngiNote - AI-Powered Engineering Notebooks

## Overview

EngiNote is a productivity-focused web application for creating and managing engineering notebooks with AI assistance. It enables engineers and technical professionals to create structured documentation including lab reports, design documents, and project logs with AI-powered content generation. The application features a warm, beige-themed interface inspired by Linear and Notion, prioritizing clarity and efficient information architecture for technical writing.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- Notebook creation and management with emoji support
- Section-based content organization with drag-and-drop ordering (via orderIndex)
- AI-powered content generation panel with context-aware suggestions
- Template system for common engineering document types (Lab Reports, Design Documents, Project Logs, etc.)
- Real-time auto-save functionality
- Export capabilities for documentation

### Backend Architecture

**Technology Stack:**
- **Runtime:** Node.js with Express.js framework
- **Language:** TypeScript with ES modules
- **Database ORM:** Drizzle ORM with PostgreSQL dialect
- **Session Management:** connect-pg-simple for PostgreSQL session storage
- **AI Integration:** OpenAI API for content generation

**API Design:**
- RESTful API structure with resource-based endpoints
- Endpoints for notebooks: GET /api/notebooks, GET /api/notebooks/:id, POST /api/notebooks, PATCH /api/notebooks/:id, DELETE /api/notebooks/:id
- Endpoints for sections: GET /api/notebooks/:id/sections, POST /api/notebooks/:id/sections, PATCH /api/sections/:id, DELETE /api/sections/:id
- AI generation endpoint: POST /api/ai/generate with prompt and context support
- Request validation using Zod schemas with drizzle-zod integration

**Data Models:**
- **Notebooks:** id, title, emoji, createdAt, updatedAt
- **Sections:** id, notebookId (foreign key with cascade delete), title, content, orderIndex (for ordering)
- Schema-first approach with Drizzle ORM and automatic type inference

**Development Approach:**
- In-memory storage implementation (MemStorage) for development with interface-based design allowing easy migration to database
- Hot module replacement in development via Vite middleware integration
- Custom logging middleware for API request tracking
- Error handling middleware for consistent error responses

### External Dependencies

**AI Services:**
- **OpenAI API:** Used for AI-powered content generation
  - Configurable via AI_INTEGRATIONS_OPENAI_API_KEY environment variable
  - Supports custom base URL via AI_INTEGRATIONS_OPENAI_BASE_URL for alternative providers
  - Context-aware generation using notebook sections as reference material

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