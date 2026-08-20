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
**Dark Fantasy Pixel Art Civilization** is a hybrid strategy‑city‑builder set in a brooding, hand‑crafted pixel‑art world. You assume the role of a fledgling ruler tasked with guiding a nascent civilization through centuries of hardship, war, and mystic intrigue.  

- **Atmosphere:** Dark fantasy lore, ominous music, and atmospheric lighting.  
- **Gameplay Loop:** Gather resources → Build/upgrade structures → Expand territory → Explore dangerous locales → Defend against ever‑evolving AI threats.  
- **Goal:** Grow your population, amass wealth, and ultimately dominate the continent while surviving the relentless encroachment of supernatural forces.

Current in‑game snapshot (as of the latest save):  

| Variable | Value |
|----------|-------|
| **Day** | **65790** |
| **Population** | **7 670** |
| **Treasury** | **42 300 925 201** |

These numbers are automatically persisted in `savegame.json` and displayed on the main HUD.

---

## Features
| Feature | Description |
|---------|-------------|
| **Pixel‑Art Graphics** | 32‑bit style sprites, animated tiles, and hand‑drawn UI elements that evoke classic RPG aesthetics. |
| **Dynamic City‑Building** | Construct residential, military, magical, and economic districts. Each building influences multiple world‑state variables (e.g., food production, morale, research). |
| **Exploration & Dungeons** | Procedurally generated forests, ruins, and underground catacombs filled with loot, lore, and hostile entities. |
| **Resource Management** | Manage food, wood, stone, mana, and gold. Trade routes can be opened with neighboring AI factions. |
| **Population Mechanics** | Birth, death, migration, and morale affect growth. Special events (plagues, festivals) modify the population curve. |
| **AI Improvement System** *(see section below)* | The AI adapts its strategies based on your playstyle, scaling difficulty and introducing new challenges. |
| **Mod‑Friendly Architecture** | All game data (units, buildings, events) lives in JSON/YAML files, making it easy to add custom content. |
| **Save/Load System** | Automatic daily snapshots and manual save slots. |
| **Cross‑Platform** | Runs on Windows, macOS, and Linux via Python + Pygame. |

---

## Installation
### Prerequisites
- **Python** ≥ 3.8 (tested on 3.8‑3.12)  
- **Pygame** ≥ 2.0  
- Optional: **Git** (for cloning the repo)  

### Step‑by‑Step Guide
```bash
# 1️⃣ Clone the repository
git clone https://github.com/your-username/dark-fantasy-pixel-civ.git
cd dark-fantasy-pixel-civ

# 2️⃣ Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# 3️⃣ Install dependencies
pip install -r requirements.txt

# 4️⃣ Verify the installation (runs a quick sanity check)
python -m pytest tests/   # optional but recommended

# 5️⃣ Launch the game
python main.py
```

**Alternative (no Git):** Download the ZIP from the GitHub releases page, extract it, and run the same `pip install -r requirements.txt` + `python main.py` steps.

---

## Configuration
All configurable options live in `config.json`. The file is loaded at startup; missing keys fall back to defaults.

```json
{
  "difficulty": "medium",          // Options: "easy", "medium", "hard"
  "starting_population": 1500,
  "starting_treasury": 500000,
  "starting_day": 1,
  "autosave_interval_days": 7,
  "enable_mods": true,
  "mod_folder": "mods/",
  "audio": {
    "music_volume": 0.7,
    "sfx_volume": 0.8
  },
  "graphics": {
    "resolution": [1280, 720],
    "fullscreen": false,
    "pixel_scaling": 2
  }
}
```

### Common Tweaks
| Setting | Effect | Typical Values |
|---------|--------|----------------|
| `difficulty` | Determines AI aggression, resource scarcity, and event frequency. | `easy` (generous resources), `medium` (balanced), `hard` (scarce). |
| `autosave_interval_days` | How many in‑game days between automatic saves. | `1–30`. |
| `enable_mods` | Turns the mod loader on/off. | `true` / `false`. |
| `pixel_scaling` | Upscales the pixel art for modern displays. | `1` (native), `2`, `3`, `4`. |

After editing `config.json`, restart the game for changes to take effect.

---

## World State Variables
The engine tracks a set of core variables that drive gameplay. They are persisted in `savegame.json` and can be inspected via the debug console (`~` key).

| Variable | Type | Description | Current Value |
|----------|------|-------------|---------------|
| `day` | Integer | In‑game day counter (starts at 1). | **65790** |
| `population` | Integer | Total number of citizens (including children). | **7 670** |
| `treasury` | Integer | Gold reserves (raw integer, displayed with commas). | **42 300 925 201** |
| `food_stock` | Integer | Units of food stored; affects starvation risk. | (dynamic) |
| `mana_pool` | Integer | Magical energy available for spells & research. | (dynamic) |
| `morale` | Float (0‑1) | Overall citizen happiness; influences growth rate. | (dynamic) |
| `military_strength` | Integer | Sum of combat power of all units. | (dynamic) |
| `tech_level` | Integer | Current tier of research unlocked. | (dynamic) |
| `dungeon_explored` | Integer | Number of unique dungeons cleared. | (dynamic) |

### Accessing Variables Programmatically
```python
from game.state import WorldState

ws = WorldState.load('savegame.json')
print(ws.day, ws.population, ws.treasury)
```

---

## AI Improvement System
The AI is not a static script; it evolves based on a **multi‑layered adaptation loop**:

1. **Data Collection** – Every 24 in‑game hours the AI logs:
   * Player building patterns (e.g., heavy focus on military vs. economy).
   * Resource flow (which resources you hoard or neglect).
   * Tactical choices in combat (unit composition, spell usage).

2. **Pattern Analysis** – A lightweight decision‑tree evaluates the logs and assigns a *playstyle score* (e.g., “Aggressive Builder”, “Economic Hoarder”).

3. **Difficulty Scaling** – Based on the score:
   * **Aggressive Builder** → AI increases raid frequency, adds elite units.
   * **Economic Hoarder** → AI imposes trade embargoes, raises market prices.
   * **Balanced** → AI introduces mixed challenges (random events, hidden monsters).

4. **Dynamic Event Generation** – The AI can spawn custom events (plagues, bandit raids, magical storms) that directly counter the player’s current strengths.

5. **Learning Persistence** – The AI’s learned model is saved in `ai_state.json`. When you load a save, the AI resumes from its last adaptation point, ensuring continuity across play sessions.

### Tuning the AI (Advanced)
If you wish to modify the AI’s behavior, edit `ai_rules.yaml`. Example snippet:

```yaml
aggressive_builder:
  raid_chance: 0.25   # 25% chance per day
  elite_unit_spawn: true
  resource_tax: 0.05 # 5% tax on gold income

economic_hoarder:
  trade_embargo: true
  market_price_multiplier: 1.3
```

> **Note:** Changing AI rules may unbalance the game. Keep a backup of the original file.

---

## Troubleshooting & FAQ
### The game crashes on startup
1. Verify Python version (`python --version`). Must be ≥ 3.8.  
2. Ensure Pygame is correctly installed: `pip show pygame`. If missing, run `pip install pygame`.  
3. Check the console for an error trace. Common culprits:
   * Missing `SDL` libraries on Linux (`sudo apt-get install libsdl2-dev`).
   * Incompatible graphics driver (update GPU drivers).

### Performance is sluggish
* Reduce `graphics.pixel_scaling` to `1`.  
* Disable fullscreen (`graphics.fullscreen: false`).  
* Close other CPU‑intensive applications.

### Save files become corrupted
* The game writes a temporary file (`savegame.tmp`) before overwriting the main save. If the process is interrupted, the temp file may be left behind. Delete `savegame.tmp` and reload the last good `savegame.json`.  
* Enable `autosave_interval_days` to a lower value to minimize data loss.

### AI becomes “impossible” after a few days
* The AI adapts to your dominant strategy. Try varying your playstyle (e.g., focus on research for a few days, then shift to military).  
* You can manually reset AI learning by deleting `ai_state.json` (the AI will start from default difficulty).

### Mod loading fails
* Ensure each mod folder contains a valid `mod.json` manifest.  
* Check the console for JSON parsing errors; fix malformed syntax.  
* Verify that `config.json` has `"enable_mods": true` and that the `mod_folder` path is correct.

### I want to run the game on macOS with Apple Silicon
* Use the universal Python installer from python.org (or Homebrew `brew install python`).  
* Pygame 2.0+ provides native ARM builds; if you encounter issues, install from source: `pip install --no-binary :all: pygame`.

---

## Contributing
We welcome community contributions! Follow these steps:

1. **Fork** the repository.  
2. Create a **feature branch**: `git checkout -b feature/awesome-feature`.  
3. Make your changes, ensuring they pass existing tests (`pytest`).  
4. Update documentation (README, docstrings).  
5. Submit a **Pull Request** with a clear description of the change.  

Please read `CONTRIBUTING.md` for coding standards, commit message guidelines, and the review process.

---

## License
This project is licensed under the **MIT License**. See the `LICENSE` file for full terms.

---

*Happy building, explorer! May your civilization thrive amidst the shadows.*