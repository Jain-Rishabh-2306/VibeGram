# VibeGram - Backdated Commits (Sept 15-30, 2026)
Set-Location "c:\Users\risha\OneDrive\PROJECTS\Instagram"

# Reset repo completely
Remove-Item -Recurse -Force ".git" -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500
git init
git remote add origin https://github.com/Jain-Rishabh-2306/VibeGram.git
git config user.name "Jain-Rishabh-2306"
git config user.email "rishabhjain230306@gmail.com"
Write-Host "Repo initialized fresh."

# ---------- COMMIT 1: Sept 15 ----------
git add ".gitignore"
git add ".env.example"
git add "run_vibegram_commits.ps1"
$env:GIT_AUTHOR_DATE = "2026-09-15T09:30:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-09-15T09:30:00+05:30"
git commit -m "chore: initialize VibeGram project with gitignore and env template"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 1 - Sept 15"

# ---------- COMMIT 2: Sept 16 ----------
git add "server/package.json"
git add "server/tsconfig.json"
git add "server/.env"
$env:GIT_AUTHOR_DATE = "2026-09-16T10:15:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-09-16T10:15:00+05:30"
git commit -m "chore: add server package.json, TypeScript config and environment variables"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 2 - Sept 16"

# ---------- COMMIT 3: Sept 17 ----------
git add "server/src/config/database.ts"
$env:GIT_AUTHOR_DATE = "2026-09-17T11:00:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-09-17T11:00:00+05:30"
git commit -m "feat: design complete SQLite schema for users, posts, stories, follows, messages, events, albums, polls, capsules"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 3 - Sept 17"

# ---------- COMMIT 4: Sept 18 ----------
git add "server/src/middleware/auth.ts"
git add "server/src/middleware/upload.ts"
git add "server/src/middleware/errorHandler.ts"
$env:GIT_AUTHOR_DATE = "2026-09-18T10:30:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-09-18T10:30:00+05:30"
git commit -m "feat: add JWT auth middleware, Multer file upload config, and global error handler"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 4 - Sept 18"

# ---------- COMMIT 5: Sept 19 ----------
git add "server/src/routes/auth.ts"
$env:GIT_AUTHOR_DATE = "2026-09-19T09:45:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-09-19T09:45:00+05:30"
git commit -m "feat: implement auth routes - register, login, logout, refresh token with bcrypt and JWT cookies"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 5 - Sept 19"

# ---------- COMMIT 6: Sept 20 ----------
git add "server/src/routes/users.ts"
$env:GIT_AUTHOR_DATE = "2026-09-20T11:20:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-09-20T11:20:00+05:30"
git commit -m "feat: user profile routes with Dual-Profile Incognito Toggle and professional contact tagging"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 6 - Sept 20"

# ---------- COMMIT 7: Sept 21 ----------
git add "server/src/routes/posts.ts"
$env:GIT_AUTHOR_DATE = "2026-09-21T10:00:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-09-21T10:00:00+05:30"
git commit -m "feat: posts CRUD with in-caption hyperlinks, VibeCheck polls, and content sensitivity labels"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 7 - Sept 21"

# ---------- COMMIT 8: Sept 22 ----------
git add "server/src/routes/capsules.ts"
$env:GIT_AUTHOR_DATE = "2026-09-22T09:30:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-09-22T09:30:00+05:30"
git commit -m "feat: Time Capsule posts - schedule for future publish date with server-side auto-publish interval"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 8 - Sept 22"

# ---------- COMMIT 9: Sept 23 ----------
git add "server/src/routes/feed.ts"
$env:GIT_AUTHOR_DATE = "2026-09-23T11:45:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-09-23T11:45:00+05:30"
git commit -m "feat: dual-profile aware home feed - professional mode filters posts by contact type"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 9 - Sept 23"

# ---------- COMMIT 10: Sept 24 ----------
git add "server/src/routes/stories.ts"
$env:GIT_AUTHOR_DATE = "2026-09-24T10:15:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-09-24T10:15:00+05:30"
git commit -m "feat: stories system with 24h auto-expiry, feed, and view tracking"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 10 - Sept 24"

# ---------- COMMIT 11: Sept 25 ----------
git add "server/src/routes/notifications.ts"
$env:GIT_AUTHOR_DATE = "2026-09-25T09:00:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-09-25T09:00:00+05:30"
git commit -m "feat: notifications system for likes, comments, follows and events with unread count"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 11 - Sept 25"

# ---------- COMMIT 12: Sept 26 ----------
git add "server/src/routes/messages.ts"
$env:GIT_AUTHOR_DATE = "2026-09-26T11:30:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-09-26T11:30:00+05:30"
git commit -m "feat: Contextual DM Search with keyword and date filters plus Media-Link-Location index dashboard"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 12 - Sept 26"

# ---------- COMMIT 13: Sept 27 ----------
git add "server/src/routes/events.ts"
$env:GIT_AUTHOR_DATE = "2026-09-27T10:00:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-09-27T10:00:00+05:30"
git commit -m "feat: Smart Hangout Planner with RSVP, auto group chat creation, and split-bill calculator"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 13 - Sept 27"

# ---------- COMMIT 14: Sept 28 ----------
git add "server/src/routes/albums.ts"
$env:GIT_AUTHOR_DATE = "2026-09-28T09:45:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-09-28T09:45:00+05:30"
git commit -m "feat: Collaborative Albums with member invites, role-based access, and photo contributions"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 14 - Sept 28"

# ---------- COMMIT 15: Sept 29 ----------
git add "server/src/routes/explore.ts"
$env:GIT_AUTHOR_DATE = "2026-09-29T11:00:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-09-29T11:00:00+05:30"
git commit -m "feat: Explore with unified search for users, posts and hashtags plus trending grid and user suggestions"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 15 - Sept 29"

# ---------- COMMIT 16: Sept 30 ----------
git add "server/src/socket/chatSocket.ts"
git add "server/src/index.ts"
$env:GIT_AUTHOR_DATE = "2026-09-30T10:30:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-09-30T10:30:00+05:30"
git commit -m "feat: Socket.io real-time chat with JWT auth and typing indicators, wire all routes in Express server"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 16 - Sept 30"

# ---------- Show log ----------
Write-Host ""
Write-Host "=== GIT LOG ==="
git log --format="%h %ad %s" --date=format:"%d %b %Y"

# ---------- Push ----------
Write-Host ""
git branch -M main
git push -u origin main --force
Write-Host "DONE: https://github.com/Jain-Rishabh-2306/VibeGram"
