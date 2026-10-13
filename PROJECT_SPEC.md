# VibeGram — Project Specification & Architecture

## 📌 Project Overview

- **Project Name:** VibeGram
- **Tagline:** *Express your vibe, beyond the grid.*
- **Concept:** An Instagram-inspired modern social media platform with a distinctive cyber dark-neon aesthetic, unique UX patterns, and several practical real-world features not present in Instagram.

---

## 🎨 Design & Aesthetic Theme

- **Style:** Dark Neon / Glassmorphism
- **Color Palette:**
  - **Background:** `#0F172A` (Deep Cyber Slate)
  - **Surface:** `#1E293B` / Surface Light: `#334155`
  - **Primary (Vibe Brand):** `#A855F7` (Neon Purple)
  - **Secondary (Accents):** `#06B6D4` (Electric Cyan)
  - **Accent / Hearts:** `#F43F5E` (Vivid Rose/Pink)
  - **Typography:** *Inter* & *Plus Jakarta Sans*
- **Visual Features:**
  - Story Rings with gradient borders (`#A855F7` → `#06B6D4` → `#F43F5E`)
  - Double-tap glowing floating heart animations
  - Glassmorphic card borders and subtle glow drop-shadows
  - Shimmer loading skeletons

---

## 🛠️ Complete Tech Stack

### Frontend (`/client`)
| Technology | Role |
|---|---|
| **React 18 + Vite** | High-performance SPA frontend & bundling |
| **TypeScript** | Strict end-to-end type safety |
| **Tailwind CSS v3** | Responsive utility styling with custom design system |
| **Zustand** | Lightweight reactive state stores (`authStore`, `feedStore`, `chatStore`, `notifStore`) |
| **React Router v6** | Client-side routing with `ProtectedRoute` & `GuestRoute` |
| **React Hook Form + Zod** | Form validation for login, register, profile editing |
| **Axios** | HTTP client with automatic 401 JWT refresh interceptor |
| **Socket.io-client** | Real-time direct chat & typing indicators |
| **Lucide React** | Feather-style vector icon library |
| **Framer Motion** | Page transitions, modals, and spring micro-interactions |

### Backend (`/server`)
| Technology | Role |
|---|---|
| **Node.js + Express** | RESTful API server with TypeScript (`tsx`) |
| **TypeScript** | Typed controllers, routes, middleware, and schemas |
| **SQLite (`@libsql/client`)** | Embedded SQL database with relational schema |
| **JWT (`jsonwebtoken`)** | Dual-token authentication (Access + Refresh tokens) |
| **bcryptjs** | Salted password hashing (cost factor 12) |
| **Multer** | Multipart image and media upload management |
| **Socket.io** | WebSocket server for bi-directional live chat |
| **Helmet & CORS** | Security headers & cross-origin credentials configuration |
| **express-rate-limit** | DDoS and brute-force protection on auth endpoints |
| **Zod** | Server-side runtime request payload validation |

---

## 🌟 Key Features

### 1. Core Instagram-Parity Features
- **Auth:** Registration, login, cookie-based token refresh, profile settings.
- **Home Feed:** Chronological posts with infinite scroll, like count, comment count.
- **Stories:** 24-hour ephemeral photo stories feed with visual story rings.
- **Explore & Search:** Full-text search across usernames, hashtags, and posts.
- **Notifications:** Likes, comments, follows, mentions, RSVP updates with unread counts.
- **Direct Messaging (DMs):** Real-time 1-on-1 conversations with Socket.io.

### 2. VibeGram-Exclusive Features
- **🎭 Dual-Profile Incognito Toggle:** Toggle between Personal and Professional modes. Personal posts are automatically restricted from followers categorized as professional contacts.
- **📅 Smart Hangout / Meetup Planner:** Schedule meetups with location, RSVP tracking (Going/Maybe), and auto-generated event group chat.
- **🔍 Contextual DM Search & Media Index:** Filter direct message history by keyword, date, media type, and shared locations.
- **🔗 Direct Link-in-Caption:** Clickable hyperlinks rendered natively inside post captions without bio redirect.
- **🕰️ Time Capsule Posts:** Schedule posts for future release with server-side auto-publishing.
- **🗳️ VibeCheck Polls:** Interactive A/B and multi-option opinion polls with real-time percentage graphs.
- **📸 Collaborative Albums:** Shared albums where multiple contributors can upload photos to the same album.
- **⚠️ Content Sensitivity Labels:** Poster-defined tags (*Spoiler*, *Sensitive*, *Satire*) that apply client-side blur until clicked.

