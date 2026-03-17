# OpenClaw Avatar MVP (Project Chloe) 🧬💋

## Overview
This repository houses the Minimum Viable Product (MVP) frontend for the **OpenClaw Avatar** project. Inspired by the "Chloe" android from *Detroit: Become Human*, this project aims to create a hyper-realistic, real-time, emotive digital interface for OpenClaw AI agents.

Instead of a text terminal, the user engages with a lifelike digital entity that speaks, reacts, and emotes in real-time, bridging the gap between human and machine.

## Screenshots (FE Development)

| Main Interface (Light) | Chat Experience |
|:---:|:---:|
| ![Main Light](./public/screenshots/screenshot_main_light.png) | ![Chat](./public/screenshots/screenshot_chat.png) |

| Settings & Config | Fullscreen Mode |
|:---:|:---:|
| ![Settings](./public/screenshots/screenshot_settings.png) | ![Fullscreen](./public/screenshots/screenshot_fullscreen.png) |

| Attachments & Tools | UI Variations (Gradient/Banner) |
|:---:|:---:|
| ![Attachments](./public/screenshots/screenshot_attachment.png) | ![Gradient](./public/screenshots/screenshot_gradient.png) |

| Light Mode | Minimal Banner |
|:---:|:---:|
| ![Light Mode](./public/screenshots/screenshot_lightmode.png) | ![Banner](./public/screenshots/screenshot_banner.png) |

## System Architecture

This frontend acts as the "Face and Ears", while OpenClaw acts as the "Brain".

![System Architecture](https://mermaid.ink/svg/c2VxdWVuY2VEaWFncmFtCiAgICBhY3RvciBVc2VyIGFzIEJpZyBKYWsKICAgIHBhcnRpY2lwYW50IE5leHRKUyBhcyBOZXh0LmpzIEZyb250ZW5kCiAgICBwYXJ0aWNpcGFudCBPcGVuQ2xhdyBhcyBPcGVuQ2xhdyBCYWNrZW5kCiAgICBwYXJ0aWNpcGFudCBMTE0gYXMgTExNIE1vZGVsCiAgICBwYXJ0aWNpcGFudCBFbGV2ZW5MYWJzIGFzIEVsZXZlbkxhYnMKCiAgICBOb3RlIG92ZXIgVXNlciwgTmV4dEpTOiAxLiBUaGUgRWFycwogICAgVXNlci0-Pk5leHRKUzogU3BlYWtzCiAgICBOb3RlIHJpZ2h0IG9mIE5leHRKUzogU2NyaWJlIG9yIFdlYiBTcGVlY2ggQVBJIHRyYW5zY3JpYmVzCgogICAgTm90ZSBvdmVyIE5leHRKUywgT3BlbkNsYXc6IDIuIFRoZSBOZXJ2ZSBTeXN0ZW0KICAgIE5leHRKUy0-Pk9wZW5DbGF3OiBUcmFuc2NyaWJlZCBUZXh0CgogICAgTm90ZSBvdmVyIE9wZW5DbGF3LCBMTE06IDMuIFRoZSBCcmFpbgogICAgT3BlbkNsYXctPj5MTE06IFJlcXVlc3QKICAgIExMTS0tPj5PcGVuQ2xhdzogVGV4dCBSZXNwb25zZQoKICAgIE9wZW5DbGF3LS0-Pk5leHRKUzogU3RyZWFtcyByZXNwb25zZQoKICAgIE5vdGUgb3ZlciBOZXh0SlMsIEVsZXZlbkxhYnM6IDQuIFRoZSBWb2ljZQogICAgTmV4dEpTLT4-RWxldmVuTGFiczogVFRTIFJlcXVlc3QKICAgIEVsZXZlbkxhYnMtLT4-TmV4dEpTOiBBdWRpbyBTdHJlYW0KCiAgICBOZXh0SlMtPj5Vc2VyOiBQbGF5cyBhdWRpbyBhbmQgdHJhbnNjcmlwdCBvdmVybGF5Cg)

## Tech Stack (MVP)
- **Frontend Framework:** Next.js 14 (App Router), React, Tailwind CSS, TypeScript.
- **Speech-to-Text (STT):** ElevenLabs Scribe v2 Realtime (WebSocket) + Web Speech API fallback (Chrome/Edge).
- **Text-to-Speech (TTS):** ElevenLabs API (proxied via Next.js `/api/tts`) + Web Speech API fallback.
- **Backend Logic:** OpenClaw daemon (WebSocket/REST).
- **AI Video Generation:** Planned (Simli / LivePortrait / HeyGen).

## Features

- **Voice input:** Push-to-talk mic with live transcription (green text on main screen).
- **Text input:** Chat window with keyboard input.
- **AI responses:** Streamed from OpenClaw via WebSocket or REST.
- **Voice output:** ElevenLabs TTS with live transcript overlay (red text on main screen).
- **Settings:** Gateway URL, OpenClaw API key, ElevenLabs API key + voice ID, light/dark theme.
- **Attachments:** Image, PDF, and text file uploads.

## Configuration

1. **OpenClaw Gateway:** Connect to your OpenClaw daemon (WebSocket URL + API key).
2. **ElevenLabs:** Add your API key for STT (Scribe) and TTS. Use a default voice (e.g. Adam) on free tier; library voices require a paid plan.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser. Click the gear icon to configure Gateway and ElevenLabs settings.

## Roadmap

| Status | Item |
|--------|------|
| [x] | Web Speech API (STT) for push-to-talk |
| [x] | ElevenLabs Scribe STT (cross-browser) |
| [x] | ElevenLabs TTS with Web Speech fallback |
| [x] | Connect to OpenClaw backend (WebSocket) |
| [x] | Chat window with text + voice input |
| [x] | Live transcript overlay (green/red) |
| [x] | File attachments (image, PDF, text) |
| [ ] | Photorealistic base portrait (Midjourney/Flux) |
| [ ] | AI Video API (lip-sync, emotion) |