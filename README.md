# Dark Fantasy Pixel Art Civilization Game  

## Table of Contents
1. [Project Overview](#project-overview)  
2. [Features](#features)  
3. [Installation](#installation)  
4. [Configuration](#configuration)  
5. [World State Variables](#world-state-variables)  
6. [AI Improvement System](#ai-improvement-system)  
7. [Troubleshooting & FAQ](#troubleshooting--faq)  
8. [Current Game State](#current-game-state)  

---  

## Project Overview  
Welcome to **Dark Fantasy Pixel Art Civilization**, a strategy‑simulation game that blends classic city‑building mechanics with a brooding, hand‑crafted pixel‑art world. As the ruler of a fledgling realm, you must balance resource management, technological progress, and the ever‑looming threats of a dark fantasy setting.  

Key goals for the player:  

* Grow the **population** from a modest settlement to a thriving empire.  
* Keep the **treasury** healthy while funding construction, research, and defense.  
* Navigate a dynamic world that evolves day by day, presenting new challenges and opportunities.  

The game is built with Python, uses the **Pygame** library for rendering, and stores persistent data in JSON files for easy modding.  

---  

## Features  

| Feature | Description |
|---------|-------------|
| **Pixel‑Art Visuals** | Hand‑drawn 16‑bit style sprites, tilesets, and UI elements that evoke a grim, atmospheric world. |
| **Deep City‑Building** | Construct residential, industrial, military, and magical structures; each building influences multiple world variables. |
| **Resource Management** | Track food, wood, stone, mana, and gold. Trade routes and market dynamics add strategic depth. |
| **Dynamic World Clock** | The game runs on a day‑based clock (currently **Day 64229**). Seasonal events, festivals, and calamities trigger automatically. |
| **AI Improvement System** | Research tree and upgrade path that enhances the AI’s decision‑making, automation, and efficiency. |
| **Mod‑Friendly Architecture** | All game data (buildings, techs, events) lives in JSON/YAML files; community mods are encouraged. |
| **Save/Load** | Multiple save slots; auto‑save every 100 in‑game days. |
| **Cross‑Platform** | Runs on Windows, macOS, and Linux (requires Python 3.9+). |

---  

## Installation  

### Prerequisites  
* **Python 3.9** or newer (https://www.python.org/downloads/)  
* **Git** (optional, for cloning the repo)  
* **Pygame** – will be installed automatically via `requirements.txt`  

### Steps  

```bash
# 1️⃣ Clone the repository (or download the zip)
git clone https://github.com/your‑username/dark‑fantasy‑pixel‑civilization.git
cd dark-fantasy-pixel-civilization

# 2️⃣ Create a virtual environment (recommended)
python -m venv venv
# Activate:
#   Windows: venv\Scripts\activate
#   macOS/Linux: source venv/bin/activate

# 3️⃣ Install dependencies
pip install -r requirements.txt

# 4️⃣ Run the game
python main.py
```

*If you prefer not to use a virtual environment, simply run `pip install -r requirements.txt` globally.*  

---  

## Configuration  

All configurable options live in **`config.json`** (generated on first launch). Below is a sample with explanations:

```json
{
  "game_speed": 1.0,               // 0.5 = half‑speed, 2.0 = double‑speed
  "ai_difficulty": "hard",         // easy | normal | hard | nightmare
  "graphics_quality": "high",      // low | medium | high (affects particle effects)
  "audio_volume": 0.8,             // 0.0 – 1.0
  "autosave_interval_days": 100,   // Auto‑save every N in‑game days
  "enable_mods": true,             // Load mods from the /mods folder
  "language": "en-US"
}
```

* To change a setting, edit the file and restart the game.  
* Invalid values will revert to defaults and a warning will be logged to `logs/debug.log`.  

---  

## World State Variables  

The engine tracks a set of core variables that define the current state of your civilization. They are persisted in `save/<slot>.json`.

| Variable | Type | Description | Example (Current) |
|----------|------|-------------|-------------------|
| `day` | integer | Current in‑game day count | **64229** |
| `population` | integer | Number of living citizens (including slaves, soldiers, etc.) | **7420** |
| `treasury` | integer | Gold reserves (raw integer; UI formats with commas) | **39 414 953 769** |
| `food_stock` | integer | Units of food stored | 12 340 |
| `mana_pool` | integer | Magical energy available for spells/research | 5 210 |
| `happiness` | float (0‑1) | Overall citizen satisfaction | 0.73 |
| `military_strength` | integer | Combined combat power of all units | 1 845 |
| `technology_level` | integer | Highest tier of tech unlocked | 7 |

These variables can be accessed by mods via the `GameState` API (`game_state.population`, etc.).  

---  

## AI Improvement System  

The AI improvement system is a **research tree** that unlocks both *civil* and *military* AI upgrades. Each node requires a combination of **gold**, **mana**, and **research points** (generated by libraries and academies).  

### Core Branches  

| Branch | Sample Upgrades | Effect |
|--------|----------------|--------|
| **Governance** | *Efficient Taxation* – +10 % treasury income; *Population Forecast* – reduces random population loss | Improves economic decision‑making. |
| **Logistics** | *Automated Resource Transport* – eliminates manual hauling; *Supply Chain Optimization* – reduces building construction time | Speeds up resource flow. |
| **Military Tactics** | *Adaptive Combat AI* – units react to enemy composition; *Siege Mastery* – reduces siege duration | Boosts combat effectiveness. |
| **Arcane Insight** | *Mana‑Efficient Spells* – spells cost 15 % less mana; *Predictive Weather* – reduces crop failure chance | Enhances magical aspects. |

### How to Use  

1. Build **Academies** and **Libraries** to generate **Research Points** each day.  
2. Open the **Research UI** (`R` key) and allocate points to desired upgrades.  
3. Once an upgrade is fully funded, it unlocks automatically and its effect is applied globally.  

### Balancing  

* Upgrades have diminishing returns to prevent runaway scaling.  
* Certain high‑tier upgrades require prerequisite technologies from multiple branches, encouraging diversified development.  

---  

## Troubleshooting & FAQ  

| Issue | Possible Cause | Solution |
|-------|----------------|----------|
| **Game crashes on launch** | Missing Python version or Pygame dependency | Verify Python ≥ 3.9, reinstall dependencies: `pip install -r requirements.txt`. |
| **Graphics appear garbled** | `graphics_quality` set to an unsupported value or outdated GPU driver | Set `"graphics_quality": "medium"` in `config.json` and update GPU drivers. |
| **Save file won't load** | Corrupted JSON (e.g., manual edit) | Delete the problematic `save/*.json` and start a new game, or restore from a backup in `save/backups/`. |
| **AI not improving after research** | Research points not being generated (no Academy/Library) | Build at least one Academy and one Library; ensure they have power (connected to the grid). |
| **Audio missing or static** | System audio drivers or missing `pygame.mixer` init | Reinstall Pygame (`pip uninstall pygame && pip install pygame`) and ensure your OS audio works with other apps. |
| **Mod conflicts** | Two mods editing the same JSON key | Disable one mod via `config.json` → `"enable_mods": false` or move offending mod to a separate folder. |

### Common Commands  

| Command | Action |
|---------|--------|
| `Ctrl+S` | Quick‑save current slot |
| `F5` | Reload configuration without restarting |
| `Esc` | Open pause menu (access settings, save, quit) |
| `M` | Toggle music on/off |
| `V` | Show debug overlay (FPS, variable values) – useful for troubleshooting |

---  

## Current Game State  

| Variable | Value |
|----------|-------|
| **Day** | **64229** |
| **Population** | **7420** |
| **Treasury** | **39 414 953 769** gold |

These numbers are displayed in the top‑right HUD during gameplay and are also written to the active save file each autosave interval.  

---  

## Contributing  

We welcome community contributions!  

1. Fork the repository.  
2. Create a feature branch (`git checkout -b feature/awesome‑feature`).  
3. Follow the existing code style (PEP‑8, docstrings).  
4. Submit a Pull Request with a clear description of changes.  

Please read `CONTRIBUTING.md` for detailed guidelines on asset creation, localization, and testing.  

---  

## License  

This project is licensed under the **MIT License** – see `LICENSE` for full text.  

---  

**Enjoy building your dark empire!** If you have any questions, suggestions, or bug reports, open an issue on GitHub or join our Discord community (link in the repository README).