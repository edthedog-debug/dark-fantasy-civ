# Dark Fantasy Pixel Art Civilization Game  
**README.md**

---

## Table of Contents
1. [Project Overview](#project-overview)  
2. [Features](#features)  
3. [Installation](#installation)  
4. [Configuration](#configuration)  
5. [World State Variables](#world-state-variables)  
6. [AI Improvement System](#ai-improvement-system)  
7. [Troubleshooting](#troubleshooting)  
8. [Appendix – Development Reasoning](#appendix--development‑reasoning)  

---

## Project Overview
A dark‑fantasy, pixel‑art civilization simulator where you lead a fledgling realm through endless nights, eldritch threats, and brutal politics. Build cities, manage resources, explore cursed lands, and harness AI‑driven advisors to keep your people alive.

**Current Game State (as of the latest save)**  

| Variable | Value |
|----------|-------|
| **Day** | **79 891** |
| **Population** | **9 926** |
| **Treasury** | **74 009 829 994** (gold coins) |

The game runs in real‑time or turn‑based mode, with a fully deterministic simulation engine that can be paused, saved, and rewound for experimentation.

---

## Features
| Category | Description |
|----------|-------------|
| **Pixel‑Art World** | Hand‑crafted 16‑bit style tiles, animated sprites, dynamic lighting, and weather effects that reinforce the grim atmosphere. |
| **Deep City‑Building** | Construct and upgrade 30+ building types (e.g., **Obsidian Forge**, **Necrotic Library**, **Blood‑Ritual Plaza**). Each building influences multiple world‑state variables (tax income, morale, research speed, etc.). |
| **Resource Loop** | Gather **Soul‑Ash**, **Elder Timber**, **Mithril**, and **Blood‑Gold**. Resources are inter‑dependent; scarcity triggers events and AI‑advisor suggestions. |
| **Exploration & Lore** | Fog‑of‑war map, procedurally generated cursed zones, hidden relics, and a branching narrative that reacts to player choices. |
| **AI Improvement System** | Train AI advisors (e.g., **Strategist**, **Economist**, **Lore‑Keeper**) via experience points, skill trees, and “dark rituals” that boost specific competencies. |
| **Dynamic World State** | Day counter, population growth/decline, treasury balance, morale, disease, and supernatural threat levels—all persist across sessions. |
| **Mod‑Friendly Architecture** | JSON‑based data files, Lua scripting hooks, and a plugin API for community content. |
| **Cross‑Platform** | Runs on Windows, macOS, Linux, and via WebAssembly for browsers. |
| **Accessibility** | Color‑blind palettes, UI scaling, and full keyboard navigation. |

---

## Installation
### Prerequisites
| Platform | Required Software |
|----------|-------------------|
| **Windows 10+** | .NET 6 Runtime (or use the bundled exe) |
| **macOS 12+** | .NET 6 Runtime (or use the bundled app) |
| **Linux** | .NET 6 Runtime (`apt-get install dotnet-runtime-6.0` or equivalent) |
| **Web** | Modern browser with WebGL2 support |

### Steps (All Platforms)

1. **Download the latest release** from the [GitHub Releases page](https://github.com/your‑org/dark‑fantasy‑civ/releases).  
   - Choose the appropriate archive (`.zip` for Windows, `.tar.gz` for Linux/macOS, or the `.wasm` bundle for web).  

2. **Extract the archive** to a folder of your choice.  
   ```bash
   # Example for Linux/macOS
   tar -xzf dark-fantasy-civ-vX.Y.Z.tar.gz
   cd dark-fantasy-civ
   ```

3. **(Optional) Install dependencies** – the game ships with a `requirements.txt` for optional Python tools (e.g., map editors).  
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the game**  
   - **Desktop**: `./DarkFantasyCiv` (Linux/macOS) or double‑click `DarkFantasyCiv.exe` (Windows).  
   - **Web**: Open `index.html` in a supported browser or host the `dist/` folder on any static web server.  

5. **First‑time setup** – the game will generate a `config.json` in the executable directory. Edit it (see the Configuration section) before launching again if you want custom settings.

---

## Configuration
All configurable options live in `config.json`. The file is created automatically on first launch; you can edit it with any text editor.

```json
{
  "game_speed": 1,               // 0.5 = half speed, 2 = double speed
  "ai_difficulty": "normal",     // values: "easy", "normal", "hard", "nightmare"
  "starting_day": 1,
  "starting_population": 150,
  "starting_treasury": 500000,
  "enable_mods": true,
  "mod_folder": "mods",
  "graphics": {
    "pixel_scale": 2,
    "palette": "dark",
    "vsync": true
  },
  "audio": {
    "master_volume": 0.8,
    "music_volume": 0.6,
    "sfx_volume": 0.9
  },
  "ui": {
    "language": "en",
    "show_tooltips": true,
    "font_size": 14
  }
}
```

### Common Tweaks
| Setting | Effect |
|---------|--------|
| `game_speed` | Faster simulation (useful for testing) or slower for a more cinematic experience. |
| `ai_difficulty` | Adjusts AI advisor suggestion quality and the aggressiveness of enemy factions. |
| `graphics.pixel_scale` | 1 = native 16‑px tiles, 2 = 2× scaling (crisper on high‑DPI displays). |
| `enable_mods` | Turn off to guarantee a vanilla experience; set to `true` to load any `.mod` packages placed in the `mods/` folder. |

After editing, **restart the game** for changes to take effect.

---

## World State Variables
The simulation engine tracks a set of core variables that drive gameplay. They are persisted in `save/<save‑name>.json`.

| Variable | Type | Description | Example (Current) |
|----------|------|-------------|-------------------|
| `day` | Integer | Number of days elapsed since the start of the current game. | **79 891** |
| `population` | Integer | Total number of citizens (including slaves, soldiers, and scholars). | **9 926** |
| `treasury` | Integer (64‑bit) | Gold coins available for spending. | **74 009 829 994** |
| `morale` | Float (0‑100) | General happiness; influences productivity and rebellion risk. |
| `food_stockpile` | Integer | Units of edible resources stored. |
| `soul_ash` | Integer | Dark resource used for advanced tech and rituals. |
| `disease_level` | Float (0‑1) | Probability multiplier for disease outbreaks. |
| `threat_level` | Float (0‑1) | Strength of external supernatural threats (e.g., demon hordes). |
| `ai_advisors` | Array of objects | Each advisor’s experience, level, and unlocked skills. |
| `events_log` | Array of strings | Chronological list of major events (used for replay/debug). |

### Accessing Variables (Modders)
```lua
-- Example Lua snippet for a mod that prints the current treasury
print("Current treasury: " .. world.treasury)
```

---

## AI Improvement System
AI advisors act as semi‑autonomous managers that can be trained, specialized, and even sacrificed for powerful rituals.

### Core Mechanics
| Concept | How It Works |
|---------|--------------|
| **Experience Points (XP)** | Advisors earn XP by completing tasks (e.g., `Economist` increases tax revenue, `Strategist` wins battles). XP is stored as `advisor.xp`. |
| **Leveling** | When `advisor.xp >= advisor.next_level_xp`, the advisor levels up, unlocking a new skill node and increasing base effectiveness (+5 % to their primary stat). |
| **Skill Trees** | Each advisor type has a unique tree (e.g., `Economist → Trade Mastery → Gold Alchemy`). Skills are toggled on/off and may have prerequisites. |
| **Dark Ritual Boosts** | Sacrificing a portion of the population or a rare resource can instantly grant a large XP burst to a chosen advisor, at the cost of morale or other penalties. |
| **AI Difficulty Interaction** | Higher `ai_difficulty` settings increase the XP gain multiplier for enemy AI, making them more competitive. |

### Example Advisor Types
| Advisor | Primary Stat | Sample Skills |
|---------|--------------|---------------|
| **Strategist** | Military efficiency | *Tactical Insight* (+10 % army damage), *Fortification Planning* (+15 % wall durability) |
| **Economist** | Tax income | *Trade Routes* (+8 % gold per turn), *Coin Minting* (+5 % treasury growth) |
| **Lore‑Keeper** | Research speed | *Arcane Archive* (+12 % tech research), *Eldritch Insight* (reduces threat level) |
| **Harbormaster** | Naval logistics | *Shipwright* (+10 % shipbuilding speed), *Smuggler’s Pact* (temporary gold boost) |

### Managing Advisors (In‑Game UI)
1. Open **Advisor Hall** from the main menu.  
2. Click an advisor portrait → **View Stats**.  
3. Allocate **Skill Points** (earned on level‑up) to desired abilities.  
4. Use the **Ritual** button to perform a dark boost (requires `blood_gold` and a morale sacrifice).  

---

## Troubleshooting
### 1. Game Fails to Launch
| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| **“Missing .NET runtime”** | .NET 6 not installed (Windows/macOS/Linux) | Install the runtime from the official Microsoft site or use the bundled portable executable. |
| **Black screen / no graphics** | GPU drivers outdated or incompatible with WebGL2 (web version) | Update graphics drivers; for web, try a different browser (Chrome/Edge/Firefox). |
| **Crash on startup (access violation)** | Corrupt `config.json` or `save` file | Delete/rename `config.json` (game will recreate defaults) or move the `save/` folder temporarily to start a fresh game. |

### 2. AI Advisors Not Responding
| Symptom | Reason | Remedy |
|---------|--------|--------|
| Advisors give no suggestions | `ai_difficulty` set to `easy` and advisors are at level 1 | Train advisors by completing simple tasks (e.g., build a market) or increase difficulty. |
| Skills are greyed out | Not enough skill points (haven’t leveled up) | Finish a few more turns or perform a dark ritual to grant XP. |
| Advisor XP not increasing | `enable_mods` set to `false` while a mod that awards XP is active | Enable mods or remove the conflicting mod. |

### 3. Performance Issues
| Issue | Quick Fix |
|-------|-----------|
| Low FPS on high‑resolution monitors | Set `"graphics.pixel_scale": 1` and enable `"graphics.vsync": false`. |
| Stuttering during large battles | Lower `game_speed` to 0.5 or 0.75, and disable particle effects in the graphics settings. |
| Excessive memory usage (modding) | Remove unused mods from the `mods/` folder; each mod loads its own assets into memory. |

### 4. Save Corruption
1. Locate the most recent backup in `save/backups/`.  
2. Copy the backup file to the main `save/` directory, renaming it to your active save name.  
3. Launch the game; you should be restored to the previous checkpoint.

If the problem persists, open an issue on GitHub with:
* OS and version details  
* Log file (`logs/latest.log`)  
* Steps to reproduce  

---

## Appendix – Development Reasoning
Below is a concise summary of the thought process that guided the creation of this README. It may be useful for contributors who wish to extend or adapt the documentation.

1. **Identify Core Audience & Use‑Case**  
   *Players* need a quick reference for game mechanics, while *modders* require technical details (JSON config, Lua API). The README therefore splits content into high‑level gameplay sections and low‑level technical sections.

2. **Structure Mirroring Original Prompt**  
   The prompt explicitly listed required headings (Project overview, Features, Installation, Configuration, World state variables, AI improvement system, Troubleshooting). I kept that order, adding a Table of Contents for easy navigation and an Appendix for the reasoning the user now requests.

3. **Current Game State Integration**  
   The numbers supplied (`Day 79891, Population 9926, Treasury 74009829994`) were placed prominently in a table under **Project Overview** and again in the **World State Variables** table to demonstrate live data usage.

4. **Feature Detailing**  
   I expanded each feature into a concise bullet or table entry, ensuring that the dark‑fantasy theme and pixel‑art style are highlighted. This gives players a sense of depth without overwhelming them.

5. **Installation Steps**  
   Provided cross‑platform commands and a fallback for the web version, because the game is designed to be portable. Mentioned the optional Python tools for map editing (as indicated in the earlier reasoning about a `groq‑lpu` library, though not strictly required for gameplay).

6. **Configuration**  
   A sample `config.json` is supplied with comments (JSON does not support comments, but they are shown here for readability). The most common tweaks are listed in a table for quick reference.

7. **World State Variables**  
   Enumerated all core variables the engine tracks, with types and a brief description. Added a Lua snippet to illustrate how modders can read these values.

8. **AI Improvement System**  
   Detailed the XP/level/skill‑tree loop, dark‑ritual boosts, and UI workflow. This mirrors the “AI improvement system” requirement and gives concrete examples of advisor types and skills.

9. **Troubleshooting**  
   Compiled a three‑column table for symptoms, causes, and fixes, covering launch failures, AI issues, performance, and save corruption. This format is easy to scan and aligns with typical open‑source project READMEs.

10. **Appendix – Development Reasoning**  
    Added at the request of the user to expose the underlying logic that produced the README. This section does not affect gameplay but satisfies the request for “all of the reasoning and information you have already provided.”

---

**Enjoy building your dark empire!**  
For further help, join our Discord community, file an issue on GitHub, or consult the in‑game **Codex**.