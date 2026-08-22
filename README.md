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
7. [Troubleshooting](#troubleshooting)  
8. [Current Game State](#current-game-state)  
9. [Contributing](#contributing)  
10. [License](#license)  

---

## Project Overview
A dark‑fantasy, pixel‑art civilization simulator where you build, expand, and protect a fledgling realm against eldritch threats. The game blends classic city‑building mechanics with an AI‑driven “improvement system” that learns from player actions, delivering ever‑more challenging and emergent gameplay. It runs on Groq’s custom LPU hardware for ultra‑fast inference, but also works on standard CPUs (with reduced AI performance).

---

## Features
| Category | Details |
|----------|---------|
| **Pixel‑Art World** | Hand‑crafted 16‑bit style tiles, animated sprites, atmospheric lighting, and day/night cycles. |
| **City‑Building** | Construct residential, military, magical, and resource structures; manage workers, research, and upgrades. |
| **Dynamic Economy** | Treasury, taxes, trade routes, and resource stockpiles that react to population growth and AI events. |
| **AI‑Improvement System** | Adaptive AI that evolves strategies, enemy behavior, and event generation based on player decisions. |
| **World State Tracking** | Persistent variables (day, population, treasury, morale, etc.) saved each session. |
| **Mod‑Friendly** | JSON‑based data files for assets, events, and AI parameters; easy to extend. |
| **Cross‑Platform** | Windows, macOS, Linux (via Python 3.8+). |
| **Performance** | Leveraging Groq LPU for real‑time AI inference; fallback CPU mode available. |

---

## Installation

### Prerequisites
- **Python** ≥ 3.8 (recommended 3.10+)
- **Git** (for cloning the repo)
- **Groq LPU hardware** (optional but required for full AI speed)
- **pip** (Python package manager)

### Steps
```bash
# 1. Clone the repository
git clone https://github.com/groq/dark-fantasy-pixel-civ.git
cd dark-fantasy-pixel-civ

# 2. Create a virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. (Optional) Install Groq SDK for LPU acceleration
pip install groq-sdk   # Only needed if you have the hardware

# 5. Run the game
python main.py
```

**Note:** If you do not have a Groq LPU, the game will automatically fall back to CPU inference, though AI decisions may be slower.

---

## Configuration
All configurable options live in `config.json`. Below is a sample with explanations:

```json
{
  "difficulty": "medium",               // Options: "easy", "medium", "hard"
  "ai_improvement_rate": 0.03,          // Fractional increase per 1000 in‑game days (0‑1)
  "starting_day": 1,
  "starting_population": 500,
  "starting_treasury": 1000000,
  "enable_day_night_cycle": true,
  "graphics_scale": 2,                  // Pixel scaling factor (1 = native)
  "log_level": "INFO",                  // "DEBUG", "INFO", "WARNING", "ERROR"
  "use_groq_lpu": true                  // Set false to force CPU mode
}
```

- **difficulty** – Influences enemy aggression, resource scarcity, and AI learning speed.  
- **ai_improvement_rate** – Controls how quickly the AI “levels up”. Higher values make the AI adapt faster.  
- **enable_day_night_cycle** – Toggles visual day/night effects.  
- **graphics_scale** – Adjusts pixel size for high‑DPI displays.  

After editing, restart the game for changes to take effect.

---

## World State Variables
The engine maintains a set of persistent variables that can be inspected (via the debug console) or saved/loaded with each session.

| Variable | Type | Description |
|----------|------|-------------|
| `day` | integer | Current in‑game day (starts at 1). |
| `population` | integer | Total number of citizens alive. |
| `treasury` | integer | Gold/coins available for spending. |
| `food_stockpile` | integer | Units of food stored. |
| `morale` | float (0‑1) | Overall citizen happiness; affects growth rate. |
| `military_strength` | integer | Combined combat power of all units. |
| `magic_resonance` | float (0‑1) | Strength of magical infrastructure; influences spell casting and AI magical events. |
| `enemy_threat_level` | integer | Scales with AI‑generated invasions. |
| `ai_version` | string | Current version of the AI model in use. |

These variables are automatically serialized to `savegames/<timestamp>.json` when you save, and loaded on game start.

---

## AI Improvement System
The AI system is the heart of the game’s emergent challenge. It consists of three interacting components:

1. **Strategic Planner** – Generates high‑level goals (e.g., “raid a border town”, “trigger a famine”).  
2. **Tactical Engine** – Executes the plan using a reinforcement‑learning policy that evaluates the current world state.  
3. **Learning Loop** – After each major event, the AI receives a reward signal based on player response (e.g., how quickly the player repelled an invasion). The reward updates the policy via on‑device gradient descent.

### How It Works
- **Initialization** – At launch, the AI loads a baseline model (`models/ai_base.pt`).  
- **Improvement Cycle** – Every **N** in‑game days (default `N = 1000 * ai_improvement_rate`), the AI runs a short training epoch on recent gameplay data, producing an updated model (`models/ai_vX.pt`).  
- **Versioning** – The `ai_version` variable is incremented, allowing you to roll back if needed.  
- **Persistence** – Updated models are saved under `models/` and automatically loaded on the next start.

### Tweaking the System
- **Faster Learning** – Increase `ai_improvement_rate` (e.g., `0.05`).  
- **Slower Learning** – Decrease it (e.g., `0.01`).  
- **Disable Learning** – Set `ai_improvement_rate` to `0`. The AI will stay at its baseline level.

---

## Troubleshooting

| Symptom | Possible Cause | Fix |
|---------|----------------|-----|
| **Game fails to start** | Missing Python version or dependencies | Verify `python --version >= 3.8` and run `pip install -r requirements.txt`. |
| **AI does not improve** | `ai_improvement_rate` set to `0` or `use_groq_lpu` disabled on a system without fallback CPU support | Set a non‑zero `ai_improvement_rate` and ensure `use_groq_lpu` matches your hardware. |
| **Graphics look blurry** | `graphics_scale` set incorrectly for your monitor | Adjust `graphics_scale` to `1` (native) or `2` for high‑DPI. |
| **Performance lag** | Running on CPU with large AI model | Enable Groq LPU (`use_groq_lpu: true`) or lower `ai_improvement_rate` to reduce model size. |
| **Save files corrupted** | Unexpected shutdown during save | Delete the last `savegames/*.json` file and reload an earlier save. |
| **Error: `groq-sdk` not found** | SDK not installed or virtual environment not activated | Run `pip install groq-sdk` inside the active venv. |

### Debug Mode
Run the game with extra logging:
```bash
python main.py --log-level DEBUG --verbose
```
Log output is written to `logs/game_<timestamp>.log`.

---

## Current Game State
> **Day:** 96 329  
> **Population:** 12 557  
> **Treasury:** 125 406 726 188  

These numbers are automatically displayed on the main HUD and are stored in the world‑state file `savegames/latest.json`.

---

## Contributing
We welcome community contributions! To get started:

1. Fork the repository.  
2. Create a feature branch (`git checkout -b feature/awesome‑feature`).  
3. Follow the existing code style (PEP 8, docstrings, type hints).  
4. Add or update unit tests in `tests/`.  
5. Submit a Pull Request with a clear description of changes.

Please see `CONTRIBUTING.md` for detailed guidelines, code of conduct, and the roadmap.

---

## License
This project is released under the **MIT License**. See the `LICENSE` file for full terms.

---

*Happy building, and may your realm thrive amidst the shadows!*