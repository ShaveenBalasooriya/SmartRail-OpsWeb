# SmartRail Operations (web)

The Network Controller and Auditor surface of SmartRail. It is a feature-sliced React 19 and TypeScript
single-page app built on Vite. `src/app/` holds routing, guards, layout, providers and route-level error
pages. `src/features/<domain>/` holds pages, components, hooks, API services, pure lib functions and types
for one domain. `src/shared/` holds the domain-agnostic transport (`httpClient`, a typed `ApiError`),
generic UI (`QueryState`, `ConfirmDialog`, `EmptyState`, `ErrorPage`, `FilterBar`, `Button`, `Badge`) and
cross-cutting hooks and preferences. Server state lives only in TanStack Query under hierarchical keys.
Session identity lives in a context that exposes a non-null `useCurrentUser()` beneath the route guards.
Shareable filter state lives in the URL, so a filtered board can be refreshed or shared. Authorization is
enforced at the route, then in conditional rendering, then by the API. Styling is CSS Modules over one
token sheet in `src/index.css`, with `data-theme` and `data-motion` on `<html>` driving light and dark
themes and reduced motion, and one `--motion-duration` token that collapses all animation. Every
route-level page uses the same four-state query ladder (pending, error, empty, data), and every list uses
pure `lib/` filtering with the "no data" versus "no matches" split.

The architecture follows the Deskline blueprint the owner asked us to reproduce, with the deviations listed
below. Decisions are in `../docs/frontend-architecture.md`.

## Running it

Requirements: Node 24 and npm 11.

```bash
npm install
npm run dev        # http://localhost:5173
```

The dev server forwards `/api` to the SmartRail API. Start the API first (it listens on
`http://localhost:5080` by default, with routes under `/api/v1`). To point the proxy somewhere else,
set `VITE_API_PROXY_TARGET`, for example `VITE_API_PROXY_TARGET=http://localhost:6000 npm run dev`.

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with the `/api` proxy |
| `npm run build` | Type-checks the project (`tsc -b`), then builds to `dist/` |
| `npm run lint` | ESLint flat config: TypeScript, React Hooks, React Refresh, TanStack Query rules |
| `npm test` | Vitest with Testing Library, in jsdom |
| `npm run preview` | Serves the production build |

Sign-in is a development placeholder: `/login` lets you pick the Network Controller or the Auditor role,
stored in `sessionStorage`. It is not authentication. It is replaced by Authentik OIDC when the backend
`add-identity-access` change lands, behind the `sessionService` interface in
`src/features/auth/api/session.ts`.

## Why it is built this way (and not otherwise)

- **Feature folders, not type folders.** Each domain's code sits together, so a change to journeys touches
  one folder. The import direction is one way: pages, then components, then hooks, then services, then the
  transport.
- **Hooks own server state, pages own view state.** Components receive props and render JSX. They never
  fetch.
- **Services are plain async functions.** Nothing in them is React-specific, so swapping the data layer
  later does not touch the UI.
- **Errors are typed.** The client turns each failure into an `ApiError` with a semantic `code`, and the
  UI branches on the code. The API returns RFC 9457 problem details, so the code is derived from the HTTP
  status. The API maps each error type to exactly one status, so no information is lost.
- **Guards render in place.** A silent redirect would drop the user's context and explain nothing. A
  forbidden page at the attempted URL is honest, and the user can sign in and retry at the same address.
- **The filter is in the URL, the search is not.** A status filter should survive a refresh and be
  shareable. Search text is momentary, so it is debounced local state.
- **No form, validation, state, or UI kit libraries.** Each was replaced by a few dozen lines of local
  convention, which is cheaper to maintain than a dependency for an app this size.
- **No code generator for the API client yet.** Services are hand-written with local wire types, matching
  the blueprint. `docs/frontend-architecture.md` section 3 proposed generating the client from OpenAPI. That
  is a deliberate difference for now and can be revisited.
- **Freshness is visible.** The board shows a "Last updated" time, and a failed refresh keeps the last-known
  list on screen with a note, rather than replacing it with a blank screen (M-02).

## Deviations from the blueprint

Each one is either a fix from the blueprint's own list (section 14) or forced by the SmartRail backend:

- Path alias `@/` added (`tsconfig.app.json` and `vite.config.ts`).
- `QueryClient` defaults: `staleTime` 30 seconds, `retry` only up to two retries, `refetchOnWindowFocus`
  off.
- A route-level `errorElement` on the pathless root covers render crashes.
- Vitest and Testing Library added from day one.
- The duplicate `features/errors` pages were not created.
- ESLint 10 replaces oxlint, with `@tanstack/eslint-plugin-query` wired in.
- No MSW. The dev server proxy reaches the real API. `createHttpClient("")` is used as the blueprint has it.
- No `cookie` dependency. The client sends a bearer token through `getAccessToken` when one exists, and it
  does not send cookies.
- `requesterId` and `authorId` are not copied from the blueprint.
- The journey status is `null` ("not reported") until the API has a live status endpoint. See the
  `features/journeys` notes.

## Layout

```text
src/
  main.tsx, App.tsx      bootstrap and provider composition
  index.css              design tokens and global element styles
  app/                   router, query client, auth provider, guards, layout, route-level pages
  features/
    auth/                sign-in page, identity placeholder, the User and Role types
    journeys/            the Live board: types, service, hooks, pure filter, components, page
    audit/               Auditor-only stub page
  shared/
    api/                 httpClient, ApiError, the client composition root
    components/          Button, Badge
    ui/                  QueryState, EmptyState, ErrorPage, FilterBar, LoadingIndicator, ConfirmDialog
    hooks/               useDebouncedValue
    lib/                 railway time helpers
    preferences/         theme and motion
  test/setup.ts          Testing Library setup
```

## Conventions

- Components are `PascalCase.tsx` with a default export of `function Name()`. Each has a colocated
  `PascalCase.module.css` with semantic class names.
- Use `import type` for type-only imports. Unions with `_VALUES` arrays are used instead of enums.
- Query keys are `["entity"]`, `["entity", id]` or `["entity", { facet }]`.
- Hard-coded colours are not allowed in components. Use the `var(--…)` tokens from `index.css`.
- Comments explain why, not what.
