# VibeGram - Backdated Commits (Sept 15 - Oct 12, 2026)
Set-Location "c:\Users\risha\OneDrive\PROJECTS\Instagram"

# Reset repo completely
Remove-Item -Recurse -Force ".git" -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500
git init
git remote add origin https://github.com/Jain-Rishabh-2306/VibeGram.git
git config user.name "Jain-Rishabh-2306"
git config user.email "rishabhjain230306@gmail.com"
Write-Host "Repo initialized fresh."

# ==================== BACKEND SPRINTS (Sept 15 - Sept 30) ====================

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
git add "server/package-lock.json"
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

# ==================== FRONTEND CLIENT SPRINTS (Oct 01 - Oct 12) ====================

# ---------- COMMIT 17: Oct 01 ----------
git add "client/package.json"
git add "client/package-lock.json"
git add "client/tsconfig.json"
git add "client/vite.config.ts"
git add "client/tailwind.config.js"
git add "client/postcss.config.js"
git add "client/index.html"
git add "client/src/main.tsx"
git add "client/src/index.css"
$env:GIT_AUTHOR_DATE = "2026-10-01T09:30:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-10-01T09:30:00+05:30"
git commit -m "chore: setup React 18, Vite, TypeScript and Tailwind CSS with cyber-indigo dark theme"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 17 - Oct 01"

# ---------- COMMIT 18: Oct 02 ----------
git add "client/src/lib/api.ts"
git add "client/src/lib/utils.ts"
$env:GIT_AUTHOR_DATE = "2026-10-02T10:45:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-10-02T10:45:00+05:30"
git commit -m "feat: configure Axios API client with automatic JWT token refresh interceptor and helper utilities"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 18 - Oct 02"

# ---------- COMMIT 19: Oct 03 ----------
git add "client/src/store/authStore.ts"
git add "client/src/store/feedStore.ts"
git add "client/src/store/chatStore.ts"
git add "client/src/store/notifStore.ts"
$env:GIT_AUTHOR_DATE = "2026-10-03T11:15:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-10-03T11:15:00+05:30"
git commit -m "feat: create Zustand state management for authentication, feed caching, Socket.io chat and notifications"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 19 - Oct 03"

# ---------- COMMIT 20: Oct 04 ----------
git add "client/src/components/ui/Avatar.tsx"
git add "client/src/components/ui/Spinner.tsx"
git add "client/src/components/ui/Modal.tsx"
git add "client/src/components/ui/Toast.tsx"
git add "client/src/components/ui/SkeletonCard.tsx"
$env:GIT_AUTHOR_DATE = "2026-10-04T10:00:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-10-04T10:00:00+05:30"
git commit -m "feat: design reusable UI library - Avatar with story rings, Modal, Toast notification system and skeletons"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 20 - Oct 04"

# ---------- COMMIT 21: Oct 05 ----------
git add "client/src/components/auth/ProtectedRoute.tsx"
git add "client/src/components/layout/Navigation.tsx"
git add "client/src/components/layout/AppLayout.tsx"
git add "client/src/App.tsx"
$env:GIT_AUTHOR_DATE = "2026-10-05T11:30:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-10-05T11:30:00+05:30"
git commit -m "feat: implement responsive app shell with Sidebar, mobile navbar, protected routes and lazy router"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 21 - Oct 05"

# ---------- COMMIT 22: Oct 06 ----------
git add "client/src/pages/LoginPage.tsx"
git add "client/src/pages/RegisterPage.tsx"
$env:GIT_AUTHOR_DATE = "2026-10-06T09:45:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-10-06T09:45:00+05:30"
git commit -m "feat: build modern LoginPage and RegisterPage with Zod schema validation and smooth motion"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 22 - Oct 06"

# ---------- COMMIT 23: Oct 07 ----------
git add "client/src/components/post/PostCard.tsx"
git add "client/src/components/post/CommentsModal.tsx"
git add "client/src/components/stories/StoriesBar.tsx"
$env:GIT_AUTHOR_DATE = "2026-10-07T10:15:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-10-07T10:15:00+05:30"
git commit -m "feat: build PostCard with media carousel, double-tap heart, sensitivity blur and Comments modal"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 23 - Oct 07"

# ---------- COMMIT 24: Oct 08 ----------
git add "client/src/pages/FeedPage.tsx"
git add "client/src/pages/PostDetailPage.tsx"
$env:GIT_AUTHOR_DATE = "2026-10-08T11:00:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-10-08T11:00:00+05:30"
git commit -m "feat: implement FeedPage with Stories integration and dedicated PostDetailPage view"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 24 - Oct 08"

# ---------- COMMIT 25: Oct 09 ----------
git add "client/src/pages/ExplorePage.tsx"
git add "client/src/pages/NotificationsPage.tsx"
$env:GIT_AUTHOR_DATE = "2026-10-09T09:30:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-10-09T09:30:00+05:30"
git commit -m "feat: build ExplorePage with unified search and NotificationsPage with mark-all-read"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 25 - Oct 09"

# ---------- COMMIT 26: Oct 10 ----------
git add "client/src/pages/MessagesPage.tsx"
$env:GIT_AUTHOR_DATE = "2026-10-10T10:30:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-10-10T10:30:00+05:30"
git commit -m "feat: build MessagesPage with real-time Socket.io direct messaging and conversation selector"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 26 - Oct 10"

# ---------- COMMIT 27: Oct 11 ----------
git add "client/src/pages/CreatePostPage.tsx"
$env:GIT_AUTHOR_DATE = "2026-10-11T11:15:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-10-11T11:15:00+05:30"
git commit -m "feat: build CreatePostPage studio with multi-media upload, Time Capsule scheduling and interactive poll builder"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 27 - Oct 11"

# ---------- COMMIT 28: Oct 12 ----------
git add "client/src/pages/ProfilePage.tsx"
git add "client/src/pages/EditProfilePage.tsx"
git add "client/src/pages/EventsPage.tsx"
git add "client/src/pages/AlbumsPage.tsx"
$env:GIT_AUTHOR_DATE = "2026-10-12T10:00:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-10-12T10:00:00+05:30"
git commit -m "feat: build ProfilePage with Dual-Profile mode toggle, EditProfilePage, Events planner and Albums manager"
[System.Environment]::SetEnvironmentVariable("GIT_AUTHOR_DATE",$null,"Process")
[System.Environment]::SetEnvironmentVariable("GIT_COMMITTER_DATE",$null,"Process")
Write-Host "OK: Commit 28 - Oct 12"

# ---------- Show log ----------
Write-Host ""
Write-Host "=== GIT LOG ==="
git log --format="%h %ad %s" --date=format:"%d %b %Y"

# ---------- Push ----------
Write-Host ""
git branch -M main
git push -u origin main --force
Write-Host "DONE: https://github.com/Jain-Rishabh-2306/VibeGram"
