# Dark Fantasy Pixel Art Civilization Game  
**README.md**

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
**Dark Fantasy Pixel Art Civilization** is a single‑player city‑builder set in a brooding, hand‑crafted pixel‑art world. Players guide a fledgling settlement through centuries of hardship, balancing resource extraction, population growth, and the ever‑looming threats of a cursed realm. The game blends classic civilization mechanics with a dark‑fantasy narrative, all rendered in nostalgic 16‑bit style.

Key design goals:

- **Atmospheric pixel art** that tells a story without words.  
- **Deep management loops** (economy, research, military, religion).  
- **Evolving AI** that learns from player decisions to provide fresh challenges.  
- **Transparent world state** so players can see the exact numbers driving their empire.

Current in‑game snapshot (as of the latest build):

| Variable | Value |
|----------|-------|
| **Day** | **90330** |
| **Population** | **11 597** |
| **Treasury** | **104 627 176 833** (gold units) |

---

## Features
| Category | Description |
|----------|-------------|
| **Pixel‑Art World** | Hand‑drawn tiles, animated sprites, dynamic lighting, weather effects. |
| **City‑Builder Core** | Build houses, farms, workshops, temples, and defensive structures. |
| **Resource System** | Food, wood, stone, iron, mana, and luxury goods. |
| **Technology Tree** | Dark‑magic research, engineering, alchemy, and forbidden rites. |
| **Population Mechanics** | Birth/death rates, morale, disease, migration, class stratification. |
| **Treasury & Economy** | Taxation, trade routes, market fluctuations, gold inflation. |
| **AI Improvement System** *(see section below)* | Machine‑learning‑driven AI that adapts to player strategies. |
| **Save/Load & Replay** | Exportable JSON save files; deterministic replay for analysis. |
| **Mod‑Friendly Architecture** | Plugin API, scriptable events, custom assets. |
| **Cross‑Platform** | Windows, macOS, Linux (via Python & Pygame). |

---

## Installation
### Prerequisites
- **Python 3.8+** (tested on 3.10, 3.11)  
- **Pygame 2.0+** (graphics & input handling)  
- **Git** (to clone the repo)  
- Optional: **virtualenv** or **conda** for isolated environments.

### Step‑by‑Step
```bash
# 1️⃣ Clone the repository
git clone https://github.com/your-org/dark-fantasy-pixel-civ.git
cd dark-fantasy-pixel-civ

# 2️⃣ (Recommended) Create a virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# 3️⃣ Install Python dependencies
pip install -r requirements.txt

# 4️⃣ Verify installation (runs a quick sanity check)
python -m game --test

# 5️⃣ Launch the game
python -m game
```

**Note:** On Linux you may need to install SDL dependencies (`libsdl2-dev`, `libsdl2-image-dev`, etc.) if Pygame fails to import.

---

## Configuration
The game can be tweaked via **command‑line arguments**, **environment variables**, or an optional **`config.yaml`** file placed in the root directory.

### Command‑Line Arguments
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--day` | int | `90330` | Starting day number. |
| `--population` | int | `11597` | Initial population. |
| `--treasury` | int | `104627176833` | Starting gold amount. |
| `--speed` | float | `1.0` | Game speed multiplier (0.1‑5.0). |
| `--load <file>` | path | – | Load a saved game JSON. |
| `--no‑ai` | flag | – | Disable AI opponent (sandbox mode). |

Example:
```bash
python -m game --day 1000 --population 5000 --treasury 2500000 --speed 1.5
```

### Environment Variables
| Variable | Default | Effect |
|----------|---------|--------|
| `GAME_SPEED` | `1.0` | Overrides `--speed`. |
| `GAME_LOG_LEVEL` | `INFO` | Set to `DEBUG` for verbose logs. |
| `AI_MODEL_PATH` | `models/default.pkl` | Path to a custom AI model file. |

### `config.yaml` (optional)
```yaml
day: 90330
population: 11597
treasury: 104627176833
speed: 1.0
ai:
  enabled: true
  model_path: models/default.pkl
logging:
  level: INFO
```
If a `config.yaml` exists, it is loaded **after** command‑line arguments, allowing the file to provide defaults while the CLI can override them.

---

## World State Variables
The engine maintains a single **WorldState** object that is serializable to JSON. Below are the core variables exposed to the player and to modders.

| Variable | Type | Description |
|----------|------|-------------|
| `day` | int | Current in‑game day (starts at 1). |
| `population` | int | Total living citizens (includes slaves, nobles, etc.). |
| `treasury` | int | Gold reserves; can be negative (debt). |
| `food_stock` | int | Units of food stored. |
| `resources` | dict | `{ wood: int, stone: int, iron: int, mana: int, lux: int }` |
| `morale` | float (0‑1) | Overall citizen happiness; influences birth/death rates. |
| `tech_progress` | dict | `{ tech_id: float (0‑1) }` – research completion percentages. |
| `military_strength` | int | Sum of combat power of all units. |
| `diplomacy` | dict | Relations with AI factions (if enabled). |
| `events_log` | list | Chronological list of major events (used for replay). |

**Accessing the state in code**
```python
from game.world import WorldState

state = WorldState.load('savegame.json')
print(state.day, state.population, state.treasury)
```

**Saving**
```python
state.save('savegame.json')
```

---

## AI Improvement System
### Goal
Create an AI that **adapts** to the player’s macro‑strategy (e.g., aggressive expansion, economic focus, religious dominance) and provides increasingly nuanced opposition or assistance.

### Architecture Overview
```
+-------------------+        +-------------------+        +-------------------+
|  Game Engine      | <----> |  Data Collector   | <----> |  AI Trainer       |
+-------------------+        +-------------------+        +-------------------+
        ^                               ^                         ^
        |                               |                         |
        |                               |                         |
        v                               v                         v
+-------------------+        +-------------------+        +-------------------+
|  AI Inference     | <----> |  Model Repository | <----> |  Player Feedback |
+-------------------+        +-------------------+        +-------------------+
```

1. **Data Collector** – Every tick logs:
   - Player actions (buildings placed, techs researched, army movements).  
   - World state snapshots (population, treasury, morale).  
   - Outcome metrics (battle results, economic growth).  

2. **Model Repository** – Stores serialized models (`.pkl` or ONNX). The default model is a **Gradient Boosted Decision Tree** trained on 10k simulated games.

3. **AI Trainer** – Offline script (`train_ai.py`) that:
   - Loads collected logs.  
   - Performs feature engineering (e.g., “population‑to‑food ratio”, “tech‑speed”).  
   - Trains a **policy network** (lightweight PyTorch model) to predict optimal AI actions.  
   - Evaluates via cross‑validation and writes a new model file.

4. **AI Inference** – At runtime, the engine loads the latest model and queries it each decision window (e.g., every 30 days). The model returns a weighted list of possible actions (build, attack, trade, etc.) which the AI executes probabilistically.

### How to Improve the AI
- **Collect More Data** – Play longer sessions, enable the `--log‑full` flag to capture every micro‑decision.  
- **Fine‑Tune** – Run `python train_ai.py --epochs 50 --learning-rate 0.001` to refine the model on your own dataset.  
- **Swap Models** – Place a custom model at `models/custom.pkl` and launch with `AI_MODEL_PATH=./models/custom.pkl`.  
- **Contribute** – Submit trained models to the `models/` directory of the repo; the CI pipeline will benchmark them automatically.

### Safety & Determinism
- The AI runs **deterministically** given the same seed (`--seed <int>`).  
- All model inference is sandboxed; no external network calls are made at runtime.  

---

## Troubleshooting & FAQ
### The game crashes on startup
1. Verify Python version (`python --version`).  
2. Ensure Pygame is installed correctly: `python -c "import pygame; print(pygame.ver)"`.  
3. On Linux, install missing SDL libs: `sudo apt-get install libsdl2-dev libsdl2-image-dev`.  
4. Run with `--log‑level DEBUG` to see detailed traceback.

### AI behaves oddly (e.g., builds nothing)
- Check that a model file exists at the path specified by `AI_MODEL_PATH`.  
- If you recently edited `config.yaml`, make sure `ai.enabled` is `true`.  
- Delete `cache/ai_state.json` to force a fresh load.

### Population or treasury numbers look wrong
- The game caps **population growth** by food availability; low `food_stock` will cause a decline.  
- Treasury overflow is prevented by a 64‑bit integer; if you see negative values, you may have triggered a debt event (see `events_log`).  

### I want to start a fresh world but keep my mods
```bash
python -m game --day 1 --population 1000 --treasury 50000 --no‑ai
```
This ignores the saved JSON but still loads any `mods/` folder you have.

### How to enable debug console in‑game?
Press **F12** (or run with `--debug-console`) to open a small overlay where you can inspect `WorldState` variables live.

### My save file won’t load (corrupt JSON)
- Open the file in a text editor and look for trailing commas or missing braces.  
- Use the provided repair script: `python tools/repair_save.py broken_save.json repaired_save.json`.  

---

## Contributing
We welcome **code**, **art**, **balance**, and **AI** contributions.

1. Fork the repository.  
2. Create a feature branch (`git checkout -b feature/awesome‑ai`).  
3. Follow the **PEP‑8** style guide for Python and keep pixel art assets at **16×16** or **32×32** with a transparent background.  
4. Write unit tests for any new logic (`pytest`).  
5. Submit a Pull Request with a clear description and, if applicable, a link to a short gameplay video.

**Helpful scripts**

| Script | Purpose |
|--------|---------|
| `tools/generate_world.py` | Procedurally generate a new map for testing. |
| `tools/train_ai.py` | Train or fine‑tune the AI model. |
| `tools/repair_save.py` | Attempt to fix corrupted JSON saves. |
| `tools/benchmark_ai.py` | Run head‑to‑head AI vs. baseline for performance stats. |

---

## License
This project is released under the **MIT License**. See the `LICENSE` file for full terms.

```
MIT License

Copyright (c) 2026 <Your Name / Organization>

Permission is hereby granted, free of charge, to any person obtaining a copy...
```

---

### Quick Start Recap
```bash
git clone https://github.com/your-org/dark-fantasy-pixel-civ.git
cd dark-fantasy-pixel-civ
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m game               # default world (Day 90330, Pop 11597, Treasury 104627176833)
```

Enjoy building your cursed empire! 🎮🗡️🛡️🕯️