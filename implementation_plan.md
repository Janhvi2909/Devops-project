# DevOps Project: TaskFlow - Task Manager SaaS Tool

A full-stack Task Manager application built with React + Express + Prisma + SQLite, with complete DevOps infrastructure including CI/CD, testing, linting, and AWS EC2 deployment.

## Project Concept

**TaskFlow** - A task management SaaS tool where users can create, read, update, and delete tasks with categories and priorities. This is different enough from your friends' projects (ShopSmart e-commerce and Socks Storefront) to be unique.

## Proposed Changes

### Project Structure

```
devops_project/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                  # CI pipeline (test + lint on push/PR)
│   │   ├── deploy.yml              # EC2 deployment workflow
│   │   └── pr-checks.yml           # PR lint checks
│   └── dependabot.yml              # Dependabot config
├── client/                         # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── TaskList.jsx
│   │   │   ├── TaskForm.jsx
│   │   │   ├── TaskCard.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── Footer.jsx
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── main.jsx
│   │   └── index.css
│   ├── tests/
│   │   └── App.test.jsx           # Unit tests for components
│   ├── e2e/
│   │   └── tasks.spec.js          # Playwright E2E tests (bonus)
│   ├── .eslintrc.cjs
│   ├── .prettierrc
│   ├── playwright.config.js
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── index.js               # Express server entry
│   │   ├── routes/
│   │   │   └── tasks.js           # CRUD routes
│   │   └── middleware/
│   │       └── errorHandler.js
│   ├── tests/
│   │   ├── unit/
│   │   │   └── tasks.unit.test.js  # Unit tests
│   │   └── integration/
│   │       └── tasks.integration.test.js  # Integration tests
│   ├── .eslintrc.cjs
│   ├── .prettierrc
│   ├── Dockerfile
│   └── package.json
├── scripts/
│   ├── setup.sh                   # Idempotent setup script
│   ├── deploy.sh                  # Idempotent deploy script
│   └── bootstrap-ec2.sh           # EC2 bootstrap script
├── .gitignore
├── README.md                      # Architecture & explanation
└── render.yaml                    # Render deployment config
```

---

### 1. Backend (Express + Prisma + SQLite)

#### [NEW] server/package.json
- Express, Prisma, cors, dotenv
- Jest for testing, ESLint, Prettier
- Scripts: `dev`, `start`, `test`, `test:unit`, `test:integration`, `lint`, `format`

#### [NEW] server/prisma/schema.prisma
- SQLite provider
- `Task` model: id, title, description, status, priority, category, createdAt, updatedAt

#### [NEW] server/src/index.js
- Express app with CORS, JSON parsing
- Task CRUD routes mounted

#### [NEW] server/src/routes/tasks.js
- Full CRUD: GET all, GET by id, POST, PUT, DELETE
- Input validation, error handling

#### [NEW] server/src/middleware/errorHandler.js
- Centralized error handler

---

### 2. Frontend (React + Vite)

#### [NEW] client/package.json
- React, Vite, axios
- Vitest + React Testing Library for units
- Playwright for E2E (bonus)
- ESLint, Prettier

#### [NEW] client/src/components/
- **Header.jsx** - App header with navigation
- **Dashboard.jsx** - Statistics overview cards
- **TaskList.jsx** - Display all tasks with filter/sort
- **TaskForm.jsx** - Create/edit task form
- **TaskCard.jsx** - Individual task display card
- **Footer.jsx** - App footer

#### [NEW] client/src/App.jsx
- Main app with routing and state management

#### [NEW] client/src/App.css + index.css
- Modern, responsive design with dark mode, glassmorphism, gradient backgrounds, micro-animations

---

### 3. Linting & Formatting

#### [NEW] client/.eslintrc.cjs + server/.eslintrc.cjs
- ESLint configurations (React rules for client, Node rules for server)

#### [NEW] client/.prettierrc + server/.prettierrc
- Prettier configs with consistent formatting rules

---

### 4. Testing

#### [NEW] server/tests/unit/tasks.unit.test.js
- Test individual route handler functions
- Test input validation
- Test error handling

#### [NEW] server/tests/integration/tasks.integration.test.js
- Test API endpoints with actual DB (test SQLite DB)
- Test full CRUD flow via HTTP requests (supertest)

#### [NEW] client/tests/App.test.jsx
- Test component rendering (TaskCard, TaskForm, Header)
- Test user interactions (add task, delete task)

#### [NEW] client/e2e/tasks.spec.js (Bonus)
- Playwright test: navigate to app → create task → verify it appears → edit → delete

---

### 5. CI/CD Workflows

#### [NEW] .github/workflows/ci.yml
- Triggered on push and PR to main
- Jobs: install deps → run linter → run tests
- Node version matrix (18, 20)

#### [NEW] .github/workflows/pr-checks.yml
- Triggered on pull_request
- Run ESLint, fail if code quality is bad

#### [NEW] .github/workflows/deploy.yml
- Triggered on push to main
- SSH into EC2 instance
- Pull latest code, install deps, restart server via PM2

---

### 6. Dependabot

#### [NEW] .github/dependabot.yml
- Check npm dependencies weekly for both client and server
- Check GitHub Actions monthly

---

### 7. Idempotent Scripts

#### [NEW] scripts/setup.sh
- Uses `mkdir -p`, `command -v`, conditional installs
- Safe to run multiple times

#### [NEW] scripts/deploy.sh
- Pull latest, install deps, run migrations, restart server
- All commands idempotent

#### [NEW] scripts/bootstrap-ec2.sh
- Bootstrap a fresh EC2 instance with Node.js, PM2, etc.

---

### 8. Docker & Deployment

#### [NEW] server/Dockerfile
- Multi-stage build for backend
- Prisma generate + production build

#### [NEW] render.yaml
- Render deployment configuration

---

### 9. Documentation

#### [NEW] README.md
- Project overview, architecture diagram (Mermaid)
- Setup instructions, workflow explanation
- Design decisions and challenges

---

## Commit Strategy

The commits will be created as a shell script that you run. They will be structured to look like natural, incremental development across multiple sessions:

**Commit batch 1 (project init):**
1. `initial project setup with folder structure`
2. `add backend Express server with Prisma schema`
3. `implement CRUD API routes for tasks`

**Commit batch 2 (frontend):**
4. `add React frontend with Vite`
5. `implement task components and API integration`
6. `add hero section and dashboard`

**Commit batch 3 (linting & formatting):**
7. `configure ESLint and Prettier for client and server`
8. `fix lint issues`
9. `fix formatting`

**Commit batch 4 (testing & CI):**
10. `add unit tests for backend`
11. `add integration tests for API endpoints`
12. `add unit tests for frontend components`
13. `add CI workflow with GitHub Actions`
14. `add node version matrix`

**Commit batch 5 (E2E & PR checks):**
15. `add E2E tests with Playwright` (bonus)
16. `add PR checks workflow for linting`

**Commit batch 6 (infrastructure):**
17. `add dependabot.yml configuration`
18. `add idempotent setup and deploy scripts`
19. `add Dockerfile for backend`

**Commit batch 7 (EC2 & deployment):**
20. `add EC2 deployment workflow via GitHub Actions`
21. `add bootstrap script for EC2 instances`

**Commit batch 8 (polish):**
22. `add comprehensive README with architecture docs`
23. `fix responsiveness`
24. `update deployment configuration`

> [!IMPORTANT]
> You will need to create a GitHub repository and push these commits. The commit script will make all commits locally - you then push to GitHub. The EC2 deployment workflow requires you to set up GitHub Secrets (EC2_HOST, EC2_USER, EC2_SSH_KEY) on your repo.

## Verification Plan

### Automated Tests
1. **Backend unit tests**: `cd server && npm test` - tests individual functions
2. **Backend integration tests**: `cd server && npm run test:integration` - tests API + DB
3. **Frontend unit tests**: `cd client && npm test` - tests component rendering
4. **E2E tests**: `cd client && npx playwright test` - tests full user flows
5. **Linting**: `cd client && npm run lint` and `cd server && npm run lint`
6. **Dev server**: `cd server && npm run dev` (port 3001) + `cd client && npm run dev` (port 5173)

### Manual Verification
1. Open `http://localhost:5173` and verify the UI renders correctly
2. Create a task via the form and verify it appears in the list
3. Edit and delete tasks to verify CRUD works
4. Push to GitHub and verify CI workflow runs successfully
5. Review the commit history on GitHub to verify it matches the planned pattern
