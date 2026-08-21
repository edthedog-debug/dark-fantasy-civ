# Dark Fantasy Pixel Art Civilization Game README
=============================================

## Project Overview
---------------

Welcome to the **Dark Fantasy Pixel Art Civilization Game**! This game blends strategy, exploration, and city‑building in a hauntingly beautiful pixel‑art world. As the ruler of a fledgling civilization, you must manage resources, expand your territory, and survive the myriad threats of a dark fantasy realm.

**Current Game State**  
- **Day:** 86479  
- **Population:** 10 980  
- **Treasury:** 92 619 597 622  

---

## Features
------------

| Feature | Description |
|---------|-------------|
| **Pixel‑Art Graphics** | Hand‑crafted, atmospheric pixel art that brings a grim fantasy world to life. |
| **City‑Building** | Construct homes, farms, workshops, temples, fortifications, and more. |
| **Resource Management** | Gather and allocate gold, food, wood, stone, and magical essences. |
| **Exploration & Discovery** | Send scouts into the unknown, uncover new biomes, ruins, and hidden resources. |
| **Dynamic World State** | Day counter, population growth, treasury balance, and other variables evolve in real time. |
| **AI Improvement System** | Research and apply AI‑driven upgrades that boost efficiency, combat, and diplomacy. |
| **Difficulty Levels** | Choose from Easy, Medium, Hard, or Nightmare to tailor the challenge. |
| **Mod‑Friendly Architecture** | JSON‑based configuration and a clear plugin API for community extensions. |

---

## Installation
---------------

### Prerequisites
- **Python** 3.9 or newer  
- **Operating System**: Windows 10/11, macOS 10.15+, or any modern Linux distribution  
- **Git** (optional, for cloning the repo)

### Step‑by‑Step Guide
```bash
# 1. Clone the repository
git clone https://github.com/your‑username/dark‑fantasy‑pixel‑civilization.git
cd dark-fantasy-pixel-civilization

# 2. Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the game
python main.py
```

*If you prefer not to use a virtual environment, simply run `pip install -r requirements.txt` globally.*

---

## Configuration
---------------

All configurable options live in **`config.json`** at the project root. The file is loaded at startup, and any changes require a game restart.

### Sample `config.json`

```json
{
  "game_speed": 1.0,               // 1.0 = real‑time, >1 faster, <1 slower
  "difficulty": "medium",          // options: "easy", "medium", "hard", "nightmare"
  "starting_day": 1,
  "starting_population": 100,
  "starting_treasury": 5000,
  "enable_mods": true,
  "mod_folder": "mods/",
  "ui_scale": 1.0,
  "audio_volume": 0.8,
  "show_day_counter": true
}
```

#### Key Settings Explained
| Setting | Effect |
|---------|--------|
| `game_speed` | Controls how quickly days advance. |
| `difficulty` | Alters resource yields, enemy aggression, and AI improvement costs. |
| `enable_mods` | Toggles loading of user‑created mods from the `mod_folder`. |
| `ui_scale` | Scales the UI for high‑DPI displays. |
| `audio_volume` | Master volume (0.0‑1.0). |
| `show_day_counter` | Show/hide the day counter in the HUD. |

---

## World State Variables
-------------------------

The engine tracks a set of core variables that influence gameplay and are displayed in the UI. They can also be accessed via the in‑game console for debugging or modding.

| Variable | Type | Description |
|----------|------|-------------|
| `day` | `int` | Current day number (starts at 1). |
| `population` | `int` | Number of living citizens. |
| `treasury` | `int` | Amount of gold available for spending. |
| `food_stock` | `int` | Units of food stored. |
| `wood_stock` | `int` | Units of wood stored. |
| `stone_stock` | `int` | Units of stone stored. |
| `magic_essence` | `int` | Rare magical resource used for advanced research. |
| `happiness` | `float` (0‑1) | Overall citizen satisfaction; affects growth and productivity. |
| `military_strength` | `int` | Combined combat power of all armed units. |
| `research_progress` | `dict` | Mapping of research IDs to completion percentages. |

*The current snapshot (as of the README generation) is:*  

```json
{
  "day": 86479,
  "population": 10980,
  "treasury": 92619597622
}
```

---

## AI Improvement System
-------------------------

The AI Improvement System (AIS) is a modular research tree that lets you unlock **AI‑driven upgrades** for various aspects of your civilization. Each improvement has a cost, a prerequisite chain, and a tangible in‑game effect.

### How It Works
1. **Research Points** are generated each day based on `population`, `happiness`, and `magic_essence`.  
2. Points are allocated to **research nodes** in the UI.  
3. Once a node reaches 100 % completion, the improvement is **unlocked** and its effects become active.  
4. Some improvements unlock **sub‑nodes**, creating a branching tech tree.

### Example Improvement Nodes

| Node ID | Name | Prerequisite | Cost (Research Points) | Effect |
|---------|------|--------------|------------------------|--------|
| `RES_GATHER_01` | **Efficient Woodcutting** | None | 150 | Wood gathering speed +20 % |
| `RES_GATHER_02` | **Advanced Mining** | `RES_GATHER_01` | 300 | Stone extraction +30 % |
| `BUILD_SPEED_01` | **Rapid Construction** | `RES_GATHER_01` | 250 | Building construction time –15 % |
| `MILITARY_01` | **Tactical AI** | `BUILD_SPEED_01` | 400 | Military combat efficiency +10 % |
| `MAGIC_01` | **Arcane Optimization** | `RES_GATHER_02` | 500 | Magic essence generation +25 % |

### Custom AI Improvements (Modding)
Mods can add new nodes by appending to `data/ai_improvements.json`. Required fields:

```json
{
  "id": "CUSTOM_01",
  "name": "Shadow Veil",
  "description": "Reduces enemy detection range by 20 %.",
  "prerequisite": "MILITARY_01",
  "cost": 600,
  "effect": {
    "enemy_detection_modifier": -0.20
  }
}
```

---

## Troubleshooting
------------------

### The Game Won’t Start
| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `ImportError: No module named ...` | Missing dependencies | Run `pip install -r requirements.txt` inside your virtual environment. |
| `SyntaxError` in `config.json` | Invalid JSON formatting | Validate JSON with an online linter or run `python -m json.tool config.json`. |
| `pygame.error: No video mode` | No display (running on headless server) | Use the `--no-gui` flag (if available) or run on a machine with a graphics environment. |

### Resources Not Updating
- **Check AI Improvements**: Ensure relevant research nodes are completed.  
- **Population Too Low**: Resource generation scales with population; consider building housing.  
- **Happiness < 0.3**: Low happiness reduces efficiency. Build entertainment or reduce taxes.

### Performance Lag
- Lower `game_speed` in `config.json`.  
- Reduce `ui_scale` or disable optional visual effects (`enable_particles`: false).  
- Close other CPU‑intensive applications.

### Mod Loading Errors
- Verify that each mod folder contains a valid `mod.json` manifest.  
- Ensure no duplicate `id` fields across mods.  
- Check console output for specific error messages; they usually point to the offending file/line.

### Getting Help
- **GitHub Issues**: <https://github.com/your-username/dark-fantasy-pixel-civilization/issues>  
- **Discord Community**: Invite link in the repository README.  
- **Documentation**: See the `docs/` folder for deeper technical details.

---

## License
This project is licensed under the **MIT License** – see the `LICENSE` file for full terms.

---

*Enjoy building your dark empire, and may your pixel‑crafted legends endure through the ages!*