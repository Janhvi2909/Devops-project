# AWS EC2 + GitHub Actions — Step-by-step

Your project **already implements** automated deployment:

| Piece | Location | What it does |
|-------|----------|----------------|
| GitHub → EC2 SSH | [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) | On every push to `main` (or manual run), connects to EC2 and runs deploy commands |
| First-time server setup | [`scripts/bootstrap-ec2.sh`](scripts/bootstrap-ec2.sh) | Node 20, Git, PM2, swap (idempotent) |
| Deploy / restart | [`scripts/deploy.sh`](scripts/deploy.sh) | `git pull`, `npm ci`, Prisma, client build, **PM2 start/restart** `taskflow-server` |

**Rubric level “Full”** = this workflow runs successfully with secrets configured and EC2 reachable.

---

## Prerequisites

- AWS account
- Your repo pushed to GitHub: [Janhvi2909/Devops-project](https://github.com/Janhvi2909/Devops-project) (or your fork)
- Local terminal with `ssh` (optional, for testing)

---

## Step 1 — Create an EC2 instance

1. **AWS Console** → EC2 → **Launch instance**
2. **Name:** e.g. `taskflow-deploy`
3. **AMI:** Ubuntu Server **22.04 LTS** (matches `bootstrap-ec2.sh` / `apt-get`)
4. **Instance type:** `t2.micro` or `t3.micro` (free tier eligible if applicable)
5. **Key pair:** Create or select a key pair → download the `.pem` file (you need it for SSH and for GitHub Secrets)

---

## Step 2 — Security group (network)

Edit the instance’s security group **Inbound rules**:

| Type | Port | Source | Purpose |
|------|------|--------|---------|
| SSH | 22 | Your IP, or `0.0.0.0/0` (only for testing; lock down later) | GitHub Actions + your SSH |
| Custom TCP | 3001 | `0.0.0.0/0` or your IP | Express API (if you test from browser/Postman) |

> **Note:** GitHub Actions runners use **dynamic IPs**. If SSH from Actions fails with “connection refused”, ensure port **22** is open to the internet **temporarily** for class demos, or use a fixed runner / self-hosted runner / VPN — your teacher may accept opening `22` for the assignment window.

---

## Step 3 — Get EC2 connection details

- **Host:** Public IPv4 address of the instance (e.g. `54.123.45.67`) → this is `EC2_HOST`
- **User:** For Ubuntu AMI, use **`ubuntu`** → this is `EC2_USER`

---

## Step 4 — Test SSH from your laptop (recommended)

```bash
chmod 400 /path/to/your-key.pem
ssh -i /path/to/your-key.pem ubuntu@YOUR_PUBLIC_IP
```

If this works, EC2 and the key are correct before relying on GitHub Actions.

---

## Step 5 — Add GitHub Secrets

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret name | Value |
|-------------|--------|
| `EC2_HOST` | Public IPv4 (e.g. `54.123.45.67`) |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | **Entire contents** of the **private** `.pem` file (including `-----BEGIN ...-----` lines) |

Paste the PEM **exactly** — no extra spaces; multiline is OK in GitHub’s secret field.

---

## Step 6 — Trigger deployment

**Automatic:** Push any commit to `main` → **Actions** tab → workflow **Deploy to EC2** runs.

**Manual:** Actions → **Deploy to EC2** → **Run workflow** (`workflow_dispatch` is enabled in `deploy.yml`).

On the EC2 instance the workflow:

1. `cd ~/taskflow` or clones `https://github.com/<owner>/<repo>.git`
2. `git pull origin main`
3. Runs `scripts/bootstrap-ec2.sh` then `scripts/deploy.sh`
4. **`deploy.sh`** restarts the API with **PM2** (`taskflow-server`)

Check on the server after a successful run:

```bash
ssh -i your-key.pem ubuntu@YOUR_IP
pm2 list
curl -s http://127.0.0.1:3001/api/health
```

---

## Step 7 — Troubleshooting

| Problem | What to check |
|---------|----------------|
| SSH step fails in Actions | Secrets names exact (`EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`); PEM full content; security group allows **22** |
| `git pull` fails on EC2 | Repo is public **or** configure deploy key / token for private repos |
| `pm2` not found | Re-run bootstrap or `sudo npm install -g pm2` |
| App not reachable on 3001 | Security group inbound **3001**; server binding `0.0.0.0` (check `server/src/index.js`) |

---

## What counts as “implemented” for grading

- **Full:** Push to `main` → Actions deploy job **green** → EC2 shows updated code and `pm2` running the server.
- **Partial:** You SSH manually and run `scripts/deploy.sh` without Actions.
- **None:** No workflow and no EC2 usage.

You already have the **code + workflow** for **Full**; you only need **AWS + secrets + network** configured.
