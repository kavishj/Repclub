# RepClub

A college gym pilot for small friend squads, weekly commitments, staff-reviewed attendance, and internal achievements. Built with React, Vinext, Cloudflare Workers, and D1.

## Included

- Real campus creation and invite-based membership using Sites-managed ChatGPT identity.
- Campus-scoped member roles; only the campus owner can appoint gym verifiers.
- Private squad workout feeds, encouragement, and shared invite codes.
- Workout logs with optional exercises, duration, notes, and a temporary gym desk code.
- Pending, verified, and needs-attention review states with reviewer attribution.
- Server-derived attendance scores. One day counts once; XP caps at the weekly commitment. Equal completion percentages share a rank.
- Weekly goals and schedules, historical goal snapshots, India-time week boundaries, achievements, and personal JSON export.
- An explicitly labeled, temporary demo dataset, isolated from real stored records.

## Interface

- First-run onboarding: campus choice, profile, weekly goal, and an optional squad step.
- Required setup is committed atomically; returning members see their saved campus and a checklist of unfinished actions.
- The demo is opt-in and stays separate from participant records.

- A compact activity feed with expandable exercise details, workout detail views, and encouragement.
- Light, dark, and system appearance preferences, remembered on the current device.
- Searchable workout history, attendance filters, date ranges, and repeat-workout prefilling.
- Interactive weekly and 28-day calendars, history bars, member progress, and achievement details.
- Responsive sidebar and mobile bottom navigation.
- Motion powers onboarding, page and dialog transitions, press feedback, and like reactions. Its animation features load after the initial render.
- Radix Toggle Group provides keyboard navigation for weekly targets and planned days; Radix Tooltip explains icon controls on hover or focus.
- Sonner handles dismissible, swipeable success and error notices in both themes.
- Canvas Confetti loads only when setup is finished or a new verified milestone is detected. Pending logs do not trigger milestone rewards. Reduced-motion preferences disable transforms and confetti.

## Verification limits

Staff confirm attendance independently. A desk code supports a check-in but cannot establish that every exercise, repetition, or weight was completed. Users cannot approve their own attendance. Exercise details remain self-reported.

The first deployment is private. Participants need Site access before app invite codes can be used. Arrange facility permission and enroll consenting adults before running the pilot. This version does not include wearable APIs, cash, gift cards, AI inference, or payment processing.

## Development and checks

Use the Sites development and publication workflow for this checkout. The managed preview uses `sites-preview start <absolute-checkout>` when the preview service is available. Hosting identity and the D1 binding are declared in `.openai/hosting.json`; no application secrets are committed.

```sh
node node_modules/typescript/bin/tsc --noEmit
node --experimental-strip-types --test tests/league.test.mjs
node /root/.codex/plugins/cache/openai-curated-remote/sites/1.1.2/scripts/build-site.mjs
node --experimental-strip-types tests/worker-smoke.mjs
```

The Worker smoke test uses an ephemeral Miniflare D1 database, applies every checked-in migration, and exercises authentication, campus isolation, invitations, permission checks, independent attendance review, duplicate-day protection, goal locking, encouragement, and persisted state reload. Synthetic identity headers are local test fixtures only. Hosted requests use the platform's authenticated identity.

Generate additive schema migrations with `node node_modules/drizzle-kit/bin.cjs generate`. Production migrations are applied by Sites during publication. Demo and test records are not seeded into production.
