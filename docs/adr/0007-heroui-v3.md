# ADR 0007: HeroUI v3 as MetaLayer UI kit

- Status: Accepted
- Date: 2026-07-12
- Deciders: MetaLayer maintainers
- Supersedes: UI kit decision in ADR 0002 (item 3)

## Context

ADR 0002 selected shadcn/ui + Radix + Tailwind v3 for `apps/frontend` and `apps/dashboard`. Product design guidance in `FRONTEND.md` requires a coherent **Layered Minimalism** system with a single general-purpose component library, dark-first surfaces, and branded variants.

HeroUI v3 (React Aria + Tailwind CSS v4) is the modern target kit. It does not coexist with HeroUI v2 or with parallel shadcn/Radix general-purpose components.

## Decision

1. **UI kit:** **HeroUI v3** via `@heroui/react` + `@heroui/styles`.
2. **Runtime:** **React 19** and **Tailwind CSS v4** (CSS-first imports).
3. **Bundler unchanged:** **Rsbuild** remains the app build tool (ADR 0002 items 1–2).
4. **Two apps unchanged:** `apps/frontend` (configure) and `apps/dashboard` (admin).
5. **Shared design system:** `packages/shared-ui` (`@metalayer/shared-ui`) owns tokens, glass/opaque surface variants, and MetaLayer wrappers over HeroUI primitives.
6. **Route prefixes:**
   - Configure SPA: `basename=/configure`
   - Admin SPA: `basename=/admin`
7. **Do not** install Mantine packages; Mantine remains layout inspiration only.
8. **Do not** keep shadcn/Radix as a second general-purpose kit. Remove as pages migrate.
9. **i18n** remains `i18next` + `react-i18next` + `@metalayer/i18n`.

## Consequences

- Both apps upgrade together to React 19 / Tailwind v4 / HeroUI v3.
- Visual language converges on Layered Minimalism (dark-first tokens in `shared-ui`).
- Short-term churn replacing shadcn `Button`/`Badge` wrappers.
- Future feature work builds MetaLayer components on HeroUI slots, not raw HeroUI defaults.

## Alternatives considered

- **HeroUI v2 on React 18 / Tailwind 3:** rejected; maintainers chose the modern line.
- **Single SPA for configure+admin:** deferred; two apps + shared-ui keep Lite deploy boundaries clear.
- **Keep shadcn:** rejected; conflicts with FRONTEND.md single-kit policy.
