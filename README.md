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
10. [Acknowledgements](#acknowledgements)  

---  

## Project Overview  

Welcome to **Dark Fantasy Pixel Art Civilization**, a sandbox‑style strategy game where you guide a fledgling realm through centuries of darkness, war, and wonder. Built with **Python** and **Pygame**, the game blends classic pixel‑art aesthetics with modern AI‑driven decision‑making tools, giving you both the nostalgic feel of retro titles and the depth of contemporary simulation games.  

> **Current Game State** (as of the latest save)  
> - **Day:** `80729`  
> - **Population:** `10 061` citizens  
> - **Treasury:** `76 163 712 970` gold coins  

Your mission is to expand, defend, and evolve your civilization while balancing resource scarcity, morale, and the ever‑looming threats of the dark fantasy world.

---  

## Features  

| Category | Description |
|----------|-------------|
| **Pixel‑Art World** | Hand‑crafted 16‑bit style tiles, characters, UI elements, and animated weather effects. |
| **Dynamic Economy** | Real‑time production/consumption loops for food, wood, stone, mana, and gold. |
| **Population Management** | Birth/death rates, health, morale, and class (peasants, artisans, soldiers, mages). |
| **Tech Tree & Lore** | Branching research paths (e.g., *Necromancy*, *Runic Engineering*, *Shadowcraft*). |
| **AI Improvement System** | Machine‑learning‑assisted advisors that suggest optimal building placement, resource allocation, and policy changes. |
| **Procedural Events** | Randomized raids, plagues, festivals, and celestial phenomena that affect the world state. |
| **Mod‑Friendly Architecture** | JSON‑based data files, clear separation of assets, and a plugin API for community extensions. |
| **Save/Load** | Persistent world state stored in a single `savegame.json` file. |
| **Cross‑Platform** | Runs on Windows, macOS, and Linux (requires Python 3.8+). |

---  

## Installation  

### Prerequisites  

- **Python** ≥ 3.8 (tested on 3.8‑3.12)  
- **Git** (optional, for cloning)  
- **Pygame** ≥ 2.1.0  
- **NumPy** ≥ 1.20 (used by the AI module)  

### Step‑by‑Step  

1. **Clone the repository** (or download a zip)  

   ```bash
   git clone https://github.com/your‑org/dark‑fantasy‑pixel‑civilization.git
   cd dark-fantasy-pixel-civilization
   ```

2. **Create a virtual environment** (recommended)  

   ```bash
   python -m venv venv
   source venv/bin/activate   # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**  

   ```bash
   pip install -r requirements.txt
   ```

   *`requirements.txt` contains:*  

   ```
   pygame>=2.1.0
   numpy>=1.20
   scikit-learn>=1.2   # for the AI advisor
   ```

4. **Run the game**  

   ```bash
   python main.py
   ```

5. (Optional) **Create a desktop shortcut** – see the `docs/shortcut‑guide.md` file for OS‑specific instructions.

---  

## Configuration  

All configurable options live in `config.json` at the project root. The file is loaded at startup and can be edited while the game is not running.

### Example `config.json`

```json
{
  "difficulty": "hard",
  "starting_population": 150,
  "starting_treasury": 500000,
  "world_seed": 842931,
  "ai_advisor": {
    "enabled": true,
    "update_interval_days": 30,
    "model_path": "ai/models/advisor_v1.pkl"
  },
  "graphics": {
    "scale_factor": 2,
    "fullscreen": false,
    "vsync": true
  },
  "audio": {
    "master_volume": 0.8,
    "music_volume": 0.6,
    "sfx_volume": 0.7
  }
}
```

### Key Options  

| Option | Values | Description |
|--------|--------|-------------|
| `difficulty` | `"easy"`, `"medium"`, `"hard"` | Adjusts resource yields, enemy strength, and AI aggressiveness. |
| `starting_population` | integer | Number of citizens at day 0. |
| `starting_treasury` | integer | Gold available at the beginning. |
| `world_seed` | integer | Seed for procedural map generation; same seed → identical map. |
| `ai_advisor.enabled` | boolean | Turn the AI advisor on/off. |
| `ai_advisor.update_interval_days` | integer | How often (in‑game days) the advisor re‑evaluates the world state. |
| `graphics.scale_factor` | 1‑4 | Pixel‑art scaling for modern displays. |
| `audio.*_volume` | 0.0‑1.0 | Volume sliders for master, music, and sound‑effects. |

After editing, **restart the game** for changes to take effect.

---  

## World State Variables  

The engine tracks a set of core variables that are persisted in `savegame.json`. Understanding them helps you read the log files, write mods, or debug AI recommendations.

| Variable | Type | Description | Example (current) |
|----------|------|-------------|-------------------|
| `day` | integer | Current in‑game day count (starts at 0). | `80729` |
| `population.total` | integer | Total number of living citizens. | `10061` |
| `population.by_class` | object | Breakdown by class (peasants, artisans, soldiers, mages). | `{ "peasants": 7200, "artisans": 1800, "soldiers": 800, "mages": 161 }` |
| `treasury` | integer | Gold reserves (raw number, not formatted). | `76163712970` |
| `resources` | object | Quantities of food, wood, stone, mana, etc. | `{ "food": 452300, "wood": 128900, "stone": 87420, "mana": 3120 }` |
| `happiness` | float (0‑1) | Average citizen morale; influences birth rate and productivity. | `0.73` |
| `tech_progress` | object | Current research points per tech tree branch. | `{ "necromancy": 1240, "runic_engineering": 860 }` |
| `events_log` | array of objects | Chronological list of major events (raids, festivals, discoveries). | `[{ "day": 80720, "type": "raid", "severity": "high" }, …]` |
| `ai_advisor.last_update` | integer | Day number when the AI last generated recommendations. | `80700` |

> **Tip:** Use the in‑game console (`~` key) and type `state dump` to print a JSON snapshot of the current world state.

---  

## AI Improvement System  

The AI advisor is a **hybrid system** that combines rule‑based heuristics with a lightweight machine‑learning model trained on thousands of simulated playthroughs. Its purpose is to surface *actionable insights* without taking control away from the player.

### Architecture  

```
+-------------------+      +-------------------+      +-------------------+
|   Game Engine     | ---> |   Data Collector  | ---> |   Feature Engine  |
+-------------------+      +-------------------+      +-------------------+
                                 |                         |
                                 v                         v
                         +-------------------+   +-------------------+
                         |   Historical DB   |   |   ML Model (sklearn)|
                         +-------------------+   +-------------------+
                                 |                         |
                                 +-----------+-------------+
                                             |
                                   +-------------------+
                                   |   Advisor Engine  |
                                   +-------------------+
                                             |
                                   +-------------------+
                                   |   UI Recommendation|
                                   +-------------------+
```

### How It Works  

1. **Data Collection** – Every `update_interval_days` (default 30) the engine records a snapshot of all world state variables.  
2. **Feature Engineering** – Raw numbers are transformed into normalized features (e.g., *gold per capita*, *food surplus ratio*, *military readiness index*).  
3. **Model Inference** – A pre‑trained **RandomForestRegressor** predicts the *expected growth* for each possible action (build, research, tax change).  
4. **Rule Overlay** – Hard constraints (e.g., “never suggest a building that exceeds current wood stock”) are applied to filter out infeasible options.  
5. **Recommendation Generation** – The top‑3 actions with the highest predicted ROI are displayed in the **Advisor Panel** (accessible via `F1`).  

### Extending / Retraining the AI  

- **Data Source** – All snapshots are stored in `ai/data/history/*.json`.  
- **Training Script** – Run `python ai/train_advisor.py --epochs 50 --output models/advisor_v2.pkl`.  
- **Custom Models** – The advisor can load any scikit‑learn compatible model that implements `predict_proba`. Update `config.json → ai_advisor.model_path` accordingly.  

### Example Recommendations (Day 80729)  

| Rank | Action | Predicted Daily Gold Δ | Reason |
|------|--------|------------------------|--------|
| 1 | Upgrade **Mages’ Tower** to level 3 | + 12 340 gold | Improves mana production → unlocks *Runic Engineering* |
| 2 | Enact **Tax Increase** (5 %) | + 8 210 gold | Population morale > 0.70, so impact minimal |
| 3 | Build **Granary** (x2) | + 4 500 gold | Food surplus > 20 % → storage reduces waste |

---  

## Troubleshooting & FAQ  

### The game crashes on startup  

1. **Check Python version** – Must be ≥ 3.8. Run `python --version`.  
2. **Missing dependencies** – Re‑run `pip install -r requirements.txt`.  
3. **Corrupt assets** – Delete the `assets/cache/` folder; it will be regenerated.  

### Audio is silent or distorted  

- Verify your system’s volume mixer isn’t muting the Python process.  
- Ensure `audio.master_volume` in `config.json` is > 0.  
- On Linux, you may need to install `libsdl2-mixer-2.0-0`.  

### AI advisor never updates  

- Confirm `ai_advisor.enabled` is `true`.  
- Check that `day` is advancing (the game may be paused).  
- Look at `logs/ai.log` for errors; a common issue is a missing model file.  

### Save file won’t load / “Corrupted save data”  

- Ensure the JSON syntax is valid (use an online validator).  
- If you edited the file manually, revert to the last backup in `saves/backup/`.  

### Performance is low on high‑resolution monitors  

- Reduce `graphics.scale_factor` to `1` or `2`.  
- Turn off `graphics.vsync` if you experience input lag.  
- Close other CPU‑intensive applications.  

### I want to add a new building or unit  

1. Add a JSON definition in `data/buildings/` or `data/units/`.  
2. Provide a 32×32 pixel sprite in `assets/sprites/`.  
3. Register the new entry in `engine/registry.py`.  
4. Restart the game – the new content will appear in the build menu.  

---  

## Contributing  

We welcome community contributions!  

1. **Fork** the repository.  
2. Create a **feature branch** (`git checkout -b feature/awesome‑feature`).  
3. Follow the **PEP 8** style guide and run `flake8` before committing.  
4. Write **unit tests** for any new logic (`pytest tests/`).  
5. Submit a **Pull Request** with a clear description of the change.  

Please see `CONTRIBUTING.md` for detailed guidelines, code of conduct, and the release process.

---  

## License  

This project is licensed under the **MIT License**. See the `LICENSE` file for the full text.

---  

## Acknowledgements  

- **Pygame** – The engine that makes pixel‑art rendering simple and fast.  
- **NumPy** & **scikit‑learn** – Powering the AI advisor’s data handling and modeling.  
- **OpenGameArt.org** – For many of the public‑domain tiles and sound effects.  
- **Community Playtesters** – For invaluable feedback during early alpha stages.  

---  

*Happy building, and may your kingdom thrive in the shadows!*  