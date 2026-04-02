# AGENTS.md — Coding Guide for AI Assistants

## Project Overview
**Glowly** is a Next.js 16+ demo application that integrates with the **Unified API** to connect Shopify stores and display product inventory. It's a showcase of OAuth2-based commerce integration with real-time data fetching.

- **Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion
- **Key API**: Unified API v2 (`@unified-api/typescript-sdk`, `@unified-api/react-directory`)
- **Build**: `npm run dev` | `npm run build` | `npm run start`

## Architecture Patterns

### OAuth2 Authentication Flow
The app authenticates users through Unified API's hosted OAuth flow:
- User clicks "Connect Shopify Store" button → redirects to `https://api.unified.to/unified/integration/auth/{workspaceId}/shopify`
- Unified API handles OAuth redirect back to app origin
- Connection ID (returned in query param) is stored in `localStorage` as `demo_id`
- See: `src/app/page.tsx` (`startAuth()`, `useEffect` with `searchParams`)

### Data Fetching Pattern
**Problem**: Direct Unified API calls expose auth keys; **Solution**: proxy through Next.js API route.
- Frontend calls `/api/unified?connectionId=X&category=commerce&endpoint=item`
- Route constructs URL: `https://api.unified.to/{category}/{connectionId}/{endpoint}`
- Backend includes `UNIFIED_API_KEY` in Authorization header
- See: `src/app/api/unified/route.ts`

### Data Parsing Robustness
The Unified API returns inconsistent commerce item schemas across integrations. **Strategy**:
- Use fallback chains (e.g., `pickString(item.imageUrl) ?? pickString(item.image_url) ?? ...`)
- Check both normalized fields (`item.name`) and raw provider fields (`item.raw.variants[0].price`)
- Map unpredictable schemas to a normalized `DisplayProduct` type
- See: `src/lib/parse-products.ts` (35+ lines of defensive parsing logic)

### Animation & Progressive Enhancement
Uses Framer Motion for staggered reveals:
- Container variants control child animation timing
- Suspense fallback renders layout skeleton before hydration
- Motion divs are additive—page works without JavaScript
- See: `src/components/product-section.tsx`, `containerVariants`/`itemVariants`

## Configuration & Environment

### Required Environment Variables
```env
UNIFIED_API_KEY=<backend secret for API calls>
NEXT_PUBLIC_UNIFIED_WORKSPACE_ID=<public workspace ID for OAuth flow>
```
- `UNIFIED_API_KEY`: **server-only**, never expose to client
- `NEXT_PUBLIC_*`: client-accessible, used in browser auth URL
- See: `src/app/page.tsx` line 12, `src/app/api/unified/route.ts` line 16

### Brand Customization
All branding lives in `src/config/brand.ts`:
- `HERO_IMAGE_SRC`: Path to hero image in `/public` (default: `/glowly-hero.svg`)
- `HERO_IMAGE_ALT`: Alt text for accessibility
- **Why?** Single source of truth; easier to fork/rebrand without touching components

## Component Conventions

### Client vs Server Components
- **Client components** (`"use client"`): Need interactivity, state, effects (ProductSection, BrandHero)
- **Server components**: Layout, metadata, static structure (layout.tsx, root page skeleton)
- **Pattern**: Wrap client logic in Suspense; define fallback UI to avoid hydration mismatch

### Prop Types
Always export type definitions alongside components:
```typescript
type Props = { product: DisplayProduct; index: number; onPromote?: () => void };
export function ProductCard({ product, index, onPromote }: Props) { ... }
```
See: `src/components/product-card.tsx`, `product-section.tsx`

### Error Handling in Components
Always set error state and display user-facing message:
```typescript
catch {
  setError("Network error");
  setProducts([]);
}
// ... in render: {error ? <p>{error}</p> : ...}
```
See: `src/components/product-section.tsx` lines 46–49, 90–93

## CSS & Styling

### Tailwind + Custom Colors
Uses Tailwind v4 with custom palette (not default grays):
- `bg-[#FAF9F6]` — cream/off-white background
- `bg-[#E4F9A0]` — lime/highlight color
- `bg-[#7C7EDA]` — purple accent (section headers)
- `text-[#1A1A1A]` — near-black text
- `/10`, `/12`, `/60`, `/70` — opacity modifiers (replace alpha chaining)

**Why?**: Brand consistency; easier to swap colors globally by editing one value.

### Font Stacking
Imports Google fonts in layout:
- `Playfair_Display` (serif, headlines) — CSS var `--font-playfair`
- `DM_Sans` (sans-serif, body) — CSS var `--font-dm-sans`
- Applied via `playfair.variable`, `dmSans.variable` in root `<html>` class
- Reference in Tailwind: `font-serif` (Playfair), `font-sans` (DM Sans)
- See: `src/app/layout.tsx`

## API Routes

### GET /api/unified
Proxies Unified API requests. **Parameters** (query string):
- `connectionId` — OAuth connection identifier
- `category` — API category (e.g., `commerce`)
- `endpoint` — Resource type (e.g., `item` for products)

**Example call**: `GET /api/unified?connectionId=conn123&category=commerce&endpoint=item`

### POST /api/workflow
Creates a task in Trello via Unified API. **Pattern**:
- Uses `unifiedFetch()` helper from `src/lib/unified.ts`
- Helper automatically adds Bearer token, JSON headers
- Error messages from API are re-thrown with context
- See: `src/app/api/workflow/route.ts`

### Helper: `unifiedFetch()`
Wrapper around `fetch()` that:
1. Prepends `https://api.unified.to` base URL
2. Adds `Authorization: Bearer {UNIFIED_API_KEY}` header
3. Validates response status; throws on error
4. Returns parsed JSON
- See: `src/lib/unified.ts`

## Development Workflows

### Local Development
```powershell
npm install
npm run dev  # runs on http://localhost:3000
```
- Hot reload enabled; edits to `.tsx`/`.ts` files auto-refresh
- API routes require server restart if changes touch Node globals

### Production Build
```powershell
npm run build  # generates .next/
npm run start  # runs production server
```
- React Compiler enabled (`reactCompiler: true` in next.config.ts)
- Type-checks via TypeScript in tsconfig.json (strict mode enabled)

### Testing Strategy
No test framework currently configured. When adding tests:
- Test data parsing logic (`src/lib/parse-products.ts`) — most complex, deterministic
- Mock Unified API responses for component tests
- Integration tests for OAuth flow (complex, requires manual testing)

## Known Limitations & Todos

1. **Session Persistence**: Connection ID stored in localStorage; survives page refresh but lost in incognito/new tab
2. **Error Recovery**: Network errors show generic message; could surface specific Unified API errors
3. **Pagination**: Product listing doesn't paginate; assumes <100 items
4. **Accessibility**: Some ARIA labels missing on interactive buttons (badges, promote buttons)

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Root layout, OAuth auth flow, connection state |
| `src/components/product-section.tsx` | Fetches + displays product grid with animations |
| `src/lib/parse-products.ts` | Normalizes Unified API schemas → DisplayProduct |
| `src/app/api/unified/route.ts` | Secure proxy for Unified API calls |
| `src/config/brand.ts` | Single source of branding (hero image, alt text) |
| `src/lib/unified.ts` | Unified API HTTP helper with auth |

---

**Last Updated**: March 2026 | **Framework**: Next.js 16, React 19, TypeScript 5

