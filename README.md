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
7. [Troubleshooting](#troubleshooting)  
8. [Contributing](#contributing)  
9. [License](#license)  

---  

## Project Overview  
The **Dark Fantasy Pixel Art Civilization Game** is a single‑player, turn‑based simulation where you guide a fledgling realm through a bleak, myth‑laden world rendered in nostalgic pixel art.  
- **Goal:** Grow your civilization, keep its people alive, and amass wealth while surviving supernatural threats and harsh environments.  
- **Current Game State (as of the latest save):**  

| Variable | Value |
|----------|-------|
| **Day** | `105 329` |
| **Population** | `13 997` |
| **Treasury** | `160 909 415 272` (gold units) |

The game is designed to be extensible: new tiles, units, events, and AI behaviours can be added without touching the core engine.

---  

## Features  

| Category | Description |
|----------|-------------|
| **Pixel‑Art Visuals** | Hand‑crafted 16‑bit style sprites, tilesets, and UI elements that evoke classic dark‑fantasy aesthetics. |
| **Deep Civilization Management** | Control food production, housing, military recruitment, research, and religious influence. |
| **Dynamic World State** | Day counter, population growth/decline, treasury balance, morale, and environmental modifiers evolve each turn. |
| **Event System** | Random and scripted events (e.g., demon incursions, plagues, celestial alignments) that affect world variables. |
| **AI Improvement System** | A modular, data‑driven AI that learns from player actions and can be upgraded via “AI Points”. |
| **Mod‑Friendly Architecture** | JSON/YAML configuration files, plugin hooks, and a clear separation between engine, data, and assets. |
| **Save/Load** | Persistent binary save files with versioning support. |
| **Cross‑Platform** | Runs on Windows, macOS, and Linux (via Python). |
| **Open‑Source** | MIT‑licensed, encouraging community contributions. |

---  

## Installation  

### Prerequisites  

| Requirement | Minimum Version |
|-------------|-----------------|
| **Python** | 3.8 (3.11 recommended) |
| **Pip** | 21.0+ |
| **Git** | any recent version (optional, for cloning) |
| **OS** | Windows 10/11, macOS 12+, or any modern Linux distro |

### Step‑by‑Step  

1. **Clone the repository** (or download a zip).  
   ```bash
   git clone https://github.com/your‑org/dark‑fantasy‑pixel‑civilization.git
   cd dark-fantasy-pixel-civilization
   ```

2. **Create a virtual environment** (highly recommended).  
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # macOS / Linux
   source venv/bin/activate
   ```

3. **Install dependencies**.  
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the game**.  
   ```bash
   python main.py
   ```

5. (Optional) **Create a desktop shortcut** or add the `run.sh` / `run.bat` script to your PATH for one‑click launching.

---  

## Configuration  

All configurable aspects live under the `config/` directory. The primary files are:

| File | Purpose |
|------|---------|
| `config/settings.yaml` | Global toggles (debug mode, UI scaling, sound volume). |
| `config/world.yaml` | Baseline world parameters (starting resources, climate, map size). |
| `config/ai.yaml` | AI learning rates, point costs, and upgrade paths. |
| `config/events.json` | Event definitions, probabilities, and outcomes. |

### Example: `settings.yaml`

```yaml
debug: false
ui_scale: 1.0
audio:
  master_volume: 0.8
  music_volume: 0.6
  sfx_volume: 0.9
autosave_interval_minutes: 10
```

### Changing the Current Game State  

The live game state is stored in `saves/current_save.dat`. **Do not edit this binary file directly.**  
To modify the starting values for testing, edit `config/world.yaml`:

```yaml
starting_day: 1
starting_population: 500
starting_treasury: 10000
```

After changing the defaults, delete or rename the existing save file so the game creates a fresh one on next launch.

---  

## World State Variables  

The engine tracks a set of core variables each turn. They are exposed to the UI, the AI, and mod scripts.

| Variable | Type | Description | Example (Current) |
|----------|------|-------------|-------------------|
| `day` | `int` | Number of days elapsed since the beginning of the simulation. | `105329` |
| `population` | `int` | Total number of living citizens (including children). | `13997` |
| `treasury` | `int` | Amount of gold (or generic currency) stored in the royal vault. | `160909415272` |
| `food_stock` | `int` | Units of food available for consumption. |
| `morale` | `float` (0‑1) | General happiness; influences productivity and rebellion risk. |
| `military_strength` | `int` | Sum of combat power of all standing units. |
| `research_points` | `int` | Accumulated points for unlocking new technologies. |
| `ai_points` | `int` | Points earned by the AI for learning; spent on upgrades. |
| `environment_factor` | `float` | Modifier based on climate, season, and magical anomalies. |

These variables can be accessed programmatically via the `GameState` singleton:

```python
from engine.state import GameState

gs = GameState.instance()
print(gs.day, gs.population, gs.treasury)
```

---  

## AI Improvement System  

### Overview  
The AI controls non‑player factions, random events, and the “advisor” that suggests actions to the player. It is built around a **point‑based upgrade tree** that unlocks smarter behaviours as the game progresses.

### Core Concepts  

| Concept | Explanation |
|---------|-------------|
| **AI Points** | Earned each turn based on the player’s achievements (e.g., reaching population milestones, completing quests). |
| **Upgrade Nodes** | Each node represents a new decision‑making rule (e.g., “Prefer diplomatic solutions over war”). |
| **Learning Rate** | Determines how many AI points are required for the next upgrade. Configurable in `config/ai.yaml`. |
| **Dynamic Re‑balancing** | The AI can re‑evaluate its strategy when world variables cross thresholds (e.g., treasury > 1 billion). |

### Example Upgrade Tree (excerpt)

```yaml
upgrades:
  - id: "diplomacy_1"
    name: "Basic Diplomacy"
    cost: 500
    unlocks:
      - "prefer_peaceful_events"
  - id: "economics_1"
    name: "Improved Taxation"
    cost: 800
    unlocks:
      - "dynamic_tax_rates"
  - id: "military_1"
    name: "Tactical Warfare"
    cost: 1200
    unlocks:
      - "flank_attacks"
```

When the AI spends points on `diplomacy_1`, it will start weighting diplomatic event outcomes higher than hostile ones.

### Extending the AI  

1. **Add a new node** in `config/ai.yaml`.  
2. **Implement the behaviour** in `engine/ai/behaviours.py` using the `@ai_behavior` decorator.  
3. **Register the node** in `engine/ai/upgrade_manager.py`.  

The system is deliberately decoupled from the main game loop, allowing future integration of machine‑learning models if desired.

---  

## Troubleshooting  

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| **Game fails to start, “ImportError: No module named …”** | Missing dependencies or virtual environment not activated. | Run `pip install -r requirements.txt` inside the activated venv. |
| **Graphics appear corrupted or missing** | Asset folder not found or wrong working directory. | Ensure you launch the game from the repository root (`python main.py`). |
| **Save file corrupted / game crashes on load** | Unexpected termination while writing `current_save.dat`. | Delete/rename the corrupted save file; a fresh save will be generated. |
| **AI does not improve after many days** | AI points not being awarded (e.g., `ai.enabled: false` in `settings.yaml`). | Set `ai.enabled: true` and verify `ai_points` increase in the UI. |
| **Performance drops dramatically after day 100 000** | Accumulated event log causing memory bloat. | Enable `debug: false` (disables verbose logging) or increase `max_event_log` in `config/settings.yaml`. |
| **Audio is silent** | System volume muted or `audio.enabled: false`. | Check OS volume, then set `audio.enabled: true` in `settings.yaml`. |
| **Mod changes not reflected** | Cached data or old save file. | Delete the `cache/` folder and restart the game. |

### Reporting Bugs  

1. **Gather information**: OS, Python version, steps to reproduce, and the full traceback (if any).  
2. **Create an issue** on GitHub: <https://github.com/your-org/dark-fantasy-pixel-civilization/issues>  
3. **Attach logs**: `logs/latest.log` (found in the `logs/` directory).  

---  

## Contributing  

We welcome contributions of any kind—code, art, music, documentation, or ideas.  

1. **Fork the repository**.  
2. **Create a feature branch**: `git checkout -b feature/awesome‑feature`.  
3. **Write tests** (if you add new logic).  
4. **Submit a Pull Request** with a clear description of what changed and why.  

Please read `CONTRIBUTING.md` for style guidelines, commit message conventions, and the code‑review process.

---  

## License  

This project is licensed under the **MIT License**. See the `LICENSE` file for full text.  

---  

*Happy world‑building, and may your pixelated realm thrive in the shadows!*