# Dark Fantasy Pixel Art Civilization Game  
**Version:** 1.0.0  
**License:** MIT  

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
9. [Credits & Acknowledgements](#credits--acknowledgements)  

---  

## Project Overview
The **Dark Fantasy Pixel Art Civilization Game** is a strategy‑focused city‑builder set in a brooding, hand‑crafted pixel‑art world. Players assume the role of a ruler who must:

* **Expand** a fledgling settlement into a sprawling empire.  
* **Manage** resources, population, and morale while fending off supernatural threats.  
* **Research** arcane technologies and forge alliances or rivalries with AI‑controlled factions.  

The game blends classic 4‑X mechanics (eXplore, eXpand, eXploit, eXterminate) with a living AI that learns from your decisions, ensuring each play‑through feels fresh and challenging.

---  

## Features  

| Category | Description |
|----------|-------------|
| **Pixel‑Art World** | Hand‑drawn 32×32 tiles, animated weather effects, day/night cycles, and atmospheric lighting. |
| **City‑Building** | Build residential, commercial, military, and magical structures. Each building contributes to population growth, resource production, or defensive strength. |
| **Resource Management** | Track Gold, Food, Mana, Stone, and Iron. Trade routes and market dynamics affect prices. |
| **Population Dynamics** | Birth/death rates, migration, morale, and disease. Population caps are lifted by upgrades (e.g., “Grand Cathedral”). |
| **Research Tree** | 60+ technologies spanning **Agriculture**, **Warcraft**, **Arcane Arts**, and **Infrastructure**. Unlocks new units, buildings, and spells. |
| **AI Improvement System** | Adaptive AI that observes player tactics, updates its own strategy, and evolves over the course of a campaign. |
| **Dynamic World State** | Persistent variables (Day, Population, Treasury, etc.) are saved in `savegame.json`. |
| **Mod‑Friendly Architecture** | JSON‑based data files, scriptable events, and a plug‑in system for community content. |
| **Cross‑Platform** | Runs on Windows, macOS, and Linux (requires Python 3.10+). |
| **Save/Load** | Auto‑save every 10 in‑game days; manual slots up to 10. |

---  

## Installation  

### Prerequisites
| OS | Requirement |
|----|-------------|
| Windows 10+ | Python 3.10 or newer, Git |
| macOS 12+ | Homebrew (optional), Python 3.10+ |
| Linux (Ubuntu/Debian) | `python3`, `git`, `pip` |

### Step‑by‑Step

1. **Clone the repository**  
   ```bash
   git clone https://github.com/your‑org/dark‑fantasy‑pixel‑civilization.git
   cd dark-fantasy-pixel-civilization
   ```

2. **Create a virtual environment (recommended)**  
   ```bash
   python -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**  
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the game**  
   ```bash
   python main.py
   ```

5. **Optional – Build a standalone executable** (requires `pyinstaller`)  
   ```bash
   pyinstaller --onefile --windowed main.py -n DarkFantasyCiv
   ```

---  

## Configuration  

All configurable options live in `config.json`. The file is loaded at startup; missing keys fall back to defaults.

```json
{
  "game_speed": 1.0,               // 0.5 = half speed, 2.0 = double speed
  "difficulty": "medium",          // options: "easy", "medium", "hard", "nightmare"
  "ai_aggression": 0.5,            // 0.0 (passive) → 1.0 (berserk)
  "starting_gold": 5000,
  "starting_population": 150,
  "enable_mods": true,
  "mod_directories": ["mods/official", "mods/community"],
  "autosave_interval_days": 10,
  "log_level": "INFO"              // DEBUG, INFO, WARN, ERROR
}
```

### Common Tweaks  

| Setting | Effect | Typical Values |
|---------|--------|----------------|
| `game_speed` | Controls how fast in‑game time passes. | `0.5` – `2.0` |
| `difficulty` | Adjusts AI resource bonuses and event severity. | `"easy"`, `"medium"`, `"hard"`, `"nightmare"` |
| `ai_aggression` | Determines how often AI attacks or expands aggressively. | `0.2` (peaceful) – `0.9` (war‑mad) |
| `enable_mods` | Turn on/off loading of external mods. | `true` / `false` |

After editing `config.json`, restart the game for changes to take effect.

---  

## World State Variables  

These variables are persisted in `savegame.json` and displayed on the HUD.

| Variable | Description | Current Value |
|----------|-------------|---------------|
| **Day** | Number of in‑game days elapsed since the start of the campaign. | `100 829` |
| **Population** | Total number of citizens currently living in your civilization. | `13 276` |
| **Treasury** | Amount of gold stored in the royal treasury. | `142 204 352 605` |
| **Food Stock** | Days of food remaining before famine (if >0). | *dynamic* |
| **Mana Reserves** | Magical energy available for spells and research. | *dynamic* |
| **Military Strength** | Composite score of troops, fortifications, and magical units. | *dynamic* |
| **Research Progress** | Percentage of the current technology tree completed. | *dynamic* |

> **Note:** The numbers above reflect the *current* game state at the time of this README generation. They will change as you play.

---  

## AI Improvement System  

### How It Works  

1. **Data Collection**  
   * Every turn, the AI logs player actions (building choices, troop movements, research paths).  
   * Contextual data such as resource levels, day of the campaign, and difficulty are also recorded.

2. **Pattern Recognition**  
   * A lightweight reinforcement‑learning model (Q‑learning) evaluates which player strategies lead to success or failure.  
   * The model updates a **Strategy Profile** for each player (e.g., “focuses on early magic”, “prefers defensive expansion”).

3. **Adaptive Response**  
   * The AI selects counter‑strategies based on the profile:  
     * **Economic Counter** – Boosts trade offers if you rely heavily on gold.  
     * **Military Counter** – Increases raiding frequency if you neglect defenses.  
     * **Arcane Counter** – Deploys magical units when you research high‑level spells.

4. **Long‑Term Evolution**  
   * After each saved game is loaded, the AI persists its learned weights, allowing it to become more challenging across sessions.  
   * Players can reset the AI memory by deleting `ai_state.json`.

### Tuning the AI  

| Parameter | Description | Default |
|-----------|-------------|---------|
| `learning_rate` | How quickly the AI updates its model after each observation. | `0.05` |
| `exploration_factor` | Chance the AI tries a random strategy to discover new tactics. | `0.1` |
| `memory_decay` | Rate at which old observations lose influence. | `0.001` |

These are stored in `ai_config.json` and can be edited for experimental play.

---  

## Troubleshooting & FAQ  

| Symptom | Possible Cause | Fix |
|---------|----------------|-----|
| **Game crashes on launch** | Missing Python version or corrupted dependencies. | Verify Python ≥ 3.10, reinstall with `pip install -r requirements.txt`. |
| **Graphics appear corrupted / missing tiles** | Asset folder not found or case‑sensitivity issue (Linux). | Ensure `assets/` directory exists and is correctly named. |
| **AI never attacks** | `ai_aggression` set too low or difficulty set to “easy”. | Raise `ai_aggression` to ≥ 0.4 or switch to “medium”. |
| **Save file won’t load** | `savegame.json` corrupted. | Restore from the most recent backup in `saves/backup/`. |
| **Performance drops after many days** | Large number of entities causing slow updates. | Enable “low‑detail mode” in `config.json` (`"graphics_detail": "low"`). |
| **Mod crashes the game** | Incompatible mod version. | Disable mods (`"enable_mods": false`) and re‑enable one by one to isolate the culprit. |
| **Audio missing** | `pygame` mixer not initialized on some Linux distros. | Install `libsdl2-mixer-2.0-0` (Ubuntu) or equivalent. |

### Frequently Asked Questions  

**Q:** *Can I change the current world state (Day, Population, Treasury) manually?*  
**A:** Yes. Edit `savegame.json` directly, but be aware that extreme values may break balance or trigger AI “cheat detection” (the AI will treat you as a high‑risk opponent).  

**Q:** *Is there a way to speed up time without affecting AI learning?*  
**A:** Set `"game_speed"` in `config.json`. The AI’s learning algorithm is time‑agnostic; it still records actions per turn, not per real‑second.  

**Q:** *How do I create my own mod?*  
**A:** See `docs/modding_guide.md`. In short, create a folder under `mods/`, add a `mod.json` manifest, and place your custom assets and JSON data there.  

---  

## Contributing  

We welcome contributions! Please follow these steps:

1. Fork the repository.  
2. Create a feature branch (`git checkout -b feature/awesome‑feature`).  
3. Write code and **add unit tests** under `tests/`.  
4. Ensure the test suite passes: `pytest`.  
5. Submit a Pull Request with a clear description of changes.  

See `CONTRIBUTING.md` for detailed guidelines, coding style, and the review process.

---  

## Credits & Acknowledgements  

* **Lead Designer & Writer:** *Aurelia Nightshade*  
* **Pixel Artists:** *Mira Stormblade, Joren Emberforge*  
* **Programmers:** *Liam Codewright, Priya Dataweaver*  
* **AI Research:** *Dr. Selene Voss* (reinforcement‑learning model)  
* **Music & Sound:** *Eldric Whisperwind*  
* **Community Testers:** Thank you to the early‑access players on the Discord server!  

Special thanks to the open‑source libraries that make this project possible:  

* **Pygame** – graphics & input handling  
* **NumPy** – numerical operations for AI  
* **PyYAML** – configuration parsing  
* **pytest** – testing framework  

---  

*Happy ruling, and may your empire thrive in the shadows!*