# EngiNote - AI-Powered Engineering Notebooks

## Overview

EngiNote is a free AI-powered engineering notebook application that uses a conversational interface to help engineers write technical documentation. Users chat with AI, and it writes all the notebook content for them. The application features Replit Auth for secure user authentication and uses Replit AI Integrations for free AI content generation (billed to Replit credits, no API key needed).

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (October 15, 2025)

### Standalone Authentication System (Latest)
- Replaced Replit Auth with standalone username/password authentication
- Users create accounts with username, password, and optional profile info
- Secure password hashing using scrypt
- Session management via PostgreSQL (connect-pg-simple)
- Auth page at /auth with login and registration forms
- Password hashes are sanitized from all API responses for security
- Logout button in sidebar for easy sign out

### Chat-Based UI Redesign
- Replaced textarea-based editing with conversational chat interface
- AI writes all notebook content based on user conversation
- Chapters panel on right side for viewing AI-generated sections
- Real-time content updates with automatic section assignment

### Database Schema Updates
- Added username and password fields to users table for standalone auth
- Added users and sessions tables for authentication
- Added userId foreign key to notebooks for user ownership
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
- **Notebooks:** id, userId (foreign key with cascade delete), title, emoji, createdAt, updatedAt
- **Sections:** id, notebookId (foreign key with cascade delete), title, content, orderIndex (for ordering)
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