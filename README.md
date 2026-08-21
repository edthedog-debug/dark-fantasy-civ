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
7. [Troubleshooting & FAQ](#troubleshooting--faq)  
8. [Contributing](#contributing)  
9. [License](#license)  

---  

## Project Overview  

Welcome to **Dark Fantasy Pixel Art Civilization**, a strategy‑city‑builder set in a brooding, hand‑crafted pixel‑art world. You assume the role of a fledgling ruler tasked with guiding a fledgling settlement through centuries of hardship, war, and arcane intrigue.  

- **Atmosphere:** Dark fantasy lore, moody lighting, and atmospheric music.  
- **Gameplay Loop:** Build → Gather → Research → Expand → Defend → Evolve.  
- **Goal:** Grow your civilization from a modest hamlet to a sprawling empire while managing resources, diplomacy, and an evolving AI‑driven leader.  

---  

## Features  

| Category | Description |
|----------|-------------|
| **Pixel‑Art Graphics** | 32‑bit style sprites, animated tiles, and dynamic weather effects. |
| **City‑Building** | Construct residential, commercial, military, and magical structures. |
| **Resource Management** | Track Food, Gold (Treasury), Mana, and Materials. |
| **Exploration** | Fog‑of‑war map, hidden ruins, and random events. |
| **Combat & Defense** | Recruit units, design formations, and defend against raids or launch offensives. |
| **Dynamic AI Leader** | Leader stats (Intelligence, Charisma, Strength) improve over time via the AI Improvement System. |
| **Procedural World Events** | Seasonal festivals, plagues, demon incursions, and more that affect world state variables. |
| **Mod‑Friendly** | JSON‑based configuration, easy asset swapping, and a clear plugin API. |
| **Cross‑Platform** | Runs on Windows, macOS, and Linux (via Python & Pygame). |

---  

## Installation  

### Prerequisites  

- **Python** ≥ 3.8 (recommended 3.11)  
- **Pygame** ≥ 2.0  
- Git (optional, for cloning)  

### Steps  

```bash
# 1️⃣ Clone the repository (or download a zip)
git clone https://github.com/your‑repo/dark-fantasy-pixel-civ.git
cd dark-fantasy-pixel-civ

# 2️⃣ Create a virtual environment (highly recommended)
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# 3️⃣ Install required Python packages
pip install -r requirements.txt

# 4️⃣ Run the game
python main.py
```

**Optional:** To launch the game with a custom configuration file:  

```bash
python main.py --config path/to/your_config.json
```

---  

## Configuration  

All runtime options are stored in `config.json`. Below is a sample with explanations.

```json
{
  "difficulty": "medium",               // easy | medium | hard
  "starting_population": 150,           // Initial citizens
  "starting_treasury": 500000,          // Gold at day 0
  "starting_day": 1,
  "enable_ai_improvement": true,        // Toggle AI leader upgrades
  "max_population_cap": 50000,
  "resource_rates": {
    "food_per_farm": 5,
    "gold_per_mine": 3,
    "mana_per_tower": 2
  },
  "graphics": {
    "resolution": [1280, 720],
    "fullscreen": false,
    "vsync": true
  }
}
```

**Key options you may want to tweak**

| Option | Effect |
|--------|--------|
| `difficulty` | Influences enemy AI aggressiveness, resource scarcity, and event frequency. |
| `starting_population` / `starting_treasury` | Sets the initial world state (overrides the “Current state” values if changed). |
| `enable_ai_improvement` | Turns the AI leader upgrade system on/off. |
| `max_population_cap` | Upper bound for population growth; useful for performance testing. |
| `resource_rates` | Adjusts how productive each building type is. |
| `graphics` | Controls window size, fullscreen mode, and V‑Sync. |

---  

## World State Variables  

These variables are persisted each save and displayed on the HUD. They reflect the **current** snapshot of the world.

| Variable | Current Value | Description |
|----------|---------------|-------------|
| **Day** | `91262` | Number of in‑game days elapsed since the start. Each day triggers resource production, event checks, and AI leader progression. |
| **Population** | `11745` | Total number of living citizens (workers, soldiers, scholars, etc.). Affects tax income, food consumption, and unit recruitment limits. |
| **Treasury** | `107,835,924,368` | Gold reserves. Used for building construction, unit training, research, and diplomatic gifts. |
| **Food Stock** | *(tracked internally)* | Determines whether the population can be sustained; shortage triggers starvation events. |
| **Mana Reserve** | *(tracked internally)* | Powers magical buildings and spells. |
| **AI Leader Stats** | See AI Improvement System below | Determines bonuses to resource efficiency, diplomacy, and combat. |

> **Note:** The numbers above are **dynamic**; they will change as you play. The README reflects the snapshot you provided.

---  

## AI Improvement System  

The AI leader (your ruler) evolves over time, granting civilization‑wide bonuses. Upgrades are unlocked automatically when certain thresholds are met, or they can be accelerated by spending **Leadership Points** (earned each day based on population and treasury size).

### Core Attributes  

| Attribute | Base Effect | Upgrade Path |
|-----------|-------------|--------------|
| **Intelligence** | +1% resource production per level. | `Level 1 → 5` (cost: 10 k LP each) |
| **Charisma** | +2% trade income & diplomatic success chance. | `Level 1 → 5` (cost: 12 k LP each) |
| **Strength** | +3% unit health & damage. | `Level 1 → 5` (cost: 15 k LP each) |

### How It Works  

1. **Earn Leadership Points (LP)** – Each day you receive:  

   ```
   LP = floor( (Population / 1000) + (Treasury / 1e9) )
   ```  

2. **Spend LP** – Open the **Leader** UI (press `L`) and allocate points to any attribute.  

3. **Automatic Milestones** – When the following conditions are met, the system auto‑upgrades the corresponding attribute by 1 level (no LP cost):  

   - **Intelligence**: Population > 20 000 **or** Treasury > 5 × 10¹¹  
   - **Charisma**: Completed ≥ 10 diplomatic missions **or** Trade income > 1 × 10⁸ per day  
   - **Strength**: Won ≥ 5 battles **or** Military size > 2 000  

4. **Effect Propagation** – After each upgrade, the game recalculates global modifiers (resource rates, combat stats, etc.) instantly.  

### Example  

At **Day 91262**, with **Population 11 745** and **Treasury 107 835 924 368**, the AI leader has likely already unlocked several automatic upgrades. If you open the Leader UI you may see something like:

```
Intelligence: Level 4 (auto‑upgraded)
Charisma:     Level 3 (auto‑upgraded)
Strength:     Level 2 (player‑assigned)
Leadership Points available: 23
```

You can now spend the remaining points to push Strength to Level 3, gaining a noticeable boost to your army’s survivability.

---  

## Troubleshooting & FAQ  

### The game crashes on startup  

1. **Check Python version** – Must be ≥ 3.8. Run `python --version`.  
2. **Verify Pygame installation** – `pip show pygame`. If missing, reinstall: `pip install pygame`.  
3. **Inspect console output** – Look for `ImportError` or missing DLL messages.  

### No sound / audio glitches  

- Ensure your system’s audio drivers are up‑to‑date.  
- On Linux, you may need to install `libsdl2-mixer-2.0-0`.  

### Graphics appear distorted or flickering  

- Disable `vsync` in `config.json` (`"vsync": false`).  
- Lower the resolution (`"resolution": [800, 600]`).  

### My population stops growing despite enough food  

- Check **Housing Capacity** – Each residential building provides a fixed cap. Build more houses or upgrade existing ones.  
- Verify **Tax Rate** – Extremely high taxes can cause unrest, leading to population decline.  

### AI leader upgrades are not unlocking automatically  

- Confirm `enable_ai_improvement` is set to `true` in `config.json`.  
- Make sure you have **saved** after reaching the milestone; the auto‑upgrade triggers on the next day tick.  

### I want to start a fresh game but keep my custom config  

1. Delete the `saves/` folder (or move it elsewhere).  
2. Keep `config.json` untouched – the game will load your custom settings on the new run.  

### Reporting Bugs  

- Open an issue on GitHub: <https://github.com/your-repo/dark-fantasy-pixel-civ/issues>  
- Include: OS, Python version, a short description, and a copy of the console log (`log.txt` is generated in the root folder).  

---  

## Contributing  

We welcome contributions!  

1. **Fork** the repository.  
2. Create a feature branch: `git checkout -b feature/awesome‑feature`.  
3. Make your changes, ensuring they pass existing tests (`pytest`).  
4. Submit a **Pull Request** with a clear description of what you changed and why.  

Please adhere to the following guidelines:  

- Follow the existing code style (PEP 8).  
- Add or update documentation in `README.md` and docstrings.  
- Include unit tests for new logic.  

---  

## License  

This project is licensed under the **MIT License**. See the `LICENSE` file for full details.  

---  

*Happy building, and may your empire thrive in the shadows!*  