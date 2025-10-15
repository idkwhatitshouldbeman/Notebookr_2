# Engineering Notebook Design Guidelines

## Design Approach: Design System with Productivity Focus

**Selected Approach**: Design System (Material Design 3 / Fluent Design hybrid) with inspiration from **Linear** and **Notion** for productivity-focused interfaces

**Justification**: This is a utility-focused productivity tool requiring clarity, consistency, and efficient information architecture. The design must support long-form technical writing while providing clear visual feedback for AI generation states.

**Core Principles**:
- Information clarity over visual flourish
- Predictable, consistent interaction patterns
- Strong typographic hierarchy for technical content
- Subtle feedback for AI processing states

---

## Color Palette

### Light Mode (Beige/Warm Theme)
- **Background Layers**: 40 30% 96% (soft beige), 38 25% 92% (warm cream), 36 20% 88% (deeper beige)
- **Text Colors**: 30 15% 25% (warm dark brown), 35 10% 45% (medium warm gray), 35 8% 60% (soft warm gray)
- **Brand Primary**: 25 70% 55% (warm terracotta/coral for AI actions)
- **Brand Accent**: 45 65% 50% (golden amber for highlights)
- **Borders**: 38 20% 85% (subtle warm border)

### Dark Mode (Warm Dark)
- **Background Layers**: 30 15% 12% (warm charcoal), 28 12% 18% (warm dark gray), 26 10% 22% (lighter warm gray)
- **Text Colors**: 40 25% 95% (warm off-white), 38 15% 75% (warm light gray), 36 12% 65% (medium warm gray)
- **Brand Primary**: 25 65% 60% (soft coral for AI actions)
- **Brand Accent**: 45 60% 55% (muted gold for highlights)
- **Borders**: 28 12% 28% (subtle warm border)

### Semantic Colors
- **Warning**: 38 92% 50% (AI processing state)
- **Error**: 0 84% 60% (generation failures)
- **Info**: 199 89% 48% (AI suggestions)

---

## Typography

**Primary Font**: 'Inter' (Google Fonts) - Clean, highly readable for UI and content
**Monospace Font**: 'JetBrains Mono' (Google Fonts) - Code blocks and technical data

### Type Scale
- **Hero/Display**: text-4xl md:text-5xl, font-semibold (onboarding, empty states)
- **Section Headers**: text-2xl md:text-3xl, font-semibold
- **Notebook Titles**: text-xl md:text-2xl, font-medium
- **Body Content**: text-base, font-normal, leading-relaxed (1.75 line height)
- **Secondary Text**: text-sm, text-secondary
- **Caption/Meta**: text-xs, text-tertiary

---

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16
- Micro spacing: p-2, gap-2 (component internals)
- Standard spacing: p-4, gap-4, mb-6 (cards, sections)
- Section spacing: py-8, mb-12 (major sections)
- Page padding: p-6 md:p-8 lg:p-12

**Grid System**:
- Sidebar navigation: w-64 fixed (desktop), full-width drawer (mobile)
- Main content area: max-w-4xl mx-auto (optimal reading width for notebooks)
- Editor workspace: max-w-5xl (slightly wider for editing comfort)
- Dual-pane layouts: 60/40 split (editor/preview or notebook/AI panel)

---

## Component Library

### Navigation & Structure
- **Top Bar**: Fixed header with app logo, notebook title, save status indicator, user profile
- **Sidebar**: Persistent navigation with notebook list, templates, settings (collapsible on mobile)
- **Breadcrumbs**: Show navigation path (All Notebooks > Project Name > Entry)

### Core Components

**Notebook Editor**:
- Rich text editor with floating toolbar (appears on text selection)
- Section headers with auto-numbering (Objectives, Methods, Observations, Conclusions)
- Markdown preview toggle
- Word/character count display

**AI Generation Panel**:
- Slide-out panel (right side, w-96 on desktop)
- Prompt input field with multi-line support
- Generation controls: Generate, Regenerate, Stop
- Context indicator showing which sections AI is aware of
- Loading states: Pulsing text shimmer during generation
- Generated content preview with Accept/Edit/Discard actions

**Template Cards**:
- Grid layout (2 columns on tablet, 3 on desktop)
- Template icon, name, description
- Preview on hover (subtle elevation increase)
- Quick start button

**Notebook List**:
- List view with notebook thumbnail (first few lines preview)
- Metadata: Last edited, word count, completion status
- Status badges: Draft, In Progress, Complete
- Search and filter controls

### Forms & Inputs
- **Text Fields**: Rounded-lg borders, focus ring-2 ring-brand-primary
- **Buttons Primary**: bg-brand-primary, rounded-lg, px-6 py-2.5, hover:brightness-110
- **Buttons Secondary**: border-2 variant with bg-transparent
- **Icon Buttons**: w-10 h-10, rounded-lg, subtle hover background

### Feedback & States
- **AI Processing**: Animated gradient border on generating sections
- **Success Toast**: Slide in from top-right, auto-dismiss in 3s
- **Empty States**: Centered icon + heading + description + CTA button
- **Loading Skeletons**: Pulsing gray rectangles matching content structure

---

## Iconography
**Library**: Heroicons (outline for navigation, solid for actions)
- CDN: `<script src="https://cdn.jsdelivr.net/npm/heroicons@2.0.18/outline/index.js"></script>`
- Common icons: DocumentTextIcon, PencilIcon, SparklesIcon (AI), BeakerIcon (lab), ChartBarIcon (data)

---

## Animations (Minimal & Purposeful)
- **Page Transitions**: Simple fade-in (150ms)
- **Panel Slides**: Transform translate-x with 200ms ease
- **AI Generation**: Gentle pulsing opacity on active text (50%-100%)
- **Button Hovers**: Brightness/scale changes (duration-200)
- **No**: Auto-playing animations, parallax effects, or distracting motion

---

## Images
**Hero Section**: Yes - Single hero on landing/welcome page showing notebook interface mockup or abstract technical illustration (blueprint/schematic aesthetic). Image should be 16:9 aspect ratio, positioned as full-width background with overlay gradient for text readability.

**Additional Images**:
- Empty state illustrations: Minimal line art showing notebook concept
- Template previews: Screenshots of formatted notebook examples
- Onboarding graphics: Step-by-step visual guides (optional)

All images should maintain professional, technical aesthetic - think engineering diagrams, clean workspace photography, or abstract data visualization patterns.

---

## Responsive Behavior
- **Mobile (< 768px)**: Single column, stacked panels, hamburger menu for navigation
- **Tablet (768px - 1024px)**: Collapsible sidebar, single-column editor
- **Desktop (> 1024px)**: Full dual-pane layout with persistent sidebar

**Critical Mobile Optimizations**:
- Floating action button for quick AI generation
- Swipe gestures for panel navigation
- Bottom sheet for AI controls instead of side panel