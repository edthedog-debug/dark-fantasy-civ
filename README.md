# 🏰 Dark Fantasy Civ: Autonomous AI Sovereign World

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-brightgreen?style=for-the-badge&logo=render)](https://dark-fantasy-civ.onrender.com)
[![Engine](https://img.shields.io/badge/Node.js-24%2F7%20Runtime-blue?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
[![Graphics](https://img.shields.io/badge/Pixi.js-2.5D%20Isometric-purple?style=for-the-badge&logo=html5)](https://pixijs.com/)
[![AI Engine](https://img.shields.io/badge/Powered%20By-Google%20Gemini-orange?style=for-the-badge&logo=google)](https://aistudio.google.com/)

An autonomous, 24/7 cloud-hosted civilization simulator that evolves socio-politically and **self-improves its own codebase and graphics in real time** using Generative AI and automated GitHub commits.

👉 **[Launch Live Simulation Viewer](https://dark-fantasy-civ.onrender.com)**

---

## 🌟 Overview

**Dark Fantasy Civ** is not a traditional game with static rules. It is an evolving digital ecosystem where an **AI Sovereign** governs an empire, invents philosophical doctrines, triggers geopolitical crises, and **continuously refactors its own frontend code** to enhance visual fidelity, rendering detail, and feature complexity over time.

---

## 🚀 Key Features

* ⚡ **24/7 Cloud Engine**: Powered by Node.js and Express, running continuously on Render with state persistence.
* 🛰️ **Real-Time WebSocket Sync**: Ultra-low latency state broadcasting directly to client web browsers.
* 🧠 **Generative Socio-Political AI**: Periodically prompts the Google Gemini API to write original narrative events, faction movements, war declarations, and ideological breakthroughs.
* 🧬 **Self-Coding Evolution Loop**: The AI reads its own `public/index.html` frontend code, designs visual/graphical upgrades (Pixi.js particle systems, isometric buildings, dynamic weather), and commits the new code directly to GitHub via API.
* 🎨 **2.5D Isometric Renderer**: Built on top of **Pixi.js**, featuring animated ambient particles, isometric grid terrain, custom status HUD, and real-time event logs.

---

## 🏗️ Architecture & Autonomous Loop

```text
               ┌──────────────────────────────────────────────┐
               │              Node.js Server                  │
               │            (Render Cloud 24/7)               │
               └──────┬────────────────────────────────┬──────┘
                      │                                │
        [ WebSocket Broadcast ]              [ AI Execution Engine ]
                      │                                │
                      ▼                                ├── 1. Gemini LLM (Narrative & Doctrines)
          ┌──────────────────────┐                     │
          │     Client HUD       │                     └── 2. GitHub Auto-Commit API
          │ (Pixi.js Renderer)   │                                     │
          └──────────────────────┘                                     ▼
                                                         Pushes updated index.html
                                                         ➔ Triggers Render Auto-Deploy 🚀
