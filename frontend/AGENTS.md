<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# DOPA Frontend Agent Rules

## 1. What the Frontend Is

DOPA's frontend is a **workspace-centric architecture visualization tool**, not a generic dashboard or admin panel.

The UI has one job: guide a user from a vague idea to a validated, deployable cloud architecture — through conversation, recommendation, and interactive graph visualization.

Every component, page, and animation must serve that pipeline.

## 2. Design Identity

### Brand Palette

DOPA uses a **dark-first, blue-accent** design language. All UI must feel like a premium developer tool (think Linear, Vercel Dashboard, or Raycast).

```
Background:     slate-950 (#020617)
Surface:        slate-900/50 with border slate-800
Card:           slate-900/40, border slate-800, hover:border-slate-700
Text Primary:   slate-50 (#f8fafc)
Text Secondary: slate-400 (#94a3b8)
Text Muted:     slate-500 (#64748b)
Accent:         blue-500 (#3b82f6)
Accent Hover:   blue-400 (#60a5fa)
Accent Glow:    blue-500/15 (box-shadow for selected states)
Gradient Brand: from-blue-400 to-indigo-400
Success:        green-500 (#22c55e)
Warning:        yellow-500 (#eab308)
Danger:         red-500 (#ef4444)
```

### Typography

- Use Geist Sans (loaded via `next/font/google`) as the primary font.
- Headings: `font-semibold` or `font-bold`, never `font-normal`.
- Body: `text-sm` (14px) for most content. `text-xs` (12px) for metadata/labels.
- Never use browser-default fonts. Every text element must inherit from `--font-geist-sans`.

### Spacing & Layout

- Use `gap-6` (24px) between major panels.
- Use `gap-4` (16px) between cards within a panel.
- Use `p-4` (16px) for card padding.
- Use `p-6` (24px) for page-level padding.
- Border radius: `rounded-xl` (12px) for cards, `rounded-lg` (8px) for inputs/buttons.

### Motion & Animation

- Use Framer Motion for all layout transitions and hover states.
- Cards: `whileHover={{ scale: 1.02 }}` — subtle, never aggressive.
- Page transitions: `initial={{ opacity: 0, y: 20 }}` → `animate={{ opacity: 1, y: 0 }}`.
- Loading states: `animate-pulse` from Tailwind.
- Graph edges: `animated: true` for active data flow connections.
- Never use `transition-all` without specifying `duration-*`. Default to `duration-200`.

## 3. Architecture Rules

### File Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout (Server Component, no "use client")
│   ├── page.tsx            # Dashboard / Landing
│   └── projects/
│       └── [id]/
│           └── page.tsx    # Workspace page
├── components/             # DOPA-specific components
│   ├── ui/                 # shadcn/ui primitives (auto-generated, do not manually edit)
│   ├── workspace-layout.tsx
│   ├── conversation-panel.tsx
│   ├── recommendation-cards.tsx
│   ├── graph-canvas.tsx
│   ├── requirements-summary.tsx
│   ├── health-indicator.tsx
│   ├── providers.tsx
│   └── pipeline-status.tsx
├── lib/
│   ├── api/                # Typed API client layer
│   │   ├── client.ts       # Axios instance
│   │   ├── projects.ts
│   │   ├── conversation.ts
│   │   ├── generation.ts
│   │   └── health.ts
│   └── utils.ts            # shadcn utility (cn)
├── store/
│   └── index.ts            # Zustand global store
├── types/                  # Shared TypeScript interfaces
│   ├── project.ts
│   ├── graph.ts
│   ├── recommendation.ts
│   └── conversation.ts
└── hooks/                  # Custom React hooks (as needed)
```

### Component Rules

1. **"use client" discipline**: Only add `"use client"` to components that need browser APIs, hooks, or interactivity. Keep `layout.tsx` as a Server Component.
2. **No prop drilling beyond 2 levels.** If a prop needs to cross 3+ component boundaries, use Zustand or React Query cache.
3. **Never put business logic in components.** Components render state. Logic belongs in the API layer, Zustand actions, or custom hooks.
4. **shadcn/ui components live in `src/components/ui/`** and must not be manually edited. Use `npx shadcn@latest add <component>` to install new primitives.
5. **Every interactive element must have a unique `id`** for testability and accessibility.

### Data Flow

```
Backend API  →  React Query (cache)  →  Components (render)
                     ↕
               Zustand (UI state: selections, theme, panel visibility)
```

- **React Query** owns all server state: project data, graph, recommendations, requirements.
- **Zustand** owns all client-only state: selected node, selected recommendation, theme, panel collapse state.
- **Never fetch data inside `useEffect`.** Always use `useQuery` or `useMutation` from `@tanstack/react-query`.
- **Never store server data in Zustand.** That's React Query's job.

### API Client Rules

- All API calls go through `src/lib/api/client.ts` (the centralized Axios instance).
- Base URL is `http://localhost:8000/api/v1`.
- Every API function must have a typed return value matching the `types/` interfaces.
- On network errors, show inline UI feedback — never silent failures, never `alert()`.

## 4. Page Architecture

### Dashboard (`/`)

The entry point. Allows creating a new project.

- Full-viewport centered layout with gradient background blobs.
- Single form: project name → POST → redirect to `/projects/{id}`.
- Show the Health Indicator in the top-right corner.

### Workspace (`/projects/[id]`)

The core DOPA experience. A 12-column grid layout:

```
┌──────────────────────┬────────────────────────────────────┐
│  Requirements (1/3)  │  Recommendations (fixed height)    │
│  Summary Panel       │  3 clickable architecture cards     │
│                      ├────────────────────────────────────┤
│  Conversation (2/3)  │  Architecture Graph (flex-1)       │
│  Chat Panel          │  React Flow canvas                 │
│                      │                                    │
└──────────────────────┴────────────────────────────────────┘
Left: col-span-4       Right: col-span-8
```

Rules:
- Left column is always 4/12. Right column is always 8/12. This is non-negotiable.
- The Recommendations section has a fixed height (`h-48`). The Graph fills remaining space.
- The Conversation Panel must auto-scroll to the latest message.
- The Requirements Summary updates in real-time as the user provides requirements.

## 5. Component Specifications

### Conversation Panel

- Opens with a DOPA greeting message driven by `next_question` from the backend.
- User messages align right (blue-600 background).
- DOPA messages align left (slate-800 background, slate-700 border).
- The input field locks (disabled) when `is_complete` is true or project status leaves "discovery".
- On each message send: append user bubble → call `POST /conversation/message` → append DOPA reply.
- The DOPA reply must use the `next_question` field from the API response, not a hardcoded string.
- Show a pulsing "DOPA is thinking..." bubble while the mutation is pending.

### Requirements Summary

- Displays the extracted requirements as key-value badges.
- Reads from `GET /api/v1/projects/{id}/requirements`.
- Shows a progress indicator (e.g., "5/8 fields completed").
- Empty state: "No requirements gathered yet."

### Recommendation Cards

- Horizontal row of 3 cards (flex layout).
- Each card shows: name, match score (percentage badge), metric bars (cost, complexity, scalability).
- The selected/active card has a blue border glow (`shadow-[0_0_15px_rgba(59,130,246,0.15)]`).
- Clicking a card updates Zustand's `selectedRecommendation` and (eventually) re-renders the graph.

### Graph Canvas

- Uses `@xyflow/react` in dark mode (`colorMode="dark"`).
- Node style: slate-900 background, slate-700 border, white text, 8px border radius.
- Edge style: slate-400 stroke, animated for active connections.
- Background: dot grid, color `#334155`, gap 16.
- Always render `<Controls />` for zoom/pan.
- Always call `fitView` on initial load.
- Empty state: centered "Awaiting architecture generation..." text.

### Health Indicator

- Polls `GET /health` every 10 seconds.
- Green dot + "Backend Connected" when healthy.
- Red dot + "Backend Offline" when unreachable.
- The green dot pulses (`animate-pulse`). The red dot is static.
- Both dots have a colored box-shadow glow.

### Pipeline Status

- A horizontal step indicator showing the project's position in the DOPA pipeline.
- States: Discovery → Requirements → Options → Graph → Analyzing → Complete.
- Current step is highlighted (blue). Completed steps are dimmed (green check). Future steps are slate-600.
- Appears in the workspace header, between the DOPA logo and the Health Indicator.

## 6. State Management Rules

### Zustand Store Shape

```typescript
interface DopaState {
  // Client-only UI state
  currentProject: Project | null;
  selectedRecommendation: RecommendationOption | null;
  selectedNode: GraphNode | null;
  theme: 'dark' | 'light';
  conversationPanelCollapsed: boolean;
  requirementsPanelCollapsed: boolean;

  // Actions
  setCurrentProject: (project: Project | null) => void;
  setSelectedRecommendation: (rec: RecommendationOption | null) => void;
  setSelectedNode: (node: GraphNode | null) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleConversationPanel: () => void;
  toggleRequirementsPanel: () => void;
}
```

Rules:
- Zustand is for **UI state only**. Never store API response data here.
- Use `useStore(state => state.field)` selectors, never destructure the entire store.

### React Query Keys

Follow a consistent key naming convention:

```typescript
['project', projectId]           // Single project
['status', projectId]            // Project status
['requirements', projectId]      // Requirements snapshot
['recommendations', projectId]   // Architecture options
['graph', projectId]             // Graph nodes/edges
```

## 7. Error Handling Rules

- **API errors**: Show inline within the component (e.g., a red banner inside the card). Never use `alert()`, `console.error()` as the only feedback, or toast notifications that disappear.
- **Backend offline**: The Health Indicator handles global connectivity. Individual components show "Backend offline" in their empty state.
- **Network timeout**: Use Axios interceptors in `client.ts` with a 10s timeout. Show retry UI.
- **404 on project**: Redirect to `/` with a flash message.

## 8. Accessibility Rules

- Every interactive element has a descriptive `aria-label` or visible label.
- Color is never the sole indicator of state (always pair with text or icons).
- Focus states use `focus:ring-2 focus:ring-blue-500/50`.
- Chat input has `aria-label="Type your requirements"`.

## 9. Performance Rules

- **No unnecessary re-renders.** Use `React.memo()` for graph node components and recommendation cards.
- **Lazy load React Flow.** It's a heavy library — use `next/dynamic` with `ssr: false` for the graph canvas.
- **Debounce chat input** if implementing auto-suggest (300ms).
- **Polling intervals**: Status = 3s, Recommendations = 5s, Graph = 5s, Health = 10s. Never poll faster than 3s.

## 10. Testing Rules

- Components must be testable in isolation with mocked React Query data.
- Use `data-testid` attributes on key interactive elements.
- Graph canvas tests should verify node/edge counts, not pixel positions.

## 11. Things to Never Do

1. Never hardcode API URLs outside `client.ts`.
2. Never use inline styles except for React Flow node/edge config.
3. Never use `any` type — always define proper interfaces in `types/`.
4. Never import from `@/components/ui/` directly in page files — wrap in DOPA-specific components.
5. Never use `useEffect` for data fetching — always use React Query.
6. Never store chat message history in Zustand — it's local component state.
7. Never add `"use client"` to `layout.tsx`.
8. Never manually edit files inside `src/components/ui/`.
