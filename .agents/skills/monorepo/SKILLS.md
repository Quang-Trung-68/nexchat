# SKILL.md — Production Fullstack Chat App Architecture Guide (TypeScript Monorepo)

## Skill Name

Production-Ready Fullstack Chat Application Skill (Monorepo + Feature-Based + TypeScript)

---

## Purpose

This skill instructs an AI agent to design, scaffold, implement, and maintain a **production-grade realtime chat platform**.

This skill MUST be used whenever the task involves:

* project scaffolding
* feature implementation
* refactoring architecture
* realtime chat workflows
* performance optimization
* database schema design
* frontend state management
* error handling
* deployment

---

## Core Tech Stack (Mandatory)

### Frontend

* TypeScript
* React
* Vite
* Zustand
* TanStack Query
* React Router
* Error Boundary

### Backend

* TypeScript
* Node.js
* Express
* Socket.IO
* Prisma ORM
* PostgreSQL / MySQL
* Redis
* BullMQ
* Global Error Handler

### Repository Strategy

* Monorepo
* Feature-based architecture

---

## Repository Structure

```text
fullstack-chat-app/
├── apps/
│   ├── client/
│   └── server/
│
├── packages/
│   ├── shared-types/
│   ├── shared-utils/
│   ├── shared-constants/
│   └── shared-schemas/
│
├── infra/
│   ├── docker/
│   ├── nginx/
│   └── scripts/
│
├── package.json
└── README.md
```

---

## Architecture Rules

### Rule 1 — Feature-based inside each app

Never organize large projects only by file type.

Always use:

```text
features/chat
features/auth
features/notifications
```

---

### Rule 2 — Strict separation

```text
apps/client
apps/server
```

No backend logic in client.
No UI logic in server.

---

### Rule 3 — Shared code in packages

Use packages for:

* DTO types
* schemas
* constants
* helper functions
* socket event names

---

# CLIENT ARCHITECTURE

## Client Structure

```text
apps/client/
├── src/
│   ├── app/
│   ├── routes/
│   ├── features/
│   ├── shared/
│   ├── stores/
│   ├── services/
│   └── main.tsx
```

---

## Feature Template

```text
src/features/<feature>/
├── components/
├── hooks/
├── queries/
├── store/
├── services/
├── types/
└── pages/
```

---

## State Management Rules

### Zustand Rules

Use Zustand ONLY for:

* UI state
* modal state
* sidebar state
* selected room
* typing status
* socket connection state
* temporary local message drafts

Example:

```typescript
selectedRoomId
isTyping
onlineUsers
socketConnected
```

Never store server-fetch data as primary source in Zustand.

---

### TanStack Query Rules

Use TanStack Query for:

* conversations list
* messages pagination
* user profile
* notifications
* unread count

Example:

```typescript
useQuery(['messages', roomId])
useInfiniteQuery(['room-messages', roomId])
```

All API fetched data MUST use Query.

---

## Important Query Rule for Messages

Messages MUST use infinite pagination.

Preferred:

```typescript
useInfiniteQuery()
```

Never load all messages at once.

---

## Error Boundary Rule

The client MUST include global React Error Boundary.

Required structure:

```text
src/app/ErrorBoundary.tsx
```

Responsibilities:

* catch render crash
* fallback UI
* reload option
* log error service

All route-level pages MUST be wrapped.

---

# SERVER ARCHITECTURE

## Server Structure

```text
apps/server/
├── src/
│   ├── config/
│   ├── modules/
│   ├── sockets/
│   ├── jobs/
│   ├── middlewares/
│   ├── prisma/
│   └── server.ts
```

---

## Module Template

```text
src/modules/<feature>/
├── <feature>.controller.ts
├── <feature>.service.ts
├── <feature>.repository.ts
├── <feature>.routes.ts
├── <feature>.validation.ts
└── <feature>.types.ts
```

---

## Layer Responsibilities

### controller

* request
* response
* status code

No business logic.

---

### service

* business rules
* permission checks
* workflow orchestration
* message delivery flow

---

### repository

* Prisma query only
* Redis cache query
* DB optimization query

---

# PRISMA RULES (MANDATORY)

## Prisma Folder

```text
src/prisma/
├── schema.prisma
├── migrations/
└── seed.ts
```

---

## Message Model Best Practice

```prisma
model Message {
  id        String   @id @default(uuid())
  roomId    String
  senderId  String
  content   String
  createdAt DateTime @default(now())

  @@index([roomId, createdAt])
}
```

---

## Critical Performance Rule

For chat message loading, the agent MUST ALWAYS create this composite index:

```prisma
@@index([roomId, createdAt])
```

This is mandatory.

Reason:

* fast room-based pagination
* fast newest-first sorting
* optimized infinite scroll

This index is REQUIRED for production chat apps.

---

## Additional Recommended Indexes

```prisma
@@index([senderId])
@@index([createdAt])
```

For unread optimization:

```prisma
@@index([roomId, isRead])
```

---

## Query Rule

Always query messages using:

```typescript
where: { roomId }
orderBy: { createdAt: 'desc' }
take: 30
cursor
```

Never fetch entire room history.

---

# SOCKET RULES

## Socket Structure

```text
src/sockets/
├── socketServer.ts
├── chat.socket.ts
└── notification.socket.ts
```

---

## Mandatory Events

* join_room
* leave_room
* send_message
* receive_message
* typing
* stop_typing
* message_seen
* user_online
* user_offline

All names must come from shared constants.

---

# ERROR HANDLING RULES

## Global Error Handler (MANDATORY)

Required file:

```text
src/middlewares/globalErrorHandler.ts
```

Must handle:

* validation error
* Prisma error
* unauthorized
* forbidden
* internal server error

Example responsibilities:

* status code normalization
* safe error response
* logging
* stack trace in development only

---

## Custom Error Class

```text
src/shared/errors/AppError.ts
```

Required:

```typescript
statusCode
message
code
```

All services must throw AppError.

---

# DATABASE PERFORMANCE RULES

## Chat Load Optimization

Mandatory strategy:

* composite index
* cursor pagination
* Redis cache recent messages
* unread count caching

---

## Recommended Redis Strategy

Cache latest 30 messages per room.

Key format:

```text
chat:room:{roomId}:recent
```

TTL recommended:

```text
60–120 seconds
```

---

# FEATURE IMPLEMENTATION WORKFLOW FOR AGENT

Whenever adding a feature, follow this exact order:

1. Create frontend feature
2. Create Zustand store if UI state needed
3. Create TanStack query hooks
4. Create backend module
5. Update Prisma schema
6. Add indexes
7. Add routes
8. Add socket events
9. Add error handling
10. Add shared types/constants

---

# ANTI-PATTERNS

Never do:

* fetch messages without pagination
* use Zustand for API source of truth
* omit Prisma indexes
* put business logic in controller
* direct socket event strings in UI
* missing Error Boundary
* missing Global Error Handler

---

# OUTPUT STANDARD FOR AGENT

Every response must include:

1. folder tree
2. files to create
3. implementation order
4. performance notes
5. error handling notes
6. prisma index recommendation

---

# BEST USE CASE

This skill is optimized for:

* mini chat platform
* ecommerce buyer-seller chat
* support messaging
* social messaging
* realtime notification system
