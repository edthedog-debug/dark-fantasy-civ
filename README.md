# Dark Fantasy Pixel Art Civilization Game – README.md  

*(All sections requested are included, and the reasoning that guided their creation follows the README.)*  

---  

## Project Overview  
Welcome to **Dark Fantasy Pixel Art Civilization**, a strategy‑city‑builder set in a brooding, hand‑crafted pixel‑art world. Players must grow a fledgling settlement into a thriving empire while contending with scarce resources, hostile neighbors, and the ever‑present threat of darkness. The game blends classic civilization mechanics (resource management, diplomacy, warfare) with a unique **AI Improvement System** that lets you research and automate city functions for ever‑greater efficiency.

---  

## Features  

| Feature | Description |
|---------|-------------|
| **Dynamic World** | Procedurally generated continents, ruins, forests, and cursed lands that change each play‑through. |
| **Pixel‑Art Aesthetic** | 16‑bit style sprites, animated tiles, and atmospheric lighting that reinforce the dark fantasy tone. |
| **City Building & Management** | Build houses, workshops, temples, and defenses; balance food, stone, magic, and gold. |
| **Population & Treasury Tracking** | Real‑time stats (e.g., Day 59829, Population 6716, Treasury 31 910 406 575) displayed on the HUD. |
| **Diplomacy & Warfare** | Form alliances, trade pacts, or declare war on rival civilizations and roaming monster hordes. |
| **AI Improvement System** | Allocate research points to unlock AI‑driven efficiencies (resource gathering, construction speed, diplomatic AI, etc.). |
| **Mod‑Friendly Architecture** | JSON‑based configuration, data‑driven content, and a clear plugin API for community extensions. |
| **Cross‑Platform** | Runs on Windows, macOS, and Linux via Python 3.8+ and Pygame 2.0+. |

---  

## Installation  

### Prerequisites  

* **Python 3.8** or newer (https://www.python.org/downloads/)  
* **Pygame 2.0+** (installed via pip)  
* Optional: **Git** for cloning the repo  

### Steps  

```bash
# 1. Clone the repository
git clone https://github.com/your-repo/dark-fantasy-civilization.git
cd dark-fantasy-civilization

# 2. Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the game
python main.py
```

If you prefer not to use a virtual environment, simply run `pip install -r requirements.txt` globally.

---  

## Configuration  

All configurable options live in **`config.json`** (root directory). The file is loaded at startup, allowing you to tweak difficulty, world size, and starting conditions without touching code.

```json
{
  "difficulty": "medium",          // easy | medium | hard
  "world_size": "large",           // small | medium | large
  "starting_population": 150,
  "starting_treasury": 5000,
  "enable_ai_improvements": true,
  "seed": 123456789                // for reproducible world generation
}
```

**Key fields explained**

| Field | Effect |
|-------|--------|
| `difficulty` | Adjusts AI aggressiveness, resource scarcity, and event frequency. |
| `world_size` | Controls map dimensions and total number of resource nodes. |
| `starting_population` | Sets the initial citizen count. |
| `starting_treasury` | Gold available at Day 0. |
| `enable_ai_improvements` | Toggles the AI improvement research tree. |
| `seed` | Deterministic world generation; change for a new map. |

After editing, restart the game for changes to take effect.

---  

## World State Variables  

The engine maintains a set of global variables that are displayed on the HUD and can be accessed by mods:

| Variable | Current Value (as of this README) | Description |
|----------|-----------------------------------|-------------|
| `day` | **59829** | Number of in‑game days elapsed since the start. |
| `population` | **6716** | Total living citizens in your civilization. |
| `treasury` | **31 910 406 575** | Gold reserves available for construction, research, and army upkeep. |
| `food_stock` | (dynamic) | Current food stored; influences population growth. |
| `mana_pool` | (dynamic) | Magical energy used for spells, enchantments, and certain building upgrades. |
| `research_points` | (dynamic) | Points you can spend on the AI Improvement System. |

These variables are persisted to `savegames/` as JSON, enabling you to load and continue any saved session.

---  

## AI Improvement System  

The AI Improvement System is a lightweight research tree that lets you automate and accelerate core city functions. Research points are earned each month based on **`population`** and **`mana_pool`**.

### Core Branches  

| Branch | Unlockable Technologies | Benefits |
|--------|------------------------|----------|
| **Resource Gathering** | *Efficient Harvesting*, *Magical Mining* | +10‑30 % resource yield, reduced waste. |
| **Building Construction** | *Rapid Foundations*, *Arcane Blueprint* | Construction time cut by 20‑50 %. |
| **Diplomacy** | *Envoy Training*, *Psychic Negotiation* | Improved relation gain, lower war penalties. |
| **Military AI** (optional) | *Tactical Formations*, *Siege Automation* | Units act smarter in combat, reduced micromanagement. |

### How to Use  

1. **Accumulate Research Points** – displayed in the HUD under “Research”.  
2. Open the **Research Menu** (`R` key).  
3. Click a technology to spend points; prerequisites are shown as locked until earlier techs are completed.  
4. Once unlocked, the effect is applied globally and persists across saves.

### Balancing  

- Each technology costs a scaling amount of points (e.g., 100 RP for Tier 1, 250 RP for Tier 2).  
- Higher difficulty levels increase the cost multiplier.  
- You can reset the tree (costly) via the **Advanced Settings** menu if you wish to re‑allocate points.

---  

## Troubleshooting  

| Symptom | Possible Cause | Fix |
|---------|----------------|-----|
| **Game crashes on launch** | Missing or incompatible Pygame version | `pip install -U pygame` or reinstall Python 3.8+. |
| **World does not generate / shows blank map** | Invalid `world_size` or corrupted `seed` | Delete `config.json` (or reset fields) and restart. |
| **Population stays at 0** | `starting_population` set to 0 or negative | Edit `config.json` → `"starting_population": 150` (or any positive integer). |
| **Research points never increase** | `enable_ai_improvements` set to `false` | Set `"enable_ai_improvements": true` in `config.json`. |
| **Audio glitches / no sound** | Missing SDL libraries (Linux) | Install `libsdl2-mixer-2.0-0` (or equivalent for your distro). |
| **Save file fails to load** | Corrupted JSON in `savegames/` | Delete the offending file or restore from backup. |

### Reporting Bugs  

1. Reproduce the issue and note the exact steps.  
2. Capture the console output (`python main.py > log.txt 2>&1`).  
3. Open an issue on GitHub: https://github.com/your-repo/dark-fantasy-civilization/issues  
4. Include the log file, OS details, and a brief description.

---  

## Contributing  

We welcome community contributions!  

1. Fork the repo.  
2. Create a feature branch (`git checkout -b feature/awesome‑feature`).  
3. Follow the existing code style (PEP 8, docstrings).  
4. Submit a pull request with a clear description and screenshots if UI changes are involved.  

Please read `CONTRIBUTING.md` for detailed guidelines.

---  

## License  

This project is licensed under the **MIT License** – see the `LICENSE` file for full text.

---  

# Development Reasoning (Why the README Looks Like This)

Below is the thought process that produced the sections above, ensuring the document meets the original request and provides a useful, developer‑friendly reference.

1. **Identify Required Sections** – The user explicitly asked for:  
   - Project overview  
   - Features  
   - Installation  
   - Configuration  
   - World state variables  
   - AI improvement system  
   - Troubleshooting  

   I listed each as a top‑level heading to make navigation trivial.

2. **Project Overview** – A concise paragraph sets the tone (dark fantasy, pixel art, strategy) and tells new players what the core loop is.

3. **Features** – I used a table to present each major capability clearly, including the current world‑state numbers (Day 59829, Population 6716, Treasury 31 910 406 575) because they were part of the supplied “current state”. This also highlights the AI system, which is a unique selling point.

4. **Installation** – Standard Python‑project steps (clone, virtual‑env, pip install, run) are familiar to the target audience. I added a Bash snippet for copy‑and‑paste convenience.

5. **Configuration** – The game is data‑driven, so exposing a `config.json` example with comments (JSON5‑style for readability) shows users how to tweak difficulty, world size, and starting resources. Each key gets a short description.

6. **World State Variables** – I created a table that lists the dynamic variables the engine tracks, inserting the exact numbers the user gave. This makes the README a live snapshot of the game’s current status.

7. **AI Improvement System** – Because the user highlighted this as a required section, I detailed the research tree, how points are earned, and the benefits of each branch. A step‑by‑step “How to Use” guide ensures players can actually interact with the system.

8. **Troubleshooting** – Common failure modes (crashes, map generation, zero population, research not accruing) are anticipated based on the game’s dependencies (Python, Pygame) and configuration options. A table format lets users quickly scan for their symptom.

9. **Additional Standard Sections** – I added **Contributing**, **License**, and a brief **Development Reasoning** section (the latter directly answering the user’s request to include the reasoning). These are typical for open‑source projects and improve the README’s completeness.

10. **Formatting** – All headings use Markdown syntax (`##`, `###`). Code blocks are fenced with triple backticks for commands and JSON snippets. Tables are used where they improve readability.

By following this structured approach, the final README is comprehensive, easy to read, and directly reflects the information the user supplied.