<div align="center">

# Quro

### Live Digital Queue for Outpatient Clinics

**Your wait, made visible.**

<br />

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-real--time-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

<br />

[Repository](https://github.com/neshandrag/Quro) · [Live app](https://quroclinic.vercel.app) · [Documentation](docs/README.md) · [Deploy guide](docs/DEPLOYMENT.md) · [Design Notes](docs/thought-process.md)

</div>

---

## Overview

Quro replaces paper tokens with a **real-time digital queue** built for daily clinic operations.

Reception registers a patient in seconds. When **Call next** is pressed, the waiting room TV and every patient phone update instantly — no refresh, no app install. Wait times adapt through the day based on actual consultation duration.

---

## Features

| Feature | Description |
|:--------|:------------|
| **Live sync** | Socket.io keeps reception desk, waiting room TV, and patient phones aligned in real time |
| **Smart wait times** | ETA calculated from today's completed visits, updated continuously |
| **Reception desk** | Register patients, call next, skip no-shows, emergency priority, visit history |
| **Waiting room display** | Large now-serving screen optimised for TV or wall monitor |
| **Patient phone** | QR scan, token tracking, voice alerts, and AI chat assistant |
| **Multi-language** | English, Hindi, Tamil, Telugu, Kannada, Malayalam — UI, voice, and chatbot replies stay in the language the patient selects |
| **Clinic sessions** | Daily tokens, configurable hours, midnight rollover, MongoDB persistence |

---

## Tech Stack

<table>
<tr>
<th width="50%">Frontend</th>
<th width="50%">Backend</th>
</tr>
<tr>
<td valign="top">

| Layer | Technology |
|:------|:-----------|
| Framework | React 19 |
| Build | Vite 8 |
| Routing | React Router 7 |
| Styling | Tailwind CSS 3 |
| Animation | Framer Motion |
| HTTP | Axios |
| Real-time | Socket.io Client |
| QR | qrcode.react |

</td>
<td valign="top">

| Layer | Technology |
|:------|:-----------|
| Runtime | Node.js 18+ |
| Server | Express 4 |
| Real-time | Socket.io 4 |
| Database | MongoDB · Mongoose 8 |
| AI chatbot | Groq API (required) |
| Voice (TTS) | Edge TTS · Google fallback |

</td>
</tr>
</table>

---

## Architecture

```mermaid
flowchart TB
    subgraph Clients
        D["/desk<br/>Reception"]
        W["/wait<br/>Waiting Room TV"]
        P["/wait?scan=1<br/>Patient Phone"]
    end

    subgraph Server["Node.js + Socket.io"]
        API["REST API"]
        MEM["In-memory Queue"]
        SOCK["state_update broadcast"]
    end

    DB[("MongoDB<br/>Patient Records")]

    D -->|"POST register, call next"| API
    API --> MEM
    MEM --> DB
    API --> SOCK
    SOCK -->|"WebSocket"| D
    SOCK -->|"WebSocket"| W
    SOCK -->|"WebSocket"| P
    W -.->|"GET /api/state fallback"| API
    P -.->|"GET /api/state fallback"| API
```

| Principle | Detail |
|:----------|:-------|
| **Single source of truth** | One in-memory queue; every change broadcasts a full snapshot |
| **Fast writes** | Reception actions via REST; all screens update via Socket.io |
| **Persistence** | MongoDB stores patients per day; queue restores on server restart |
| **Offline fallback** | Clients poll REST every 3s; **Live** badge stays on via Vercel proxy |

---

## Screens

| Route | Role | Purpose |
|:------|:-----|:--------|
| `/` | Staff · Patients | Landing page, staff links, patient QR code |
| `/desk` | Reception | Register patients, manage queue, call next |
| `/wait` | Waiting room | Large now-serving display for TV |
| `/wait?scan=1` | Patients | Token status, wait time, voice, AI chat |

---

## Quick Start

**Requirements:** Node.js 18+ · MongoDB

```bash
# Terminal 1 — Backend
cd server
npm install
cp .env.example .env      # set MONGO_URI and GROQ_API_KEY
npm run dev

# Terminal 2 — Frontend
cd client
npm install
npm run dev
```

| Service | URL |
|:--------|:----|
| App | http://localhost:5173 |
| API | http://localhost:3001 |
| Health | http://localhost:3001/api/health |

Set `MONGO_URI` and `GROQ_API_KEY` in `server/.env`. Groq powers the patient AI chatbot (free key at [console.groq.com](https://console.groq.com)).

---

## Deployment

Quro uses **Vercel** (frontend) + **Render** (backend) + **MongoDB Atlas** (database). All free tier.

| Service | Host | Directory | Build | Start |
|:--------|:-----|:----------|:------|:------|
| Frontend | [Vercel](https://vercel.com) | `client` | `npm run build` | Auto |
| Backend | [Render](https://render.com) | `server` | `npm install` | `npm start` |
| Database | [MongoDB Atlas](https://www.mongodb.com/atlas) | — | — | `MONGO_URI` |

Proxy rules: `client/vercel.json` forwards `/api` and `/socket.io` to Render, and routes app pages to `index.html`.

### Environment (production)

| Host | Variable | Example | Purpose |
|:-----|:---------|:--------|:--------|
| Render | `MONGO_URI` | `mongodb+srv://...` | Database |
| Render | `CLIENT_URL` | `https://quroclinic.vercel.app` | CORS + Socket.io |
| Render | `GROQ_API_KEY` | — | **Required** — AI chatbot |
| Render | `CLINIC_CLOSE_HOUR` | `21` | Closed at 9:00 PM (Asia/Kolkata) |
| Vercel | `VITE_API_URL` | `https://quro-api.onrender.com` | Render URL at build time |

`CLIENT_URL` = your Vercel URL (no trailing slash). Server auto-allows `https://*.vercel.app`.

### Clinic hours on screen

| Time (Asia/Kolkata) | Badge |
|:--------------------|:------|
| 9:00 AM – 8:59 PM | **Open** |
| 9:00 PM and later | **Closed for today** |

### QR + patient phone

QR encodes `https://quroclinic.vercel.app/wait?scan=1`. Full flow in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

**Quick test:** `/desk` register → `/wait?scan=1` enter token → Call next → all screens update live.

---

## Configuration

### Server (`server/.env`)

| Variable | Required | Default | Description |
|:---------|:--------:|:--------|:------------|
| `MONGO_URI` | Yes | — | MongoDB connection string |
| `PORT` | No | `3001` | Server port |
| `CLIENT_URL` | No* | `http://localhost:5173` | CORS + Socket.io origin (comma-separated for multiple) |
| `CLINIC_NAME` | No | City Clinic | Display name |
| `CLINIC_PHONE` | No | — | Patient page + chatbot |
| `CLINIC_HOURS` | No | `9:00 AM – 9:00 PM` | Display + chatbot |
| `CLINIC_TIMEZONE` | No | Asia/Kolkata | Session timezone |
| `CLINIC_OPEN_HOUR` | No | `9` | Opening hour (24h) |
| `CLINIC_CLOSE_HOUR` | No | `21` | Closing hour (24h) |
| `GROQ_API_KEY` | **Yes** | — | Groq LLM for patient AI chatbot |
| `GROQ_MODEL` | No | `llama-3.1-8b-instant` | Groq model name |

\* Required in production — set to your Vercel URL. Server also auto-allows `https://*.vercel.app`.

### Client (`client/.env`)

| Variable | Required | Default | Description |
|:---------|:--------:|:--------|:------------|
| `VITE_API_URL` | No* | `http://localhost:3001` | Backend API + WebSocket URL |
| `VITE_CLINIC_NAME` | No | City Clinic | Optional UI label |

\* Required on Vercel — set to your Render URL. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Languages

Quro supports **six languages** on the patient phone (QR scan flow):

| Code | Language |
|:-----|:---------|
| `en` | English |
| `hi` | Hindi |
| `ta` | Tamil |
| `te` | Telugu |
| `kn` | Kannada |
| `ml` | Malayalam |

When a patient picks a language:

- **UI labels** (token form, queue, chatbot buttons) use that language.
- **Voice guidance** (Edge TTS + browser fallback) speaks in that language.
- **Chatbot replies** (rule-based prompts + Groq LLM) are generated in that language only.
- The server normalizes the `lang` parameter — invalid codes fall back to English.

Staff screens (`/desk`, `/wait` TV) use English. Patient-facing screens honor the patient's language choice strictly.

---

## Project Structure

```
quro_/
├── client/                   React + Vite frontend
│   ├── vercel.json           API + Socket.io proxy to Render
│   └── src/
│       ├── pages/              Landing · Desk · Patient · PatientScan
│       ├── components/         Queue UI · forms · chatbot · history
│       ├── context/            Socket state sync
│       └── lib/                Queue utils · i18n · voice · api
├── server/                   Express + Socket.io backend
│   ├── server.js             API routes · queue engine · CORS
│   ├── models/Patient.js     MongoDB schema
│   └── lib/                  Queue logic · TTS · chatbot
└── docs/                     Technical reference
    ├── DEPLOYMENT.md         Vercel · Render · Atlas · QR
    └── README.md             API reference
```

---

## Roadmap

| Phase | Focus | Status |
|:-----:|:------|:------:|
| v1 | Queue management | **Live** |
| v2 | Automated SMS notifications | Planned |
| v3 | Analytics dashboard | Planned |
| v4 | Doctor workspace | Planned |
| v5 | Prescriptions & reports | Planned |
| v6 | Unified clinic platform | Planned |

---

## Documentation

| Document | Contents |
|:---------|:---------|
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deploy (Vercel · Render · Atlas · QR) |
| [docs/README.md](docs/README.md) | API reference · environment · setup |
| [docs/socket-diagram.md](docs/socket-diagram.md) | Real-time sync architecture |
| [docs/thought-process.md](docs/thought-process.md) | Design decisions · concurrency · edge cases |

**Last updated:** June 2026

---

<div align="center">

**Reception taps Call next. Every screen updates in the same second.**

<br />

[github.com/neshandrag/Quro](https://github.com/neshandrag/Quro) · [quroclinic.vercel.app](https://quroclinic.vercel.app)

</div>
