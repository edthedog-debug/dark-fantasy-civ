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

---  

## Project Overview  
The **Dark Fantasy Pixel Art Civilization Game** is a strategic simulation set in a brooding, hand‑crafted pixel‑art world. Players guide a fledgling settlement through centuries of hardship, balancing resource management, city‑building, research, and diplomacy while confronting ever‑evolving AI‑driven threats.  

Key design goals:  

- **Atmospheric pixel art** that evokes classic dark‑fantasy aesthetics.  
- **Deep, emergent gameplay** where every decision ripples through the world.  
- **AI‑driven dynamics** powered by Groq’s LPU hardware, delivering fast, adaptive opponents and advisors.  

> **Current Game State (as of this build)**  
> - **Day:** `88261`  
> - **Population:** `11 265`  
> - **Treasury:** `97 907 013 586`  

---  

## Features  

| Category | Description |
|----------|-------------|
| **Pixel‑Art World** | Hand‑drawn tiles, animated sprites, weather & lighting effects. |
| **Civilization Management** | Build structures, assign workers, manage food, gold, mana, and morale. |
| **Research Tree** | Unlock dark‑magic technologies, military upgrades, and cultural wonders. |
| **Dynamic AI** | Adaptive AI factions, rogue necromancers, and a living ecosystem that reacts to player actions. |
| **Procedural Events** | Randomized calamities, festivals, invasions, and quests that keep each play‑through unique. |
| **Modular Architecture** | Plug‑in support for new units, buildings, and storylines. |
| **Performance‑Optimized** | Runs on Groq LPU hardware for near‑instant AI inference; also works on standard CPUs (with slower AI). |
| **Save/Load System** | Export and import game snapshots (JSON format). |
| **Multilingual UI** | English, Spanish, Japanese, and community‑contributed translations. |

---  

## Installation  

### Prerequisites  

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **Operating System** | Windows 10 / macOS 10.15 / Linux (glibc 2.27+) | Same |
| **Python** | 3.8 | 3.11 |
| **Groq LPU** | Optional (for full‑speed AI) | Required for best experience |
| **Graphics** | GPU supporting OpenGL 3.3 | Any modern GPU |
| **Disk Space** | 500 MB | 1 GB (including assets & logs) |

### Step‑by‑Step  

1. **Clone the repository**  
   ```bash
   git clone https://github.com/your‑org/dark‑fantasy‑civ.git
   cd dark-fantasy-civ
   ```

2. **Create a virtual environment (highly recommended)**  
   ```bash
   python -m venv .venv
   source .venv/bin/activate   # Linux/macOS
   .venv\Scripts\activate      # Windows
   ```

3. **Install Python dependencies**  
   ```bash
   pip install -r requirements.txt
   ```

4. **(Optional) Install Groq LPU drivers**  
   Follow the official Groq installation guide: <https://docs.groq.com/lpu/setup>  

5. **Run the game**  
   ```bash
   python launch.py
   ```

6. **First‑time setup**  
   The game will generate a `config.json` in the working directory. Edit it (see *Configuration* below) before launching again if you want custom settings.

---  

## Configuration  

All configurable options live in **`config.json`**. Below is a sample with explanations.

```json
{
  "game_speed": "normal",          // Options: "slow", "normal", "fast", "ultra"
  "difficulty": "hard",            // Options: "easy", "medium", "hard", "nightmare"
  "audio": {
    "master_volume": 0.8,
    "music_volume": 0.6,
    "sfx_volume": 0.9
  },
  "display": {
    "resolution": "1920x1080",
    "fullscreen": false,
    "vsync": true
  },
  "ai": {
    "use_groq_lpu": true,
    "max_think_time_ms": 30
  },
  "save_path": "saves/",
  "log_level": "INFO"
}
```

### Key Sections  

- **`game_speed`** – Controls how quickly days advance. Faster speeds reduce UI animation time but may make strategic planning harder.  
- **`difficulty`** – Alters AI aggression, resource scarcity, and event frequency.  
- **`ai.use_groq_lpu`** – Set to `true` to enable hardware‑accelerated AI; `false` falls back to CPU inference (slower).  
- **`max_think_time_ms`** – Upper bound for AI decision‑making per tick; lower values increase responsiveness but may reduce AI depth.  

After editing, **restart the game** for changes to take effect.

---  

## World State Variables  

The engine tracks a core set of variables that define the current simulation state. They are persisted in the save file (`*.json`) and can be inspected via the debug console (`~` key).

| Variable | Type | Description | Example (current) |
|----------|------|-------------|-------------------|
| `day` | Integer | Number of days elapsed since the founding of the settlement. | `88261` |
| `population` | Integer | Total number of living citizens (including children, workers, soldiers). | `11265` |
| `treasury` | Integer (gold units) | Current gold reserves available for construction, research, and upkeep. | `97907013586` |
| `food_stock` | Integer | Units of food stored; determines starvation risk. | *dynamic* |
| `mana_reserve` | Integer | Magical energy pool used for spells, enchantments, and certain building upgrades. | *dynamic* |
| `morale` | Float (0‑1) | Overall citizen happiness; influences productivity and rebellion chance. | *dynamic* |
| `tech_level` | Integer | Highest tier of research unlocked. | *dynamic* |
| `diplomacy.relations` | Object | Mapping of other AI factions → relationship score (‑100 to +100). | *dynamic* |
| `events.active` | Array | List of currently active world events (e.g., “Eternal Eclipse”). | *dynamic* |

> **Tip:** Use the in‑game **Stat Tracker** (press `F1`) to view a live dashboard of these variables.

---  

## AI Improvement System  

The AI subsystem is built around a **continuous learning loop** that adapts to player behavior and overall game progression.

### Core Concepts  

1. **Goal‑Oriented Action Planning (GOAP)** – Each AI faction defines high‑level goals (e.g., “Expand Territory”, “Harvest Mana”). The planner selects actions that maximize a utility function.  
2. **Reinforcement Learning (RL) on LPU** – A lightweight RL agent runs on the Groq LPU, updating policy weights after each major decision (e.g., war declaration, trade offer).  
3. **Dynamic Difficulty Adjustment (DDA)** – The system monitors player performance metrics (win‑rate, resource growth) and subtly tweaks AI aggression, research speed, and event intensity to keep the challenge curve engaging.  

### How It Works (Simplified Flow)

```
[Game Tick] → Gather World State → Feed to LPU → AI Policy Evaluation → Choose Action → Execute → Reward Calculation → Update Policy → Loop
```

- **Input**: Current world state variables + recent player actions.  
- **Output**: Decision (e.g., “Send scouting party to Forest”, “Offer trade of 500 gold for 200 mana”).  

### Configuration Options (see `config.json`)

| Setting | Effect |
|---------|--------|
| `ai.use_groq_lpu` | Enables hardware‑accelerated inference. |
| `ai.max_think_time_ms` | Caps the time the AI may spend per tick (lower = faster but potentially less optimal). |
| `ai.dda.enabled` | Turns Dynamic Difficulty Adjustment on/off. |
| `ai.logging` | Set to `true` to dump AI decision logs for debugging. |

### Extending the AI  

- **Custom Policies** – Add new `.py` modules under `ai/policies/` and register them in `ai/__init__.py`.  
- **Training Data** – The game automatically records episodes in `ai/episodes/`. Use `ai/train.py` to re‑train the model offline if you wish to experiment with different reward structures.  

---  

## Troubleshooting & FAQ  

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| **Game crashes on launch** | Missing dependencies or incompatible Python version. | Verify you’re using Python 3.8+ and run `pip install -r requirements.txt`. |
| **AI behaves erratically / freezes** | `max_think_time_ms` set too low, or LPU driver not installed. | Increase `max_think_time_ms` to ≥ 50 ms, or set `ai.use_groq_lpu` to `false` to fall back to CPU. |
| **Graphics glitches / missing textures** | Out‑of‑date GPU drivers or unsupported OpenGL version. | Update GPU drivers; ensure OpenGL 3.3+ is available. |
| **Save file won’t load** | Corrupted JSON (e.g., manual edit error). | Delete the offending save (or restore from backup) and start a new game. |
| **Audio is silent** | Volume settings in `config.json` set to 0 or system mute. | Adjust `audio.master_volume` > 0 and check OS sound settings. |
| **Performance is sluggish on CPU** | AI is using the LPU‑optimized model on a regular CPU. | Set `"ai.use_groq_lpu": false` in `config.json` or acquire a Groq LPU. |
| **I want to change the day counter format** | Day display is hard‑coded in UI. | Modify `ui/day_counter.py` and rebuild the UI assets. |

### Getting Help  

- **GitHub Issues**: <https://github.com/your-org/dark-fantasy-civ/issues> – Search first, then open a new issue with logs (`log_level: DEBUG`).  
- **Discord Community**: Invite link in the repo README – real‑time help from developers and players.  
- **Documentation**: Full API docs are generated with Sphinx and live at <https://your-org.github.io/dark-fantasy-civ/>.  

---  

## Contributing  

We welcome contributions! Follow these steps:

1. Fork the repository.  
2. Create a feature branch (`git checkout -b feature/awesome‑feature`).  
3. Write code **and** tests (see `tests/`).  
4. Ensure the test suite passes: `pytest -q`.  
5. Submit a Pull Request with a clear description of changes.  

Please adhere to the **PEP 8** style guide and keep the pixel‑art assets under the `assets/` folder organized by category.

---  

## License  

This project is licensed under the **MIT License**. See the `LICENSE` file for full terms.  

---  

*Happy building, and may your kingdom thrive in the shadows!*  