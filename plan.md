# [SHOP NAME] — Stationery & Smart Printing

## Implementation approach

Build the first production-quality storefront slice in the managed React/Express/Drizzle starter. The customer-facing surface will be a responsive home-first shopping experience with real interactive states for category browsing, cart drawer, print-now flow, product add-to-cart feedback, and a compact admin preview route. The current UI will use local mock catalog data and service states while preserving clear seams for database-backed products, orders, print jobs, loyalty, and admin modules already provisioned by the server/database starter.

### Product scope for this slice
- Premium colorful storefront homepage with sticky navigation, hero, quick service strip, category rail, featured products, smart printing panel, custom products, loyalty reward card, shop favorites, and footer.
- Interactive cart drawer with quantity/removal controls and subtotal.
- Print-now modal with file picker, paper/color/side/copy options, fulfilment choice, and dynamic estimate.
- `/shop` route with a focused product grid and category tabs.
- `/admin` route with a restrained operations dashboard showing sales, print queue, printer status, low-stock items, and recent orders.
- Route manifest for `/`, `/shop`, `/admin`.

## Project structure

- `client/src/App.tsx` — route shell, app-level cart state, toast provider.
- `client/src/pages/Home.tsx` — storefront homepage composition and interactive sections.
- `client/src/pages/Shop.tsx` — category/search/filter-friendly product grid.
- `client/src/pages/Admin.tsx` — neutral management dashboard surface distinct from the colorful storefront.
- `client/src/index.css` — semantic pastel tokens, typography, paper texture, responsive layout, motion.
- `public/manus-routes.json` — complete page route manifest.
- `public/` — future durable images and public metadata.
- `server/` — existing managed Express/tRPC/Drizzle seams retained for later persistence.

## Design direction

- **Design movement:** premium editorial stationery world with scrapbook details — closer to a contemporary independent paper shop than a toy store.
- **Core principles:** product-first composition; controlled pastel color blocking; generous breathing room; tactile details used as accents rather than noise.
- **Color philosophy:** cream is the calm paper canvas; pink is the expressive creative signal; yellow/lime marks moments of momentum; lavender frames personal/custom discovery; mint/cyan makes printing feel efficient and fresh; black carries editorial contrast and outlines.
- **Layout paradigm:** a flowing paper-trail rhythm with asymmetric split bands, horizontal product rails, and curved section transitions rather than a repetitive centered card grid.
- **Signature elements:** offset “sticker” labels, thin black keyline outlines, and notebook/grid micro-textures.
- **Interaction philosophy:** browsing feels like flipping through a well-curated counter display; actions give quick tactile feedback through lifts, toasts, drawer transitions, and low-friction modals.
- **Animation:** short ease-out reveals, subtle card lifts, soft floating hero shapes, and a restrained printing progress shimmer; all motion is transform/opacity based and respects reduced-motion preferences.
- **Typography system:** Plus Jakarta Sans for strong headings and UI, DM Sans for body copy, and Caveat only for occasional handwritten annotations.
- **Brand essence:** a neighborhood stationery destination where everyday supplies, beautiful gifts, and fast printing live in one considered place. Personality: warm, inventive, dependable.
- **Brand voice:** concise, inviting, lightly witty. Example lines: “Make room for good ideas.” / “Upload it. We’ll make it tangible.”
- **Wordmark & logo:** [SHOP NAME] appears as a compact two-line wordmark with a small hand-drawn paperclip/star mark; replaceable later without changing layout.
- **Signature brand color:** soft pink `#F6A8C9`, used as the recognizable creative anchor without turning every section pink.

## Data seams

Mock data is intentionally shaped like future DB entities: products, categories, print settings, printer status, queue items, orders, loyalty stamps. The UI can be wired to tRPC procedures without redesigning the components. Print documents must move through secure storage and a backend queue in production; the current screen communicates that architecture without claiming a live printer connection.

## Material constraints

- Use only original layout, copy, and generated product imagery; the supplied reference informs palette and rhythm only.
- Keep the page mobile-first from 320px upward, with intentional mobile navigation and full-width actions.
- Keep text contrast accessible: black/near-black on pastels; avoid light text on yellow.
- Preserve the existing managed server/database configuration and TypeScript diagnostics.
- Do not add dependency-heavy features when CSS and existing lucide-react/framer-motion primitives are sufficient.


## Phase 2 implementation update

The first data-backed slice adds `categories` and `products` tables with additive migration only. Products store prices as integer paise, retain a replaceable media URL, carry publication/sort metadata, and include stock plus a low-stock threshold. A guarded first-run seed populates the empty catalog once; later calls only read current records. tRPC exposes public catalog queries and a protected inventory summary for the next admin wiring step. The storefront keeps its local data as a temporary fallback so a missing database does not blank the customer experience.


## Phase 2 — admin inventory operations

The admin dashboard now includes a neutral inventory manager backed by the same catalog query used by the storefront. Stock edits call a protected `adminProcedure` mutation and return a clear permission error when no owner session is present; the UI remains useful in Preview by showing live published catalog rows and preserving the static operations dashboard around them. Product visibility mutation plumbing is ready for the authenticated product-management pass.


## Design-system refinement and responsive overhaul

The storefront keeps the existing catalog, cart, printing modal, admin dashboard, and database architecture while adding a coherent responsive interaction layer. The customer shell now has a real mobile menu plus fixed quick navigation, the print flow presents Upload → Configure → Review → Pay → Queue, product imagery uses lazy loading/decoding hints, and the design tokens include a shared spacing scale, content max-width, and brand motion easing. The neutral admin surface remains separate from the playful customer surface. LocalBusiness JSON-LD was added to make the business legible to search systems; canonical URL wiring is intentionally deferred until the real production domain is known.


## Production platform phase 1 — authentication and authorization foundation

The existing Manus OAuth session remains the sole login mechanism. The user role enum is additive and keeps the legacy `user` value while adding `customer`, `admin`, `owner`, and `staff`, with `customer` as the database default for new users. A server-only permission map now controls sensitive procedures; inventory reads/writes require inventory permission, and the admin route presents loading, sign-in, and forbidden states instead of exposing the dashboard to everyone. The owner role is granted only when the authenticated open ID matches the configured `OWNER_OPEN_ID` value.
