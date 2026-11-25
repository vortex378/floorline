# Floorline — notes for AI coding agents

Real estate pre-sales platform (Next.js 16 App Router). Demo project: "Vela Residence", fictional, 65 units, locales en/sq/it.
Read `README.md` for the architecture and `docs/SPEC.md` for the product spec. Read `AGENTS.md` (Next.js 16 rules) before touching routing or caching.

## Commands
pnpm dev · pnpm build · pnpm lint · pnpm typecheck · pnpm test · pnpm test:e2e

## Rules
- Business logic lives in `src/domain` as pure functions returning `Result`. No React or I/O there. Every rule change needs a Vitest test.
- UI never mutates state directly. Call `dispatch(command)` from `src/lib/store/sandbox.ts`. Unit writes must pass `expectedVersion`.
- Status changes only through `changeUnitStatus`, which checks the `canTransition` state machine in `src/domain/rules.ts`.
- Seed data must stay deterministic (seeded PRNG). Server-rendered pages depend on it for hydration.
- No hard-coded UI strings. Add keys to all three files in `src/lib/i18n/messages/`. A test enforces key parity.
- Motion: GSAP inside `useGSAP` + `gsap.matchMedia`, with a reduced-motion fallback. Animate transform/opacity only.
- Accessibility: interactive SVG elements need role, tabIndex, aria-label and keyboard handlers. Status is never shown by color alone.
- Content is fictional. Never use real developers' names, renders or logos.
