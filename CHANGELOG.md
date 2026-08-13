# Changelog

Significant changes to L3MON documented per release.

> For granular change history, see [DEVLOG.md](DEVLOG.md).

---

## 📋 RULE: AI Agents Must Document Changes

> **Any AI agent reading, editing, or making changes to this repository MUST follow this process:**
>
> 1. **Log everything in [DEVLOG.md](DEVLOG.md)** — every file edit, every change, every fix
> 2. **Promote significant items to this file** — only major features, fixes, and breaking changes
>
> ### Dev Log Format (DEVLOG.md)
> ```
> ## [DATE] — HH:MM
> - **File:** path/to/file.js
> - **Change:** what was changed and why
> ```
>
> ### Changelog Format (this file)
> ```
> ### ✨ New Features
> - **Feature name** — description
>
> ### 🐛 Bug Fixes
> - **Fix name** — what was broken and how it was fixed
>
> ### 🎨 UI Changes
> - **Change name** — what changed visually
>
> ### 🔧 Backend Changes
> - **Change name** — what changed in the backend
>
> ### ❌ Removed
> - **Feature name** — why it was removed
> ```
>
> **If an AI agent makes a change and doesn't log it, the change is incomplete.**

---

## [3.1.0] — Revamped L3MON (August 12–13, 2026)

> Complete revamp of L3MON by xTheDevilRazedMe. Merged original revamp work with UI overhaul, bug fixes, and new features into a single release.

### ✨ New Features

- **AI Agent Panel** — built-in AI chat with tool-calling (execute commands, read device data, list devices)
- **AI Config** — configurable provider (endpoint, API key, model) with model detection
- **AI Commands** — `/shell`, `/alpine`, `/recon`, `/hide`, `/show`, `/admin` via chat
- **Exploit Scanner** — CVE scanning against NVD database + searchsploit integration
- **Exploit Recon** — kernel version parsing, severity classification (Critical/High/Medium/Low)
- **Module Store** — deployable Alpine toolkits (nmap, ssh, python, gcc, proxychains, wifi tools)
- **Tunnel Manager** — LocalTunnel integration with persistent state and auto-reconnect
- **Alpine Linux Environment** — proot-based Linux on Android with persistent sessions
- **Alpine Package Manager** — apk list/add/del via device manager
- **Alpine Supervisor** — process management with startup scripts
- **Device Nicknames** — custom names stored in DB, shown everywhere instead of raw client IDs
- **Device Selector** — dropdown in header and sidebar to switch between devices
- **Device Cards** — clickable dashboard cards with quick action buttons (Shell, SMS, GPS, Contacts, Calls, Mic)
- **Back Button** — in header and sidebar for navigation
- **Rename from Dashboard** — pencil icon on device cards to set nicknames
- **Auto-Extraction** — device data automatically requested on connection (contacts, SMS, calls, apps, GPS, WiFi, permissions, files, notifications)
- **Sidebar Scroll Persistence** — remembers scroll position across page navigation
- **Multi-Session Auth** — up to 20 concurrent login tokens
- **Per-Device Command Queue** — offline devices queue commands for when they reconnect
- **GPS Polling** — configurable interval for automatic location updates
- **Per-Device Database** — individual LowDB files for each connected device
- **Camera Photo Storage** — photos stored per-device with timestamps
- **File Download Storage** — downloaded files stored with unique keys
- **Live Mic Streaming** — continuous microphone recording with interval control
- **Keylogger** — notification-based keystroke logging
- **24 Device Pages** — GPS, SMS, Calls, Contacts, Clipboard, Microphone, Camera, Files, Terminal, Alpine, Packages, Exploits, WiFi, Notifications, Permissions, Apps, Accounts, System Settings, Device Settings, Keylogger, Downloads, Device Info, No Page, Not Found

### 🎨 UI Changes

- **Full Dark Theme** — all pages migrated from Semantic UI to Tailwind CSS dark theme
- **Dashboard Redesign** — device cards replace table layout, stat cards show real data (Online/Total/Offline/Commands)
- **Sidebar Redesign** — split into Overview section (Dashboard, Event Log, Build Payload) and Device section (context-aware, only shows when device selected)
- **Header Redesign** — logo left, page name center, device selector + actions right
- **Footer Added** — "Edited with ❤️ by xTheDevilRazedMe" on every page
- **Builder Page** — migrated from Semantic UI to dark theme with sidebar and AI panel
- **Logs Page** — migrated from Semantic UI to dark theme with sidebar and AI panel
- **Glass-morphism Cards** — backdrop blur effects on all card components
- **Gradient Stat Cards** — green/blue/amber gradients on dashboard stats
- **Activity Feed** — latest device connections shown on dashboard
- **Device Info Quick Actions** — grid of quick action buttons on device info page
- **Login Error Messages** — specific messages per error type (badLogin, missingUsername, missingPassword)
- **Selected Device Indicator** — blue highlighted box in sidebar showing current device with rename button
- **Device Switcher Dropdown** — appears in sidebar when 2+ devices are connected
- **Empty State** — dashboard shows "Build Payload" CTA when no devices connected

### 🐛 Bug Fixes

- **Critical: `module.exports` placement** — terminal routes (110+ lines) were unreachable because `module.exports` was placed before them
- **Broken sidebar links on dashboard** — `/manage//terminal` (empty deviceID) returned errors; sidebar now conditionally renders device links
- **Login errors non-specific** — always showed "Invalid username or password"; now shows specific messages per error type
- **Dashboard stat cards static** — showed meaningless "Active" / "Live" text; now show Offline count and Active device count
- **No logout in sidebar** — added logout link to sidebar footer
- **Builder page old UI** — used Semantic UI; rewritten with Tailwind dark theme
- **Logs page old UI** — used Semantic UI; rewritten with Tailwind dark theme

### 🔧 Backend Changes

- **Auto-extraction on connect** — device data automatically requested when device connects (staggered by 2s)
- **Client list passed to all views** — `allClients` array available in every template for device selector
- **Nickname API** — `POST /manage/:deviceid/nickname` endpoint for setting device names
- **Terminal routes fixed** — all live terminal, Alpine supervisor, and output polling routes now properly exported
- **Database schema** — `nickname` field added to client objects

---

## [3.0.0] — Original L3MON (GitHub)

> The original L3MON by D3VL/efxtv — archived October 29, 2025.

### Core Features
- Node.js + Express + Socket.IO backend
- EJS templating with Semantic UI
- APK builder with tunnel support
- GPS, SMS, Calls, Contacts
- Microphone recording
- Camera capture
- Shell terminal
- File manager
- Notification logging
- Clipboard monitoring
- WiFi scanning
- Device admin capabilities

### Default Stack
- Express web server on port 22533
- Socket.IO on port 22222
- LowDB (JSON file database)
- LocalTunnel for APK connectivity
- Java 8 for APK building

---

## Version Summary

| Version | Date | Key Changes |
|---------|------|-------------|
| 3.0.0 | Original | Base L3MON from GitHub (D3VL/efxtv) |
| 3.1.0 | Aug 12–13, 2026 | Full revamp: AI Agent, Dark Theme, Device Nicknames, Auto-Extraction |

---

*Edited with ❤️ by xTheDevilRazedMe*
