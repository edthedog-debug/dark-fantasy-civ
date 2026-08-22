# Dark Fantasy Pixel Art Civilization Game  
*Version 1.0.0*  

---  

## Table of Contents
1. [Project Overview](#project-overview)  
2. [Features](#features)  
3. [Installation](#installation)  
4. [Configuration](#configuration)  
5. [World State Variables](#world-state-variables)  
6. [AI Improvement System](#ai-improvement-system)  
7. [Troubleshooting & Debugging](#troubleshooting--debugging)  
8. [Current Game State](#current-game-state)  
9. [Contributing](#contributing)  
10. [License](#license)  

---  

## Project Overview  
This **dark fantasy pixel‑art civilization** game puts you in charge of a fledgling realm steeped in gloom, myth, and ancient magic. You must balance resource management, city building, research, and diplomacy while confronting an ever‑evolving AI that adapts to your strategies. The game runs in real‑time (or turn‑based, depending on speed settings) and persists an extensive world state that can be saved and re‑loaded at any time.

---  

## Features  

| Category | Description |
|----------|-------------|
| **Pixel‑Art Aesthetic** | Hand‑crafted 16‑bit style sprites, tilesets, and UI elements that evoke classic dark‑fantasy titles. |
| **Deep Civilization Management** | Build districts, manage food, gold, mana, and morale; enact edicts, research magical technologies, and recruit heroes. |
| **Dynamic AI Opponents** | Multiple AI factions with distinct personalities (e.g., *Necromancer Empire*, *Dwarven Forge‑clan*). AI learns from your actions via the **AI Improvement System**. |
| **Procedural World Generation** | Randomly generated continents, biomes, and resource nodes each new game. |
| **Persistent World State** | Day counter, population, treasury, and dozens of hidden variables are saved in a JSON save file. |
| **Mod‑Friendly Architecture** | All data (units, buildings, events) are defined in external JSON/YAML files, making it easy to add new content. |
| **Configurable Game Speed & Difficulty** | Adjust the tick rate, AI difficulty, and UI scaling via a single `config.json`. |
| **Debug & Profiling Tools** | Built‑in console, FPS overlay, and state dump for developers and power‑users. |

---  

## Installation  

### Prerequisites  

| Tool | Minimum Version |
|------|-----------------|
| **Python** | 3.8+ |
| **Pygame** | 2.0+ (installed via pip) |
| **Git** | Any recent version (optional, for cloning) |
| **Optional** | `ffmpeg` (for recording gameplay) |

### Steps  

```bash
# 1️⃣ Clone the repository
git clone https://github.com/your-username/dark-fantasy-civilization-game.git
cd dark-fantasy-civilization-game

# 2️⃣ Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# 3️⃣ Install dependencies
pip install -r requirements.txt

# 4️⃣ Run the game
python main.py
```

*If you prefer Docker:*  

```dockerfile
# Dockerfile (provided in repo)
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
CMD ["python", "main.py"]
```

```bash
docker build -t dark-fantasy-civ .
docker run -it --rm -p 8000:8000 dark-fantasy-civ
```

---  

## Configuration  

All runtime options live in **`config.json`** (generated on first launch). Below is a commented example:

```json
{
  "game_speed": 1.0,               // 0.5 = half‑speed, 2.0 = double‑speed
  "ai_difficulty": "hard",         // options: "easy", "normal", "hard", "nightmare"
  "ui_scale": 1.0,                 // UI scaling factor for high‑DPI displays
  "debug_mode": false,             // Enables console overlay & state dumps
  "autosave_interval_minutes": 10,
  "max_population_cap": 500000,
  "starting_day": 1,
  "seed": null                     // Set a number for reproducible world generation
}
```

**Changing a setting while the game is running:**  
1. Open the in‑game console (`~` key).  
2. Type `config set <key> <value>` (e.g., `config set game_speed 2.0`).  
3. The change takes effect immediately and is persisted to `config.json`.

---  

## World State Variables  

The engine maintains a **`world_state.json`** file (auto‑saved each autosave). Key variables include:

| Variable | Type | Description |
|----------|------|-------------|
| `day` | integer | Current day counter (starts at `starting_day`). |
| `population` | integer | Total number of citizens across all cities. |
| `treasury` | integer | Gold reserves (can be negative if you’re in debt). |
| `mana_reserve` | integer | Magical energy used for spells & research. |
| `food_stockpile` | integer | Days of food remaining before starvation. |
| `morale` | float (0‑1) | Overall citizen happiness; affects growth rate. |
| `technology_progress` | dict | `{ "tech_name": percent_complete }`. |
| `diplomacy` | dict | Relations with AI factions (`{ "faction_id": reputation }`). |
| `events_log` | list | Chronological list of major events (used for replay). |
| `ai_adaptation_score` | float | Internal metric the AI uses to gauge how much it has learned from the player. |

> **Tip:** You can inspect the full schema in `docs/world_state_schema.md`.

---  

## AI Improvement System  

### Overview  
The AI is not static; it employs a **reinforcement‑learning‑inspired adaptation loop** that runs every **`ai_adaptation_interval`** (default: 30 in‑game days). The loop evaluates three signals:

1. **Strategic Success** – Victory points earned (territory, technology, military).  
2. **Player Counter‑Strategies** – Frequency of player actions that directly thwart AI plans (e.g., ambushes, trade embargoes).  
3. **Resource Efficiency** – How well the AI converts gold/mana into useful assets.

Based on these signals, the AI adjusts weights in its decision‑making tree (e.g., “prioritize naval expansion” vs. “focus on magical research”).  

### How It Works (Simplified)

```text
Every ai_adaptation_interval:
    1. Gather metrics → M = {success, counter, efficiency}
    2. Compute reward R = w1*success - w2*counter + w3*efficiency
    3. Update policy weights via gradient ascent:
           weight_new = weight_old + α * R * ∂logπ/∂weight
    4. Persist updated weights to ai_policy.json
```

* `α` (learning_rate) is configurable in `config.json` under `ai_learning_rate`.  
* The system is deterministic for a given seed, making it reproducible for testing.

### Player‑Facing Effects  

| AI Behavior | Trigger | In‑Game Manifestation |
|-------------|---------|-----------------------|
| **Aggressive Expansion** | High reward from territorial gains | More frequent raids, faster city founding |
| **Defensive Posture** | Frequent heavy losses | Fortified borders, increased scouting |
| **Technological Rush** | High mana efficiency | Rapid research of magical tech, spawning of spell‑casters |
| **Economic Sabotage** | High gold‑theft reward | Trade embargoes, market price manipulation |

### Modding the AI  

- Edit `ai_policy.json` to manually set initial weights.  
- Add new decision nodes in `ai/decision_tree.yaml`.  
- Use the `ai_debug` console command to print current weights.

---  

## Troubleshooting & Debugging  

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| **Game crashes on start** | Missing `pygame` or incompatible Python version | Verify `python --version` ≥ 3.8 and run `pip install -r requirements.txt`. |
| **Black screen / no graphics** | GPU driver issues or missing SDL libraries | Install system SDL2 (`apt-get install libsdl2-2.0-0` on Linux) or update graphics drivers. |
| **Performance drops below 30 FPS** | High `game_speed` + many active entities | Lower `game_speed` in `config.json` or enable `debug_mode: false`. |
| **AI never adapts** | `ai_learning_rate` set to 0 or `ai_adaptation_interval` too high | Set `"ai_learning_rate": 0.05` and `"ai_adaptation_interval": 30`. |
| **Save file corrupted** | Unexpected shutdown while writing `world_state.json` | Delete the last backup (`world_state.backup.json`) and restart; the game will load the previous autosave. |
| **Audio missing** | `pygame.mixer` not initialized (common on headless servers) | Ensure you have a working audio device or set `"audio_enabled": false` in `config.json`. |

### Enabling Debug Mode  

1. Open `config.json`.  
2. Set `"debug_mode": true`.  
3. Restart the game.  

You will now see:  

- FPS counter in the top‑right corner.  
- Real‑time values for `ai_adaptation_score`, `morale`, and `population growth rate`.  
- Press **F12** to open the in‑game console (type `help` for commands).  

### Common Console Commands  

| Command | Description |
|---------|-------------|
| `save` | Immediately writes a new save file. |
| `load <slot>` | Loads a specific save slot. |
| `config set <key> <value>` | Change a config option on the fly. |
| `ai dump` | Prints current AI policy weights. |
| `world dump` | Outputs the full `world_state.json` to the console. |
| `log level <debug|info|warn|error>` | Adjusts logging verbosity. |

---  

## Current Game State  

| Metric | Value |
|--------|-------|
| **Day** | **99 359** |
| **Population** | **13 041** |
| **Treasury** | **136 359 847 504** gold |

These numbers are automatically loaded from `world_state.json` at launch.  

---  

## Contributing  

We welcome contributions of any kind—code, art, music, documentation, or balance tweaks.

1. **Fork** the repository.  
2. Create a **feature branch** (`git checkout -b feature/awesome‑feature`).  
3. Follow the **PEP‑8** style guide for Python and keep pixel‑art assets at **16 × 16** tiles unless a larger size is justified.  
4. Add or update **unit tests** in `tests/`.  
5. Submit a **Pull Request** with a clear description of changes.  

See `CONTRIBUTING.md` for detailed guidelines, code of conduct, and the release process.

---  

## License  

This project is licensed under the **MIT License**. See the `LICENSE` file for the full text.  

---  

*Happy world‑building, and may your darkness be ever‑lasting!*  