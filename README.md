# Dark Fantasy Pixel Art Civilization Game  

*Version: 1.0.0*  

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

The **Dark Fantasy Pixel Art Civilization Game** is a strategy‑simulation title that blends classic city‑building mechanics with a dark, atmospheric pixel‑art world. Players must grow a fledgling settlement into a thriving (or terrifying) empire while contending with hostile forces, scarce resources, and ever‑changing political dynamics.  

Key design goals:  

* **Atmospheric pixel art** – hand‑crafted tiles, characters, and UI that evoke a grim fantasy aesthetic.  
* **Deep management loops** – resource balancing, population dynamics, and treasury control that feel rewarding at both micro‑ and macro‑levels.  
* **Procedurally generated world** – each play‑through offers a fresh map, unique landmarks, and distinct challenges.  
* **AI‑driven progression** – an extensible AI improvement system that lets players research and apply upgrades to stay ahead of threats.  

---  

## Features  

| Category | Description |
|----------|-------------|
| **Pixel‑Art Graphics** | 32‑bit style sprites, animated tiles, and atmospheric lighting effects. |
| **Civilization Management** | Build structures, assign workers, manage food, wood, stone, magic, and gold. |
| **Dynamic Population** | Births, deaths, migrations, and morale affect growth; current population **11 117**. |
| **Treasury System** | Gold accrues from taxes, trade, and loot; current treasury **91 731 059 809**. |
| **Procedural World** | World seed determines terrain, resource nodes, and enemy strongholds. |
| **Exploration & Combat** | Turn‑based tactical encounters with monsters, bandits, and rival kingdoms. |
| **AI Improvement System** | Research tree with three main branches (Resource, Combat, Infrastructure) that unlocks permanent bonuses. |
| **Day Counter** | Time advances each turn; current day **87 329**. |
| **Mod‑Friendly Architecture** | JSON‑based config, plugin hooks, and a clear separation of core logic from assets. |

---  

## Installation  

### Prerequisites  

* **Python** ≥ 3.9 (tested on 3.9‑3.12)  
* **Pygame** ≥ 2.1.2  
* **Git** (optional, for cloning)  

### Steps  

1. **Clone the repository**  
   ```bash
   git clone https://github.com/your‑org/dark‑fantasy‑civilization.git
   cd dark-fantasy-civilization
   ```  

2. **Create a virtual environment (recommended)**  
   ```bash
   python -m venv venv
   source venv/bin/activate   # On Windows: venv\Scripts\activate
   ```  

3. **Install dependencies**  
   ```bash
   pip install -r requirements.txt
   ```  

4. **Run the game**  
   ```bash
   python main.py
   ```  

> **Tip:** If you encounter a `pygame` import error, ensure you have the correct SDL libraries for your OS (e.g., `libsdl2-dev` on Linux).  

---  

## Configuration  

All configurable values live in a single **`config.json`** file placed in the project root. The file is read at startup; missing keys fall back to the defaults shown below.  

```json
{
  "world_seed": 87329,
  "starting_population": 11117,
  "starting_treasury": 91731059809,
  "starting_day": 1,
  "difficulty": "normal",          // options: "easy", "normal", "hard", "nightmare"
  "audio": {
    "music_volume": 0.7,
    "sfx_volume": 0.8
  },
  "display": {
    "resolution": [1280, 720],
    "fullscreen": false,
    "pixel_scale": 2
  }
}
```

### Important fields  

| Field | Meaning | Typical Range |
|-------|---------|---------------|
| `world_seed` | Seed for procedural generation. Changing it creates a brand‑new map. | Any 32‑bit integer |
| `starting_population` | Initial number of citizens. | 1 000 – 50 000 |
| `starting_treasury` | Initial gold amount. | 0 – 10⁹ |
| `difficulty` | Adjusts AI aggression, resource scarcity, and event frequency. | `"easy"`, `"normal"`, `"hard"`, `"nightmare"` |
| `pixel_scale` | Multiplies the base 16×16 tiles for higher‑resolution displays. | 1 – 4 |

You can edit the file while the game is **not** running; changes will be applied on the next launch.  

---  

## World State Variables  

The engine tracks a set of global variables that are displayed on the HUD and saved in the save‑file. They are also exposed to the AI improvement system for dynamic scaling.  

| Variable | Current Value | Description |
|----------|---------------|-------------|
| **Day** | `87329` | Number of in‑game days elapsed since the start. |
| **Population** | `11117` | Total living citizens (including workers, soldiers, and scholars). |
| **Treasury** | `91 731 059 809` | Gold reserves available for construction, research, and upkeep. |
| **Food Stock** | *dynamic* | Amount of food stored; depletion leads to starvation events. |
| **Morale** | *dynamic* | A percentage (0‑100) influencing productivity and rebellion risk. |
| **Research Points** | *dynamic* | Earned each day; spent on AI upgrades. |
| **Threat Level** | *dynamic* | Aggregated measure of enemy activity around the borders. |

These variables can be inspected via the debug console (`~` key) for developers or modders.  

---  

## AI Improvement System  

The AI improvement system is the core “tech‑tree” that lets players shape the long‑term trajectory of their civilization. It is deliberately split into three independent branches, each with its own scaling formula, prerequisites, and unlockable bonuses.  

### 1. Resource Gathering  

| Tier | Cost (Research Points) | Unlocks |
|------|------------------------|---------|
| **R‑1**: Efficient Harvesting | 150 | +5 % wood & food collection speed |
| **R‑2**: Quarry Mastery | 300 | +8 % stone extraction |
| **R‑3**: Arcane Mining | 600 | +12 % rare mineral yield (used for magical items) |
| **R‑4**: Trade Hub | 1 200 | +15 % gold from trade routes |

### 2. Combat  

| Tier | Cost (Research Points) | Unlocks |
|------|------------------------|---------|
| **C‑1**: Militia Training | 200 | +4 % soldier attack |
| **C‑2**: Defensive Fortifications | 400 | +6 % building durability |
| **C‑3**: Dark Arts Warfare | 800 | +10 % magical damage |
| **C‑4**: Elite Guard | 1 600 | +12 % unit health and morale |

### 3. Infrastructure  

| Tier | Cost (Research Points) | Unlocks |
|------|------------------------|---------|
| **I‑1**: Road Building | 120 | +5 % worker movement speed |
| **I‑2**: Waterworks | 250 | +8 % food production (via irrigation) |
| **I‑3**: Library of Shadows | 500 | +10 % research point generation per day |
| **I‑4**: Grand Cathedral | 1 000 | +15 % morale boost for nearby districts |

### How It Works  

1. **Earn Research Points** – Daily income is based on population, existing research facilities, and the **Library of Shadows** upgrade.  
2. **Open a Branch** – Some tiers require a prerequisite tier in the same branch; cross‑branch synergies are possible (e.g., **Road Building** reduces travel time for troops, indirectly boosting combat effectiveness).  
3. **Apply Bonus** – Once a tier is purchased, its effect is applied globally and saved in the player’s profile.  

### Extending the System  

Developers can add new upgrades by editing `data/ai_upgrades.json`. The schema is:  

```json
{
  "id": "R-5",
  "name": "Mystic Harvest",
  "branch": "resource",
  "cost": 2500,
  "prerequisite": "R-4",
  "effects": {
    "food_multiplier": 1.20,
    "magic_resource_multiplier": 1.15
  },
  "description": "Enchants fields to yield more food and magical herbs."
}
```

---  

## Troubleshooting & FAQ  

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| **Game crashes on launch** | Missing or incompatible `pygame` version. | `pip install -U pygame` or install the appropriate SDL libraries for your OS. |
| **World generation freezes** | Extremely high `world_seed` causing integer overflow on some platforms. | Use a seed within the 32‑bit signed integer range (e.g., `0`‑`2,147,483,647`). |
| **Population drops to 0** | Starvation event + morale < 20 % → rebellion. | Increase food production, build a **Waterworks**, and keep morale above 50 %. |
| **Research points never increase** | `Library of Shadows` not built or disabled in config. | Build the library or set `"research_multiplier"` > 0 in `config.json`. |
| **Audio is silent** | Volume set to 0 in `config.json` or OS mute. | Adjust `"audio"` section or check system sound settings. |
| **Save file corrupted** | Forced termination while writing `save.json`. | Delete the corrupted file (`saves/save.json`) and restart; a fresh save will be created. |

### Debug Console  

Press **`~`** (tilde) to open the in‑game console. Useful commands:  

* `state` – prints all world state variables.  
* `add_gold <amount>` – adds gold to the treasury (cheat).  
* `set_day <number>` – jumps to a specific day (debug only).  
* `reload_config` – re‑reads `config.json` without restarting.  

---  

## Contributing  

We welcome contributions! Follow these steps:  

1. **Fork** the repository.  
2. Create a feature branch: `git checkout -b feature/awesome‑feature`.  
3. Make your changes, ensuring they pass the existing test suite (`pytest`).  
4. Submit a **Pull Request** with a clear description of what you changed and why.  

Please adhere to the **PEP 8** style guide and keep the pixel‑art assets in the `assets/` folder with proper attribution.  

---  

## License  

This project is licensed under the **MIT License**. See the `LICENSE` file for full details.  

---  

*Happy building, and may your empire thrive amidst the shadows!*