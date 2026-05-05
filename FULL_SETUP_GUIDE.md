# Complete DevOps Setup Guide — TaskFlow ECS Fargate Pipeline

This document records **every single thing done** to build a production-grade CI/CD pipeline for the TaskFlow project on **May 8, 2026**. If you copy this project to a new folder, follow every step here exactly and you will get an identical working setup.

---

## What This Guide Covers

1. [What the Existing Project Was](#1-what-the-existing-project-was)
2. [What We Built On Top](#2-what-we-built-on-top)
3. [Step 1 — Install Prerequisites](#3-step-1--install-prerequisites)
4. [Step 2 — Create Terraform Infrastructure Files](#4-step-2--create-terraform-infrastructure-files)
5. [Step 3 — Update the Server Dockerfile](#5-step-3--update-the-server-dockerfile)
6. [Step 4 — Create the Combined Root Dockerfile (for ECS)](#6-step-4--create-the-combined-root-dockerfile-for-ecs)
7. [Step 5 — Create the Client Dockerfile (Nginx)](#7-step-5--create-the-client-dockerfile-nginx)
8. [Step 6 — Create Docker Compose for Local Dev](#8-step-6--create-docker-compose-for-local-dev)
9. [Step 7 — Update Express to Serve Frontend](#9-step-7--update-express-to-serve-frontend)
10. [Step 8 — Create GitHub Actions CI/CD Workflow](#10-step-8--create-github-actions-cicd-workflow)
11. [Step 9 — Create .dockerignore Files](#11-step-9--create-dockerignore-files)
12. [Step 10 — Update .gitignore](#12-step-10--update-gitignore)
13. [Step 11 — One-Time AWS Setup (Before Pipeline)](#13-step-11--one-time-aws-setup-before-pipeline)
14. [Step 12 — Push Image to ECR Manually](#14-step-12--push-image-to-ecr-manually)
15. [Bugs We Hit and How We Fixed Them](#15-bugs-we-hit-and-how-we-fixed-them)
16. [Final Verified Working State](#16-final-verified-working-state)
17. [Final Project File Structure](#17-final-project-file-structure)

---

## 1. What the Existing Project Was

The project was already a full-stack Node.js app called **TaskFlow**:
- **Frontend**: React 18 + Vite (in `client/`)
- **Backend**: Express.js + Prisma + SQLite (in `server/`)
- **Tests**: Jest (server unit+integration), Vitest (client unit), Playwright (e2e)
- **Old CI/CD**: GitHub Actions workflows for lint/test and EC2 SSH deployment
- **No Terraform, no Docker Compose, no ECS, no ECR**

The server ran on port `3001`, the frontend on port `5173` in dev. The `App.jsx` already had:
```js
const API_URL = import.meta.env.VITE_API_URL || '/api';
```
This means the frontend defaults to `/api` as a relative path — perfect for a combined container.

---

## 2. What We Built On Top

| What | Where |
|------|-------|
| Terraform infrastructure (12 AWS resources) | `terraform/` |
| GitHub Actions 4-phase CI/CD pipeline | `.github/workflows/ecs-deploy.yml` |
| Combined Dockerfile (React + Express in one) | `Dockerfile` (root) |
| Client Dockerfile (Nginx standalone) | `client/Dockerfile` |
| Nginx config (SPA routing + API proxy) | `client/nginx.conf` |
| Docker Compose (local multi-container) | `docker-compose.yml` |
| Express updated to serve frontend | `server/src/index.js` |
| All dockerignore files | root, `server/`, `client/` |
| Documentation | `PIPELINE_GUIDE.md`, `FULL_SETUP_GUIDE.md` |

---

## 3. Step 1 — Install Prerequisites

### Install AWS CLI
```bash
brew update
brew install awscli
aws --version   # verify
```

### Install Terraform
Terraform is NOT in the default Homebrew formula anymore. You must add the HashiCorp tap:
```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
terraform --version   # should show v1.12.x or later
```

> **Common mistake**: Running `npm i terraform` installs a Node.js wrapper package, NOT the Terraform CLI. If you did this, delete the `node_modules/`, `package.json`, `package-lock.json` that got created in the `terraform/` folder.

### Configure AWS Credentials (AWS Academy)
```bash
aws configure
# Enter: Access Key ID, Secret Access Key, region (us-east-1), output (json)

# AWS Academy also requires a session token:
export AWS_SESSION_TOKEN="paste-your-session-token-here"
```
Get credentials from: AWS Academy Lab → AWS Details → Show AWS CLI Credentials

> **Important**: AWS Academy session tokens expire every ~4 hours. When you restart the lab, update your credentials and GitHub Secrets.

---

## 4. Step 2 — Create Terraform Infrastructure Files

Create a `terraform/` folder at the project root with these files:

### `terraform/backend.tf`
Stores Terraform state in S3 so the pipeline remembers what infrastructure exists. **The S3 bucket must be created manually before running terraform init** (see Step 11).

```hcl
terraform {
  backend "s3" {
    bucket       = "taskflow-terraform-state-ronit"
    key          = "ecs-fargate/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
```

> **Why `use_lockfile` not `dynamodb_table`?** Terraform 1.10+ deprecated `dynamodb_table` in the S3 backend. Use `use_lockfile = true` instead. If your pipeline uses Terraform < 1.10 it will fail with "unsupported argument". Make sure the workflow installs Terraform 1.12.0+.

### `terraform/provider.tf`
```hcl
terraform {
  required_version = ">= 1.3.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Auto-fetches your AWS account ID — used to build LabRole ARN
data "aws_caller_identity" "current" {}
```

### `terraform/variables.tf`
```hcl
variable "aws_region"        { default = "us-east-1" }
variable "environment"       { default = "lab" }
variable "project_name"      { default = "taskflow" }
variable "vpc_cidr"          { default = "10.0.0.0/16" }
variable "container_port"    { default = 3001 }
variable "task_cpu"          { default = "512" }
variable "task_memory"       { default = "1024" }
variable "desired_count"     { default = 1 }
variable "health_check_path" { default = "/api/health" }
```

> CPU/memory were set to 512/1024 (not 256/512) because the container serves both frontend static files and the backend API.

### `terraform/terraform.tfvars`
```hcl
aws_region        = "us-east-1"
environment       = "lab"
project_name      = "taskflow"
vpc_cidr          = "10.0.0.0/16"
container_port    = 3001
task_cpu          = "512"
task_memory       = "1024"
desired_count     = 1
health_check_path = "/api/health"
```

### `terraform/vpc.tf`
Creates the VPC with 2 public subnets in different Availability Zones (ALB requires 2 AZs), an Internet Gateway, and route tables.

```hcl
data "aws_availability_zones" "available" { state = "available" }

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "${var.project_name}-vpc", Environment = var.environment }
}

resource "aws_subnet" "public_1" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, 1)
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true
  tags = { Name = "${var.project_name}-public-subnet-1", Environment = var.environment }
}

resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, 2)
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = true
  tags = { Name = "${var.project_name}-public-subnet-2", Environment = var.environment }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.project_name}-igw", Environment = var.environment }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route { cidr_block = "0.0.0.0/0"; gateway_id = aws_internet_gateway.main.id }
  tags   = { Name = "${var.project_name}-public-rt", Environment = var.environment }
}

resource "aws_route_table_association" "public_1" {
  subnet_id      = aws_subnet.public_1.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_2" {
  subnet_id      = aws_subnet.public_2.id
  route_table_id = aws_route_table.public.id
}
```

### `terraform/security_groups.tf`
Two security groups implementing layered access: only the ALB is internet-facing; ECS tasks only accept traffic from the ALB.

```hcl
resource "aws_security_group" "alb" {
  name   = "${var.project_name}-alb-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 80; to_port = 80; protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTP from anywhere"
  }
  egress {
    from_port = 0; to_port = 0; protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${var.project_name}-alb-sg", Environment = var.environment }
}

resource "aws_security_group" "ecs" {
  name   = "${var.project_name}-ecs-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = var.container_port; to_port = var.container_port; protocol = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "Allow traffic only from ALB"
  }
  egress {
    from_port = 0; to_port = 0; protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${var.project_name}-ecs-sg", Environment = var.environment }
}
```

### `terraform/ecr.tf`
Private Docker image registry. `force_delete = true` allows cleanup even when images exist (useful in lab).

```hcl
resource "aws_ecr_repository" "app" {
  name                 = "${var.project_name}-server"
  image_tag_mutability = "MUTABLE"
  force_delete         = true
  image_scanning_configuration { scan_on_push = true }
  tags = { Name = "${var.project_name}-ecr", Environment = var.environment }
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep only last 5 images"
      selection    = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 5 }
      action       = { type = "expire" }
    }]
  })
}
```

### `terraform/iam.tf` — DOES NOT EXIST (AWS Academy restriction)
AWS Academy does **not allow** creating IAM roles or policies. We use the pre-existing `LabRole`. There is no `iam.tf` file. The role ARN is referenced directly in `ecs.tf`:
```
arn:aws:iam::<ACCOUNT_ID>:role/LabRole
```

### `terraform/alb.tf`
Application Load Balancer with health check pointing at `/api/health`.

```hcl
resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_1.id, aws_subnet.public_2.id]
  tags               = { Name = "${var.project_name}-alb", Environment = var.environment }
}

resource "aws_lb_target_group" "app" {
  name        = "${var.project_name}-tg"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"   # Must be "ip" for Fargate awsvpc networking

  health_check {
    enabled             = true
    path                = var.health_check_path
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    matcher             = "200"
  }
  tags = { Name = "${var.project_name}-target-group", Environment = var.environment }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
```

### `terraform/ecs.tf`
ECS cluster, task definition (using `LabRole`), and service with circuit breaker.

```hcl
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"
  setting { name = "containerInsights"; value = "disabled" }
  tags = { Name = "${var.project_name}-cluster", Environment = var.environment }
}

resource "aws_ecs_task_definition" "app" {
  family                   = "${var.project_name}-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory

  # AWS Academy: use pre-existing LabRole — do NOT create new roles
  execution_role_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/LabRole"
  task_role_arn      = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/LabRole"

  container_definitions = jsonencode([{
    name      = "${var.project_name}-container"
    image     = "${aws_ecr_repository.app.repository_url}:latest"
    essential = true
    portMappings = [{ containerPort = var.container_port, hostPort = var.container_port, protocol = "tcp" }]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT",     value = tostring(var.container_port) },
      { name = "DATABASE_URL", value = "file:./data/dev.db" }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
    healthCheck = {
      command     = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:${var.container_port}/api/health || exit 1"]
      interval    = 30; timeout = 5; retries = 3; startPeriod = 60
    }
  }])
}

resource "aws_ecs_service" "app" {
  name            = "${var.project_name}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"
  force_new_deployment = true

  network_configuration {
    subnets          = [aws_subnet.public_1.id, aws_subnet.public_2.id]
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "${var.project_name}-container"
    container_port   = var.container_port
  }

  deployment_circuit_breaker { enable = true; rollback = true }
  depends_on = [aws_lb_listener.http]
}
```

### `terraform/s3.tf`
Application storage bucket — versioned, encrypted, fully private.

```hcl
resource "aws_s3_bucket" "app_storage" {
  bucket        = "${var.project_name}-app-storage-${data.aws_caller_identity.current.account_id}"
  force_destroy = true
  tags = { Name = "${var.project_name}-app-storage", Environment = var.environment }
}

resource "aws_s3_bucket_versioning" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "app_storage" {
  bucket                  = aws_s3_bucket.app_storage.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

### `terraform/cloudwatch.tf`
Log group for ECS container logs — 7-day retention for lab environment.

```hcl
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.project_name}"
  retention_in_days = 7
  tags = { Name = "${var.project_name}-ecs-logs", Environment = var.environment }
}
```

### `terraform/outputs.tf`
```hcl
output "alb_dns_url"           { value = "http://${aws_lb.main.dns_name}" }
output "ecr_repository_url"    { value = aws_ecr_repository.app.repository_url }
output "ecs_cluster_name"      { value = aws_ecs_cluster.main.name }
output "ecs_service_name"      { value = aws_ecs_service.app.name }
output "vpc_id"                { value = aws_vpc.main.id }
output "s3_bucket_name"        { value = aws_s3_bucket.app_storage.id }
output "cloudwatch_log_group"  { value = aws_cloudwatch_log_group.ecs.name }
output "lab_role_arn"          { value = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/LabRole" }
```

---

## 5. Step 3 — Update the Server Dockerfile

The existing `server/Dockerfile` was updated to a proper multi-stage production build with a **non-root user** and **HEALTHCHECK**:

```dockerfile
# Stage 1: Build (install all deps + generate Prisma client)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci && npx prisma generate
COPY src ./src/

# Stage 2: Production (copy only what's needed)
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache wget
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL="file:./data/dev.db"

RUN mkdir -p ./data && chown -R appuser:appgroup /app
USER appuser
RUN npx prisma db push --skip-generate 2>/dev/null || true

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "src/index.js"]
```

---

## 6. Step 4 — Create the Combined Root Dockerfile (for ECS)

This is the key file used by the CI/CD pipeline and ECS. It lives at the **project root** (not inside `server/` or `client/`). It builds the React frontend and embeds it inside the Express server container — one image, one port, one ECS task.

```dockerfile
# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Install backend production deps
FROM node:20-alpine AS backend-builder
WORKDIR /app/server
COPY server/package*.json ./
COPY server/prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

# Stage 3: Final production image
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache wget
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

# Copy backend
COPY --from=backend-builder /app/server/node_modules ./node_modules
COPY --from=backend-builder /app/server/node_modules/.prisma ./node_modules/.prisma
COPY server/src ./src
COPY server/prisma ./prisma
COPY server/package*.json ./

# Copy frontend build into Express's public directory
COPY --from=frontend-builder /app/client/dist ./public

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL="file:./data/dev.db"

RUN mkdir -p ./data && chown -R appuser:appgroup /app
USER appuser
RUN npx prisma db push --skip-generate 2>/dev/null || true

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "src/index.js"]
```

---

## 7. Step 5 — Create the Client Dockerfile (Nginx)

`client/Dockerfile` — for running frontend standalone with Nginx (used in Docker Compose local dev):

```dockerfile
# Stage 1: Build React
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

`client/nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Docker's internal DNS resolver (required so Nginx resolves
    # service names at runtime, not just at startup — prevents crashes
    # when the backend container isn't ready yet)
    resolver 127.0.0.11 valid=10s;

    # SPA routing: serve index.html for all unknown paths
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy /api/* to backend container
    # "server" resolves to the backend container via Docker Compose DNS
    location /api/ {
        set $backend "http://server:3001";
        proxy_pass $backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache static assets for 1 year
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 256;
}
```

---

## 8. Step 6 — Create Docker Compose for Local Dev

`docker-compose.yml` at project root — runs both frontend and backend together locally:

```yaml
services:
  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: taskflow-server
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DATABASE_URL=file:./data/dev.db
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    container_name: taskflow-client
    ports:
      - "8080:80"
    depends_on:
      server:
        condition: service_healthy
```

To run:
```bash
docker compose up --build
# Frontend: http://localhost:8080
# Backend:  http://localhost:3001
```

---

## 9. Step 7 — Update Express to Serve Frontend

`server/src/index.js` was updated to serve the React build (in `./public/`) as static files and add a SPA fallback route:

```js
const express = require('express');
const path = require('path');       // ← added
const cors = require('cors');
const taskRoutes = require('./routes/tasks');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', methods: ['GET','POST','PUT','DELETE'], allowedHeaders: ['Content-Type'] }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/tasks', taskRoutes);

// Serve React frontend static build
const clientBuildPath = path.join(__dirname, '..', 'public');
app.use(express.static(clientBuildPath));

// SPA fallback — all non-API routes return index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`TaskFlow server running on port ${PORT}`));
}

module.exports = app;
```

---

## 10. Step 8 — Create GitHub Actions CI/CD Workflow

`.github/workflows/ecs-deploy.yml` — the full 4-phase pipeline:

```yaml
name: ECS Fargate CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  AWS_REGION: ${{ secrets.AWS_REGION || 'us-east-1' }}  # fallback if secret missing
  ECR_REPOSITORY: taskflow-server
  ECS_CLUSTER: taskflow-cluster
  ECS_SERVICE: taskflow-service
  CONTAINER_NAME: taskflow-container

jobs:
  # PHASE 1: Run all tests — pipeline stops if any fail
  test:
    name: "Phase 1 - Run Tests"
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Cache server node_modules
        uses: actions/cache@v4
        with:
          path: server/node_modules
          key: server-deps-${{ hashFiles('server/package-lock.json') }}

      - name: Cache client node_modules
        uses: actions/cache@v4
        with:
          path: client/node_modules
          key: client-deps-${{ hashFiles('client/package-lock.json') }}

      - uses: actions/setup-node@v4
        with: { node-version: 20 }

      - run: npm ci
        working-directory: ./server
      - run: npx prisma generate
        working-directory: ./server
      - run: npm run lint
        working-directory: ./server
      - run: npx prisma db push
        working-directory: ./server
        env: { DATABASE_URL: "file:./test.db" }
      - run: npm run test:unit
        working-directory: ./server
        env: { DATABASE_URL: "file:./test.db" }
      - run: npm run test:integration
        working-directory: ./server
        env: { DATABASE_URL: "file:./test.db" }

      - run: npm ci
        working-directory: ./client
      - run: npm run lint
        working-directory: ./client
      - run: npm test
        working-directory: ./client

  # PHASE 2: Terraform — only on push to main (not PRs)
  terraform:
    name: "Phase 2 - Terraform Apply"
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    defaults:
      run:
        working-directory: ./terraform
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-session-token: ${{ secrets.AWS_SESSION_TOKEN }}
          aws-region: ${{ secrets.AWS_REGION || 'us-east-1' }}

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.12.0   # Must be >=1.10 for use_lockfile support

      - run: terraform init
        env: { TF_LOG: INFO }
      - run: terraform validate
      - run: terraform plan -out=tfplan -no-color
      - run: terraform apply -auto-approve tfplan

  # PHASE 3: Docker build and push to ECR
  docker-build-push:
    name: "Phase 3 - Docker Build & Push"
    runs-on: ubuntu-latest
    needs: terraform
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-session-token: ${{ secrets.AWS_SESSION_TOKEN }}
          aws-region: ${{ secrets.AWS_REGION || 'us-east-1' }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          # Build from project root (not ./server) — uses root Dockerfile
          docker build \
            -t $ECR_REGISTRY/$ECR_REPOSITORY:latest \
            -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
            .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

  # PHASE 4: Deploy to ECS Fargate
  deploy-ecs:
    name: "Phase 4 - Deploy to ECS Fargate"
    runs-on: ubuntu-latest
    needs: docker-build-push
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-session-token: ${{ secrets.AWS_SESSION_TOKEN }}
          aws-region: ${{ secrets.AWS_REGION || 'us-east-1' }}

      - name: Get current task definition
        run: aws ecs describe-task-definition --task-definition taskflow-task --query 'taskDefinition' --output json > task-def.json

      - name: Update image in task definition
        run: |
          ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
          ECR_IMAGE="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:${{ github.sha }}"
          cat task-def.json | jq --arg IMAGE "$ECR_IMAGE" \
            '.containerDefinitions[0].image = $IMAGE | del(.taskDefinitionArn,.revision,.status,.requiresAttributes,.compatibilities,.registeredAt,.registeredBy)' \
            > new-task-def.json

      - name: Register new task definition
        id: register-task-def
        run: |
          ARN=$(aws ecs register-task-definition --cli-input-json file://new-task-def.json --query 'taskDefinition.taskDefinitionArn' --output text)
          echo "task_def_arn=$ARN" >> $GITHUB_OUTPUT

      - name: Update ECS service
        run: |
          aws ecs update-service --cluster $ECS_CLUSTER --service $ECS_SERVICE \
            --task-definition ${{ steps.register-task-def.outputs.task_def_arn }} \
            --force-new-deployment

      - name: Wait for stability
        run: aws ecs wait services-stable --cluster $ECS_CLUSTER --services $ECS_SERVICE
```

---

## 11. Step 9 — Create .dockerignore Files

### Root `.dockerignore` (for combined Dockerfile)
```
**/node_modules
.git
.gitignore
*.md
*.pdf
terraform/
ecs/
iam/
scripts/
.github/
**/.env
**/.env.*
**/*.db
**/*.db-journal
server/tests/
client/tests/
client/e2e/
**/coverage/
**/test-results/
**/playwright-report/
client/dist/
docker-compose.yml
Dockerfile
.DS_Store
render.yaml
```

### `server/.dockerignore`
```
node_modules
npm-debug.log*
.env
.env.*
*.db
*.db-journal
prisma/*.db
tests/
.eslintrc*
.prettierrc
.git
.gitignore
coverage/
README.md
```

### `client/.dockerignore`
```
node_modules
dist
coverage
test-results
playwright-report
e2e/
tests/
.eslintrc*
.prettierrc
.git
.gitignore
*.md
```

---

## 12. Step 10 — Update .gitignore

```gitignore
# Dependencies
node_modules/
.npm-cache/

# Build outputs
dist/
build/

# Environment files
.env
.env.*

# Database
*.db
*.db-journal

# OS files
.DS_Store
Thumbs.db

# Test outputs
coverage/
test-results/
playwright-report/

# Terraform — NEVER commit these
terraform/.terraform/
terraform/.terraform.lock.hcl
terraform/tfplan
terraform/*.tfplan
terraform/terraform.tfstate
terraform/terraform.tfstate.backup
*.tfstate
*.tfstate.backup
.terraform/

# Docker
docker-compose.override.yml

# IDE
.vscode/
.idea/
```

---

## 13. Step 11 — One-Time AWS Setup (Before Pipeline)

These steps must be done **once** manually before the pipeline can run. After this, the pipeline handles everything automatically.

### Create the S3 State Bucket
```bash
aws s3api create-bucket \
  --bucket taskflow-terraform-state-ronit \
  --region us-east-1

aws s3api put-bucket-versioning \
  --bucket taskflow-terraform-state-ronit \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket taskflow-terraform-state-ronit \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }'
```

> **If you change the project name**, update the bucket name in `terraform/backend.tf` to match.

### Set GitHub Secrets
Go to: GitHub repo → Settings → Secrets and variables → Actions → New repository secret

| Secret Name | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | From AWS Academy → AWS Details → Show CLI Credentials |
| `AWS_SECRET_ACCESS_KEY` | From AWS Academy → AWS Details → Show CLI Credentials |
| `AWS_SESSION_TOKEN` | From AWS Academy → AWS Details → Show CLI Credentials |
| `AWS_REGION` | `us-east-1` (optional — workflow defaults to this if missing) |

### Test terraform locally
```bash
cd terraform
terraform init
terraform validate
terraform plan
terraform apply -auto-approve
```

---

## 14. Step 12 — Push Image to ECR Manually

After running `terraform apply`, ECR exists but is empty. The pipeline fills it, but you can also push manually:

```bash
# Get your AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# CRITICAL: Build for linux/amd64 — ECS Fargate is amd64 even on Apple Silicon Macs
docker build --platform linux/amd64 \
  -t $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/taskflow-server:latest \
  .

# Push
docker push $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/taskflow-server:latest

# Force ECS to redeploy with the new image
aws ecs update-service \
  --cluster taskflow-cluster \
  --service taskflow-service \
  --force-new-deployment \
  --region us-east-1

# Wait for it to stabilize
aws ecs wait services-stable \
  --cluster taskflow-cluster \
  --services taskflow-service \
  --region us-east-1
```

---

## 15. Bugs We Hit and How We Fixed Them

### Bug 1: `zsh: command not found: aws`
**Cause**: AWS CLI was not installed.
**Fix**: `brew install awscli`

### Bug 2: `zsh: command not found: terraform` after `npm i terraform`
**Cause**: `npm i terraform` installs a JavaScript wrapper package, not the real Terraform CLI.
**Fix**:
```bash
# Remove npm package
rm -rf terraform/node_modules terraform/package.json terraform/package-lock.json
# Install real Terraform
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

### Bug 3: `S3 bucket does not exist` on terraform init
**Cause**: The backend S3 bucket must be created manually before `terraform init` can connect to it.
**Fix**: Create the bucket using `aws s3api create-bucket` (see Step 11).

### Bug 4: `use_lockfile is not expected here` in pipeline
**Cause**: The pipeline was installing Terraform 1.7.0 which doesn't support `use_lockfile`.
**Fix**: Updated workflow to `terraform_version: 1.12.0`.

### Bug 5: ALB returned 503 (site unreachable)
**Cause**: The ECR repository was empty — no image had been pushed. ECS couldn't pull an image, so no tasks ran, and the ALB had no healthy targets.
**Fix**: Push the Docker image to ECR (Step 12).

### Bug 6: `image Manifest does not contain descriptor matching platform 'linux/amd64'`
**Cause**: Built the Docker image on an Apple Silicon Mac (ARM64). ECS Fargate runs on `linux/amd64`. The manifest didn't include an AMD64 variant.
**Fix**: Always build with `--platform linux/amd64` when pushing to ECR from a Mac:
```bash
docker build --platform linux/amd64 -t ... .
```

### Bug 7: Frontend showed React UI but `/api/tasks` returned 502 (Bad Gateway)
**Cause**: The `client/` container (Nginx) had `proxy_pass http://localhost:3001` in `nginx.conf`. Inside a Docker container, `localhost` refers to the container itself, not the host machine or another container.
**Fix**: Changed `nginx.conf` to use the Docker Compose service name:
```nginx
resolver 127.0.0.11 valid=10s;  # Docker's internal DNS
set $backend "http://server:3001";
proxy_pass $backend;
```
The `resolver 127.0.0.11` directive forces Nginx to resolve hostnames at request time, not at startup — this prevents Nginx from crashing if the backend container isn't ready yet.

### Bug 8: Port 3001 already in use when starting `docker run`
**Cause**: The local `npm run dev` server was running on port 3001.
**Fix**: Kill the local server first, then use Docker Compose (which manages port allocation for both containers).

### Bug 9: `Input required and not supplied: aws-region` in GitHub Actions
**Cause**: The `AWS_REGION` GitHub Secret was not set. The workflow used `${{ secrets.AWS_REGION }}` which resolves to empty string.
**Fix**: Added a fallback in the workflow: `${{ secrets.AWS_REGION || 'us-east-1' }}` — this uses `us-east-1` if the secret is missing.

---

## 16. Final Verified Working State

After everything was done, these commands returned successful responses:

```bash
# API health check
curl http://taskflow-alb-1054308663.us-east-1.elb.amazonaws.com/api/health
# → {"status":"ok","timestamp":"2026-05-08T08:31:03.207Z"}

# Frontend
curl -s -o /dev/null -w "%{http_code}" http://taskflow-alb-1054308663.us-east-1.elb.amazonaws.com/
# → 200

# ECS service status
aws ecs describe-services --cluster taskflow-cluster --services taskflow-service \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}'
# → { "Status": "ACTIVE", "Running": 1, "Desired": 1 }
```

**Live URL**: `http://taskflow-alb-1054308663.us-east-1.elb.amazonaws.com/`
> Note: Use `http://` not `https://` — no SSL certificate is configured.

---

## 17. Final Project File Structure

```
Devops-project/
├── .github/
│   ├── dependabot.yml
│   └── workflows/
│       ├── ecs-deploy.yml          ← NEW: 4-phase ECS CI/CD pipeline
│       ├── ci.yml                  ← existing
│       ├── deploy.yml              ← existing (EC2)
│       └── pr-checks.yml          ← existing
├── client/
│   ├── src/                        ← React components (unchanged)
│   ├── tests/                      ← Vitest unit tests (unchanged)
│   ├── e2e/                        ← Playwright tests (unchanged)
│   ├── Dockerfile                  ← NEW: Nginx frontend container
│   ├── nginx.conf                  ← NEW: SPA routing + API proxy
│   ├── .dockerignore               ← NEW
│   ├── package.json                ← unchanged
│   └── vite.config.js              ← unchanged
├── server/
│   ├── src/
│   │   ├── index.js                ← UPDATED: serves React static files
│   │   ├── routes/tasks.js         ← unchanged
│   │   └── middleware/             ← unchanged
│   ├── prisma/schema.prisma        ← unchanged
│   ├── tests/                      ← unchanged
│   ├── Dockerfile                  ← UPDATED: non-root user + healthcheck
│   └── .dockerignore               ← NEW
├── terraform/
│   ├── backend.tf                  ← NEW: S3 remote state
│   ├── provider.tf                 ← NEW: AWS provider v6.0
│   ├── variables.tf                ← NEW
│   ├── terraform.tfvars            ← NEW
│   ├── vpc.tf                      ← NEW
│   ├── security_groups.tf          ← NEW
│   ├── ecr.tf                      ← NEW
│   ├── alb.tf                      ← NEW
│   ├── ecs.tf                      ← NEW (uses LabRole)
│   ├── s3.tf                       ← NEW
│   ├── cloudwatch.tf               ← NEW
│   └── outputs.tf                  ← NEW
├── ecs/
│   └── task-definition.json        ← NEW: documentation reference
├── iam/
│   └── policies.json               ← NEW: LabRole documentation
├── scripts/                        ← unchanged
├── Dockerfile                      ← NEW: combined frontend+backend (used by ECS)
├── docker-compose.yml              ← NEW: local multi-container dev
├── .dockerignore                   ← NEW: root-level for combined Dockerfile
├── .gitignore                      ← UPDATED: added Terraform entries
├── README.md                       ← UPDATED: full rewrite
├── PIPELINE_GUIDE.md               ← NEW: detailed pipeline docs
└── FULL_SETUP_GUIDE.md             ← NEW: this file
```

---

## Cleanup

To destroy all AWS infrastructure when done:
```bash
cd terraform
terraform destroy -auto-approve
```

To remove local Docker containers:
```bash
docker compose down --rmi all
```
