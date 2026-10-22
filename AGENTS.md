# Events Planner Agent Rules

1. Read `README.md` and `IMPLEMENTATION_STATUS.md` before changing product behavior.
2. Events Planner is a wedding operating system, not a CRM, ERP, invoicing tool or marketing tool.
3. Do not add pricing, billing, payment or sales funnel features without explicit approval.
4. Use the official Events Planner logo from `assets/brand/`.
5. Keep UX mobile-first, calm, elegant and operational.
6. All future production data must live in Supabase/PostgreSQL, not localStorage.
7. All exposed tables require Row Level Security.
8. Do not expose service-role keys or secrets in browser code.
9. Prefer server validation, Zod schemas and TypeScript strict mode in the production app.
10. Every relevant mutation should create activity/audit records.
11. The portal must never expose internal notes, other weddings or team-only data.
12. Update `IMPLEMENTATION_STATUS.md` after each phase.
13. Run syntax/type/build/tests before declaring work complete.
