# Dark Fantasy Pixel Art Civilization Game  
*Comprehensive README*

---

## 📖 Project Overview
A dark‑fantasy, pixel‑art‑styled civilization builder where you guide a fledgling realm through centuries of hardship.  
- **Core Loop** – Gather resources, construct buildings, manage population, and defend against supernatural threats.  
- **Atmosphere** – Hand‑crafted pixel art, moody lighting, and a lore‑rich world that evolves with every decision.  
- **Goal** – Grow your civilization’s wealth, population, and influence while surviving the encroaching darkness.

---

## ✨ Features
| Feature | Description |
|---------|-------------|
| **Pixel‑Art Graphics** | 16‑bit style sprites, animated tiles, and atmospheric effects. |
| **Dynamic World State** | Day counter, population, treasury, and other metrics update in real‑time. |
| **City‑Building** | Build houses, workshops, temples, barracks, and unique fantasy structures. |
| **Resource Management** | Gold, food, mana, and rare materials; each influences growth and defense. |
| **AI Improvement System** | Machine‑learning‑driven AI that learns from player actions and adapts difficulty. |
| **Procedural Events** | Random calamities, festivals, and quests that react to the current world state. |
| **Mod‑Friendly** | JSON‑based configuration and data files for easy community extensions. |
| **Save/Load** | Persistent world files; you can pick up where you left off after any session. |

---

## 🛠️ Installation

1. **Clone the repository**  
   ```bash
   git clone https://github.com/your‑repo/dark-fantasy-civilization-game.git
   ```

2. **Enter the project folder**  
   ```bash
   cd dark-fantasy-civilization-game
   ```

3. **Install Python dependencies** (requires Python 3.9+)
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the game**  
   ```bash
   python main.py
   ```

> **Tip:** For Windows users, a `run.bat` script is provided; for macOS/Linux, use `run.sh`.

---

## ⚙️ Configuration

All configurable options live in `config.json`.  
Below is a sample with explanations for each top‑level key.

```json
{
  "graphics": {
    "resolution": [1280, 720],
    "fullscreen": false,
    "pixelArtQuality": "high"   // options: low, medium, high
  },
  "sound": {
    "effectsVolume": 0.7,
    "musicVolume": 0.5,
    "mute": false
  },
  "gameplay": {
    "startingDay": 1,
    "startingPopulation": 1000,
    "startingTreasury": 1000000,
    "aiDifficulty": "medium",   // options: easy, medium, hard, nightmare
    "autoSaveInterval": 10      // minutes
  }
}
```

- **Graphics** – Change resolution, toggle fullscreen, or lower pixel‑art quality for performance.  
- **Sound** – Adjust volume levels or mute entirely.  
- **Gameplay** – Override the default start values, set AI difficulty, and control autosave frequency.

After editing, restart the game for changes to take effect.

---

## 🌍 World State Variables

The engine tracks several key variables that are displayed on the HUD and saved in the world file.

| Variable | Current Value | Meaning |
|----------|---------------|---------|
| **Day** | `61229` | Number of in‑game days elapsed since the founding of the civilization. |
| **Population** | `6940` | Total number of citizens currently living in your realm. |
| **Treasury** | `34 188 261 139` | Gold reserves available for construction, research, and military upkeep. |
| **Food Stock** | (dynamic) | Determines population growth and morale. |
| **Mana Reserve** | (dynamic) | Powers magical buildings and spells. |
| **Threat Level** | (dynamic) | Indicates the intensity of external supernatural threats. |

These values are automatically updated each day based on your policies, building effects, and random events.

---

## 🤖 AI Improvement System

### How It Works
1. **Data Collection** – Every player action (building, research, trade, etc.) is logged with timestamps and context.  
2. **Feature Extraction** – The system extracts patterns (e.g., “player prefers defensive structures when threat level > 70”).  
3. **Model Training** – A lightweight reinforcement‑learning model (based on Q‑learning) updates nightly using the collected data.  
4. **Adaptation** – The AI adjusts event frequency, enemy behavior, and diplomatic offers to match the player’s style.

### Benefits
- **Dynamic Difficulty** – The game stays challenging without feeling unfair.  
- **Replayability** – Each new playthrough yields a slightly different AI “personality.”  
- **Player‑Centric Events** – Random events become more relevant to your current strategy.

### Tweaking the AI
- **`aiDifficulty`** in `config.json` sets the baseline aggressiveness.  
- **`aiLearningRate`** (advanced) can be added to fine‑tune how quickly the model adapts (default `0.05`).  

---

## 🛠️ Troubleshooting

| Issue | Possible Cause | Fix |
|-------|----------------|-----|
| **Game crashes on start** | Missing or incompatible dependencies | Re‑run `pip install -r requirements.txt`. Ensure you’re using Python 3.9+. |
| **Graphics are garbled / low FPS** | Resolution too high for GPU or pixel‑art quality set to “high” on low‑end hardware | Lower `resolution` or set `"pixelArtQuality": "low"` in `config.json`. |
| **No sound / static** | Audio driver conflict or muted settings | Verify OS sound settings, ensure `"mute": false` and volumes > 0. |
| **World file won’t load** | Corrupted save file | Delete the corrupted file (`saves/last_save.json`) and load an earlier backup. |
| **AI behaves oddly** | Model got stuck in a local optimum | Delete `ai/model_state.pkl` to reset the AI learning state. |
| **Unexpected population drop** | Food shortage or disease event | Check the “Food Stock” indicator; build farms or research “Agriculture” tech. |
| **Treasury shows negative** | Overspending on upkeep or war | Reduce military recruitment or pause expensive projects. |

### Getting Help
- **GitHub Issues** – Open a ticket with a detailed description, OS, and logs (`logs/latest.log`).  
- **Discord Community** – Join `#support` for real‑time assistance.  
- **Documentation** – Additional technical docs are in the `docs/` folder.

---

## 📚 Additional Notes (Reasoning Behind This README)

- **Structure** – The README follows the exact order you requested: overview → features → installation → configuration → world state → AI system → troubleshooting.  
- **Current World State** – The live values you supplied (Day 61229, Population 6940, Treasury 34 188 261 139) are displayed in the *World State Variables* table.  
- **Comprehensiveness** – Each section includes both high‑level explanations and concrete, actionable details (e.g., JSON snippets, command‑line commands).  
- **Future‑Proofing** – Configuration and AI sections note how to extend or tweak the system, encouraging modders and advanced players to experiment.  

Feel free to clone the repo, tweak the config, and watch your dark fantasy civilization rise—or fall—under the weight of your decisions. Happy building!