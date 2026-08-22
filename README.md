# Dark Fantasy Pixel Art Civilization Game  
*Comprehensive README*

---

## Table of Contents
1. [Project Overview](#project-overview)  
2. [Features](#features)  
3. [Installation](#installation)  
4. [Configuration](#configuration)  
5. [World State Variables](#world-state-variables)  
6. [AI Improvement System](#ai-improvement-system)  
7. [Troubleshooting & FAQ](#troubleshooting--faq)  
8. [Contributing](#contributing)  
9. [License](#license)  

---

## Project Overview
The **Dark Fantasy Pixel Art Civilization Game** is a strategy‑simulation title that blends classic city‑building mechanics with a gritty, atmospheric dark‑fantasy setting rendered entirely in pixel art. Players guide a fledgling settlement from a humble hamlet to a sprawling empire while contending with hostile forces, supernatural events, and an ever‑evolving AI that learns from their decisions.

Key design goals:

- **Immersive pixel‑art world** – hand‑crafted sprites, tilesets, and UI that evoke a moody, medieval fantasy vibe.  
- **Deep management loops** – resource production, population growth, happiness, military recruitment, and diplomacy.  
- **Dynamic world state** – a living world whose variables (day count, population, treasury, weather, etc.) affect gameplay in real time.  
- **Adaptive AI** – an opponent system that improves over time, offering a fresh challenge on each playthrough.

Current in‑game snapshot (as of the latest save):
- **Day:** 104 479  
- **Population:** 13 860  
- **Treasury:** 157 495 836 436 gold  

---

## Features
| Category | Description |
|----------|-------------|
| **Pixel‑Art Graphics** | 32‑bit style sprites, animated tiles, day/night lighting, weather effects. |
| **City‑Building & Management** | Build structures, assign workers, manage food, wood, stone, magic crystals, and gold. |
| **Exploration & Map Generation** | Procedurally generated continents, hidden ruins, resource nodes, and random events. |
| **Diplomacy & Warfare** | Form alliances, trade routes, declare war, recruit heroes, and command armies. |
| **AI Improvement System** | Machine‑learning‑driven AI that tracks player tactics, adjusts strategies, and unlocks new behaviors. |
| **World State Variables** | Persistent variables (day, population, treasury, morale, climate) that influence events and AI decisions. |
| **Modding Support** | JSON‑based data files, scriptable events, and a simple plugin API for community extensions. |
| **Save/Load & Cloud Sync** | Automatic backups, manual saves, and optional cloud synchronization. |
| **Accessibility Options** | Color‑blind palettes, UI scaling, subtitles, and remappable controls. |

---

## Installation

### Prerequisites
- **Operating System:** Windows 10/11, macOS 12+, or any modern Linux distribution.  
- **Python:** 3.9 or newer (recommended 3.11).  
- **Graphics:** GPU supporting OpenGL 3.3 or higher.  
- **Optional:** Git (for source checkout) and virtual‑environment tools (`venv`, `conda`).

### Steps

1. **Clone the repository**  
   ```bash
   git clone https://github.com/your-org/dark-fantasy-civilization-game.git
   cd dark-fantasy-civilization-game
   ```

2. **Create a virtual environment (recommended)**  
   ```bash
   python -m venv .venv
   source .venv/bin/activate   # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**  
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the game**  
   ```bash
   python main.py
   ```

5. **(Optional) Build a standalone executable**  
   ```bash
   pyinstaller --onefile --windowed main.py
   ```

   The generated binary will appear in the `dist/` folder.

---

## Configuration

All configurable options live in `config.json` (generated on first launch). Below is a concise overview; full schema is documented in `docs/config_schema.md`.

```json
{
  "graphics": {
    "resolution": "1920x1080",
    "fullscreen": false,
    "vsync": true,
    "pixel_scale": 2
  },
  "audio": {
    "master_volume": 0.85,
    "music_volume": 0.70,
    "sfx_volume": 0.80,
    "mute": false
  },
  "gameplay": {
    "difficulty": "hard",          // easy | normal | hard | nightmare
    "ai_learning_rate": 0.03,      // 0 = static AI, 1 = maximal adaptation
    "starting_day": 1,
    "starting_population": 150,
    "starting_treasury": 5000
  },
  "controls": {
    "move_up": "W",
    "move_down": "S",
    "move_left": "A",
    "move_right": "D",
    "open_menu": "Esc"
  },
  "mods": {
    "enabled": [],
    "mod_folder": "mods"
  }
}
```

- **Changing values**: Edit the JSON file with any text editor and restart the game for changes to take effect.  
- **Mod loading**: Drop a folder containing a `mod.json` manifest into the `mods/` directory and list its name under `enabled`.  

---

## World State Variables

The engine maintains a set of **global variables** that persist across saves and influence both gameplay mechanics and AI decision‑making.

| Variable | Type | Description | Example (Current) |
|----------|------|-------------|-------------------|
| `day` | Integer | Number of days elapsed since the world’s creation. | **104 479** |
| `population` | Integer | Total number of citizens under the player’s rule. | **13 860** |
| `treasury` | Integer (64‑bit) | Gold reserves available for construction, recruitment, and trade. | **157 495 836 436** |
| `morale` | Float (0‑1) | Overall happiness; affects productivity and rebellion risk. | 0.73 |
| `climate` | Enum (`sunny`, `rain`, `storm`, `snow`) | Current weather; modifies resource yields. | `storm` |
| `global_event_counter` | Integer | Tracks how many world‑wide events have occurred (e.g., plagues, invasions). | 27 |
| `ai_difficulty_modifier` | Float | Dynamic multiplier applied to AI aggression based on player performance. | 1.12 |

These variables are stored in `save/<save_name>/world_state.json` and can be inspected or edited manually for debugging or modding purposes.

---

## AI Improvement System

### Overview
The AI is built on a **reinforcement‑learning loop** that runs in‑game (lightweight, no external server required). It observes player actions, evaluates outcomes, and updates a policy table that guides future decisions.

### Core Components
1. **State Representation** – Encodes the current world state (day, population, treasury, morale, recent events, etc.) into a fixed‑size vector.  
2. **Action Space** – Includes diplomatic offers, troop movements, resource raids, technology research, and special events.  
3. **Reward Function** – Rewards the AI for:
   - Gaining territory or resources.
   - Reducing player morale.
   - Successfully defending against player attacks.
   - Achieving long‑term strategic goals (e.g., controlling a magical nexus).  
4. **Learning Rate (`ai_learning_rate`)** – Adjustable via `config.json`. Higher values make the AI adapt faster but can lead to instability.  

### How It Works (Simplified)
```text
while game_running:
    observe current_state
    choose action = policy(state)   # epsilon‑greedy selection
    execute action in world
    receive reward based on outcome
    update policy using Q‑learning (or SARSA) with learning_rate
```

### Player Interaction
- **Transparency**: Players can view the AI’s “thought process” in the debug console (`--debug-ai` flag).  
- **Control**: Setting `ai_learning_rate` to `0` disables learning, making the AI deterministic (useful for speedruns or testing).  

### Future Enhancements (Roadmap)
- Introduce **neural‑network‑based policy** for more nuanced strategies.  
- Add **AI personality profiles** (e.g., “Aggressive War‑lord”, “Cautious Trader”).  
- Enable **cross‑save learning** where AI retains knowledge between separate play sessions.

---

## Troubleshooting & FAQ

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| **Game crashes on startup** | Missing or incompatible OpenGL driver. | Update graphics drivers; ensure GPU supports OpenGL 3.3+. |
| **Missing textures / pixelated UI** | `assets/` folder not found or corrupted. | Verify that the `assets/` directory exists in the root and contains subfolders `sprites/`, `tiles/`, `ui/`. Re‑clone the repo if necessary. |
| **AI does not improve** | `ai_learning_rate` set to `0` or `debug_mode` disables learning. | Open `config.json` and set `"ai_learning_rate"` to a value > 0 (e.g., `0.05`). |
| **Save file won’t load** | Version mismatch after an update. | Delete the `save/` folder (or back it up) and start a new game; the new version may require migration scripts. |
| **Performance drops on large maps** | Excessive draw calls / unoptimized tile rendering. | Enable `vsync: false` and lower `pixel_scale` in `config.json`. Consider using the `--low-graphics` launch flag. |
| **Mod crashes the game** | Mod manifest missing required fields. | Check `mods/<mod_name>/mod.json` against the schema in `docs/mod_schema.md`. |

### Getting Help
1. **Read the Wiki** – https://github.com/your-org/dark-fantasy-civilization-game/wiki  
2. **Search Issues** – https://github.com/your-org/dark-fantasy-civilization-game/issues  
3. **Open a New Issue** – Provide:
   - OS, Python version, and GPU details.  
   - Steps to reproduce.  
   - Relevant log excerpts (`logs/latest.log`).  

---

## Contributing

We welcome community contributions! Follow these steps:

1. **Fork** the repository.  
2. **Create a feature branch** (`git checkout -b feature/awesome‑feature`).  
3. **Write code** adhering to PEP‑8 (Python) and the project's style guide (`docs/style_guide.md`).  
4. **Add tests** in `tests/` (use `pytest`).  
5. **Run the test suite**: `pytest`.  
6. **Submit a Pull Request** with a clear description of changes.

Please read `CONTRIBUTING.md` for detailed guidelines on code standards, commit messages, and review process.

---

## License

This project is licensed under the **MIT License**. See the full text in `LICENSE`:

```
MIT License

Copyright (c) 2026 ...

Permission is hereby granted, free of charge, to any person obtaining a copy...
```

---

*Happy building, and may your empire thrive in the shadows!*