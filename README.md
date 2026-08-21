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
7. [Troubleshooting](#troubleshooting)  
8. [Current Game State](#current-game-state)  
9. [Contributing & Reporting Issues](#contributing--reporting-issues)  

---

## Project Overview
**Dark Fantasy Pixel Art Civilization** is a strategy‑city‑builder set in a brooding, hand‑crafted pixel‑art world. You assume the role of a fledgling ruler tasked with guiding a nascent civilization through the perils of a dark fantasy realm—​monstrous beasts, cursed ruins, and ever‑shifting magical forces.  

Key design goals:

| Goal | Description |
|------|-------------|
| **Atmospheric Art** | 16‑bit style sprites, animated tiles, and atmospheric lighting to evoke a grim, mystical vibe. |
| **Deep Systems** | Interlocking resource, population, and morale mechanics that react to day/night cycles, weather, and player decisions. |
| **AI‑Assisted Management** | A modular AI improvement system that lets you train “advisors” to automate or optimise specific tasks. |
| **Dynamic World** | World state variables evolve continuously, influencing events, quests, and AI behaviour. |

The game is built with **Python 3.9+** and **Pygame**, making it easy to run on Windows, macOS, and Linux.

---

## Features
- **Pixel‑Art World** – Hand‑drawn tiles, animated sprites, and a dark fantasy palette.
- **City‑Building & Management** – Construct houses, workshops, temples, and defensive structures while balancing food, wood, stone, mana, and gold.
- **Exploration & Discovery** – Send scouts to uncover hidden locations, ancient relics, and resource‑rich biomes.
- **Dynamic Day/Night & Weather** – Each day (in‑game) progresses through sunrise, daylight, sunset, and night; weather events (rain, fog, storms) affect productivity and morale.
- **AI Improvement System** – Train AI advisors in:
  - **Resource Management** – Optimise gathering, storage, and distribution.
  - **Construction** – Reduce build times, prioritize critical structures.
  - **Research & Lore** – Accelerate tech trees, unlock magical upgrades.
- **Event Engine** – Random and scripted events (plagues, invasions, festivals) that react to world‑state variables.
- **Modular Architecture** – Core engine, UI, and data layers are decoupled, allowing community mods.

---

## Installation
### Prerequisites
| Component | Minimum Version |
|-----------|-----------------|
| **Python** | 3.9 |
| **Pygame** | 2.1.2 |
| **Git** (optional) | any |

### Step‑by‑Step
```bash
# 1️⃣ Clone the repository
git clone https://github.com/your-username/dark-fantasy-pixel-civ.git
cd dark-fantasy-pixel-civ

# 2️⃣ (Optional) Create a virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# 3️⃣ Install required Python packages
pip install -r requirements.txt

# 4️⃣ Run the game
python main.py
```

**Troubleshooting the install**  
- *“pygame not found”* → Ensure you have the correct Python version and run `pip install pygame`.  
- *“DLL load failed”* (Windows) → Install the latest Visual C++ Redistributable.  

---

## Configuration
All runtime options live in **`config.json`** (generated on first launch if missing). Below is a sample with explanations:

```json
{
  "difficulty": "medium",               // easy | medium | hard
  "starting_population": 500,
  "starting_treasury": 1000000,
  "enable_ai_advisors": true,
  "max_ai_advisors": 5,
  "autosave_interval_minutes": 10,
  "graphics": {
    "scale_factor": 2,
    "fullscreen": false,
    "vsync": true
  },
  "audio": {
    "master_volume": 0.8,
    "music_volume": 0.6,
    "sfx_volume": 0.9
  }
}
```

**Key configurable sections**

| Section | Setting | Effect |
|---------|---------|--------|
| `difficulty` | `easy`/`medium`/`hard` | Alters resource yields, enemy aggression, and AI learning speed. |
| `starting_population` / `starting_treasury` | Integer | Overrides the default start values. |
| `enable_ai_advisors` | Boolean | Turns the AI improvement system on/off. |
| `max_ai_advisors` | Integer (1‑10) | Caps how many advisors you can train simultaneously. |
| `graphics.scale_factor` | 1‑4 | Pixel‑art scaling for high‑DPI displays. |
| `audio.*_volume` | 0.0‑1.0 | Volume sliders for master, music, and sound‑effects. |

Edit the file, save, and restart the game for changes to take effect.

---

## World State Variables
The engine tracks a set of **global variables** that persist across saves. They are exposed to the UI, AI advisors, and event scripts.

| Variable | Type | Description | Example (Current) |
|----------|------|-------------|-------------------|
| `day` | Integer | Current in‑game day count (starts at 1). | **81811** |
| `population` | Integer | Total living citizens (including children). | **10233** |
| `treasury` | Integer | Gold stored in the royal vault. | **79 143 987 335** |
| `food_stock` | Integer | Units of food available for consumption. |
| `mana_reserve` | Integer | Magical energy used for spells & research. |
| `morale` | Float (0‑1) | Overall citizen happiness; influences growth rate. |
| `weather` | Enum | Current weather (`clear`, `rain`, `storm`, `fog`). |
| `season` | Enum | `spring`, `summer`, `autumn`, `winter`. |
| `active_events` | List | IDs of currently active scripted events. |
| `ai_advisor_levels` | Dict | `{advisor_name: level}` – tracks each advisor’s progress. |

These variables can be inspected via the **Debug Console** (`~` key) or exported to a JSON dump (`debug/export_state.json`).

---

## AI Improvement System
### Overview
The AI system provides **advisors**—autonomous agents that can be trained to handle specific aspects of civilization management. Advisors learn through a **skill‑tree** and gain experience by completing tasks.

### Advisor Types
| Advisor | Primary Domain | Example Tasks |
|---------|----------------|---------------|
| **Mara the Steward** | Resource Management | Re‑allocate surplus wood, balance food consumption. |
| **Gorath the Architect** | Construction | Prioritise defensive walls, schedule building upgrades. |
| **Eldra the Sage** | Research & Lore | Choose optimal tech paths, allocate mana for experiments. |
| **Riven the Guard** | Defense | Auto‑deploy troops, predict invasion waves. |
| **Sylas the Envoy** | Diplomacy/Trade | Manage caravans, negotiate with neighboring factions. |

### Training Mechanics
1. **Allocate Training Points** – Earned each day based on `morale` and `treasury`.  
2. **Select Skill Branch** – Each advisor has a branching tree (e.g., *Efficient Harvesting → Bulk Storage → Trade Surplus*).  
3. **Experience Gain** – Completing tasks grants XP; higher levels reduce task cooldowns and increase effectiveness.  

### Integration with Gameplay
- Advisors can be **assigned** to a city district or left **unassigned** (global effect).  
- The AI can **suggest** actions via the UI (e.g., “Build a granary to avoid famine”).  
- Players may **override** AI decisions at any time.  

### Persistence
All advisor data is saved in `save/<save_name>/ai_advisors.json`. Modifying this file manually is possible but may corrupt the skill tree.

---

## Troubleshooting
### General Tips
| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| **Game crashes on start** | Missing/incorrect Pygame version | `pip install -U pygame` |
| **Black screen / no graphics** | `scale_factor` set too high for GPU | Reduce `graphics.scale_factor` to 1 or 2 |
| **Audio crackles** | Out‑of‑sync vsync disabled | Enable `graphics.vsync` in `config.json` |
| **AI advisors do nothing** | `enable_ai_advisors` set to `false` or no training points | Set `enable_ai_advisors: true` and allocate points in the Advisor UI |
| **World variables not updating** | Corrupted `save_state.json` | Delete the corrupted save (or restore from backup) and start a new game |

### Known Issues (as of v1.2.0)
| Issue | Description | Work‑around |
|-------|-------------|------------|
| **Memory leak on long‑running sessions** | Repeated loading of large map chunks can increase RAM usage. | Restart the game every ~10,000 in‑game days. |
| **AI advisor level reset after update** | Occasionally the JSON schema changes. | Back up `ai_advisors.json` before updating; re‑import after patch. |
| **Weather not syncing with season** | Visuals may show summer rain in winter. | This is cosmetic; gameplay impact is unchanged. |

### Debug Console
Press **`~`** (tilde) to open the console. Useful commands:

```text
state          # prints all world state variables
advisor <name> # shows advisor details
set day 1      # manually set the day (for testing)
save           # force a save
```

---

## Current Game State
> **Day:** 81 811  
> **Population:** 10 233  
> **Treasury:** 79 143 987 335  

These numbers are automatically loaded from the latest save file. Use the Debug Console to verify.

---

## Contributing & Reporting Issues
- **Fork** the repository and submit **pull requests** for bug fixes, new art, or feature additions.  
- Follow the **PEP‑8** style guide for Python code and keep pixel art dimensions consistent (16×16 base tile).  
- **Issue Tracker:** <https://github.com/your-username/dark-fantasy-pixel-civ/issues>  
  - Include OS, Python version, a short description, and steps to reproduce.  
  - Attach logs from `debug/log.txt` if possible.  

---

### License
This project is released under the **MIT License** – see `LICENSE` for details.

---

Enjoy building your dark empire, and may your pixel‑crafted legends endure!