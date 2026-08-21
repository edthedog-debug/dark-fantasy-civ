# Dark Fantasy Pixel Art Civilization Game  

## Table of Contents
1. [Project Overview](#project-overview)  
2. [Features](#features)  
3. [Installation](#installation)  
4. [Configuration](#configuration)  
5. [World State Variables](#world-state-variables)  
6. [AI Improvement System](#ai-improvement-system)  
7. [Troubleshooting](#troubleshooting)  

---

## Project Overview
A dark‑fantasy, pixel‑art civilization simulator where you rule a fledgling settlement in a cursed world.  
- **Genre:** Strategy / City‑Builder / Simulation  
- **Perspective:** Top‑down, tile‑based pixel art  
- **Goal:** Grow your population, amass wealth, and master forbidden magics while surviving hostile forces and environmental hazards.  

The game tracks an ever‑evolving world state (day count, population, treasury, etc.) and features an AI‑driven decision‑support system that can be upgraded as your civilization advances.

---

## Features
- **Hand‑crafted pixel art** with a dark fantasy aesthetic.  
- **Dynamic day/night cycle** and weather that affect productivity and morale.  
- **Deep resource management** (food, gold, mana, stone, wood, etc.).  
- **Building system** ranging from modest huts to towering citadels and arcane labs.  
- **AI Improvement System** – earn AI points to unlock smarter advisors, predictive analytics, and automated optimizations.  
- **Random events** (plagues, raids, meteor strikes, relic discoveries) that force strategic decisions.  
- **Modular configuration** allowing custom difficulty, starting conditions, and rule tweaks.  
- **Save/load** functionality with auto‑backup to prevent data loss.  

---

## Installation
1. **Prerequisites**  
   - Python 3.10 or newer  
   - `pip` package manager  

2. **Clone the repository**  
   ```bash
   git clone https://github.com/your‑org/dark‑fantasy‑pixel‑civilization.git
   cd dark‑fantasy‑pixel‑civilization
   ```

3. **Install dependencies**  
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the game**  
   ```bash
   python main.py
   ```

*Optional:* Create a virtual environment before installing dependencies to keep the project isolated.

---

## Configuration
All configurable options live in `config.json`.  
```json
{
  "difficulty": "medium",          // Options: "easy", "medium", "hard"
  "starting_population": 1000,
  "starting_treasury": 1000000,
  "starting_day": 1,
  "resource_multipliers": {
    "food": 1.0,
    "gold": 1.0,
    "mana": 1.0
  },
  "enable_random_events": true,
  "autosave_interval_minutes": 10
}
```
- **difficulty** – influences resource availability, enemy aggression, and AI point gain rate.  
- **starting_* values** – set the initial world state.  
- **resource_multipliers** – fine‑tune the yield of each resource type.  
- **enable_random_events** – toggle the random‑event engine.  
- **autosave_interval_minutes** – how often the game auto‑saves.  

After editing, save the file and restart the game for changes to take effect.

---

## World State Variables
The engine maintains a set of global variables that can be displayed in the UI or accessed via the console for debugging/modding.

| Variable | Type | Description | Example (Current) |
|----------|------|-------------|-------------------|
| `day` | int | Current day number (increments each turn) | **83729** |
| `population` | int | Total number of citizens alive | **10541** |
| `treasury` | int | Gold reserves (in the smallest currency unit) | **84,568,036,297** |
| `food_stock` | int | Amount of stored food | (depends on gameplay) |
| `mana_stock` | int | Stored magical energy | (depends on gameplay) |
| `ai_level` | int | Current AI improvement tier | (depends on upgrades) |
| `ai_points` | int | Points available to spend on AI upgrades | (depends on gameplay) |
| `happiness_index` | float (0‑1) | Average citizen happiness | (depends on gameplay) |
| `threat_level` | int | Aggregate danger from monsters, bandits, etc. | (depends on gameplay) |

These variables are persisted in the `save/` directory as part of the save‑file JSON.

---

## AI Improvement System
The AI system acts as a council of advisors that can be upgraded to provide smarter automation and strategic hints.

### Core Concepts
- **AI Level** – Determines which tiers of upgrades are unlocked.  
- **AI Points** – Earned each day based on population size, treasury health, and difficulty. Points are spent on specific upgrades.  

### Upgrade Categories
| Category | Effects | Example Upgrades |
|----------|---------|------------------|
| **Resource Forecasting** | Predicts shortages 3‑5 days ahead, suggests allocation changes. | “Short‑Term Food Forecast”, “Mana Flow Optimizer”. |
| **Combat Planning** | Auto‑generates defensive formations, suggests troop recruitment. | “Siege Counter‑measure”, “Night‑Raid Alert”. |
| **Diplomacy & Trade** | Generates trade offers, negotiates treaties with AI‑controlled factions. | “Trade Route Optimizer”, “Alliance Advisor”. |
| **City Planning** | Suggests optimal placement of new buildings for efficiency. | “Grid Optimizer”, “Cultural District Planner”. |

### How to Upgrade
1. Open the **AI Council** UI (press `F2` or click the AI icon).  
2. Review available upgrades (cost shown in AI points).  
3. Click **Upgrade** to spend points.  
4. The effect becomes active immediately.

**Sample AI Point Gain Formula**  
```python
base_gain = 10
gain = base_gain * (population / 1000) * (treasury / 1_000_000) * difficulty_modifier
```
- `difficulty_modifier` = 1.2 (easy), 1.0 (medium), 0.8 (hard)

---

## Troubleshooting
| Issue | Possible Cause | Fix |
|-------|----------------|-----|
| **Game crashes on start** | Missing or incompatible Python version / dependencies. | Verify Python ≥ 3.10, reinstall dependencies (`pip install -r requirements.txt`). |
| **Save files not loading** | Corrupted JSON or insufficient file permissions. | Delete the offending save in `save/` (a backup is auto‑saved with `.bak`), ensure the `save/` folder is writable. |
| **AI points do not increase** | Difficulty set to *hard* with very low population/treasury. | Boost population via “Recruit Citizens” building or temporarily lower difficulty. |
| **Graphics appear garbled** | Missing `assets/` folder or wrong working directory. | Ensure you run the game from the project root where `assets/` resides. |
| **Random events never happen** | `enable_random_events` set to `false`. | Set `"enable_random_events": true` in `config.json`. |
| **Performance drops on high day counts** | Large world state arrays causing memory overhead. | Enable `config.json` option `"optimize_memory": true` (adds lazy‑loading of distant tiles). |

**Log Files**  
All runtime messages are written to `logs/game.log`. Check this file for stack traces or warning messages.

**Community Support**  
- Discord: `discord.gg/dark‑fantasy‑civ`  
- GitHub Issues: <https://github.com/your‑org/dark‑fantasy‑pixel‑civilization/issues>  

---

### Current Game State (as of this README)

- **Day:** 83729  
- **Population:** 10 541  
- **Treasury:** 84 568 036 297  

May your kingdom thrive in the shadows!