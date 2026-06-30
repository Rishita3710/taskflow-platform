# TaskFlow

A task management and team collaboration platform where every assignment, clarification, decision, file, and approval stays permanently attached to the task — instead of scattered across calls, WhatsApp, and chat apps.

Built as a portfolio/learning project demonstrating: role-based access control, a discussion-thread-driven workflow engine, real-time collaboration, and multi-tenant SaaS data modeling.

---

## 1. What this project demonstrates

- **Role-Based Access Control (RBAC)** — 4 roles (Super Admin, Manager, Team Lead, Employee) with a centralized permission matrix enforced on every API route, not scattered if/else checks.
- **Task workflow engine** — a finite-state status machine (`todo -> in_progress -> need_clarification -> under_review -> completed/rejected -> reopened`) with server-side transition validation.
- **Discussion-thread-first collaboration** — every task has a permanent, searchable comment thread supporting `@mentions`, internal/manager-only notes, "clarification request" flags, and decision logging — the actual core USP of the product.
- **Real-time updates** — Socket.io pushes new comments live to anyone viewing a task.
- **Visibility & confidentiality model** — Public / Team-only / Private / Confidential tasks, enforced both in API queries and in the UI.
- **Audit trail** — an append-only activity log per task (who did what, when), reused for the Activity Timeline UI.
- **Multi-tenant data model** — every collection is scoped by `organizationId`, so the same database can serve many companies in isolation.
- **Approval workflow** — submit -> review -> approve / reject / request changes, with automatic status transitions and notifications.

---

## 2. Tech stack

| Layer               | Choice                                                                 | Why                                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework           | **Next.js 16 (App Router, TypeScript)**                                | Single codebase for frontend + API routes; file-based routing maps cleanly to REST resources.                                                   |
| Database            | **MongoDB + Mongoose**                                                 | Flexible schema fits tasks/comments well (nested attachments, varying fields per visibility type); fast to iterate on during a portfolio build. |
| Auth                | **JWT (access + refresh tokens) + bcrypt**, stored in httpOnly cookies | Stateless auth that works cleanly with serverless API routes; no session store needed.                                                          |
| Real-time           | **Socket.io** on a custom Node server                                  | Needed for live discussion threads (new comments, typing indicators) without polling.                                                           |
| Validation          | **Zod**                                                                | Schema validation shared between route handlers, with typed inference.                                                                          |
| State/data fetching | **SWR** + React Context                                                | Lightweight client cache + revalidation; avoids pulling in Redux for a project this size.                                                       |
| Styling             | **Tailwind CSS v4**                                                    | Utility-first, fast to build a consistent dark UI.                                                                                              |

---
