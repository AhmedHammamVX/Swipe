# Swipe

**Real-time 1:1 messaging** — Angular 17 client with Socket.IO, cookie auth, friends, and image chat.

A messenger-style web app: sign in, find people, chat live, and see who’s online. Built as a full frontend against a REST + Socket.IO backend.

---

## Demo

Watch a walkthrough of Swipe:

<!--
  Option A — YouTube / LinkedIn / Drive (recommended)
  1. Upload the video
  2. Replace VIDEO_URL below
  3. Optional: drop a thumbnail at docs/demo-thumbnail.png and uncomment the image link
-->

[▶ Watch the project video](VIDEO_URL)

<!--
[![Watch the demo](docs/demo-thumbnail.png)](VIDEO_URL)
-->

<!--
  Option B — Host the file in this repo
  1. Put your video at docs/demo.mp4 (keep it under GitHub’s 100 MB file limit)
  2. Uncomment the block below
-->

<!--
<video src="docs/demo.mp4" width="100%" controls>
  Your browser does not support the video tag. [Download the demo](docs/demo.mp4)
</video>
-->

---

## Features

- **Auth** — login, signup, session restore, logout (HTTP cookies)
- **1:1 chat** — text and image messages, live incoming events, auto-scroll
- **Friends** — search users, send / accept / reject requests, remove, block / unblock
- **Presence** — online users via Socket.IO (`getOnlineUsers`)
- **Notifications** — toasts + sounds for messages and friend events
- **Settings** — profile picture upload, blocked contacts
- **Guarded routes** — home/chat requires a valid session

> WebRTC call signaling and voice-command services are in the codebase; the call/mic UI is not fully wired yet.

---

## Tech stack

| Layer | Tools |
|--------|--------|
| Framework | Angular 17 (standalone components, signals) |
| Language | TypeScript 5.4, RxJS 7 |
| Realtime | Socket.IO client |
| HTTP | Angular HttpClient + functional auth interceptor |
| UI | Bootstrap 5, Bootstrap Icons, Material Icons |
| Feedback | @ngxpert/hot-toast |

---

## Architecture

```
src/app/
├── components/
│   ├── authentication/     # login + signup shell
│   ├── home/
│   │   ├── home-navigation/
│   │   ├── home-sidebar/   # chat, contacts, notifications, settings
│   │   └── home-main/      # header, messages, composer
│   └── shared/             # confirmation modal
├── services/               # auth, messages, friends, socket, notifications
├── guards/                 # authGuard
├── interceptors/           # credentials on every request
└── models/
```

**Routes**

| Path | Screen |
|------|--------|
| `/auth` | Login / signup |
| `/home/chat` | Conversations (protected) |
| `/home/contacts` | Friends & search |
| `/home/notifications` | Requests & alerts |
| `/home/settings` | Profile & blocked users |

**API** (default: `http://localhost:5001/api`)

- Auth: `/auth/login`, `/signup`, `/logout`, `/check`, `/update-profile`
- Messages: `/messages/:userId`, `/messages/send/:userId`, `/messages/clear/:friendId`
- Friends: `/friends/search`, `/friends`, `/request`, `/accept`, `/reject`, `/block`, `/unblock`, `/blocked`

Configure URLs in `src/environments/environment.development.ts`.

---

## Getting started

**Requirements:** Node.js 18+, Angular CLI, backend running on port **5001**.

```bash
git clone <your-repo-url>
cd chat-app
npm install
ng serve
```

Open [http://localhost:4200](http://localhost:4200).

```bash
npm run build    # production build → dist/
npm test         # unit tests (Karma)
```

---

## Highlights

- **Signals-first** state (current user, messages, selected friend, online list)
- **Cookie sessions** — `withCredentials: true`, no JWT in `localStorage`
- **Realtime split** — chat/social on `SocketService`; WebRTC signaling prepared separately
- **Optimistic send** — local message appears immediately; socket events update the open chat

---

## Author

Built as a portfolio project to practice real-time Angular, Socket.IO, and product-style UX.

If you like it, star the repo — or open an issue with feedback.
