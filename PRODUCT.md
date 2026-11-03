# RepClub

<!-- impeccable:product-schema 1 -->

## Platform

Web, with responsive phone and desktop layouts. React/Vinext, Cloudflare Workers and D1. Identity and deployment access are managed by Sites.

## Users and job

College gym members in India share workouts with a private friend squad and build a consistent routine through weekly goals, a campus league and internal achievements. The user's college gyms are the proposed pilot setting.

## Product truth

- Each person belongs to a campus and may join a squad. Campus members see goal progress; workout details are shared with the current squad and authorised gym staff.
- A gym QR starts the timer. A second scan records checkout. Both timestamps come from the server.
- League XP and achievements require both scans, a duration from 5 to 240 minutes, and an independent staff review. People cannot verify their own visits.
- Manual logs, missing checkout, and short or overlong visits stay in history without earning rewards. Exercise results remain self-reported.
- One qualifying gym day counts once. Weekly XP is capped at the agreed target. Weeks follow India time; a target locks after the first check-in.
- Internal XP has no cash value. Coupons, gift cards, wearable integrations, AI coaching and payment processing are not implemented.
- Members can use editable starter templates and save up to 20 private routines across devices. Applying a routine preserves an existing workout draft and adds exercises up to the 12-exercise limit.
- Planned-day reminders are exported to a calendar as an ICS file with India time, a pre-workout alarm and an end-time checkout reminder. Calendar reminders never record attendance or substitute for gym scans.
- Weekly recaps distinguish verified days, pending reviews and manual logs. Staff pilot metrics show activation, weekly activity, checkout completion, review time and a mature week-four return cohort.
- Members may edit or delete their own manual logs. Scan timestamps remain immutable, and deleting a manual fallback does not unlock a scanned weekly target. A qualifying declined scan visit can be appealed once; decisions and appeals retain an audit trail.
- Workout drafts are scoped to an account and campus on the current device. They expire after seven days and clear on save, discard or sign-out.

## Current design decision

The user selected the Clubhouse mockup on 3 November 2026. Preserve its squad-first layout, soft neutral surfaces, lime primary actions, horizontal navigation and compact, rounded workout controls. The approved direction is a redesign of home and workout entry, followed by an Impeccable cleanup pass. Preserve existing data, permissions and reward rules.

## Open decisions

Pilot enrollment, commercial pricing, external rewards and wearable partnerships remain open. Pilot testers still need explicit Site access as well as a campus code. Current deployment access must not be widened without a chosen audience or identified testers.
