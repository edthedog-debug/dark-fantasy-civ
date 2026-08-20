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
7. [Troubleshooting & FAQ](#troubleshooting--faq)  
8. [Contributing](#contributing)  
9. [License](#license)  

---  

## Project Overview
The **Dark Fantasy Pixel Art Civilization Game** is a strategy‑city‑builder set in a grim, hand‑crafted pixel‑art world. Players assume the role of a ruler who must balance resource extraction, population growth, and military might while contending with supernatural threats and a dynamically evolving environment.

Key design goals:

| Goal | How it’s achieved |
|------|-------------------|
| **Immersive atmosphere** | Dark‑themed pixel art, ambient music, and narrative events. |
| **Deep strategic depth** | Multi‑layered resource system, AI‑driven improvement trees, and emergent world events. |
| **Modular extensibility** | JSON‑based configuration, plug‑in friendly architecture, and a clear API for world‑state manipulation. |
| **Replayability** | Randomized map seeds, variable AI difficulty, and a “legacy” mode that carries over certain stats between runs. |

---  

## Features
- **Pixel‑Art Graphics** – 32‑bit style sprites, animated tiles, and a day/night cycle that influences gameplay (e.g., night‑time raids).  
- **Robust Civilization Management** – Build, upgrade, and demolish structures; manage food, wood, stone, mana, and gold.  
- **Dynamic World State** – The world evolves each tick; seasons, weather, and random events affect resource yields and population morale.  
- **AI Improvement System** – An upgrade tree that the AI can suggest or auto‑apply based on current metrics (population, treasury, etc.).  
- **Mod‑Friendly Configuration** – All game constants live in `config.json`; modders can add new building types, resources, or AI branches without touching source code.  
- **Save/Load & Cloud Sync** – Portable save files (`.sav`) and optional cloud backup via a simple REST endpoint.  
- **Extensive Logging** – Debug, info, warning, and error logs are written to `logs/` for rapid troubleshooting.  

---  

## Installation
### Prerequisites
- **Python 3.10+** (tested on 3.10‑3.12)  
- **Pip** (comes with Python)  
- **Git** (optional, for cloning)  

### Steps
```bash
# 1️⃣ Clone the repository
git clone https://github.com/your-repo/dark-fantasy-civ-game.git
cd dark-fantasy-civ-game

# 2️⃣ Create a virtual environment (highly recommended)
python -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate

# 3️⃣ Install dependencies
pip install -r requirements.txt

# 4️⃣ Run the game
python main.py
```

> **Tip:** If you prefer Docker, a ready‑made `Dockerfile` is included. Build with `docker build -t dark-fantasy-civ .` and run `docker run -p 8000:8000 dark-fantasy-civ`.

---  

## Configuration
All tunable parameters live in **`config.json`** at the project root. Below is a trimmed example with comments (JSON does not support comments; they are shown here for documentation purposes only).

```json
{
  "graphics": {
    "resolution": "1280x720",
    "fullscreen": false,
    "vsync": true
  },
  "gameplay": {
    "day_length_seconds": 120,
    "starting_population": 500,
    "starting_treasury": 1000000,
    "ai_difficulty": "hard"
  },
  "resources": {
    "food_per_farm": 5,
    "wood_per_lumberyard": 3,
    "mana_per_tower": 2
  },
  "ai_improvement": {
    "enable_auto_suggestions": true,
    "suggestion_cooldown_days": 7
  }
}
```

### Important Keys
| Section | Key | Description |
|---------|-----|-------------|
| `graphics` | `resolution` | Screen resolution (`WIDTHxHEIGHT`). |
| `gameplay` | `day_length_seconds` | Real‑time seconds that constitute one in‑game day. |
| `gameplay` | `ai_difficulty` | `"easy"`, `"normal"`, `"hard"` – influences AI suggestion quality. |
| `ai_improvement` | `enable_auto_suggestions` | If `true`, the AI will automatically apply the highest‑scoring upgrade when the cooldown expires. |

After editing, restart the game for changes to take effect.

---  

## World State Variables
The engine tracks a set of core variables that define the current simulation snapshot. They are exposed via the `WorldState` class and can be queried through the built‑in console (`~` key) or via the REST API (`/api/state`).

| Variable | Current Value | Description |
|----------|---------------|-------------|
| **Day** | `63359` | Number of in‑game days elapsed since the start of the current run. |
| **Population** | `7 281` | Total number of citizens currently living in the civilization. |
| **Treasury** | `37 789 918 850` | Gold reserves (the primary currency). |
| **Food Stock** | *dynamic* | Amount of stored food; if it drops below `population * 2`, starvation events trigger. |
| **Mana Pool** | *dynamic* | Magical energy used for research and defensive towers. |
| **Happiness Index** | *dynamic* | Ranges 0‑100; influences population growth and productivity. |

> **Note:** The numbers above reflect the **current saved game**. They will change as the simulation progresses.

### Accessing World State Programmatically
```python
from core.world import WorldState

ws = WorldState.get_instance()
print(ws.day, ws.population, ws.treasury)
```

---  

## AI Improvement System
The AI improvement system is the “brain” that suggests or automatically applies upgrades to accelerate civilization growth. It works in three stages:

1. **Data Collection** – Every `suggestion_cooldown_days` the AI gathers the latest world‑state metrics (population growth rate, treasury growth, resource surplus/deficit, happiness).  
2. **Scoring Engine** – Each node in the **Improvement Tree** has a static base score plus dynamic modifiers derived from the collected data.  
3. **Decision & Execution** –  
   - *Suggestion Mode*: The AI presents the top‑3 upgrades in the UI; the player can accept/reject.  
   - *Auto‑Apply Mode*: If `enable_auto_suggestions` is true, the highest‑scoring upgrade is automatically purchased (provided sufficient treasury).  

### Improvement Tree Overview
```
Root
├─ Economic
│   ├─ Farming (+Food Production)
│   ├─ Mining (+Stone/Gold Yield)
│   └─ Trade Routes (+Treasury Income)
├─ Military
│   ├─ Barracks (+Recruit Speed)
│   ├─ Blacksmith (+Weapon Damage)
│   └─ Siege Works (+Siege Efficiency)
└─ Arcane
    ├─ Mana Wells (+Mana Generation)
    ├─ Enchantments (+Building Efficiency)
    └─ Dark Arts (+Nighttime Bonuses)
```

Each leaf node has:
- **Cost** (gold)
- **Prerequisites** (other upgrades)
- **Effect** (numeric modifier to a core stat)

### Extending the AI Tree
Add a new node by editing `data/ai_improvements.json`:

```json
{
  "id": "arcane/ritual_of_the_abyss",
  "name": "Ritual of the Abyss",
  "cost": 5000000,
  "prerequisites": ["arcane/mana_wells"],
  "effects": {
    "population_growth_rate": 0.12,
    "happiness": -5
  }
}
```

The AI will automatically consider it during the next evaluation cycle.

---  

## Troubleshooting & FAQ
| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| **Game crashes on start** | Missing/incorrect Python version or corrupted virtual environment. | Verify `python --version >= 3.10`. Re‑create the venv (`rm -rf .venv && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`). |
| **Performance drops below 30 FPS** | High resolution + VSync on low‑end hardware. | Lower `graphics.resolution` to `800x600` and set `vsync` to `false`. |
| **AI suggestions never appear** | `ai_improvement.enable_auto_suggestions` set to `false` **and** `suggestion_cooldown_days` is very high. | Set `suggestion_cooldown_days` to a lower value (e.g., `3`) or enable auto‑suggestions. |
| **Treasury shows a negative number** | A bug in a custom mod that overspends gold. | Disable the mod (remove its folder from `mods/`) and reload the save. |
| **Saved game won’t load** | Save file corrupted or version mismatch. | Delete the offending `.sav` file (or restore from backup) and start a new game. |
| **World state variables are not updating** | Console/REST API cache not refreshed. | Restart the game or call `WorldState.refresh()` from the console. |

### Common Commands (in‑game console)
| Command | Description |
|---------|-------------|
| `state` | Prints all world‑state variables. |
| `ai suggest` | Forces an immediate AI suggestion cycle. |
| `save <name>` | Saves the current game under `<name>`. |
| `load <name>` | Loads a previously saved game. |
| `log level <debug|info|warning|error>` | Adjusts runtime logging verbosity. |

---  

## Contributing
We welcome contributions! Follow these steps:

1. **Fork** the repository.  
2. **Create a feature branch**: `git checkout -b feature/awesome-feature`.  
3. **Write tests** (the project uses `pytest`).  
4. **Run the test suite**: `pytest -q`.  
5. **Commit** with a clear message and **push** to your fork.  
6. Open a **Pull Request** targeting `main`.  

Please read `CONTRIBUTING.md` for coding standards, branch naming conventions, and the review process.

---  

## License
This project is licensed under the **MIT License**. See the full text in the `LICENSE` file.

---  

### Quick Reference (Current Game State)

```text
Day:          63 359
Population:   7 281
Treasury:     37 789 918 850 gold
```

Keep an eye on these numbers—they drive the AI’s improvement suggestions and determine when you need to intervene (e.g., build more farms if food is low).  

Enjoy building your dark empire! 🎮✨  