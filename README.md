# Dark Fantasy Pixel Art Civilization Game  
**README.md**

---

## Table of Contents
1. [Project Overview](#project-overview)  
2. [Features](#features)  
3. [Installation](#installation)  
4. [Configuration](#configuration)  
5. [World State Variables](#world-state-variables)  
6. [AI Improvement System](#ai-improvement-system)  
7. [Troubleshooting & FAQ](#troubleshooting--faq)  
8. [Current Game State](#current-game-state)  
9. [Contributing](#contributing)  
10. [License](#license)  

---

## Project Overview
**Dark Fantasy Pixel Art Civilization** is a strategy‑city‑builder set in a brooding, hand‑crafted pixel‑art world. Players assume the role of a fledgling ruler tasked with guiding a nascent civilization through centuries of hardship, magic, and war. The game blends classic city‑building mechanics with a living, evolving AI system that reacts to player decisions, making each play‑through unique.

Key themes:
- **Gothic atmosphere** – moody lighting, cursed forests, and towering citadels.
- **Deep lore** – ancient tomes, hidden relics, and mythic beasts that shape the world.
- **Strategic depth** – resource management, diplomacy, research, and military conquest.

---

## Features
| Feature | Description |
|---------|-------------|
| **Pixel‑Art Graphics** | 32‑bit style sprites, animated tiles, and atmospheric effects that evoke classic dark‑fantasy aesthetics. |
| **Dynamic City‑Building** | Build, upgrade, and specialize districts (e.g., Necropolis, Arcane Academy, Blacksmith’s Forge). |
| **Exploration & Discovery** | Fog‑of‑war map, procedurally generated ruins, and hidden quests. |
| **AI Improvement System** | A modular AI that learns from player actions, unlocking new tech trees, policies, and adaptive enemy behavior. |
| **World State Variables** | Persistent variables (day count, population, treasury, morale, magic flux, etc.) that influence events and AI decisions. |
| **Event Engine** | Random and scripted events (plagues, invasions, celestial alignments) that react to world state. |
| **Mod‑Friendly Architecture** | JSON‑based data files, script hooks, and a clear API for community extensions. |
| **Save/Load System** | Automatic snapshots, manual saves, and cloud sync (optional). |
| **Cross‑Platform** | Runs on Windows, macOS, and Linux (via Python + Pygame). |

---

## Installation
### Prerequisites
- **Python** ≥ 3.8 (recommended 3.11)  
- **Pygame** ≥ 2.0  
- Optional: **Git** (for cloning the repo)  

### Steps
```bash
# 1️⃣ Clone the repository
git clone https://github.com/your-username/dark-fantasy-pixel-civ.git
cd dark-fantasy-pixel-civ

# 2️⃣ Create a virtual environment (highly recommended)
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

# 3️⃣ Install required Python packages
pip install -r requirements.txt

# 4️⃣ Run the game
python main.py
```

**Alternative (no Git):**  
Download the latest release ZIP from the *Releases* page, extract it, and run `python -m pip install -r requirements.txt` inside the extracted folder.

---

## Configuration
All configurable options live in `config.json`. The file is loaded at startup, and any changes require a game restart.

### Sample `config.json`
```json
{
  "game_speed": 1.0,               // 0.5 = half speed, 2.0 = double speed
  "difficulty": "hard",            // easy | normal | hard | nightmare
  "audio": {
    "music_volume": 0.7,
    "sfx_volume": 0.8
  },
  "display": {
    "resolution": [1280, 720],
    "fullscreen": false,
    "vsync": true
  },
  "ai": {
    "learning_rate": 0.03,
    "max_improvement_points": 5000
  }
}
```

#### Commonly Tweaked Settings
| Setting | Effect |
|---------|--------|
| `game_speed` | Controls how fast days progress. |
| `difficulty` | Adjusts AI aggressiveness, resource scarcity, and event severity. |
| `audio.*` | Volume levels for music and sound effects. |
| `display.resolution` | Window size; must be a multiple of 32 for pixel‑perfect scaling. |
| `ai.learning_rate` | Higher values make the AI adapt faster (may increase CPU usage). |

---

## World State Variables
The engine tracks a set of core variables that persist across saves. They are exposed to the UI, scripts, and the AI system.

| Variable | Type | Description |
|----------|------|-------------|
| `day` | Integer | Current day number (starts at 1). |
| `population` | Integer | Total living citizens. |
| `treasury` | Integer | Gold reserves (raw integer; displayed with commas). |
| `morale` | Float (0‑1) | General happiness; influences productivity. |
| `magic_flux` | Float (−1‑1) | Global magical stability; affects spell success rates. |
| `food_stockpile` | Integer | Units of food stored. |
| `improvement_points` | Integer | Points available for AI upgrades. |
| `diplomacy_score` | Float (0‑100) | Reputation with neighboring factions. |
| `threat_level` | Integer | Current external danger rating (0 = none, 5 = apocalypse). |

**Access Example (Python):**
```python
from engine.world import WorldState

ws = WorldState.instance()
print(f"Day {ws.day}, Population {ws.population}, Treasury {ws.treasury}")
```

---

## AI Improvement System
The AI is not a static opponent; it evolves using a point‑based improvement system that reacts to the world state and player actions.

### How It Works
1. **Improvement Points (IP)** are generated each day based on `improvement_points` variable, which is influenced by:
   - Population growth
   - Treasury surplus
   - Successful research
2. **Upgrade Trees** – Three primary branches:
   - **Military** – Better units, tactical AI, siege tactics.
   - **Economic** – Tax efficiency, trade routes, resource extraction.
   - **Arcane** – Spell potency, magical defenses, rune crafting.
3. **Prerequisites** – Certain upgrades require a minimum level of a related world variable (e.g., `magic_flux` > 0.2 for high‑level Arcane upgrades).
4. **Dynamic Re‑balancing** – The AI may re‑allocate IPs if a branch becomes under‑utilized, ensuring it stays competitive.

### Example Upgrade Path (Military)
| Level | Cost (IP) | Effect |
|-------|-----------|--------|
| **Militia Training** | 100 | +5% infantry attack |
| **Siege Engineering** | 300 | Unlocks catapult unit |
| **War Council** | 600 | AI can form temporary alliances |
| **Blood‑Rite Tactics** | 1200 | Critical hit chance +10% |

### Using the System (In‑Game UI)
1. Open **“Civics → AI Improvements”**.  
2. Hover over each node to see cost, prerequisites, and description.  
3. Click **“Research”** to spend available IPs.  
4. Upgrades apply instantly and are reflected in the AI’s behavior.

---

## Troubleshooting & FAQ
### The game crashes on startup
- **Check Python version** – Must be ≥ 3.8. Run `python --version`.  
- **Missing dependencies** – Re‑run `pip install -r requirements.txt`.  
- **Graphics driver** – Update your GPU driver; Pygame relies on SDL2.

### Audio is silent or distorted
- Verify your system’s volume mixer isn’t muting the Python process.  
- In `config.json`, set `"audio": {"music_volume": 0.5, "sfx_volume": 0.5}` and restart.

### Performance is low (FPS < 30)
- Lower `game_speed` or switch to a lower resolution in `config.json`.  
- Disable VSync (`"vsync": false`).  
- Close other CPU‑intensive applications.

### Save files become corrupted
- Ensure you have write permission to the `saves/` directory.  
- Use the **“Export Save”** feature to create a backup before major changes.

### How do I reset the world state?
Delete (or rename) the `saves/autosave.json` file. The next launch will start a fresh game.

### Modding – where do I add new content?
- **Sprites & Tiles** – Place PNG files in `assets/sprites/`.  
- **Data files** – JSON files in `data/` (e.g., `buildings.json`, `events.json`).  
- **Scripts** – Python modules in `mods/`; they are auto‑loaded if they expose a `register()` function.

---

## Current Game State
> **Day:** **76291**  
> **Population:** **9 350**  
> **Treasury:** **64 912 320 667**  

These numbers are displayed in the UI and can be accessed via the WorldState API for debugging or mod scripts.

---

## Contributing
We welcome community contributions! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:

- Reporting bugs (use the GitHub Issues tab).  
- Submitting pull requests (follow the `dev` branch workflow).  
- Adding new assets (respect the pixel‑art style guide).  
- Writing documentation or translations.

---

## License
This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

---

**Enjoy building your dark empire!** If you have any questions, feel free to open an issue or join our Discord community (link in the repository README).