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
9. [Design Rationale (Reasoning)](#design-rationale)  

---

## Project Overview
A dark‑fantasy, pixel‑art civilization simulator where you lead a fledgling realm through centuries of hardship, magic, and conquest. Build cities, manage resources, explore cursed lands, and harness ancient AI‑driven upgrades to shape the destiny of your people.

---

## Features
- **Pixel‑Art Aesthetic** – Hand‑crafted 16‑bit sprites and atmospheric chiptune soundtrack.  
- **Deep City‑Building** – Construct districts, manage food, stone, mana, and gold.  
- **Exploration & Lore** – Uncover ruins, encounter mythic beasts, and discover hidden quests.  
- **Dynamic AI Improvement System** – Research, train, and evolve AI‑assisted civics, units, and magic.  
- **World State Tracking** – Real‑time variables for day count, population, treasury, morale, and more.  
- **Scalable Difficulty** – Easy / Medium / Hard presets with adjustable game‑speed.  
- **Mod‑Friendly Architecture** – JSON‑based data files and a plugin hook for community extensions.

---

## Installation
### Prerequisites
| Tool | Minimum Version |
|------|-----------------|
| Python | 3.9 |
| Pygame | 2.1.2 |
| Git (optional) | any |

### Steps
```bash
# 1. Clone the repo
git clone https://github.com/your‑org/dark‑fantasy‑civ.git
cd dark-fantasy-civ

# 2. Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the game
python main.py
```

*If you prefer Docker:*
```bash
docker build -t dark-fantasy-civ .
docker run -it --rm dark-fantasy-civ
```

---

## Configuration
All configurable options live in **`config.py`** (or `config.json` for data‑only settings).

| Setting | Description | Default |
|---------|-------------|---------|
| `GAME_SPEED` | Multiplier for in‑game time progression (1 = real‑time, 2 = double speed) | `1` |
| `DIFFICULTY` | `"easy"`, `"medium"`, `"hard"` – influences resource yields & AI aggression | `"medium"` |
| `STARTING_TREASURY` | Gold at game start | `5_000_000` |
| `MAX_POPULATION` | Hard cap for population (can be raised via AI upgrades) | `100_000` |
| `ENABLE_MODS` | Load JSON mod files from `mods/` folder | `True` |

Edit the file directly or pass command‑line overrides:
```bash
python main.py --speed 2 --difficulty hard
```

---

## World State Variables
The engine maintains a central **`WorldState`** object (exposed via `world/state.py`). Key variables:

| Variable | Type | Meaning |
|----------|------|---------|
| `day` | `int` | Current day number (e.g., **71729**) |
| `population` | `int` | Total citizens alive (**8621**) |
| `treasury` | `int` | Gold reserves (**54 375 848 879**) |
| `food_stock` | `int` | Units of food stored |
| `mana_pool` | `int` | Magical energy available for spells & research |
| `morale` | `float` (0‑1) | Overall citizen happiness |
| `tech_level` | `int` | Current tier of technological advancement |
| `ai_level` | `int` | Current AI improvement tier |

These values are saved to `savegames/` as JSON each time the player clicks **Save** or on auto‑save intervals.

---

## AI Improvement System
A core gameplay loop: **Research → Upgrade → Unlock**.

1. **AI Research Points (AI‑RP)** are generated each turn based on `mana_pool` and `tech_level`.  
2. Spend AI‑RP on **Improvement Trees** (e.g., *Economic AI*, *Military AI*, *Arcane AI*).  
3. Each node grants:
   - **Passive bonuses** (e.g., +5 % gold tax efficiency).  
   - **Active abilities** (e.g., automated resource allocation).  
   - **New content** (units, spells, building types).  

### Example Upgrade Path – Economic AI
| Tier | Cost (AI‑RP) | Effect |
|------|--------------|--------|
| 1 – *Tax Optimizer* | 150 | +3 % tax revenue |
| 2 – *Market Forecast* | 300 | Predicts resource shortages 5 days ahead |
| 3 – *Automated Trade Routes* | 600 | Auto‑opens profitable trade caravans |

The system is data‑driven: each tree is defined in `data/ai_trees/*.json`, making it easy to add new branches or balance existing ones.

---

## Troubleshooting
| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| **Game crashes on launch** | Missing Pygame or incompatible Python version | Verify `python --version` ≥ 3.9 and reinstall dependencies: `pip install -r requirements.txt` |
| **Graphics appear garbled** | Running on a high‑DPI display without scaling | Set environment variable `SDL_VIDEO_HIGHDPI_DISABLED=1` before launching |
| **AI upgrades not unlocking** | `ai_level` capped at 0 due to corrupted save file | Delete/rename the problematic `savegames/*.json` and start a new game |
| **Slow performance after many days** | Large `event_log` array consuming memory | Enable `CONFIG['TRUNCATE_LOG'] = True` in `config.py` (keeps only last 10 000 entries) |
| **Mod files not loading** | `mods/` folder missing `__init__.py` or JSON syntax error | Ensure each mod folder contains a valid `manifest.json` and run `python tools/validate_mods.py` |

### Getting Help
- **Discord**: `discord.gg/darkfantasyciv` – live community support.  
- **GitHub Issues**: Open a ticket with steps to reproduce.  
- **Documentation**: Additional API docs in `docs/` folder.

---

## Current Game State
> **Day:** 71729  
> **Population:** 8621  
> **Treasury:** 54 375 848 879  

These numbers are automatically displayed on the main HUD and can be inspected via the debug console (`~` key).

---

## Design Rationale (Reasoning Behind the README)

Below is a concise summary of the thought process that shaped the README content:

1. **Clarity & Completeness** – The user explicitly requested seven sections plus the current world state. I organized the document with a table of contents for quick navigation and ensured each required heading appears verbatim.

2. **Technical Detail** – Since the game is a Python/Pygame project, I listed exact version requirements, a pip‑based install flow, and an optional Docker alternative. This mirrors typical open‑source game READMEs and reduces friction for new contributors.

3. **Configuration Transparency** – Providing a table of configurable options (speed, difficulty, treasury, etc.) helps users understand how to tweak the experience without digging into source code.

4. **World State Variables** – I enumerated the core variables (day, population, treasury) and added a few ancillary ones (food, mana, morale) that are logically part of a civilization sim. This gives developers a clear contract for serialization and UI display.

5. **AI Improvement System** – The original prompt mentioned an “AI improvement system.” I expanded it into a research‑upgrade loop, illustrated with a concrete Economic AI tree, and noted the data‑driven JSON format to aid modders.

6. **Troubleshooting** – Common failure modes (missing dependencies, graphics scaling, save corruption) are typical for Python games. I paired each symptom with a concise fix and added a “Getting Help” subsection.

7. **Current State Inclusion** – The exact numbers supplied (Day 71729, Population 8621, Treasury 54375848879) are displayed prominently both in the “World State Variables” table and a dedicated “Current Game State” block for quick reference.

8. **Formatting** – All sections use standard Markdown headings, tables, and code fences, ensuring the file renders cleanly on GitHub, GitLab, or any Markdown viewer.

By following this structure, the README serves both **players** (who need quick start instructions) and **developers/modders** (who need deeper configuration and extension details).