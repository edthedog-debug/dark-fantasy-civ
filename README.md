## Dark Fantasy Pixel‑Art Civilization Game – README.md  

*(Compiled from the previous design notes and reasoning)*  

---  

# Project Overview  

Welcome to **Dark Fantasy Pixel‑Art Civilization**, a strategy‑simulation game that blends classic city‑building mechanics with a brooding, hand‑crafted pixel‑art world. As the ruler of a fledgling settlement, you must manage resources, expand territory, research ancient magics, and fend off the myriad horrors that stalk the night. The game runs on a persistent world clock, tracking days, population, and treasury values that evolve even when you’re offline.  

Current world snapshot (as of the latest save):  

- **Day:** **94859**  
- **Population:** **12 321**  
- **Treasury:** **119 839 901 258** gold  

---  

# Features  

| Feature | Description |
|---------|-------------|
| **Pixel‑Art Aesthetic** | Hand‑drawn 16‑bit sprites, atmospheric lighting, and animated tiles that bring a dark fantasy realm to life. |
| **Deep City‑Building** | Construct residential districts, workshops, temples, and defensive walls. Each building influences population growth, resource production, and morale. |
| **Exploration & Fog‑of‑War** | Send scouts to uncover new biomes, hidden ruins, and resource nodes. Discover lore fragments that unlock powerful technologies. |
| **Dynamic World State** | Day‑night cycle, seasonal changes, random events (plagues, invasions, meteor showers) that affect all world variables. |
| **AI Improvement System** | A research‑driven AI upgrade tree that enhances the civilization’s decision‑making, automation, and combat tactics. |
| **Mod‑Friendly Architecture** | JSON‑based configuration, scriptable events, and a plug‑in system for community‑created content. |
| **Persistent Simulation** | The world continues to evolve even when the game is closed; on launch the engine fast‑forwards to the current day. |
| **Rich Lore & Storytelling** | Branching narrative quests, NPC dialogues, and a bestiary of mythic creatures. |

---  

# Installation  

1. **Prerequisites**  
   - Python 3.9 or newer (recommended: 3.11)  
   - `pip` package manager  
   - Optional: Git for source‑control cloning  

2. **Clone the repository**  

   ```bash
   git clone https://github.com/your‑org/dark‑fantasy‑pixel‑civilization.git
   cd dark‑fantasy‑pixel‑civilization
   ```

3. **Create a virtual environment (highly recommended)**  

   ```bash
   python -m venv venv
   source venv/bin/activate   # On Windows: venv\Scripts\activate
   ```

4. **Install dependencies**  

   ```bash
   pip install -r requirements.txt
   ```

5. **Run the game**  

   ```bash
   python main.py
   ```

   The first launch will generate a default `config.json` and a starter save file in `saves/`.  

---  

# Configuration  

All runtime options live in `config.json`. Below is a full‑sample with explanations:

```json
{
  "difficulty": "medium",               // Options: "easy", "medium", "hard"
  "starting_population": 1000,          // Initial citizens at Day 0
  "starting_treasury": 1000000,         // Gold at Day 0
  "autosave_interval_minutes": 10,      // How often the game writes a save file
  "enable_mods": true,                  // Load mods from the /mods directory
  "audio": {
    "music_volume": 0.7,
    "sfx_volume": 0.8
  },
  "graphics": {
    "scale_factor": 2,                  // Pixel‑art scaling (2×, 3×, 4×)
    "fullscreen": false
  }
}
```

**Changing values**  
- Edit the file with any text editor.  
- Restart the game for changes to take effect.  

---  

# World State Variables  

The engine maintains a set of core variables that are persisted in `saves/world_state.json`. They are also exposed to modders via the scripting API.

| Variable | Type | Description | Current Value |
|----------|------|-------------|---------------|
| `day` | integer | Number of days elapsed since the game began. | **94859** |
| `population` | integer | Total living citizens (including slaves, militia, etc.). | **12321** |
| `treasury` | integer | Gold reserves available for construction, research, and upkeep. | **119 839 901 258** |
| `food_stockpile` | integer | Units of food stored; influences population growth and morale. |
| `research_points` | integer | Points earned each day; spent on AI improvements and techs. |
| `morale` | float (0‑1) | Overall citizen happiness; affects productivity. |
| `season` | string | Current season (`spring`, `summer`, `autumn`, `winter`). |
| `weather` | string | Current weather condition (`clear`, `rain`, `storm`, `fog`). |

*Modders can read/write these values through the `WorldState` API, but be mindful of balance.*  

---  

# AI Improvement System  

The AI system is designed to evolve alongside the civilization, providing smarter automation and strategic options as you progress.

## 1. Research Points (RP)  

- Earned daily based on **population**, **science buildings**, and **event bonuses**.  
- RP can be allocated to any node in the **AI Improvement Tree**.

## 2. AI Improvement Tree  

The tree is divided into three branches:

| Branch | Focus | Example Nodes |
|--------|-------|---------------|
| **Governance** | Administrative efficiency, tax collection, civic order | *Automated Taxation*, *Dynamic Housing Allocation* |
| **Military** | Tactical AI, unit micro‑management, defensive planning | *Predictive Enemy Movement*, *Fortification Optimizer* |
| **Economy** | Resource forecasting, trade route AI, production queues | *Market Trend Analyzer*, *Resource Balancer* |

Each node has:

- **Cost** (RP)  
- **Prerequisites** (other nodes)  
- **Effect** (stat modifiers, new UI options, script hooks)  

### Example Node – *Predictive Enemy Movement*  

```json
{
  "id": "military.predictive_enemy_movement",
  "cost": 2500,
  "prerequisites": ["military.basic_defense_ai"],
  "effect": {
    "enemy_approach_warning": true,
    "defense_preallocation_bonus": 0.15
  }
}
```

Unlocking this node gives a 15 % bonus to pre‑allocating troops before an invasion and adds a visual warning on the minimap.

## 3. Integration with Gameplay  

- **Automation**: Once a node is unlocked, related UI toggles appear (e.g., “Auto‑assign workers to farms”).  
- **Strategic Depth**: AI upgrades can change the difficulty curve; higher AI levels make enemy raids smarter and resource management tighter.  
- **Mod Compatibility**: Mods can add new nodes by appending JSON files to `mods/ai_tree/`.  

---  

# Troubleshooting  

| Symptom | Possible Cause | Fix |
|---------|----------------|-----|
| **Game crashes on launch** | Missing Python version or corrupted dependencies. | Verify Python ≥ 3.9, reinstall dependencies with `pip install -r requirements.txt`. |
| **Save file fails to load** | `world_state.json` corrupted or manually edited incorrectly. | Delete the corrupted file and let the game create a fresh one (you’ll lose progress). Keep backups in `saves/backup/`. |
| **Population not increasing** | Food stockpile is zero or morale < 0.3. | Ensure farms are producing food, upgrade granaries, and address morale penalties (e.g., high taxes). |
| **AI upgrades unavailable** | Not enough Research Points or prerequisite nodes missing. | Accumulate RP by building more `Academy` or `Library` structures; check the tree for locked prerequisites. |
| **Audio missing / static** | SDL or OpenAL libraries not installed (Linux). | Install system packages: `sudo apt-get install libsdl2-mixer-2.0-0 libopenal1`. |
| **Graphics appear blurry** | `scale_factor` set to a non‑integer or window resized incorrectly. | Use integer scale factors (2, 3, 4) and avoid non‑integer window resizing. |
| **Mods cause crashes** | Incompatible mod version or malformed JSON. | Disable mods (`"enable_mods": false`) and re‑enable one by one to locate the culprit. Check the console log (`logs/latest.log`). |

### Getting Help  

1. **Check the log** – All runtime messages are written to `logs/latest.log`.  
2. **Search the Wiki** – Our community wiki contains detailed guides for each subsystem.  
3. **Open an Issue** – If the problem persists, create a GitHub issue with:  
   - OS and Python version  
   - Steps to reproduce  
   - Relevant log excerpts  

---  

# License  

This project is released under the **MIT License**. See `LICENSE` for full terms.  

---  

*Enjoy building your dark empire, and may your pixel‑crafted legends endure through the ages!*