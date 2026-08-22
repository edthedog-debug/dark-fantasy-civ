# Dark Fantasy Pixel Art Civilization Game  

*Version: 1.0.0*  
*Author: Your Name / Team*  
*License: MIT*  

---  

## Table of Contents  

1. [Project Overview](#project-overview)  
2. [Features](#features)  
3. [Installation](#installation)  
4. [Configuration](#configuration)  
5. [World State Variables](#world-state-variables)  
6. [AI Improvement System](#ai-improvement-system)  
7. [Troubleshooting & FAQ](#troubleshooting--faq)  
8. [Current Game State](#current-game-state)  
9. [Contributing](#contributing)  
10. [License](#license)  

---  

## Project Overview  

The **Dark Fantasy Pixel Art Civilization Game** is a strategy‑city‑builder set in a brooding, hand‑crafted pixel‑art world. Players assume the role of a fledgling ruler tasked with guiding a nascent civilization through centuries of hardship, magic, and war.  

- **Atmosphere:** Dark fantasy aesthetics, moody lighting, and a haunting soundtrack.  
- **Gameplay Loop:** Gather resources → Build & upgrade structures → Manage population → Expand territory → Research ancient magics → Defend against supernatural threats.  
- **Goal:** Achieve a thriving, self‑sustaining empire while uncovering the hidden lore of the world.  

The game is built with **Python** (core logic) and **Pygame** (rendering), making it easy to extend, mod, or embed in other projects.  

---  

## Features  

| Category | Description |
|----------|-------------|
| **Pixel‑Art Graphics** | 32‑bit color palette, animated sprites, tile‑based maps, and dynamic weather effects. |
| **City‑Building Mechanics** | Construct residential, military, magical, and economic buildings; each with unique upgrades. |
| **Resource Management** | Wood, stone, iron, mana, and gold. Resources are produced, stored, and consumed in real time. |
| **Population System** | Citizens have age, health, and skill attributes that affect productivity and morale. |
| **Exploration & Fog‑of‑War** | Send scouts to reveal new tiles, encounter random events, and discover ancient ruins. |
| **AI Improvement System** | A modular AI that learns from player actions, offering suggestions and automating routine tasks. |
| **Research Tree** | Unlock new technologies, spells, and building types by investing treasury and mana. |
| **Dynamic World State** | Day counter, population, treasury, and other variables persist across sessions. |
| **Mod‑Friendly Architecture** | JSON‑based data files, plugin hooks, and a clear separation between engine and content. |
| **Cross‑Platform** | Runs on Windows, macOS, and Linux (via Python & Pygame). |

---  

## Installation  

### Prerequisites  

- **Python 3.10+** (recommended: 3.11)  
- **Git** (optional, for cloning)  
- **Pygame 2.5+** (installed automatically via `requirements.txt`)  

### Steps  

1. **Clone the repository**  
   ```bash
   git clone https://github.com/your-username/dark-fantasy-pixel-civ.git
   cd dark-fantasy-pixel-civ
   ```

2. **Create a virtual environment (highly recommended)**  
   ```bash
   python -m venv venv
   source venv/bin/activate   # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**  
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the game**  
   ```bash
   python main.py
   ```

> **Tip:** If you encounter `pygame` import errors, ensure you have the appropriate SDL libraries for your OS (e.g., `libsdl2-dev` on Ubuntu).  

---  

## Configuration  

All configurable options live in **`config.json`** at the project root. The file is loaded at startup and can be edited while the game is not running.

### Example `config.json`

```json
{
  "graphics": {
    "resolution": [1280, 720],
    "fullscreen": false,
    "scale_factor": 2,
    "vsync": true
  },
  "gameplay": {
    "starting_day": 1,
    "starting_population": 100,
    "starting_treasury": 5000,
    "difficulty": "normal",          // options: easy, normal, hard, nightmare
    "ai_autolearn": true,
    "autosave_interval_minutes": 10
  },
  "audio": {
    "master_volume": 0.8,
    "music_volume": 0.6,
    "sfx_volume": 0.7
  },
  "paths": {
    "save_folder": "saves/",
    "mods_folder": "mods/",
    "assets_folder": "assets/"
  }
}
```

#### Key Sections  

| Section | Purpose |
|---------|---------|
| `graphics` | Screen resolution, scaling, fullscreen toggle, VSync. |
| `gameplay` | Starting conditions, difficulty scaling, AI learning toggle, autosave frequency. |
| `audio` | Volume controls for music, sound effects, and overall master volume. |
| `paths` | Where the engine looks for saves, mods, and asset files. |

After editing, **restart the game** for changes to take effect.  

---  

## World State Variables  

The engine tracks a set of persistent variables that define the current state of the world. These are saved in the active **save file** (`*.json`) and can be inspected via the debug console (`F12`).

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `day` | `int` | Current in‑game day count. Increments each 24‑hour cycle. | `99979` |
| `population` | `int` | Total number of living citizens (including children, workers, soldiers). | `13141` |
| `treasury` | `int` | Gold reserves available for spending. Large numbers are displayed with commas for readability. | `139,079,563,622` |
| `resources` | `dict` | Quantities of each raw material (`wood`, `stone`, `iron`, `mana`). | `{ "wood": 45231, "stone": 17890, ... }` |
| `happiness` | `float` (0‑1) | Overall citizen morale; influences productivity and birth rate. | `0.73` |
| `research_progress` | `dict` | Percentage completion of each research node. | `{ "alchemy": 0.42, "siege_engineering": 0.09 }` |
| `ai_level` | `int` | Current AI improvement tier (0 = none, 5 = master). | `3` |

These variables can be **displayed** in the UI via the “Statistics” panel, and they are also used by the AI improvement system to decide which upgrades are most beneficial.  

---  

## AI Improvement System  

The AI system is designed to **assist** the player by automating repetitive tasks, suggesting optimal builds, and gradually learning from the player’s style. It consists of three layers:

1. **Rule‑Based Engine** – Handles basic automation (e.g., auto‑assign idle workers to the nearest resource node).  
2. **Statistical Learner** – Collects data on player decisions (building choices, resource allocation) and builds probability models.  
3. **Neural‑Network Advisor** *(optional, enabled when `ai_autolearn` is true)* – A lightweight feed‑forward network that predicts the most beneficial next action based on the current world state.

### How to Interact  

| Action | UI Location | Effect |
|--------|-------------|--------|
| **Enable/Disable AI** | Settings → Gameplay → “AI Autolearn” | Turns the learning component on or off. |
| **Set AI Level** | Settings → Gameplay → “AI Level” (0‑5) | Higher levels unlock more aggressive automation and deeper suggestions. |
| **View AI Recommendations** | Bottom‑right “Advisor” panel | Shows a list of up‑to‑three recommended actions (e.g., “Build a Mana Well”, “Research Alchemy”). |
| **Accept/Reject** | Click the recommendation or dismiss it. | Accepted actions are queued automatically; rejected actions are logged for future learning. |

### Benefits of Raising AI Level  

| Level | Unlocks |
|-------|---------|
| **0 – Off** | No automation; pure manual play. |
| **1 – Helper** | Auto‑assign idle workers, basic resource balancing. |
| **2 – Planner** | Suggests optimal building placement based on terrain. |
| **3 – Strategist** | Recommends research paths and population growth policies. |
| **4 – Overseer** | Auto‑queues construction of high‑impact buildings when resources allow. |
| **5 – Master** | Full‑auto mode (optional) – the AI can run the civilization with minimal player input, ideal for “sandbox” or “watch‑only” modes. |

### Extending the AI  

Developers can add new decision rules by editing `ai/rules.py` or plug in a custom model via the `mods/` folder. The API is documented in `docs/ai_api.md`.  

---  

## Troubleshooting & FAQ  

### The game crashes on startup  

1. **Check Python version** – Must be 3.10+. Run `python --version`.  
2. **Missing SDL libraries** – On Linux, install `libsdl2-dev`, `libsdl2-image-dev`, `libsdl2-mixer-dev`.  
3. **Corrupt save file** – Delete or rename the most recent file in `saves/`. The game will start a new session.  

### Graphics look distorted / pixelated  

- Verify `scale_factor` in `config.json`. A value of `2` or `3` works best for 1280×720 resolution.  
- Ensure `vsync` is enabled to prevent tearing.  

### Audio is silent  

- Confirm your system volume and that the `master_volume` in `config.json` is > 0.  
- On Windows, make sure the `pygame.mixer` module loaded correctly (check console for “mixer init” messages).  

### AI recommendations are nonsensical  

- The AI learns from the last **10,000** actions. If you have just started a new game, it may not have enough data.  
- Try increasing the `ai_level` to 2 or 3, or manually reset the AI memory by deleting `ai/learned_state.json`.  

### My population is stuck at a low number  

- Check **happiness** (displayed in the Statistics panel). Low morale reduces birth rates.  
- Ensure you have enough **housing** (residential buildings) and **food** (farms, hunting lodges).  

### I want to mod the game  

1. Create a folder inside `mods/` (e.g., `mods/my_mod`).  
2. Add a `mod.json` manifest describing your assets and any new data tables.  
3. Place PNG sprites in `assets/` and reference them in the manifest.  
4. Restart the game – the mod loader will automatically detect and load your content.  

For a full guide, see `docs/modding_guide.md`.  

---  

## Current Game State  

> **Day:** `99979`  
> **Population:** `13,141`  
> **Treasury:** `139,079,563,622`  

These numbers are automatically loaded from the latest save file (`saves/slot_01.json`).  

---  

## Contributing  

We welcome contributions of any kind—bug reports, feature requests, code, art, or documentation.  

1. **Fork** the repository.  
2. Create a **feature branch** (`git checkout -b feature/awesome-feature`).  
3. Make your changes, ensuring the code follows the existing style (PEP‑8 for Python).  
4. Run the test suite: `pytest tests/`. All tests must pass.  
5. Submit a **Pull Request** with a clear description of what you changed and why.  

Please read `CONTRIBUTING.md` for detailed guidelines, coding standards, and the roadmap.  

---  

## License  

This project is licensed under the **MIT License**. See the `LICENSE` file for the full text.  

---  

*Enjoy building your dark empire, and may the shadows guide you!*  