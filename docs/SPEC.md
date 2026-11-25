# Floorline — Product Spec

> **Status:** this is the original product spec. The demo build ships the full public site and back office, but replaces the Supabase backend (§6) with a browser sandbox data layer. That layer has the same commands, rules, optimistic locking and cross-tab realtime, and is described in the README. Section 6 stays here as the production backend design.

## 1. The problem

Developers in Tirana sell most apartments off-plan. Buyers include locals, the diaspora, and Italian and German buyers. They want to know which units are still free, what the floor plans look like and what they cost, and how to reserve one.

Today that usually means an outdated PDF price list, a few renders, and a lot of WhatsApp back-and-forth. The sales team tracks availability in Excel, so double-bookings and stale information are common.

**Floorline replaces the PDF.** It has three parts:

1. A cinematic project website that sells the lifestyle.
2. A live, clickable building. Every unit shows real-time status, price and floor plan.
3. A back office. The sales team manages units, prices, reservations and leads in one place.

## 2. Demo project: Vela Residence (fictional)

- One building, 12 levels:
  - Ground floor (`0`): 3 commercial units
  - Floors `1–10`: 6 residential units per floor (60 units)
  - Floor `11`: 2 penthouses with large terraces
  - Total: **65 units**
- Unit codes: `{floor}-{letter}`, e.g. `07-B`, `11-PH1`, `00-C2`
- Types: `1+1`, `2+1`, `3+1`, `penthouse`, `commercial`
- Orientation per unit: `N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW`
- Pricing is a seeded formula: base €/m² + floor premium + orientation/view premium. The numbers are realistic-looking placeholders; tune them in the seed.
- Delivery date: about 18 months after the seed date. A construction progress timeline has 5 stages.
- Status mix in the seed: roughly 45% sold, 15% reserved, 40% available. Higher floors and south-facing units sell first, so the data looks real.

## 3. Users and roles

| Role | Who | Can |
|---|---|---|
| Visitor (anon) | Buyers | Browse, filter, view units, compare, favorite (local only), share, request a viewing or reservation |
| `agent` | Sales staff | Everything above, plus: see and manage leads assigned to them or unassigned, change unit status (not undo `sold`), add notes |
| `admin` | Sales manager | Everything, plus: edit units and prices, bulk price changes, revert `sold`, manage staff, see the audit log |
| `demo` | Public demo login | Read everything and change statuses and leads like an agent. Data resets nightly. Can't manage staff or bulk-change prices. |

## 4. Public site

### 4.1 Home `/[locale]`

- **Hero:** full-bleed building visual with a pinned scroll intro. The headline animates in with split text, then the building "assembles" or reveals floor by floor, then the CTA "Find your home" appears.
- **Live stats strip:** total units, floors, delivery date, and **% sold, read live from the DB**.
- **Location:** stylized map (SVG or static map image) with nearby points (center, lake park, schools, airport) and travel times.
- **Amenities:** grid with motion (stagger on enter).
- **Typologies:** `1+1`, `2+1`, `3+1` and Penthouse cards, each with area range, "from €…" price and available count. Each card links to the picker pre-filtered.
- **Construction progress:** timeline of 5 stages with the current stage highlighted.
- **Gallery:** horizontal scroll section (pinned).
- **Final CTA and footer.** The footer says "Fictional demo project — built by Arkel Lahi".

### 4.2 Unit picker `/[locale]/units` (the centerpiece)

- **Building view:**
  - Facade illustration with an SVG overlay, one shape per floor.
  - Hovering or focusing a floor highlights it and shows a tooltip: floor number, available count, price from.
  - Clicking or pressing Enter opens that floor.
- **Floor view:**
  - Generated SVG floor plan. Unit shapes are filled by status (available, reserved, sold, unavailable) using pattern plus color plus a legend, never color alone.
  - Clicking a unit opens a side sheet with key facts and "View unit".
- **Filters** (side panel on desktop, bottom sheet on mobile): type, bedrooms, price range, area range, floor range, orientation, "available only".
  - Filters sync to the URL, so a filtered view can be shared.
  - Units that don't match the filters fade out in both building and floor view.
- **List view toggle:** sortable table or cards (price, area, floor), with the same filters.
- **Realtime:** a status change in the admin shows up for every open visitor within about a second, with a subtle pulse animation on that unit, via Supabase Realtime on `units`.
- **Keyboard:** Tab moves through floors and units, Enter opens, Escape closes sheets, and arrow keys move between floors.

### 4.3 Unit page `/[locale]/units/[code]`

- Large floor plan (zoom and pan), key facts (type, net/gross area, terrace, floor, orientation compass, bathrooms), and price, or "Price on request" when `price_visible = false`.
- Status badge, plus a "view from this floor" image for the floor band (low, mid or high).
- Similar units: same type, still available.
- A sticky CTA, **Request a viewing / reservation**.
- Share: copy link and **WhatsApp click-to-chat pre-filled with the unit code**.
- Print-friendly CSS, so a buyer can print a clean unit sheet.
- A per-unit OG image built with `next/og` (code, type, area, price, mini plan).

### 4.4 Compare `/[locale]/compare`

- Compare up to 3 units side by side. Units are chosen from favorites or "Add to compare" buttons, and the state lives in the URL.

### 4.5 Favorites

- Heart button on units. Favorites are stored in `localStorage`, wrapped in try/catch, with no account needed.

### 4.6 Lead / reservation request

- Opens as a dialog or sheet from any unit or CTA. Fields:
  - name
  - phone (international format)
  - email
  - preferred contact (WhatsApp / phone / email)
  - preferred language
  - message
  - linked unit(s), pre-filled
  - GDPR-style consent checkbox
- Abuse protection: a honeypot field plus a rate limit (max 3 leads per IP hash per 10 minutes, enforced server-side).
- Captures UTM parameters and the source page.
- Success state, plus an optional confirmation email via Resend (behind `ENABLE_EMAIL=true`; it works without it).

### 4.7 SEO and i18n

- Locales `sq` (default), `en`, `it`, with a language switcher that keeps the current path.
- `hreflang`, `sitemap.xml` covering all units in all locales, `robots.txt`, metadata per page, and JSON-LD (`Residence` / `Offer`) on unit pages.

## 5. Back office `/[locale]/admin`

- **Auth:** Supabase Auth (email and password, plus magic link). Only users with a row in `staff` get in. There's a demo login button on the login page that uses the `demo` account.
- **Dashboard:**
  - KPI cards: units by status, % sold, value sold, value reserved, new leads this week, lead→reservation conversion.
  - Charts: sales per month (last 14 months), leads by source.
  - Activity feed from `unit_status_history` and leads.
- **Units:**
  - Data table with filtering and sorting.
  - Status change through a dialog that calls the `change_unit_status` RPC, with an optional linked lead and a note.
  - Per-unit history drawer (status and price changes).
  - Admin-only: edit price and visibility, publish or unpublish.
  - Admin-only: **bulk price adjustment**. Choose floors and/or types, apply ±% with a reason, preview the diff, then confirm. It writes to `price_changes`.
- **Leads:**
  - Kanban with columns `new → contacted → viewing → reserved → won / lost`, drag and drop with dnd-kit.
  - Lead detail: contact info, linked units, notes timeline, assigned agent.
  - Filters and **CSV export**.
- **Audit log (admin):** who changed what, and when.

## 6. Data model (Postgres / Supabase)

```
projects        id, slug, name, city, delivery_date, published
floors          id, project_id, number, label, facade_shape (SVG path), plan_layout (jsonb)
units           id, project_id, floor_id, code (unique per project), type, bedrooms, bathrooms,
                area_net_m2, area_gross_m2, terrace_m2, orientation, price_eur, price_visible,
                status (enum: available | reserved | sold | unavailable), plan_shape (SVG path),
                published, updated_at
unit_status_history  id, unit_id, from_status, to_status, changed_by, lead_id, note, created_at
price_changes   id, unit_id, old_price, new_price, changed_by, reason, created_at
leads           id, created_at, name, phone, email, locale, message, source, preferred_contact,
                status (enum: new | contacted | viewing | reserved | won | lost), assigned_to,
                consent_at, utm (jsonb), ip_hash
lead_units      lead_id, unit_id
lead_notes      id, lead_id, author_id, body, created_at
staff           user_id (→ auth.users), role (enum: admin | agent | demo), full_name
```

- **View `public_units`:** only published units and safe columns. `price_eur` is null when `price_visible = false`.
- **Function `change_unit_status(unit_id, to_status, lead_id?, note?)`:**
  - `security definer`, checks the caller's staff role.
  - Locks the row, validates the transition, updates, and writes history, all atomically.
  - Allowed transitions:
    - `available → reserved | sold | unavailable`
    - `reserved → available | sold`
    - `unavailable → available`
    - `sold → available` (admin only)
  - Returns the new row or a typed error.
- **Function `bulk_adjust_prices(floor_ids[], types[], percent, reason)`:** admin only, transactional, writes `price_changes`.
- **Lead insert:** through a Server Action that checks the honeypot and rate limit, then inserts with the anon key under RLS (anon has insert only on `leads` and `lead_units`).
- **Realtime:** publication on `units`, so clients subscribe to status and price changes.
- **Indexes:** `units(project_id, status)`, `units(floor_id)`, `leads(status, created_at)`, `leads(ip_hash, created_at)`.

## 7. Floor plans (no external assets needed)

- Each floor has a `plan_layout` JSON: a list of units with polygon points, plus walls, core and stairs.
- One generator turns the JSON into an architectural-style SVG (thin lines, room labels, north arrow). The same polygons become the clickable unit shapes, so the plan and the hit areas always match.
- Floors `1–10` share 2 alternating layouts, the penthouse floor has its own, and the ground floor is commercial.

## 8. Quality bar

- Lighthouse (mobile) on home, picker and unit pages: Performance ≥ 90, Accessibility, Best Practices and SEO ≥ 95. Record the scores in the README.
- axe: no serious or critical violations on public pages.
- Reduced-motion mode is fully usable.
- **Tests:**
  - Unit (Vitest): price formatting per locale, filter logic, URL ↔ filter serialization, transition rules (TS mirror of the SQL rules), Zod schemas.
  - DB integration (Vitest against local Supabase):
    - RLS: anon can't read leads or update units; agents can't bulk-price; demo can't manage staff.
    - `change_unit_status`: invalid transitions are rejected.
    - **Concurrency:** two parallel reserve calls on the same unit result in exactly one success.
  - E2E (Playwright):
    - Filter in the picker → open a unit → submit a request → the lead appears in the admin kanban.
    - Admin reserves a unit → an open public picker updates without a reload.
    - Keyboard-only navigation of the picker.
    - Locale switch keeps the path.

## 9. Demo and portfolio deliverables

- Live on Vercel, with a demo admin login button.
- A Vercel Cron calls a protected route that re-seeds the demo data nightly.
- README covering:
  - a hero GIF of the picker
  - screenshots (site, picker, unit, admin)
  - a Mermaid architecture diagram
  - "Engineering decisions": transactional status changes, RLS model, realtime, motion vs performance, i18n
  - Lighthouse scores
  - how to run locally
  - tech stack
  - a disclaimer that it's a fictional project
- Repo description and topics filled in, and pinned on github.com/vortex378.

## 10. Out of scope for v1 (go to `docs/IDEAS.md`)

Payments and deposits, contract generation, 3D/WebGL building, mortgage calculator, multi-project CMS, buyer accounts.
