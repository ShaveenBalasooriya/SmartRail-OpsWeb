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

## Sign-in

Sign-in is real Authentik OIDC (authorization code + PKCE, S256), using the public client
`smartrail-staff`. The API authorizes every staff request with the resulting bearer token, and the
role comes from the token's `groups` claim.

Authentik must be running on **http://localhost:9000** and the app must be served on
**http://localhost:5173** — that origin is the only allowed redirect URI
(`http://localhost:5173/...`). `npm run dev` uses 5173 by default; do not change the port.

Three staff users are seeded:

| User | Role | Access |
|---|---|---|
| `controller.mahesh` | `network_controller` | Live board, journey detail, network map, publishing |
| `guard.ishara` | `guard` | Signed in, but no SmartRail Operations access (a "no access" screen) |
| `auditor.wasantha` | `auditor` | Audit log only (read-only) |

Passwords come from the API stack's environment; they are not stored in this repository.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_OIDC_AUTHORITY` | `http://localhost:9000/application/o/smartrail-staff/` | OIDC authority (discovery) |
| `VITE_OIDC_CLIENT_ID` | `smartrail-staff` | Public client ID |
| `VITE_API_PROXY_TARGET` | `http://localhost:5080` | Dev-server `/api` proxy target |

Tokens are kept in `sessionStorage`; closing the tab signs the user out. The 15-minute access token is
renewed silently from the refresh token (`offline_access`). The only module that knows about OIDC is
`src/features/auth/api/session.ts`, behind the `sessionService` interface.

## Routes and roles

The root path is a role landing page: a Network Controller goes to `/board`, an Auditor to `/audit`,
and a signed-in role with no operations access meets the no-access screen.

| Route | Who | What |
|---|---|---|
| `/board` | Network Controller | Today's live board. The API refuses the operations reads to an auditor (403), so the auditor's only link is Audit. |
| `/journeys/:journeyId` | Network Controller | Detail, stop timeline (with the network's Interchange tags), change history. |
| `/map` | Network Controller | Network map generated from `/network/lines`, with trains placed from the live journeys. |
| `/audit`, `/audit/:entryId` | Auditor | Read-only audit record, one entry's detail and the chain integrity check. |
| `/journeys/:journeyId/publish/delay`, `.../cancellation`, `.../platform-change`, `.../termination`, `.../correction` | Network Controller | Publish drawers over the detail page. Each is a deep-linkable URL. |
| `/journeys/:journeyId/published/:changeId` | Network Controller | Confirmation page for the change that was just published. |

The board, map and publish URLs render the 403 page for an auditor, which sends them back to `/audit`
rather than offering a board they cannot open.

## Live updates

Every request now goes to the SmartRail API. There is no mock switch and no mock endpoint, so a broken
integration fails visibly instead of being hidden behind sample data.

The live board and journey detail subscribe to the API's public Server-Sent Events stream,
`GET /api/v1/public/stream`. One stream is opened for a signed-in Network Controller (Auditors have no
live data and open none). The server is the source of truth, so every journey event only invalidates the
`['journeys']` queries and the pages read the facts again; no event payload is applied directly. The same
refresh happens on a `reset` event and on a reconnect after a gap.

The client (`src/shared/api/sseClient.ts`, with the frame parser in `sseFrames.ts`) is built on `fetch`
and a `ReadableStream`, because the browser's `EventSource` cannot set `Last-Event-ID` or be closed with
an `AbortController`. A dropped connection reconnects with exponential backoff and jitter (1 s up to 30 s,
reset after a stable connection) and resends `Last-Event-ID`, so the API replays missed events in order.
An unknown position makes the API send a `reset` event first; the client refetches and keeps listening.
A `429` waits at least as long as its `Retry-After` header, and 45 seconds without any bytes — not even a
keep-alive comment — counts as a dead connection.

The navbar connection chip follows the stream: **Live** while it is open, **Degraded** while it is
connecting or reconnecting, and **Offline** when the browser is offline or the stream closed after
failing. The board's and detail's "Last updated" lines stay fetch-based and update when the refetch
caused by an event finishes.

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
- No `cookie` dependency. The client sends the Authentik access token through the `getAccessToken`
  registry in `src/shared/api/authBridge.ts`, and it does not send cookies.
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
    auth/                OIDC session, sign-in and callback pages, the User and Role types
    journeys/            the Live board: types, service, hooks, pure filter, components, page
    audit/               Auditor-only stub page
  shared/
    api/                 httpClient, ApiError, the client composition root, the SSE client and parser
    live/                the one live-update effect and the connection-status store
    components/          Button, Badge
    ui/                  QueryState, EmptyState, ErrorPage, FilterBar, LoadingIndicator, ConfirmDialog
    hooks/               useDebouncedValue, useConnectionStatus
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

## Docker

`docker compose up --build` builds the app and serves it with nginx on http://localhost:5173 (`OPSWEB_PORT` changes the port). Requests to `/api` are forwarded to `API_UPSTREAM` (default `http://host.docker.internal:5080`, the API from `SmartRail-API`'s compose), so the browser sees one origin. `VITE_*` values, including `VITE_OIDC_AUTHORITY` and `VITE_OIDC_CLIENT_ID`, are build arguments, set in the shell or an `.env` file before building. Sign-in still requires Authentik on http://localhost:9000 and the app on port 5173.
