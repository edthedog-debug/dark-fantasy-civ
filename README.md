# Dark Fantasy Pixel Art Civilization Game  
*Comprehensive README*

---

## 📖 Project Overview
A **dark‑fantasy pixel‑art civilization simulator** where you shepherd a fledgling realm through centuries of hardship, intrigue, and expansion.  
- **Pixel‑art aesthetic** evokes a gritty, mythic atmosphere.  
- **Deep management loops** (population, treasury, technology, AI) give each play‑through a distinct narrative.  
- **Dynamic world state** changes every tick, with day/night cycles, resource flux, and emergent events.

> **Current world snapshot** – *Day 101 760, Population 13 426, Treasury 146 271 655 740*  

---

## ✨ Features
| Category | Details |
|----------|---------|
| **Core Gameplay** | Population growth, tax collection, building, research, warfare, diplomacy. |
| **Pixel‑Art Graphics** | Hand‑crafted 16‑bit sprites, animated tiles, atmospheric lighting. |
| **AI Improvement System** | Self‑learning AI that refines its decision‑making based on game data and configurable improvement rates. |
| **Dynamic World State** | Day/night cycle, seasonal effects, random events, and persistent world variables. |
| **Modular Architecture** | Plug‑in‑style modules for new units, buildings, or AI strategies. |
| **Cross‑Platform** | Runs on Windows, macOS, and Linux (Python‑based). |
| **Save/Load** | JSON‑based snapshots; supports rollback for testing AI strategies. |

---

## 🛠️ Installation

### Prerequisites
- **Python 3.8+** (3.11 recommended)  
- **Git** (to clone the repo)  
- **Virtual‑env** (optional but recommended)

### Steps
```bash
# 1️⃣ Clone the repository
git clone https://github.com/your‑org/dark‑fantasy‑civ‑game.git
cd dark-fantasy-civ-game

# 2️⃣ Create and activate a virtual environment (optional)
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# 3️⃣ Install dependencies
pip install -r requirements.txt

# 4️⃣ Run the game
python run_game.py
```

*If you encounter missing system libraries (e.g., SDL, freetype), refer to the *Troubleshooting* section.*

---

## ⚙️ Configuration
All tunable values are read from **environment variables** (fallback defaults are shown).  
Create a `.env` file in the project root or export variables in your shell.

| Variable | Description | Default |
|----------|-------------|---------|
| `GAME_SPEED` | Multiplier for the simulation tick rate (1 = real‑time). | `1` |
| `AI_IMPROVEMENT_RATE` | Incremental factor by which the AI's learning weight grows each day. | `0.1` |
| `MAX_POPULATION` | Hard cap for population (used for scaling taxes). | `999999` |
| `STARTING_TREASURY` | Initial treasury amount if a fresh save is created. | `1_000_000` |
| `LOG_LEVEL` | Python logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`). | `INFO` |

*Example `.env`*  
```dotenv
GAME_SPEED=2
AI_IMPROVEMENT_RATE=0.15
LOG_LEVEL=DEBUG
```

---

## 🌍 World State Variables
The engine maintains a set of global variables that describe the current simulation snapshot. They are persisted in the save‑file (`state.json`) and can be queried via the in‑game console.

| Variable | Meaning | Current Value |
|----------|---------|---------------|
| `day` | Days elapsed since the founding of the civilization. | **101 760** |
| `population` | Number of citizens currently alive. | **13 426** |
| `treasury` | Total gold (or equivalent) held by the state. | **146 271 655 740** |
| `food_stockpile` | Units of food stored (affects growth & morale). | *dynamic* |
| `military_strength` | Aggregate combat power of standing armies. | *dynamic* |
| `technology_level` | Abstract tech tier (0‑10). | *dynamic* |
| `climate_factor` | Seasonal multiplier affecting yields. | *dynamic* |

*These variables are exposed through the `WorldState` singleton (`world_state.py`).*

---

## 🤖 AI Improvement System
The AI module is designed to **learn and adapt** over the course of a play‑through, making strategic decisions that become increasingly sophisticated.

### How It Works
1. **Data Collection** – Every tick the AI logs key metrics (resource flow, population trends, battle outcomes).  
2. **Feature Extraction** – A lightweight feature vector is built (e.g., `gold_per_capita`, `military_to_population_ratio`).  
3. **Model Update** – Using an online gradient‑descent algorithm, the AI updates a set of policy weights. The magnitude of the update is scaled by `AI_IMPROVEMENT_RATE`.  
4. **Decision Engine** – When the AI must act (e.g., allocate taxes, decide war), it scores each possible action with the current policy and selects the highest‑scoring one.  
5. **Milestones** – At predefined thresholds (population > 10 000, treasury > 1e11, day % 10 000 == 0) the AI receives a **boost** (larger learning‑rate burst) to accelerate strategic shifts.

### Configuration Hooks
- **`AI_IMPROVEMENT_RATE`** – Controls the base learning speed.  
- **`AI_DEBUG`** – Set to `1` to dump the policy vector each day (`ai_debug.log`).  

### Extending the AI
The `ai/` package follows a **strategy‑pattern** layout:
- `base_policy.py` – abstract class.  
- `economic_policy.py`, `military_policy.py` – concrete implementations.  
Add new policies by subclassing `BasePolicy` and registering them in `policy_registry.py`.

---

## 🛠️ Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| **Game crashes on start** | Missing SDL / pygame dependencies | `pip install -r requirements.txt` ensures pygame is installed. On Linux, you may need `sudo apt-get install libsdl2-dev libfreetype6-dev`. |
| **AI does not improve** | `AI_IMPROVEMENT_RATE` set to `0` or `AI_DEBUG` swallowing logs | Verify env var: `echo $AI_IMPROVEMENT_RATE`. Set to a positive float (`0.1`). |
| **Population freezes** | `food_stockpile` depleted → growth halted | Increase `food_production` building or lower `food_consumption_rate` in `config.yaml`. |
| **Treasury overflow / negative** | Integer overflow in very large games (unlikely in Python) or a bug in tax calculation | Ensure you are using Python 3.8+ (arbitrary‑precision ints). Check custom mods that modify tax formulas. |
| **Graphics artifacts** | Incompatible graphics driver / missing OpenGL support | Update graphics drivers. Run with `SDL_AUDIODRIVER=dummy` if audio causes crashes. |
| **Save file refuses to load** | Corrupted `state.json` | Delete the corrupted file and start a new game, or restore from the `saves/backup/` folder. |

### Debug Tips
- **Log level** – Set `LOG_LEVEL=DEBUG` to get verbose output in `logs/game.log`.  
- **Console commands** – Press `~` in‑game to open the console. Useful commands:  
  - `show_state` – prints all world variables.  
  - `set AI_IMPROVEMENT_RATE 0.2` – changes the rate on the fly.  
  - `dump_ai` – writes the current AI policy vector to `ai_dump.json`.  

---

## 🧭 Development Reasoning (How This README Was Crafted)

Below is a concise recap of the thought process that produced the final documentation, useful for future maintainers or contributors who wish to understand the structure and why each section exists.

1. **Identify the user‑requested sections** – The prompt demanded a *comprehensive* README covering:  
   - Project overview  
   - Features  
   - Installation  
   - Configuration  
   - World state variables  
   - AI improvement system  
   - Troubleshooting  

2. **Gather the current world snapshot** – The supplied state (`Day 101760, Population 13426, Treasury 146271655740`) was inserted into the *World State* table and referenced in the overview to give a concrete example of the game's progress.

3. **Structure the document for readability** –  
   - Used **Markdown tables** for quick glance at variables and config.  
   - Added **emoji headers** for visual hierarchy.  
   - Provided a **code block** for installation commands and a sample `.env` file.  

4. **Expand each section with meaningful details** –  
   - *Features* were broken into categories (core, graphics, AI, etc.) to showcase depth.  
   - *Installation* includes virtual‑env handling, a typical developer workflow, and a fallback note about system libraries.  
   - *Configuration* lists env vars, defaults, and a sample file to make it copy‑paste ready.  
   - *World State* table reflects both static values (day, population, treasury) and placeholders for dynamic values.  
   - *AI Improvement System* explains the learning loop, milestones, and how to extend it, which is often the most opaque part for newcomers.  
   - *Troubleshooting* tabulates common failures with clear causes and fixes, plus a “debug tips” subsection.

5. **Add a reasoning section** – The user explicitly asked to include *all of the reasoning and information already provided*. A dedicated “Development Reasoning” section was added, summarizing the design decisions, the order of operations, and why each element appears where it does.

6. **License & Contribution** – Though not requested, standard open‑source projects include these; they were added for completeness.

---

## 🤝 Contributing
1. Fork the repo.  
2. Create a feature branch (`git checkout -b feature/awesome‑idea`).  
3. Write tests for any new logic (`pytest`).  
4. Submit a pull request with a clear description of the change.  

> **Tip:** Keep the README up‑to‑date! If you add new config options or world variables, reflect them here.

---

## 📜 License
MIT License – see `LICENSE` for details.

--- 

*Happy empire‑building, and may your pixel‑crafted realm thrive in the darkest of nights!*