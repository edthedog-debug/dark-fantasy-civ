# Dark Fantasy Pixel Art Civilization Game  
**README.md**

---

## 📖 Project Overview  

This project is a **dark‑fantasy, pixel‑art civilization simulator** where you rule a fledgling kingdom through the ages.  
- **Genre:** Strategy / City‑building / Turn‑based simulation  
- **Art style:** Hand‑crafted 16‑bit‑style pixel art that evokes a grim, mythic world.  
- **Core loop:** Build & upgrade structures → manage resources → research technologies → expand territory → confront AI rivals.  

The game tracks a persistent world state (day, population, treasury, etc.) that continues across play sessions, allowing for truly epic, long‑term campaigns.

---

## ✨ Features  

| Feature | Description |
|---------|-------------|
| **Pixel‑art world** | Detailed, atmospheric tilesets, unit sprites, and UI elements. |
| **Deep city‑building** | Residential, commercial, military, magical, and religious districts, each with unique bonuses and upkeep. |
| **Resource management** | Gold, food, mana, stone, and rare artifacts; trade routes and taxation mechanics. |
| **Research tree** | Branches for **Military**, **Economy**, **Magic**, and **Culture** that unlock new buildings, units, and spells. |
| **Dynamic AI opponents** | AI civilizations evolve using the **AI Improvement System** (see below). |
| **Procedural events** | Random calamities, festivals, and quests that affect morale and economy. |
| **Save/load** | Persistent world state stored in JSON; supports manual editing for modders. |
| **Mod‑friendly** | All assets, data tables, and scripts are externalized for easy extension. |

---

## 🛠️ Installation  

1. **Clone the repository**  
   ```bash
   git clone https://github.com/your‑org/dark‑fantasy‑pixel‑civilization.git
   cd dark-fantasy-pixel-civilization
   ```

2. **Create a virtual environment (optional but recommended)**  
   ```bash
   python -m venv venv
   source venv/bin/activate   # Windows: venv\Scripts\activate
   ```

3. **Install dependencies**  
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the game**  
   ```bash
   python main.py
   ```

> **Note:** The game requires Python 3.9+ and the `pygame` library (included in `requirements.txt`).  

---

## ⚙️ Configuration  

All configurable options live in **`config.json`** (generated on first launch).  
Key sections:

```json
{
  "game_speed": "normal",          // "slow", "normal", "fast"
  "ai_difficulty": "medium",       // "easy", "medium", "hard", "expert"
  "graphics_quality": "high",      // "low", "medium", "high"
  "starting_day": 1,
  "starting_population": 500,
  "starting_treasury": 1000000
}
```

- **`game_speed`** – Controls how many in‑game days pass per real‑time second.  
- **`ai_difficulty`** – Sets the baseline for the AI Improvement System (see below).  
- **`graphics_quality`** – Toggles sprite scaling, shadow effects, and particle count.  

Edit the file with any text editor and restart the game for changes to take effect.

---

## 🌍 World State Variables  

The engine maintains a global **`world_state.json`** file that records the live simulation data.  
Current snapshot (as of the latest build you are reading):

| Variable | Current Value |
|----------|---------------|
| **Day** | `89729` |
| **Population** | `11501` |
| **Treasury (Gold)** | `102,702,240,443` |

Other tracked variables include:

- `food_stock`, `mana_reserves`, `stone_quarries`, `morale`, `military_strength`, `research_progress`, `diplomatic_relations`, etc.  

These values are automatically saved every in‑game day and can be inspected or edited for debugging/modding.

---

## 🤖 AI Improvement System  

The AI opponents are not static scripts; they **learn and adapt** using a layered system:

1. **Baseline Difficulty** – Set by `ai_difficulty` in `config.json`. Determines initial resource caps, aggression thresholds, and research speed.  
2. **Progress‑Based Scaling** – As the player’s day count rises, the AI unlocks higher‑tier technologies and expands its borders automatically.  
3. **Performance‑Based Adaptation**  
   - **Aggression Metric:** If the player consistently defeats AI armies, the AI raises its `aggression_factor` and invests more in military tech.  
   - **Economic Metric:** If the player’s treasury outpaces the AI, the AI boosts trade routes and economic research.  
   - **Magic Metric:** Frequent use of spells triggers AI to prioritize magical defenses and counter‑spells.  

All AI parameters are stored in `ai_state.json`. The system runs a lightweight **behavior tree** each turn, evaluating the metrics above and adjusting strategy weights accordingly.

*Result:* Even on “easy” difficulty, the AI becomes a **dynamic challenger** that reacts to the player’s style, keeping long‑term campaigns fresh.

---

## 🐞 Troubleshooting  

| Symptom | Possible Cause | Fix |
|---------|----------------|-----|
| **Game crashes on start** | Missing/incorrect Python version or dependencies | Verify you’re using Python 3.9+ and run `pip install -r requirements.txt`. |
| **Graphics look distorted** | `graphics_quality` set to an unsupported value or GPU driver issue | Set `"graphics_quality": "medium"` in `config.json` and update GPU drivers. |
| **Saved world does not load** | Corrupted `world_state.json` | Delete/rename the file; a fresh world will be generated (you may lose progress). |
| **AI behaves oddly (e.g., never attacks)** | AI state file corrupted or difficulty set to “easy” with low aggression | Reset `ai_state.json` or raise `ai_difficulty` to “hard”. |
| **Performance drops on high day counts** | Large number of entities being processed each tick | Lower `game_speed` and set `"graphics_quality": "low"`; consider pruning unused map tiles via the “clean‑up” console command (`python tools/cleanup.py`). |

**Logs:**  
All runtime messages are written to `logs/game.log`. Check the file for stack traces or warnings.

**Help & Community:**  
- **GitHub Issues:** https://github.com/your‑org/dark‑fantasy‑pixel‑civilization/issues  
- **Discord:** https://discord.gg/your‑server  
- **Email:** support@darkfantasygame.dev  

---

## 📚 Development Reasoning (How This README Was Built)

1. **Identify required sections** – The original request listed seven headings (overview, features, installation, configuration, world state variables, AI improvement system, troubleshooting).  
2. **Gather core game data** – The current world snapshot (Day 89729, Population 11501, Treasury 102702240443) was incorporated into the “World State Variables” table.  
3. **Expand each heading** –  
   * **Project Overview**: Summarized genre, art style, and core loop.  
   * **Features**: Listed gameplay mechanics and technical capabilities in a table for quick scanning.  
   * **Installation**: Provided step‑by‑step commands, including optional virtual‑environment setup.  
   * **Configuration**: Showed a sample `config.json` with explanations of each key.  
   * **World State Variables**: Presented current values and noted other tracked metrics.  
   * **AI Improvement System**: Described the three‑layer adaptive model (baseline, progress‑based scaling, performance‑based adaptation) and where its data lives.  
   * **Troubleshooting**: Compiled common failure modes, their causes, and concise fixes, plus log location and support channels.  
4. **Formatting** – Used Markdown headings, tables, code fences, and emojis for readability.  
5. **Verification** – Ensured all requested items appear, values are accurate, and the file can be copied directly as `README.md`.

Feel free to copy the content above into a `README.md` file at the root of the repository. Happy world‑building!