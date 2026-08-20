# Dark Fantasy Pixel Art Civilization Game  
*Comprehensive README*

---

## 📖 Project Overview  

The **Dark Fantasy Pixel Art Civilization Game** is a strategy‑focused city‑builder set in a brooding, hand‑crafted pixel world. Players assume the mantle of a ruler who must:

* **Expand** a fledgling settlement into a sprawling empire.  
* **Survive** the perils of a dark fantasy realm—monsters, curses, and shifting politics.  
* **Manage** resources, population, and treasury while making long‑term strategic choices.  

The game blends classic 4‑X mechanics (eXplore, eXpand, eXploit, eXterminate) with a unique **AI Improvement System** that lets you research and evolve the civilization’s capabilities over time.

---

## ✨ Features  

| Feature | Description |
|---------|-------------|
| **Pixel‑Art Visuals** | Dark, atmospheric tiles and sprites rendered in a nostalgic 16‑bit style. |
| **Deep City‑Building** | Construct residential, military, magical, and economic districts—each with distinct bonuses and upkeep. |
| **Exploration & Discovery** | Send scouts to uncover hidden ruins, resource nodes, and narrative events. |
| **Dynamic World State** | Day count, population, and treasury evolve continuously; events trigger based on thresholds. |
| **AI Improvement System** | Research trees, AI‑driven policy suggestions, and “boost” cards that accelerate specific aspects (e.g., faster resource gathering, stronger troops). |
| **Modular Configuration** | All core parameters are stored in `config.json` for easy tweaking or custom scenarios. |
| **Save/Load** | Persistent world state saved in JSON; supports multiple slots. |
| **Cross‑Platform** | Runs on Windows, macOS, and Linux (Python‑based). |

---

## 🛠️ Installation  

### Prerequisites  

* **Python** ≥ 3.9 (recommended 3.11)  
* **Git** (optional, for cloning)  
* A terminal/command prompt with write permissions to the install directory  

### Steps  

```bash
# 1️⃣ Clone the repository (or download the zip)
git clone https://github.com/your‑repo/dark‑fantasy‑pixel‑civilization.git
cd dark-fantasy-pixel-civilization

# 2️⃣ Create a virtual environment (highly recommended)
python -m venv venv
# Activate:
#   Windows: venv\Scripts\activate
#   macOS/Linux: source venv/bin/activate

# 3️⃣ Install required packages
pip install -r requirements.txt

# 4️⃣ Run the game
python main.py
```

*If you prefer not to use a virtual environment, simply run `pip install -r requirements.txt` globally.*

---

## ⚙️ Configuration  

All tunable settings live in **`config.json`**. Below is a sample with explanations:

```json
{
  "difficulty": "medium",          // Options: "easy", "medium", "hard", "nightmare"
  "starting_population": 1000,    // Initial citizens
  "starting_treasury": 1000000,   // Gold at Day 0
  "day_length_seconds": 5,        // Real‑time seconds per in‑game day
  "enable_ai_assist": true,       // Turn on AI improvement suggestions
  "max_save_slots": 5
}
```

*Changing any value requires a game restart to take effect.*  

Additional optional sections (e.g., custom event tables, mod loading) can be added following the same JSON schema—see `config_schema.json` for the full specification.

---

## 🌍 World State Variables  

The engine tracks a handful of core variables that are displayed on the HUD and saved in `savegame_*.json`:

| Variable | Current Value | Meaning |
|----------|---------------|---------|
| **Day** | `67229` | Number of in‑game days elapsed since the start. |
| **Population** | `7900` | Total living citizens (workers, soldiers, scholars, etc.). |
| **Treasury** | `44 998 556 266` | Gold reserves available for construction, research, and upkeep. |
| **Food Stock** | (auto‑calculated) | Determines population growth/decline. |
| **Morale** | (0‑100) | Affects productivity and chance of rebellion. |
| **Tech Level** | (0‑10) | Progress along the AI improvement research tree. |

These variables can be inspected or edited manually (for debugging) by opening the corresponding save file and editing the JSON fields.

---

## 🤖 AI Improvement System  

### Overview  

The AI Improvement System is a **research‑driven meta‑layer** that provides both *passive* upgrades (e.g., “Efficient Harvesting”) and *active* boosts (e.g., “Warrior’s Fury”). It is designed to evolve alongside the civilization, offering strategic depth without overwhelming the player.

### Components  

1. **Research Trees**  
   *Three primary branches*:  
   - **Economics** – boosts tax income, market efficiency, and treasury growth.  
   - **Military** – unlocks new unit types, combat tactics, and defensive structures.  
   - **Arcane** – grants magical buildings, spell‑casting units, and curse mitigation.  

   Each node costs a combination of **gold**, **research points**, and **time** (in days).  

2. **AI Boost Cards**  
   *One‑time consumables* that temporarily multiply a specific stat (e.g., “+25 % resource gathering for 30 days”). Boosts are earned via achievements, events, or purchased with premium currency (optional).  

3. **Policy Advisor (Optional)**  
   When `enable_ai_assist` is true, the game suggests the next optimal research node based on current world state (population pressure, treasury health, upcoming threats).  

### How to Use  

*Open the **Research** UI → select a branch → click a node → confirm resource cost.*  
*Boost cards appear in the **Inventory** tab; drag onto the target building or global icon to activate.*

---

## 🛠️ Troubleshooting  

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| **Game crashes on launch** | Missing dependencies / wrong Python version | Verify `python --version` ≥ 3.9 and run `pip install -r requirements.txt`. |
| **Save file fails to load** | Corrupted JSON (e.g., manual edit error) | Open the save file in a JSON validator, correct syntax, or delete the corrupted slot (a new slot will be created). |
| **Population freezes** | Food production < consumption | Build/upgrade farms, check for pest events in the **Events Log**, or increase `food_efficiency` via research. |
| **Treasury shows negative value** | Overspending on upkeep or a bug in a custom mod | Disable mods (`mods_enabled: false` in `config.json`) and ensure building upkeep is affordable. |
| **AI suggestions not appearing** | `enable_ai_assist` set to false or missing `ai_assist.py` | Set `"enable_ai_assist": true` in `config.json` and ensure the `ai_assist.py` module exists in the `src/` folder. |
| **Graphics appear garbled** | Incompatible terminal/console rendering | Run the game in a windowed mode (`python main.py --windowed`) or update your graphics drivers. |

### Getting Help  

1. **Check the console output** – error traces often point directly to the offending file/line.  
2. **Search the Issues tab** on GitHub – many common problems are already documented.  
3. **Open a new issue** if you can’t find a solution. Include:  
   - OS and Python version  
   - Full error traceback  
   - Steps to reproduce  

Link: <https://github.com/your-repo/dark-fantasy-pixel-civilization/issues>

---

## 🤝 Contributing  

We welcome contributions! Typical workflow:

```bash
git fork https://github.com/your-repo/dark-fantasy-pixel-civilization.git
git checkout -b feature/awesome‑new‑mechanic
# develop, test
git commit -m "Add awesome new mechanic"
git push origin feature/awesome‑new‑mechanic
# Open a Pull Request on GitHub
```

Please adhere to the **PEP 8** style guide, write unit tests for new logic, and update the documentation (README, docstrings) accordingly.

---

## 📄 License  

This project is licensed under the **MIT License**. See the `LICENSE` file for full terms.

---

*— End of README —*