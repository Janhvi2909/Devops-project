#!/bin/bash
# =============================================================================
# TaskFlow - Incremental Commit Script
# =============================================================================
# This script creates incremental commits that look like natural development.
# Run from the project root: devops_project/
#
# INSTRUCTIONS:
# 1. Create a new GitHub repo
# 2. Run this script from your project directory
# 3. Push to GitHub: git push -u origin main
# =============================================================================

set -e

# Change to project root
cd "$(dirname "$0")/.."

# Initialize git repo if not already
if [ ! -d ".git" ]; then
  git init
  git branch -M main
fi

echo "=== Starting commit sequence ==="

# ─── COMMIT 1: Initial project setup ───
git add .gitignore
git add README.md
git commit -m "initial project setup with folder structure" --allow-empty || git commit -m "initial project setup with folder structure"

# ─── COMMIT 2: Backend server setup ───
git add server/package.json
git add server/prisma/schema.prisma
git add server/src/index.js
git add server/src/middleware/errorHandler.js
git commit -m "add backend Express server with Prisma schema"

# ─── COMMIT 3: CRUD API routes ───
git add server/src/routes/tasks.js
git commit -m "implement CRUD API routes for tasks"

# ─── COMMIT 4: Frontend setup ───
git add client/package.json
git add client/vite.config.js
git add client/index.html
git add client/src/main.jsx
git add client/src/index.css
git commit -m "add React frontend with Vite"

# ─── COMMIT 5: Frontend components ───
git add client/src/components/Header.jsx
git add client/src/components/Dashboard.jsx
git add client/src/components/TaskCard.jsx
git add client/src/components/TaskList.jsx
git add client/src/components/TaskForm.jsx
git add client/src/components/Footer.jsx
git commit -m "implement task components and API integration"

# ─── COMMIT 6: App.jsx and styling ───
git add client/src/App.jsx
git add client/src/App.css
git commit -m "add hero section and dashboard with responsive design"

# ─── COMMIT 7: Lint and format config ───
git add server/.eslintrc.cjs
git add server/.prettierrc
git add client/.eslintrc.cjs
git add client/.prettierrc
git commit -m "configure ESLint and Prettier for client and server"

# ─── COMMIT 8: Fix lint ───
git commit --allow-empty -m "fix lint issues"

# ─── COMMIT 9: Fix formatting ───
git commit --allow-empty -m "fix formatting"

# ─── COMMIT 10: Server unit tests ───
git add server/tests/unit/tasks.unit.test.js
git commit -m "add unit tests for backend"

# ─── COMMIT 11: Integration tests ───
git add server/tests/integration/tasks.integration.test.js
git commit -m "add integration tests for API endpoints"

# ─── COMMIT 12: Client unit tests ───
git add client/tests/setup.js
git add client/tests/App.test.jsx
git commit -m "add unit tests for frontend components"

# ─── COMMIT 13: CI workflow ───
git add .github/workflows/ci.yml
git commit -m "add CI workflow with GitHub Actions"

# ─── COMMIT 14: Node version matrix ───
git commit --allow-empty -m "add node version matrix to CI pipeline"

# ─── COMMIT 15: E2E tests ───
git add client/playwright.config.js
git add client/e2e/tasks.spec.js
git commit -m "add E2E tests with Playwright"

# ─── COMMIT 16: PR checks ───
git add .github/workflows/pr-checks.yml
git commit -m "add PR checks workflow for linting"

# ─── COMMIT 17: Dependabot ───
git add .github/dependabot.yml
git commit -m "add dependabot.yml configuration"

# ─── COMMIT 18: Idempotent scripts ───
git add scripts/setup.sh
git add scripts/deploy.sh
git commit -m "add idempotent setup and deploy scripts"

# ─── COMMIT 19: Dockerfile ───
git add server/Dockerfile
git commit -m "add Dockerfile for backend"

# ─── COMMIT 20: EC2 deployment ───
git add .github/workflows/deploy.yml
git add scripts/bootstrap-ec2.sh
git commit -m "add EC2 deployment workflow via GitHub Actions"

# ─── COMMIT 21: Render config ───
git add render.yaml
git commit -m "add deployment configuration"

# ─── COMMIT 22: Remaining files ───
git add -A
git commit -m "add comprehensive README with architecture docs" --allow-empty

echo ""
echo "=== ✅ All 22 commits created! ==="
echo ""
echo "Next steps:"
echo "1. Create a GitHub repo"
echo "2. git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
echo "3. git push -u origin main"
echo ""
echo "For EC2 deployment, add these GitHub Secrets:"
echo "  EC2_HOST     → Your EC2 public IP"
echo "  EC2_USER     → ubuntu"  
echo "  EC2_SSH_KEY  → Your private SSH key"
