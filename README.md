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
10. [Acknowledgments](#acknowledgments)  

---  

## Project Overview  

The **Dark Fantasy Pixel Art Civilization Game** is a strategy‑simulation title that blends classic city‑building mechanics with a gritty, atmospheric dark‑fantasy setting rendered entirely in pixel art. Players must grow a fledgling settlement into a thriving empire while contending with hostile monsters, rival kingdoms, and ever‑shifting world conditions.  

Key design goals:  

- **Immersive pixel‑art world** – hand‑crafted tiles, characters, and UI that evoke the mood of a cursed medieval realm.  
- **Deep systems** – resource management, diplomacy, warfare, and a living world that reacts to player choices.  
- **Dynamic AI** – an AI opponent that learns from player behavior and evolves its tactics over time.  
- **Mod‑friendly architecture** – data‑driven configuration files and a clear plugin interface for community extensions.  

Current in‑game snapshot (as of the latest save):  

- **Day:** 74 729  
- **Population:** 9 101 citizens  
- **Treasury:** 61 098 557 849 gold coins  

---  

## Features  

| Category | Description |
|----------|-------------|
| **Pixel‑Art Graphics** | 32‑bit color palette, animated sprites, day/night lighting, weather overlays. |
| **City‑Building & Management** | Build houses, workshops, temples, and defensive structures; assign citizens to jobs; manage food, wood, stone, mana, and gold. |
| **Exploration & Diplomacy** | Send scouts to uncover ruins, negotiate trade routes, form alliances, or declare war on neighboring factions. |
| **Combat & Defense** | Turn‑based tactical battles, automated city defenses, magical wards, and monster sieges. |
| **Dynamic World State** | Global day/night cycle, seasonal weather, random events (plagues, eclipses, meteor showers). |
| **AI Improvement System** | Machine‑learning‑backed AI that adapts strategies based on player actions; behavior trees for nuanced decision‑making. |
| **Modding Support** | JSON‑based data files, Lua scripting hooks, and a simple asset pipeline for custom sprites and tiles. |
| **Save/Load & Cloud Sync** | Automatic backups, manual save slots, optional cloud synchronization via Git‑LFS. |
| **Accessibility Options** | Color‑blind palettes, UI scaling, subtitles for all narrative text. |

---  

## Installation  

### Prerequisites  

- **Python** ≥ 3.9 (64‑bit)  
- **Pygame** 2.5+ (installed via `requirements.txt`)  
- **Operating System**: Windows 10/11, macOS 12+, or any modern Linux distribution with X11/Wayland support.  
- **Graphics Drivers**: Up‑to‑date GPU drivers (OpenGL 3.3+ compatible).  

### Step‑by‑Step  

1. **Clone the repository**  

   ```bash
   git clone https://github.com/your‑org/dark‑fantasy‑civilization‑game.git
   cd dark-fantasy-civilization-game
   ```

2. **Create a virtual environment (optional but recommended)**  

   ```bash
   python -m venv venv
   source venv/bin/activate   # Linux/macOS
   .\venv\Scripts\activate    # Windows
   ```

3. **Install dependencies**  

   ```bash
   pip install -r requirements.txt
   ```

4. **Run the game**  

   ```bash
   python main.py
   ```

5. **First‑time setup** – The game will generate a default `config.json` and a `saves/` folder on first launch.  

### Building a Stand‑Alone Executable (Optional)  

If you prefer a single executable:  

```bash
pip install pyinstaller
pyinstaller --onefile --windowed --add-data "assets:assets" main.py
```

The resulting binary will appear in `dist/`.  

---  

## Configuration  

All configurable options live in **`config.json`** (generated automatically on first run). Below is a concise reference; the file contains comments for each field.

```json
{
  "graphics": {
    "resolution": [1280, 720],
    "fullscreen": false,
    "vsync": true,
    "pixel_scale": 2,
    "color_palette": "default"   // options: default, dark, high_contrast
  },
  "gameplay": {
    "difficulty": "normal",      // easy, normal, hard, nightmare
    "ai_aggressiveness": 0.75,   // 0.0–1.0
    "day_length_seconds": 120,
    "auto_save_interval_minutes": 10
  },
  "audio": {
    "master_volume": 0.8,
    "music_volume": 0.6,
    "sfx_volume": 0.9,
    "mute": false
  },
  "controls": {
    "move_up": "W",
    "move_down": "S",
    "move_left": "A",
    "move_right": "D",
    "open_menu": "ESC",
    "quick_save": "F5",
    "quick_load": "F9"
  },
  "mods": {
    "enabled": [],
    "mod_folder": "mods"
  }
}
```

**Tips:**  

- Changing `pixel_scale` lets you keep the retro look while fitting larger screens.  
- Set `ai_aggressiveness` to a lower value for a more diplomatic AI, higher for relentless conquest.  
- The `mods.enabled` array accepts folder names of installed mods (e.g., `"my_custom_tiles"`).  

---  

## World State Variables  

The engine tracks a set of **global variables** that influence every simulation tick. They are persisted in the save file (`saves/<slot>.json`) and can be inspected via the debug console (`~` key).  

| Variable | Type | Description | Current Value |
|----------|------|-------------|---------------|
| `day_counter` | Integer | Number of days elapsed since the start of the game. | **74 729** |
| `population_total` | Integer | Total living citizens across all districts. | **9 101** |
| `treasury_gold` | Integer (64‑bit) | Gold reserves available for spending. | **61 098 557 849** |
| `food_stockpile` | Integer | Days of food remaining (based on consumption). | 124 |
| `mana_reserve` | Integer | Magical energy used for spells & enchantments. | 38 720 |
| `weather_state` | Enum (`clear`, `rain`, `storm`, `fog`) | Current weather affecting productivity. | `clear` |
| `global_mood` | Float (0‑1) | Overall citizen happiness; influences growth rate. | 0.73 |
| `diplomatic_stance` | Dict | Reputation with each known faction (value -1.0 to 1.0). | `{ "Northern_Clans": 0.42, "Ebon_Consortium": -0.15 }` |
| `active_events` | List | Ongoing world events (e.g., “Eclipse”, “Plague”). | `[]` |

**Accessing variables in code** (example snippet):

```python
from engine.world import WorldState

ws = WorldState.instance()
print(f"Day {ws.day_counter}, Pop {ws.population_total}, Gold {ws.treasury_gold}")
```

---  

## AI Improvement System  

The AI is built on a **hybrid architecture** that combines deterministic behavior trees with a lightweight reinforcement‑learning (RL) module. This design gives the AI both predictable strategic depth and the ability to adapt over long play sessions.

### 1. Behavior Trees  

- **Core Decision Layer** – Handles high‑level actions: expand, trade, war, research.  
- **Sub‑trees** – Specific tactics such as “Siege Preparation”, “Resource Hoarding”, “Diplomatic Offer”.  
- **Priority System** – Nodes are weighted by current world variables (e.g., low gold → prioritize raiding).  

### 2. Reinforcement Learning Module  

- **Algorithm** – Proximal Policy Optimization (PPO) with a small neural net (2 hidden layers, 64 units each).  
- **Training Loop** – Runs in the background after each completed game day; experiences are stored in a replay buffer and sampled every 100 days.  
- **Reward Signal** – Composite of:  
  - **Territory Gain** (+1 per new tile)  
  - **Population Growth** (+0.5 per 100 citizens)  
  - **Treasury Increase** (+0.2 per 10⁶ gold)  
  - **War Losses** (‑2 per defeated unit)  
- **Policy Update Frequency** – Every 5,000 in‑game days or when the AI’s win‑rate deviates >10 % from baseline.  

### 3. Persistence  

- AI model weights are saved in `saves/ai_model.pt`.  
- When a player loads a save, the AI resumes training from the stored checkpoint, ensuring continuity across sessions.  

### 4. Customization  

Players can tweak AI behavior via `config.json`:

```json
{
  "gameplay": {
    "ai_aggressiveness": 0.85,
    "ai_learning_rate": 0.0003,
    "ai_update_interval_days": 5000
  }
}
```

Lower `ai_learning_rate` makes the AI adapt more slowly (good for competitive play), while higher values produce a rapidly evolving opponent.  

---  

## Troubleshooting & FAQ  

### The game crashes on startup  

1. **Check Python version** – Must be 3.9+. Run `python --version`.  
2. **Verify dependencies** – Re‑run `pip install -r requirements.txt`.  
3. **Graphics driver** – Ensure your GPU driver supports OpenGL 3.3+. Update from the vendor’s website.  
4. **Run in console** – Launch with `python main.py` to view traceback; post the error log on the GitHub Issues page.  

### I get “Missing asset: …” errors  

- Confirm the `assets/` folder exists and is not empty.  
- If you cloned via a shallow copy, some large texture files may be omitted; run `git lfs pull`.  

### AI seems “stuck” or not improving  

- Verify that the `saves/ai_model.pt` file is writable.  
- Check `config.json` → `gameplay.ai_learning_rate` – a value of `0` disables learning.  
- Look at the debug console (`~`) and type `ai_status`. It will print the current policy loss and recent reward.  

### My save file won’t load (corrupt JSON)  

- The game automatically creates a backup (`<slot>.json.bak`). Rename the backup to the original name.  
- If both are corrupted, you can use the **Export → CSV** tool in the main menu to salvage population/treasury numbers and start a new game with those values.  

### Performance is low on a modern PC  

- Reduce `pixel_scale` or switch to a lower resolution in `config.json`.  
- Turn off VSync (`graphics.vsync: false`).  
- Disable background music (`audio.music_volume: 0`).  

### How do I enable mods?  

1. Place the mod folder inside the `mods/` directory (e.g., `mods/my_custom_tiles`).  
2. Add the folder name to `config.json` → `mods.enabled`.  
3. Restart the game.  

---  

## Contributing  

We welcome contributions from artists, programmers, writers, and testers.  

1. **Fork** the repository.  
2. Create a **feature branch** (`git checkout -b feature/awesome‑feature`).  
3. Follow the **PEP‑8** style guide for Python code and the **Pixel‑Art Style Guide** (`docs/style_guide.md`).  
4. Write **unit tests** for any new logic (`pytest` is used).  
5. Submit a **Pull Request** with a clear description of changes.  

Please read `CONTRIBUTING.md` for detailed guidelines on code standards, asset licensing, and the review process.  

---  

## License  

This project is licensed under the **MIT License**. See the full text in the `LICENSE` file.  

---  

## Acknowledgments  

- **Groq** – for providing the LPU hardware that powers the AI learning loop.  
- **Pixel‑Art Community** – countless artists who contributed sprites, tilesets, and UI elements.  
- **Open‑Source Libraries** – Pygame, NumPy, PyTorch, and many others that make this project possible.  
- **Playtesters** – for valuable feedback that shaped balance and gameplay depth.  

---  

*Enjoy building your dark empire, and may your pixel‑crafted legends endure through the ages!*