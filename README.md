# Dark Fantasy Pixel Art Civilization Game README

## Project Overview
Welcome to the **Dark Fantasy Pixel Art Civilization Game**, a deep‑strategy, city‑building experience set in a hauntingly beautiful pixel‑art world. Players guide a fledgling civilization through centuries of darkness, managing resources, forging (or breaking) alliances, and confronting ever‑evolving AI opponents that learn from their tactics.

## Features
- **Dynamic Day/Night & Weather** – Weather patterns and time of day affect resource yields, combat, and morale.  
- **Robust Resource Management** – Mine, harvest, trade, and allocate gold, food, mana, and rare artifacts.  
- **AI Improvement System** – The game’s AI observes player decisions, adjusts its strategies, and presents progressively tougher challenges.  
- **Diplomacy & Conflict** – Negotiate treaties, trade routes, or declare war against neighboring factions.  
- **Pixel‑Art Aesthetic** – Hand‑crafted, dark‑fantasy sprites and tiles bring the world to life.  
- **Mod‑Friendly Architecture** – JSON‑based configuration and a clear plugin API for community extensions.

## Installation

### System Requirements
| Component | Minimum |
|-----------|---------|
| OS | Windows 10 / macOS 10.13 / Linux (Ubuntu 18.04 or newer) |
| CPU | Dual‑core 2.4 GHz |
| RAM | 8 GB |
| GPU | OpenGL 3.3‑compatible graphics card |
| Disk Space | 2 GB free |

### Steps
1. **Clone the repository**  
   ```bash
   git clone https://github.com/your‑repo/dark‑fantasy‑civ.git
   ```
2. **Enter the project folder**  
   ```bash
   cd dark-fantasy-civ
   ```
3. **Run the installer**  
   - **Linux/macOS**: `./install.sh`  
   - **Windows**: double‑click `install.bat` or run `install.bat` from a command prompt.  
4. **Launch the game**  
   - Executable created in `bin/` → run `dark_fantasy_civ` (or `dark_fantasy_civ.exe` on Windows).

## Configuration

### `config.json` (located in the root folder)
```json
{
  "difficulty": "hard",
  "graphics_quality": "high",
  "sound_volume": 80,
  "auto_save_interval_minutes": 10,
  "game_speed": 1.0,
  "ai_learning_rate": 0.05,
  "ai_adaptation_speed": 0.03
}
```
- **difficulty** – `easy`, `normal`, `hard`, `nightmare`.  
- **graphics_quality** – `low`, `medium`, `high`, `ultra`.  
- **sound_volume** – 0‑100.  
- **auto_save_interval_minutes** – How often the game auto‑saves.  
- **game_speed** – Multiplier for simulation speed (1.0 = real‑time).  
- **ai_learning_rate** – 0‑1; higher values make the AI learn faster from player actions.  
- **ai_adaptation_speed** – 0‑1; controls how quickly the AI changes its overall strategy.

### In‑Game Settings
Access via **Options → Settings** to tweak:
- Resolution, fullscreen/windowed mode, V‑Sync.  
- Music vs. SFX volumes.  
- UI scaling and language.

## World State Variables
The engine tracks several key variables that are displayed on the HUD and saved in `savegame.json`:

| Variable | Description | Example (current) |
|----------|-------------|-------------------|
| **Day** | Current day count since the world’s creation. | `73891` |
| **Population** | Total number of citizens under your rule. | `8 966` |
| **Treasury** | Gold reserves available for spending. | `59 177 021 553` |
| **Mana Reserve** | Magical energy used for spells and enchantments. | (value stored in save) |
| **Faith** | Influence of religious institutions on morale. | (value stored in save) |

These values can be inspected or edited (for debugging) via the developer console (`~` key).

## AI Improvement System
The AI is built around a **reinforcement‑learning loop** that updates its policy after each major player decision (e.g., war declaration, trade deal, technology research).

1. **Observation** – AI records the state vector: resources, military strength, diplomatic stance, etc.  
2. **Reward Calculation** – Positive reward for gaining territory, resources, or favorable diplomatic outcomes; negative reward for losses.  
3. **Policy Update** – Using a lightweight Q‑learning algorithm, the AI adjusts action probabilities.  
4. **Adaptation Parameters**  
   - `ai_learning_rate` (default 0.05) – Controls magnitude of Q‑value updates.  
   - `ai_adaptation_speed` (default 0.03) – Determines how quickly the AI shifts its overall strategy (e.g., from aggressive expansion to defensive consolidation).

Developers can replace the learning module with a custom model by implementing the `IAIEngine` interface located in `src/ai/`.

## Troubleshooting

| Symptom | Possible Cause | Fix |
|---------|----------------|-----|
| **Game crashes on launch** | Missing OpenGL drivers / incompatible GPU | Update graphics drivers; verify GPU supports OpenGL 3.3+. |
| **Graphics appear corrupted** | Incorrect `graphics_quality` setting for hardware | Lower graphics quality in `config.json` or via in‑game options. |
| **Slow performance after many days** | Large save file / AI state bloat | Delete old autosave files; enable `auto_save_interval_minutes` to a larger value. |
| **AI behaves erratically** | `ai_learning_rate` set too high | Reset to default (0.05) or lower. |
| **Unable to save** | No write permission in the game directory | Run the launcher with appropriate permissions or move the folder to a writable location. |
| **Audio glitches** | Conflicting sound drivers or high SFX volume | Lower `sound_volume` or disable SFX in settings. |

### Getting Help
- **GitHub Issues**: https://github.com/your-repo/dark-fantasy-civ/issues  
- **Discord Community**: https://discord.gg/your‑server  
- **Email Support**: support@example.com  

When reporting a bug, include:
1. OS and hardware specs.  
2. Steps to reproduce.  
3. Relevant log excerpts (`logs/latest.log`).  

## Contributing
1. Fork the repository.  
2. Create a feature branch (`git checkout -b feature/awesome‑feature`).  
3. Commit your changes with clear messages.  
4. Open a Pull Request targeting `main`.  

Please follow the **Code of Conduct** and adhere to the **C++/Python style guide** located in `docs/style_guide.md`.

## License
This project is licensed under the **MIT License** – see the `LICENSE` file for details.

---  

*This README consolidates all previously discussed sections (project overview, features, installation, configuration, world state variables, AI improvement system, and troubleshooting) into a single, comprehensive markdown document.*