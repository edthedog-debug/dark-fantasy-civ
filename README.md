# Dark Fantasy Pixel Art Civilization Game

## Project Overview
A dark‑fantasy, pixel‑art strategy game where you build, manage, and expand a civilization while navigating politics, warfare, and mystical threats. The game blends city‑building, resource management, exploration, and a dynamic AI that learns from your tactics.

## Features
- **Pixel‑Art World** – Hand‑crafted, atmospheric sprites and tiles.
- **City‑Building & Management** – Construct buildings, manage resources, and keep citizens happy.
- **Exploration & Diplomacy** – Discover neighboring realms, trade, form alliances, or wage war.
- **Dynamic World State** – Day/night cycle, weather, global events, and persistent variables.
- **AI Improvement System** – Machine‑learning driven AI that adapts to player strategies over time.
- **Mod‑Friendly** – JSON‑based data files for easy modding of units, buildings, and events.
- **Cross‑Platform** – Runs on Windows, macOS, and Linux.

## Installation

### Prerequisites
| Platform | Minimum Specs |
|----------|---------------|
| Windows 10+ / macOS 10.12+ / Ubuntu 18.04+ | 2 GHz dual‑core CPU, 4 GB RAM, OpenGL 3.3‑compatible GPU |

### Steps
```bash
# 1. Clone the repo
git clone https://github.com/your‑repo/dark‑fantasy‑civilization.git
cd dark‑fantasy‑civilization

# 2. Run the installer
# Linux/macOS
./install.sh
# Windows
install.bat
```
The installer will download required assets, set up a virtual environment, and create a `config/` folder for your custom settings.

## Configuration

### `config/settings.json`
```json
{
  "graphics": {
    "resolution": "1920x1080",
    "fullscreen": true,
    "quality": "high"
  },
  "audio": {
    "masterVolume": 0.8,
    "musicVolume": 0.6,
    "sfxVolume": 0.7
  },
  "gameplay": {
    "gameSpeed": 1.0,
    "difficulty": "normal"
  }
}
```
- **Graphics** – Change resolution, toggle fullscreen, or lower quality for performance.
- **Audio** – Adjust master, music, and SFX volumes.
- **Gameplay** – Speed multiplier (0.5‑2.0) and difficulty (`easy`, `normal`, `hard`, `nightmare`).

## World State Variables
These variables are persisted in `save/world_state.json` and affect every simulation tick.

| Variable | Current Value | Description |
|----------|---------------|-------------|
| `day` | **95479** | Global day counter (affects events, seasons, AI scaling). |
| `population` | **12 420** | Total living citizens across all cities. |
| `treasury` | **122 153 042 306** gold | Total gold reserves; used for construction, research, and diplomacy. |
| `climate` | `"grim"` | Current climate tier (affects crop yields, monster spawn rates). |
| `globalMorale` | `0.73` | Aggregate happiness; influences productivity and rebellion risk. |

You can view or edit these values manually for testing, but changes outside the game may cause desynchronisation with the AI learning module.

## AI Improvement System
The AI uses a **reinforcement‑learning loop** that runs after each completed game session:

1. **Data Collection** – All player actions, outcomes, and world‑state changes are logged.
2. **Training** – A lightweight neural network (TensorFlow Lite) updates its policy network using the collected data.
3. **Deployment** – The updated model is saved to `ai/model.tflite` and loaded on the next game start.

### How It Works
- **State Representation** – Vector of world variables (day, population, treasury, etc.) + current diplomatic stance.
- **Action Space** – Build, research, attack, trade, or negotiate.
- **Reward Function** – Positive reward for AI victories, resource gain, and long‑term stability; negative reward for defeats and high casualties.

The system is **offline** (training occurs between sessions) to keep runtime performance smooth. Advanced users can replace `ai/model.tflite` with a custom model trained on their own data.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| **Game crashes on launch** | Out‑of‑date graphics driver or unsupported GPU | Update GPU drivers; lower graphics quality in `config/settings.json`. |
| **Save file won't load** | Corrupted `world_state.json` | Delete/rename the corrupted file; the game will start a new world. |
| **AI behaves erratically** | Incomplete AI model or interrupted training | Delete `ai/model.tflite` and let the game regenerate a fresh model on next start. |
| **Audio glitches** | Conflicting sound drivers (especially on Linux) | Install `pulseaudio` or use the `ALSA` backend via `export AUDIO_DRIVER=alsa`. |
| **Performance drops after many days** | Accumulated simulation objects (e.g., unused units) | Open the console (`~`) and run `clear_cache()` or restart the game. |

### Reporting Bugs
1. Create a minimal reproducible example (screenshots, logs from `logs/latest.log`).
2. Open an issue on the GitHub repo: <https://github.com/your-repo/dark-fantasy-civilization/issues>
3. Include your OS, hardware specs, and the exact steps that triggered the bug.

## Contributing
1. Fork the repository.  
2. Create a feature branch (`git checkout -b feature/awesome‑feature`).  
3. Follow the code style guidelines (`flake8` for Python, `eslint` for JS).  
4. Submit a pull request with a clear description and screenshots if UI changes are involved.

## License
MIT License – see the `LICENSE` file for full text.

---

*Current world snapshot (for reference):*  
**Day 95479 | Population 12 420 | Treasury 122 153 042 306 gold**.