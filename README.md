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
7. [Troubleshooting & FAQ](#troubleshooting--faq)  
8. [Contributing](#contributing)  
9. [License](#license)  

---  

## Project Overview  

The **Dark Fantasy Pixel Art Civilization Game** is a strategic, turn‑based simulation set in a brooding, hand‑crafted pixel‑art world. Players guide a fledgling settlement through centuries of hardship, expanding territory, managing resources, and confronting supernatural threats.  

Key design goals:  

- **Immersive pixel‑art aesthetic** that evokes classic dark‑fantasy titles.  
- **Deep civilization management** (population, treasury, technology, morale, etc.).  
- **AI‑driven world dynamics** – the world reacts to player actions, and the AI itself evolves over time.  
- **Scalable performance** – built to run on standard PCs and on Groq LPU hardware for accelerated AI inference.  

**Current Game State (as of the latest save):**  

| Variable | Value |
|----------|-------|
| **Day** | **97260** |
| **Population** | **12 705** |
| **Treasury** | **128 788 030 891** (gold units) |

---  

## Features  

| Feature | Description |
|---------|-------------|
| **Pixel‑Art World** | Hand‑drawn tiles, characters, and UI elements with a dark‑fantasy palette. |
| **Civilization Management** | Build structures, research technologies, manage food, morale, and military. |
| **Dynamic AI** | NPC factions, monsters, and environmental events are driven by a learning AI model. |
| **AI Improvement System** | The AI refines its decision‑making based on player interactions and internal metrics. |
| **Modular Architecture** | Core engine, UI, AI, and data layers are loosely coupled for easy extension. |
| **Cross‑Platform** | Runs on Windows, macOS, Linux; optional Groq LPU acceleration for heavy AI workloads. |
| **Save/Load System** | Persistent world state stored in JSON; supports multiple save slots. |
| **Rich Lore** | In‑game codex with lore entries, quests, and hidden secrets. |

---  

## Installation  

### Prerequisites  

- **Python 3.9+** (recommended: 3.11)  
- **Git** (for cloning the repo)  
- **Optional – Groq LPU hardware** (for accelerated AI inference)  

### Step‑by‑Step  

```bash
# 1️⃣ Clone the repository
git clone https://github.com/groq/dark-fantasy-pixel-art-civilization-game.git
cd dark-fantasy-pixel-art-civilization-game

# 2️⃣ Create a virtual environment (highly recommended)
python -m venv .venv
# Activate:
#   Windows: .venv\Scripts\activate
#   macOS/Linux: source .venv/bin/activate

# 3️⃣ Install Python dependencies
pip install -r requirements.txt

# 4️⃣ (Optional) Install Groq LPU drivers if you have the hardware
# Follow the official Groq guide: https://console.groq.com/docs/lpu-setup

# 5️⃣ Run the game
python main.py
```

> **Tip:** The first launch will generate a default `config.json` and a starter save file (`save_001.json`).  

---  

## Configuration  

All runtime options are stored in **`config.json`** at the project root. Below is a sample with explanations.

```json
{
  "game_title": "Dark Fantasy Pixel Art Civilization",
  "difficulty": "medium",                     // easy | medium | hard
  "starting_day": 1,
  "starting_population": 500,
  "starting_treasury": 1000000,
  "ai_improvement_rate": 0.02,                // % increase in AI skill per 10,000 days
  "max_population_cap": 500000,
  "treasury_interest_rate": 0.001,            // Daily interest applied to treasury
  "enable_lpu_acceleration": true,
  "log_level": "INFO",                        // DEBUG, INFO, WARN, ERROR
  "save_directory": "saves/",
  "autosave_interval_days": 30
}
```

### Important Keys  

| Key | Purpose | Typical Values |
|-----|---------|----------------|
| `difficulty` | Sets baseline AI aggressiveness and resource scarcity. | `easy`, `medium`, `hard` |
| `ai_improvement_rate` | Controls how fast the AI learns from experience. | `0.01`–`0.05` (1–5 % per 10k days) |
| `enable_lpu_acceleration` | Toggles hardware‑accelerated inference. | `true` / `false` |
| `log_level` | Verbosity of console/file logs. | `DEBUG`, `INFO`, `WARN`, `ERROR` |

After editing `config.json`, restart the game for changes to take effect.  

---  

## World State Variables  

The game’s persistent state is stored in a JSON save file (e.g., `saves/save_001.json`). Core variables include:

| Variable | Type | Description |
|----------|------|-------------|
| `day` | integer | Current in‑game day counter. |
| `population` | integer | Total number of citizens alive. |
| `treasury` | integer | Gold reserves (raw integer; UI formats with commas). |
| `food_stockpile` | integer | Units of food stored. |
| `morale` | float (0‑1) | Overall citizen happiness; influences productivity. |
| `technology_tree` | object | Keys are tech IDs, values are booleans (`true` = researched). |
| `buildings` | list of objects | Each entry contains `type`, `level`, `position`, `status`. |
| `military_units` | list of objects | Details of each unit (type, health, location). |
| `ai_state` | object | Internal AI metrics (experience points, skill level, last‑update timestamp). |
| `events_log` | array | Chronological list of major world events (for debugging / lore). |

**Example snippet** (truncated):

```json
{
  "day": 97260,
  "population": 12705,
  "treasury": 128788030891,
  "food_stockpile": 84213,
  "morale": 0.73,
  "technology_tree": {
    "agriculture": true,
    "blacksmithing": true,
    "dark_rituals": false
  },
  "buildings": [
    {"type":"town_hall","level":4,"position":[12,8],"status":"operational"},
    {"type":"barracks","level":2,"position":[13,9],"status":"operational"}
  ],
  "military_units": [
    {"type":"swordsman","health":100,"location":[13,9]},
    {"type":"shadow_mage","health":80,"location":[14,10]}
  ],
  "ai_state": {
    "skill_level": 3,
    "experience_points": 458920,
    "last_update": "97258"
  },
  "events_log": [
    {"day":97255,"event":"Orc raid repelled"},
    {"day":97258,"event":"Discovered ancient rune"}
  ]
}
```

---  

## AI Improvement System  

The AI that governs NPC factions, random events, and world‑reaction logic is **self‑optimizing**. Its improvement pipeline consists of three stages:

1. **Experience Accumulation**  
   - Every in‑game day the AI records outcomes of its decisions (e.g., success of raids, resource allocation efficiency).  
   - These outcomes are converted into **experience points (XP)** using a weighted scoring function.  

2. **Skill Level Advancement**  
   - When XP crosses a threshold (`XP_THRESHOLD = 100 000 * current_skill_level`), the AI’s **skill level** increments by 1.  
   - Skill level directly influences:  
     - Decision‑making depth (more look‑ahead steps).  
     - Probability of generating novel events.  
     - Adaptation speed to player strategies.  

3. **Model Fine‑Tuning (Optional LPU)**  
   - If `enable_lpu_acceleration` is `true`, the system periodically exports a batch of recent gameplay traces to the LPU, where a lightweight transformer model is fine‑tuned.  
   - The updated model weights are hot‑swapped without restarting the game, giving the AI **real‑time learning**.  

### Configurable Parameters  

| Parameter | Effect | Default |
|-----------|--------|---------|
| `ai_improvement_rate` | % increase in skill per 10 k days (if XP thresholds are met). | `0.02` (2 %) |
| `xp_decay_factor` | Daily decay applied to old XP to prevent runaway growth. | `0.999` |
| `max_skill_level` | Upper bound for AI skill (prevents infinite scaling). | `10` |

### Monitoring AI Progress  

The UI includes an **“AI Dashboard”** (accessible via the pause menu) showing:  

- Current skill level  
- Total XP earned  
- Days until next level (estimated)  
- Recent decision‑outcome statistics  

Developers can also inspect `ai_state` in the save file or enable `log_level: "DEBUG"` to write detailed logs to `logs/ai_debug.log`.  

---  

## Troubleshooting & FAQ  

### The game won’t start / crashes immediately  

| Possible Cause | Fix |
|----------------|-----|
| **Missing Python version** | Verify `python --version` ≥ 3.9. Install the correct version from python.org. |
| **Groq LPU driver not installed** (when `enable_lpu_acceleration` is true) | Either install the driver per the Groq docs or set `"enable_lpu_acceleration": false` in `config.json`. |
| **Corrupted `config.json`** | Delete/rename the file; the game will regenerate a default config on next launch. |
| **Dependency mismatch** | Run `pip install -r requirements.txt` again; consider recreating the virtual environment. |

### AI isn’t improving (skill level stays at 1)  

1. Check `config.json` → `ai_improvement_rate`. A value of `0` disables growth.  
2. Ensure the save file’s `ai_state.experience_points` is increasing (open the JSON or view the AI Dashboard).  
3. If using LPU acceleration, verify the hardware is recognized (`groq-lpu status` command).  

### My treasury shows a massive number (e.g., 128 788 030 891) and overflows UI  

- The UI formats numbers with commas but does not cap display length.  
- You can enable a **compact view** by editing `config.json`: `"treasury_display_mode": "compact"` (options: `full`, `compact`).  

### Game runs slowly on a standard laptop (no LPU)  

- Lower the difficulty (`"difficulty": "easy"`).  
- Reduce the AI improvement rate (`"ai_improvement_rate": 0.01`).  
- Turn off background AI logging: `"log_level": "WARN"`.  

### I want to reset the world to day 1  

Delete or move the `saves/` folder (or rename the specific save file). The next launch will create a fresh save with the starting parameters defined in `config.json`.  

---  

## Contributing  

We welcome community contributions!  

1. **Fork** the repository.  
2. Create a feature branch: `git checkout -b feature/awesome-feature`.  
3. Make your changes, ensuring they pass existing tests (`pytest -q`).  
4. Update documentation (README, docstrings).  
5. Submit a **Pull Request** with a clear description of the change.  

Please read `CONTRIBUTING.md` for coding standards, branch naming conventions, and the review process.  

---  

## License  

This project is released under the **MIT License**. See the full text in `LICENSE`.  

---  

*Happy world‑building, and may your pixel‑crafted empire endure the darkness!*