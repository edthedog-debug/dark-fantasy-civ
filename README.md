# Dark Fantasy Pixel Art Civilization Game  

*Version: 1.0.0*  
*License: MIT*  

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
9. [Contributing](#contributing)  
10. [Contact & Support](#contact--support)  

---  

## Project Overview  

Welcome to **Dark Fantasy Pixel Art Civilization**, a strategy‑simulation game that blends classic city‑building mechanics with a brooding, hand‑crafted pixel‑art world. You command a fledgling settlement in a realm of ancient magic, cursed forests, and lurking monsters.  

- **Pixel‑art aesthetic** – Dark, atmospheric tiles and sprites that evoke a grim fantasy vibe.  
- **Dynamic world** – Day/night cycles, weather, and random events that affect resource flow and citizen morale.  
- **Deep management** – Balance food, gold, mana, and population while expanding your territory and defending against threats.  
- **AI assistants** – Train AI “advisors” that gradually take over routine tasks, research technologies, and uncover hidden lore.  

The game is built with **Python 3.11**, **Pygame** for rendering, and a lightweight JSON‑based save system, making it easy to extend or mod.  

---  

## Features  

| Feature | Description |
|---------|-------------|
| **Pixel‑art world** | Hand‑drawn tiles, animated sprites, day‑night lighting, weather effects (rain, fog, aurora). |
| **City‑building** | Construct homes, farms, workshops, temples, and defensive structures. Each building influences multiple world variables. |
| **Resource management** | Four core resources: **Food**, **Gold**, **Mana**, **Stone**. Resources are produced, stored, and consumed each turn. |
| **Population dynamics** | Birth, death, migration, and morale are simulated. Population growth unlocks new building tiers. |
| **AI Improvement System** | Hire AI advisors (e.g., *Logistics*, *Research*, *Military*). Advisors gain experience, unlock new actions, and can be assigned to specific tasks. |
| **World state variables** | Global variables (Day, Population, Treasury, etc.) are persisted in `save.json`. They can be inspected or modified via the debug console. |
| **Event engine** | Random and scripted events (plagues, raids, festivals) that modify world variables and trigger story moments. |
| **Mod‑friendly** | All game data (buildings, events, AI skills) lives in JSON/YAML files, allowing community extensions without code changes. |
| **Save/Load** | Automatic checkpoint every 10 days, manual save slots, and cloud‑sync (optional). |

---  

## Installation  

### Prerequisites  

* **Python 3.11+** – https://www.python.org/downloads/  
* **Git** – for cloning the repository (optional, you can download a zip).  

### Steps  

```bash
# 1. Clone the repository
git clone https://github.com/your-username/dark-fantasy-pixel-civ.git
cd dark-fantasy-pixel-civ

# 2. Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# 3. Install required packages
pip install -r requirements.txt

# 4. Run the game
python main.py
```

**Optional:** To build a standalone executable (Windows/macOS/Linux) use PyInstaller:

```bash
pip install pyinstaller
pyinstaller --onefile --windowed main.py
```

The generated binary will appear in the `dist/` folder.

---  

## Configuration  

All configurable options are stored in `config.json`. Below is a sample with explanations:

```json
{
  "difficulty": "medium",               // Options: "easy", "medium", "hard"
  "ai_improvement_rate": 1.2,           // Multiplier for AI experience gain per day
  "resource_gathering_rate": 1.0,       // Global multiplier for all resource production
  "starting_population": 500,
  "starting_treasury": 100000,
  "enable_weather": true,
  "enable_day_night_cycle": true,
  "autosave_interval_days": 10,
  "debug_mode": false
}
```

* **difficulty** – Influences resource scarcity, enemy aggression, and event severity.  
* **ai_improvement_rate** – Higher values make AI advisors level up faster, but may reduce the challenge.  
* **resource_gathering_rate** – Useful for testing or custom scenarios.  
* **enable_weather / enable_day_night_cycle** – Turn visual effects on/off for low‑end hardware.  

After editing `config.json`, restart the game for changes to take effect.

---  

## World State Variables  

The core state of the simulation is stored in `save.json`. Below is a description of each top‑level variable:

| Variable | Type | Meaning |
|----------|------|---------|
| `day` | integer | Current in‑game day (starts at 1). |
| `population` | integer | Number of living citizens. |
| `treasury` | integer | Gold reserves (used for building, hiring, research). |
| `food_stock` | integer | Amount of stored food. |
| `mana_reserve` | integer | Magical energy used for spells and special buildings. |
| `stone_stock` | integer | Building material for walls, roads, etc. |
| `morale` | float (0‑1) | Overall citizen happiness; affects birth rate and productivity. |
| `ai_advisors` | list of objects | Each advisor has `type`, `level`, `experience`, and `assigned_task`. |
| `events_log` | list of strings | Chronological record of events that have occurred. |

### Example snippet from `save.json`

```json
{
  "day": 103859,
  "population": 13761,
  "treasury": 154706487588,
  "food_stock": 842312,
  "mana_reserve": 12500,
  "stone_stock": 43789,
  "morale": 0.78,
  "ai_advisors": [
    {"type":"Logistics","level":4,"experience":3420,"assigned_task":"resource_distribution"},
    {"type":"Research","level":3,"experience":2100,"assigned_task":"alchemy"}
  ],
  "events_log": [
    "Day 103850 – Harvest Festival increased morale by 0.05.",
    "Day 103855 – Minor goblin raid caused 12 casualties."
  ]
}
```

---  

## AI Improvement System  

### Overview  

AI advisors act as semi‑autonomous managers that can take over repetitive tasks, research new technologies, or provide strategic recommendations. They start at **Level 1** and gain **experience** each day based on the amount of work they perform.

### Advisor Types  

| Type | Primary Role | Unlocks at |
|------|--------------|------------|
| **Logistics** | Optimizes resource distribution, reduces waste. | Day 30 |
| **Construction** | Speeds up building times, reduces material cost. | Day 45 |
| **Research** | Unlocks new technologies, spells, and building upgrades. | Day 60 |
| **Military** | Improves defense, trains militia, predicts raids. | Day 80 |
| **Mystic** | Harnesses mana for city‑wide buffs, summons. | Day 120 |

### Experience & Leveling  

* **Experience gain** = `base_gain × ai_improvement_rate × task_complexity`.  
* **Level thresholds** (cumulative XP): 0 → 1, 500 → 2, 1500 → 3, 3500 → 4, 7000 → 5.  
* Upon leveling up, advisors unlock a new **skill** (e.g., “Efficient Harvesting” for Logistics).  

### Assigning Tasks  

In the **Advisor Panel** you can drag an advisor onto a task slot (e.g., “Food Production”, “Research Alchemy”). The UI shows:

* **Current task**  
* **Progress bar** (experience toward next level)  
* **Skill tooltip** (what the advisor contributes)  

### Example Workflow  

1. **Hire** a Logistics advisor (cost: 10,000 gold).  
2. **Assign** it to “Resource Distribution”.  
3. Each day it reduces food waste by **5 %** and adds **30 XP**.  
4. After 5 days, the advisor reaches **Level 2**, unlocking “Advanced Routing” (+10 % efficiency).  

### Modding the AI  

All advisor definitions live in `data/ai_advisors.json`. You can add new types, adjust XP curves, or create custom skills without touching the source code.

---  

## Troubleshooting  

| Symptom | Possible Cause | Fix |
|---------|----------------|-----|
| **Game crashes on launch** | Missing/incorrect Python version or dependencies. | Verify you are using Python 3.11+. Run `pip install -r requirements.txt` again. |
| **Graphics are garbled / FPS very low** | `enable_day_night_cycle` or `enable_weather` on low‑end hardware. | Set both to `false` in `config.json`. |
| **AI advisors do not gain experience** | `ai_improvement_rate` set to `0` or `debug_mode` interfering. | Ensure `"ai_improvement_rate"` > 0 and `debug_mode` is `false`. |
| **Resources stop accumulating** | `resource_gathering_rate` set to `0` or a building has been disabled. | Reset `"resource_gathering_rate"` to `1.0`. Check building status in the UI. |
| **Save file corrupted / cannot load** | Unexpected shutdown while writing `save.json`. | Delete the most recent `save.json` and load the previous autosave (`save_autosave_*.json`). |
| **Event log spams the console** | `debug_mode` enabled. | Set `"debug_mode": false` in `config.json`. |
| **Audio missing** | Pygame mixer not initialized (common on Linux without ALSA). | Install `libsdl2-mixer-2.0-0` (or the equivalent for your distro). |

If none of the above resolves your issue, please open an issue on the GitHub repository with:

* A short description of the problem.  
* Your OS, Python version, and steps to reproduce.  
* Relevant log output (found in `logs/debug.log`).  

---  

## Current Game State  

> **Day:** **103 859**  
> **Population:** **13 761** citizens  
> **Treasury:** **154 706 487 588** gold  

These values are stored in `save.json` and will be updated automatically each in‑game day.

---  

## Contributing  

We welcome contributions! Please follow these steps:

1. Fork the repository.  
2. Create a feature branch (`git checkout -b feature/awesome-feature`).  
3. Write code and **add unit tests** under `tests/`.  
4. Ensure the test suite passes: `pytest`.  
5. Submit a Pull Request with a clear description of changes.  

See `CONTRIBUTING.md` for detailed guidelines, coding style, and asset licensing.

---  

## Contact & Support  

* **GitHub Issues:** https://github.com/your-username/dark-fantasy-pixel-civ/issues  
* **Discord Community:** https://discord.gg/your-invite-code  
* **Email:** support@darkfantasyciv.dev  

Thank you for playing and helping shape this dark, pixel‑perfect world!  