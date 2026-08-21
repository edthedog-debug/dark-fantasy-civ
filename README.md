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
7. [Troubleshooting & FAQ](#troubleshooting--faq)  
8. [Contributing](#contributing)  
9. [License](#license)  

---

## Project Overview
**Dark Fantasy Pixel Art Civilization** is a strategy‑city‑builder set in a brooding, hand‑crafted pixel‑art world. Players assume the role of a fledgling ruler tasked with guiding a civilization through centuries of hardship, magic, and intrigue. The game blends classic city‑building mechanics with RPG‑style exploration, dynamic world events, and a deep AI‑driven technology tree.

Key themes:

- **Gothic atmosphere** – moody lighting, cursed forests, and towering citadels.  
- **Strategic depth** – balance resources, population, military, and mystical research.  
- **Emergent storytelling** – random events, lore fragments, and player‑driven narratives.

Current in‑game snapshot (as of the latest save):

- **Day:** `77729`  
- **Population:** `9 581`  
- **Treasury:** `68 361 284 799` gold coins  

---

## Features
| Category | Description |
|----------|-------------|
| **Pixel‑Art Visuals** | 32‑bit style sprites, animated tiles, day/night cycle, weather effects. |
| **City‑Building Core** | Build houses, farms, workshops, temples, and defensive structures. |
| **Resource Management** | Food, wood, stone, iron, mana, and exotic relics. |
| **Exploration & Quests** | Send scouts to uncover ruins, hidden vaults, and mythic beasts. |
| **Dynamic World State** | Seasonal changes, random calamities (plagues, demon raids), and evolving political borders. |
| **AI Improvement System** | Tiered research tree that unlocks new technologies, magical abilities, and civilization bonuses. |
| **Mod‑Friendly Architecture** | JSON‑based data files, scriptable events, and a plug‑in API for community extensions. |
| **Save/Load Anywhere** | Auto‑save every 10 in‑game days; manual slots up to 10. |
| **Multilingual Support** | English, Spanish, Japanese (community‑contributed). |

---

## Installation

### Prerequisites
- **Python 3.10+** (or later)  
- **Pygame 2.5+** (installed automatically via `requirements.txt`)  
- **Git** (optional, for cloning the repo)

### Steps
```bash
# 1️⃣ Clone the repository
git clone https://github.com/your-username/dark-fantasy-pixel-civ.git
cd dark-fantasy-pixel-civ

# 2️⃣ Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# 3️⃣ Install dependencies
pip install -r requirements.txt

# 4️⃣ Run the game
python main.py
```

*If you prefer a pre‑built binary, download the latest release from the **Releases** page and execute the platform‑specific executable.*

---

## Configuration
All configurable options live in `config.json`. Below is a sample with explanations.

```json
{
  "difficulty": "medium",          // Options: "easy", "medium", "hard"
  "world_size": "large",           // Options: "small", "medium", "large"
  "starting_population": 1500,    // Initial citizens at Day 1
  "starting_treasury": 5000000,   // Gold at game start
  "enable_random_events": true,   // Toggle random world events
  "autosave_interval_days": 10,   // Autosave frequency
  "audio_volume": 0.8,            // 0.0 (mute) – 1.0 (max)
  "pixel_scale": 2                // 1 = native 16×16 tiles, 2 = 32×32, etc.
}
```

**Changing a setting:**  
Edit `config.json` with any text editor, save, then restart the game for changes to take effect.

---

## World State Variables
The engine tracks a set of global variables that can be inspected via the debug console (`~` key) or exported to `world_state.json`.

| Variable | Type | Current Value | Description |
|----------|------|---------------|-------------|
| `day` | Integer | **77729** | In‑game day count (starts at 1). |
| `population` | Integer | **9581** | Total living citizens (includes workers, soldiers, scholars). |
| `treasury` | Integer | **68 361 284 799** | Gold reserves available for construction, research, and trade. |
| `food_stock` | Integer | 2 340 112 | Units of food stored in granaries. |
| `mana_pool` | Integer | 1 024 500 | Magical energy used for spells and enchantments. |
| `morale` | Float (0‑1) | 0.73 | Overall citizen happiness; influences growth rate. |
| `tech_tier` | Integer | 2 | Current AI improvement tier (1‑4). |
| `active_events` | List | ["Solar Eclipse", "Bandit Raid"] | Ongoing world events affecting gameplay. |

*Developers can add custom variables by editing `world_state_schema.json` and the corresponding Python class.*

---

## AI Improvement System
The AI improvement system is a **tiered research tree** that evolves as the civilization ages. Each tier unlocks a set of **Research Nodes**; completing a node grants permanent bonuses.

### Tier Overview
| Tier | Unlock Condition | Core Benefits |
|------|------------------|---------------|
| **Tier 1 – Foundations** | Reach Day 30 **or** Population ≥ 2 000 | Basic resource extraction, simple housing, early military units. |
| **Tier 2 – Expansion** | Treasury ≥ 10 000 000 **or** complete all Tier 1 nodes | Advanced production buildings, trade routes, basic magical wards. |
| **Tier 3 – Ascendancy** | Research **All** Tier 2 nodes **and** achieve Morale ≥ 0.8 | High‑level spells, elite units, city‑wide buffs, unique wonders. |
| **Tier 4 – Apotheosis** (Endgame) | Complete Tier 3, survive a **Cataclysm** event | World‑shaping powers, permanent victory conditions, optional “god‑mode”. |

### Sample Research Nodes (Tier 2)
| Node | Cost (Gold) | Time (Days) | Effect |
|------|-------------|-------------|--------|
| **Improved Iron Smelting** | 2 500 000 | 12 | +15 % iron output, unlocks “Steel Sword” unit. |
| **Arcane Library** | 3 200 000 | 15 | +10 % mana regeneration, unlocks “Research: Runic Binding”. |
| **River Dykes** | 1 800 000 | 10 | Reduces flood damage by 80 %, +5 % food yield near rivers. |

### How to Use
1. Open the **Research Panel** (`R` key).  
2. Hover over a node to view prerequisites, cost, and benefits.  
3. Click **Research** – gold is deducted instantly, and a progress bar shows remaining days.  
4. Upon completion, the bonus is applied globally.

*The AI system also adapts: if a player neglects a tier for >30 days, research costs increase by 10 % to simulate stagnation.*

---

## Troubleshooting & FAQ
### The game crashes on startup
1. Verify you are using **Python 3.10+**.  
2. Run `pip install -r requirements.txt` again to ensure all dependencies are present.  
3. Check the console for a traceback – common culprits are missing `SDL2` libraries on Linux. Install via your package manager (`sudo apt-get install libsdl2-dev`).

### My save file won’t load / “Corrupt save data”
- Delete `save.json` (or rename it) and start a new game.  
- If you need to recover, open `save.json` in a text editor and look for malformed JSON (missing commas, stray brackets). Fix manually and retry.

### Audio is silent
- Ensure your system volume isn’t muted.  
- In `config.json`, set `"audio_volume": 1.0`.  
- On Windows, verify that the **DirectSound** driver is selected in the audio settings menu (`Esc → Settings → Audio`).

### How do I change the day counter to start at a different number?
Edit `world_state.json` (or use the debug console):
```python
world_state["day"] = 1   # or any starting day you prefer
```
Save and restart.

### I want to add my own custom building or unit.
1. Create a new JSON entry in `data/buildings.json` or `data/units.json`.  
2. Define sprites, costs, and effects following the existing schema.  
3. Add the asset files to `assets/sprites/`.  
4. Restart the game – the new content will appear in the build menu.

### The game runs very slowly on my laptop.
- Lower the `pixel_scale` in `config.json` to `1`.  
- Disable **random events** (`"enable_random_events": false`).  
- Close other CPU‑intensive applications.

---

## Contributing
We welcome community contributions! Please read our **CONTRIBUTING.md** for guidelines on:

- Forking the repo and submitting pull requests.  
- Adding new pixel‑art assets (follow the naming convention `*_32x32.png`).  
- Writing lore entries or quest scripts (see `docs/quest_design.md`).  
- Reporting bugs via the **Issues** tab (include OS, Python version, and a short log).

---

## License
This project is released under the **MIT License**. See the `LICENSE` file for full terms.

---

*Enjoy building your dark empire, and may the shadows favor your people!*