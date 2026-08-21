# Dark Fantasy Pixel Art Civilization Game  

*An immersive, strategy‑focused, dark‑fantasy world built with handcrafted pixel art.*  

---  

## Table of Contents  

1. [Project Overview](#project-overview)  
2. [Features](#features)  
3. [Installation](#installation)  
4. [Configuration](#configuration)  
5. [World State Variables](#world-state-variables)  
6. [AI Improvement System](#ai-improvement-system)  
7. [Troubleshooting & Support](#troubleshooting--support)  
8. [Current Game State](#current-game-state)  

---  

## Project Overview  

The **Dark Fantasy Pixel Art Civilization Game** puts you in charge of a fledgling realm beset by eldritch horrors, ancient curses, and rival kingdoms. Using a blend of **city‑building**, **turn‑based combat**, and **exploration**, you must:

* Grow your population while keeping them safe from supernatural threats.  
* Manage a massive treasury (the numbers can get astronomically large!).  
* Research forbidden knowledge and upgrade your civilization through an AI‑driven improvement system.  

All visuals are rendered in a gritty, 16‑bit‑style pixel art aesthetic, giving the game a nostalgic yet fresh feel.

---  

## Features  

| Category | Description |
|----------|-------------|
| **Pixel‑Art World** | Hand‑drawn tiles, characters, and UI elements that convey a bleak, magical atmosphere. |
| **Deep Civilization Management** | Build structures, assign citizens to jobs, set tax rates, and balance food, morale, and defense. |
| **Dynamic World State** | The world evolves day by day; events, weather, and monster raids are generated based on current variables. |
| **Turn‑Based Tactical Combat** | Command units in grid‑based battles against monsters, bandits, and rival lords. |
| **AI Improvement System** | An adaptive research tree that unlocks new technologies, spells, and building upgrades as the AI learns from your playstyle. |
| **Procedural Exploration** | Randomly generated regions, dungeons, and hidden lore that keep each play‑through fresh. |
| **Mod‑Friendly Architecture** | JSON‑based data files and a plugin system allow community creators to add new factions, units, and events. |
| **Save/Load Anywhere** | Cloud‑compatible save files; you can pause the game for years and resume later. |

---  

## Installation  

### Prerequisites  

| Requirement | Minimum Version |
|-------------|-----------------|
| **Python** | 3.9+ |
| **Operating System** | Windows 10/11, macOS 10.15+, Linux (any modern distro) |
| **Graphics** | GPU supporting OpenGL 3.3 (integrated graphics are fine) |
| **Disk Space** | ~500 MB for assets + save files |

### Step‑by‑Step  

1. **Clone the repository**  
   ```bash
   git clone https://github.com/your-username/dark-fantasy-civilization.git
   cd dark-fantasy-civilization
   ```

2. **Create a virtual environment (optional but recommended)**  
   ```bash
   python -m venv .venv
   source .venv/bin/activate   # Linux/macOS
   .venv\Scripts\activate      # Windows
   ```

3. **Install dependencies**  
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the game**  
   ```bash
   python main.py
   ```

5. **(Optional) Build a standalone executable**  
   ```bash
   pyinstaller --onefile --windowed main.py
   ```

---  

## Configuration  

All user‑editable settings live in `config.json`. The file is loaded at startup; missing keys fall back to defaults.

```json
{
  "game_speed": 1.0,               // 0.5 = half speed, 2.0 = double speed
  "difficulty": "medium",          // options: "easy", "medium", "hard", "nightmare"
  "audio": {
    "music_volume": 0.7,
    "sfx_volume": 0.8,
    "mute": false
  },
  "display": {
    "resolution": "1920x1080",
    "fullscreen": false,
    "vsync": true
  },
  "autosave_interval_minutes": 10,
  "language": "en"
}
```

### Common Tweaks  

| Setting | Effect | Typical Values |
|---------|--------|----------------|
| `game_speed` | Controls how fast days pass. | `0.5` – `3.0` |
| `difficulty` | Alters monster strength, tax income, and AI research speed. | `"easy"`, `"medium"`, `"hard"`, `"nightmare"` |
| `autosave_interval_minutes` | How often the game automatically writes a save file. | `5`, `10`, `30` |

After editing `config.json`, restart the game for changes to take effect.

---  

## World State Variables  

These variables are stored in the save file (`saves/save_*.json`) and are also displayed on the HUD.

| Variable | Description | Example |
|----------|-------------|---------|
| **Day** | The current day number in the simulation. | `78810` |
| **Population** | Total number of living citizens (including slaves, soldiers, and scholars). | `9 753` |
| **Treasury** | Gold reserves; can reach very large values (use 64‑bit integers). | `71 256 715 790` |
| **Food Stock** | Units of stored food; influences population growth and morale. | `12 340` |
| **Morale** | A percentage (0‑100) representing citizen happiness. | `78%` |
| **Research Points** | Points accumulated toward the next AI research unlock. | `4 210` |
| **Threat Level** | Composite metric of monster activity, bandit raids, and magical anomalies. | `High` |

> **Note:** The game’s simulation engine updates these variables each tick based on player actions, random events, and AI decisions.

---  

## AI Improvement System  

The AI improvement system is the “brain” that drives technological progress, strategic suggestions, and adaptive difficulty. It consists of three interconnected components:

### 1. Research Tree  

- **Structure** – A directed acyclic graph (DAG) where each node is a technology, spell, or civic improvement.  
- **Unlock Conditions** – Prerequisite technologies, minimum population, or a certain amount of research points.  
- **Benefits** – Each node grants concrete bonuses (e.g., “Improved Mining” → +15 % ore extraction).  

**Sample Branch**  

```
[Basic Metallurgy] → [Steel Forging] → [Runic Weaponry] → [Eldritch Armaments]
```

### 2. Adaptive Upgrade System  

- **Dynamic Scaling** – The AI monitors your playstyle (e.g., aggressive expansion vs. defensive fortification) and suggests upgrades that complement it.  
- **Upgrade Types**  
  - *Buildings*: Faster production, higher capacity, or added defensive bonuses.  
  - *Units*: New abilities, increased health, or special attacks.  
  - *Infrastructure*: Roads that reduce travel time, magical wards that lower threat level.  

### 3. AI‑Driven Event Generation  

- The AI evaluates world state variables to spawn events that are **challenging but fair**.  
- Example: If `Treasury` > 50 B and `Population` is low, the AI may trigger a **“Tax Revolt”** event, forcing you to balance income vs. morale.  

### How to Interact  

- **Research UI** – Press `R` to open the research screen, allocate research points, and view the tree.  
- **Upgrade Suggestions** – A small “Advisor” icon appears when the AI has a recommendation; click it to view details.  
- **Manual Override** – You can disable AI suggestions in `config.json` (`"ai_advisor": false`).  

---  

## Troubleshooting & Support  

### Frequently Encountered Issues  

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| **Game crashes on startup** | Missing or incompatible Python version / corrupted `requirements.txt` | Verify Python ≥ 3.9, reinstall dependencies (`pip install -r requirements.txt`). |
| **Save file fails to load** | JSON syntax error or file corruption | Delete the offending save (or restore from backup) and start a new game. |
| **Performance drops (FPS < 30)** | High resolution on low‑end GPU, VSync off, or many active particle effects | Lower resolution in `config.json`, enable VSync, or reduce `max_particles` in `settings.py`. |
| **Audio glitches / no sound** | Incorrect audio driver or muted settings | Ensure your OS audio is functional, check `"mute": false` in `config.json`, and reinstall `pygame` (`pip install pygame --force-reinstall`). |
| **AI suggestions never appear** | `ai_advisor` disabled or difficulty set to “easy” (AI is less intrusive) | Set `"ai_advisor": true` and choose “medium” or higher difficulty. |

### Debug Logging  

- Log files are written to `logs/game_YYYYMMDD_HHMMSS.log`.  
- To increase verbosity, edit `logging_config.json` and set `"level": "DEBUG"`.  

### Getting Help  

- **GitHub Issues**: <https://github.com/your-username/dark-fantasy-civilization/issues>  
- **Discord Community**: Invite link in the repository README.  
- **Email Support**: `support@darkfantasyciv.com` (response within 48 h).  

When reporting a bug, please include:  

1. OS and Python version.  
2. Steps to reproduce.  
3. Relevant log excerpts.  

---  

## Current Game State  

> **Day:** `78810`  
> **Population:** `9 753`  
> **Treasury:** `71 256 715 790`  

These numbers are automatically loaded from your most recent save file. Use them as a baseline for planning your next strategic moves—whether that means expanding your borders, investing in research, or preparing for an upcoming threat.

---  

### Happy building, brave ruler!  

May your kingdom thrive amidst the shadows, and may your pixel‑crafted heroes carve legends into the annals of this dark world. If you have any suggestions for new features or balance tweaks, the development team welcomes community contributions.  

---  