# Dark Fantasy Pixel Art Civilization Game  

## Project Overview  

The **Dark Fantasy Pixel Art Civilization Game** is a strategy‑focused city‑builder set in a brooding, hand‑crafted pixel‑art world. Players guide a fledgling settlement through centuries of hardship, balancing resource gathering, construction, diplomacy, and warfare while confronting the ever‑present threat of darkness. Every decision shapes the civilization’s destiny, and the game’s dynamic world state evolves in real time, reflecting the consequences of your policies.

> **Current World State**  
> - **Day:** 72 330  
> - **Population:** 8 717  
> - **Treasury:** 55 696 525 651  

---

## Features  

| Feature | Description |
|---------|-------------|
| **Pixel‑Art Aesthetic** | Dark, atmospheric sprites and tiles that bring a grim fantasy realm to life. |
| **Deep City‑Building** | Construct homes, workshops, temples, barracks, and magical structures; each building influences population, morale, and resource output. |
| **Resource Management** | Harvest food, ore, mana, and gold; trade or allocate them to keep the populace thriving. |
| **Dynamic World State** | Day/night cycles, seasonal events, and a living population that reacts to your policies. |
| **AI Improvement System** | An adaptive AI that learns from past decisions, offering smarter recommendations for resource allocation, building placement, and diplomatic actions. |
| **Modular Configuration** | Tweak growth rates, AI learning speed, and other parameters via a simple JSON file. |
| **Save/Load** | Persistent world state stored in JSON; supports multiple save slots. |
| **Cross‑Platform** | Runs on Windows, macOS, and Linux (Python‑based). |

---

## Installation  

### Prerequisites  

- **Python 3.9+** (official builds from python.org)  
- **Git** (optional, for cloning)  
- A terminal/command prompt with write permissions to the install directory  

### Steps  

1. **Clone the repository** (or download the ZIP)  

   ```bash
   git clone https://github.com/your‑repo/dark-fantasy-civilization-game.git
   cd dark-fantasy-civilization-game
   ```

2. **Create a virtual environment (recommended)**  

   ```bash
   python -m venv venv
   source venv/bin/activate   # Linux/macOS
   venv\Scripts\activate      # Windows
   ```

3. **Install dependencies**  

   ```bash
   pip install -r requirements.txt
   ```

4. **Run the game**  

   ```bash
   python main.py
   ```

---

## Configuration  

All tunable parameters live in **`config.json`** at the project root. Adjusting these values lets you experiment with different difficulty curves or test AI behavior.

```json
{
  "population_growth_rate": 0.08,          // % per day (default 0.1)
  "resource_gathering_efficiency": 1.15,   // multiplier for raw resource yields
  "ai_improvement_rate": 0.04,             // % improvement per 1000 days
  "tax_rate": 0.12,                        // % of treasury income taken each month
  "morale_decay_rate": 0.02                // % morale loss per day without entertainment
}
```

**Key fields**

- `population_growth_rate` – Controls how quickly the population expands or contracts.  
- `resource_gathering_efficiency` – Influences the amount of food, ore, mana, etc., collected each cycle.  
- `ai_improvement_rate` – Determines how fast the AI learns from past actions.  
- `tax_rate` – Sets the proportion of treasury income collected as tax.  
- `morale_decay_rate` – Governs morale loss when basic needs aren’t met.

After editing, **restart the game** for changes to take effect.

---

## World State Variables  

The engine tracks a set of core variables that are saved in `save/state.json`. They can be inspected (or manually edited for testing) but **should not be altered during normal play**.

| Variable | Type | Description |
|----------|------|-------------|
| `day` | integer | Current day count (e.g., 72 330). |
| `population` | integer | Number of living citizens (e.g., 8 717). |
| `treasury` | integer | Gold reserves (e.g., 55 696 525 651). |
| `food_stock` | integer | Units of food stored. |
| `mana_stock` | integer | Units of magical energy stored. |
| `morale` | float (0‑1) | Overall citizen happiness. |
| `ai_level` | integer | Current AI improvement tier. |
| `buildings` | dict | Mapping of building IDs → counts. |
| `events_log` | list | Chronological list of major events (e.g., plagues, raids). |

These variables are automatically updated each game tick based on player actions, AI suggestions, and random events.

---

## AI Improvement System  

The AI acts as an advisory layer that **learns** from the civilization’s history and proposes optimal actions. Its workflow:

1. **Data Collection** – Every tick logs resource inflow/outflow, building performance, population changes, and event outcomes.  
2. **Analysis** – A lightweight decision‑tree algorithm evaluates which actions yielded the highest net gain in *prosperity* (a composite metric of treasury, morale, and population).  
3. **Recommendation Generation** – The AI suggests:
   - New building projects (e.g., “Construct a Mage Tower to boost mana production”).  
   - Resource reallocation (e.g., “Increase food harvest by 15 %”).  
   - Policy changes (e.g., “Raise tax rate to 13 % for the next 30 days”).  
4. **Improvement Cycle** – After every **`ai_improvement_rate`** days, the AI’s decision‑tree depth increases, allowing more nuanced strategies (e.g., multi‑step plans that consider future events).  

**Player Interaction**  

- Press **`I`** during gameplay to view AI suggestions.  
- Accept a suggestion with **`Enter`**, or dismiss it.  
- The AI tracks acceptance rates; higher acceptance accelerates its learning curve.

---

## Troubleshooting  

| Symptom | Possible Cause | Fix |
|---------|----------------|-----|
| **Game fails to start** | Python version < 3.9 or missing dependencies | Verify `python --version`. Re‑run `pip install -r requirements.txt`. |
| **Missing assets / graphics glitch** | Corrupted `assets/` folder | Re‑clone the repository or re‑download the ZIP. |
| **Save file won’t load** | `save/state.json` corrupted or manually edited incorrectly | Delete the problematic save (or restore from backup) and start a new game. |
| **AI suggestions are nonsensical** | `config.json` values set to extreme numbers (e.g., `ai_improvement_rate` = 0) | Reset `config.json` to defaults. |
| **Performance drops after many days** | Large `events_log` causing memory bloat | The game automatically truncates the log after 10 000 entries; if not, manually clear `events_log` in the save file. |
| **Treasury shows negative value** | Tax rate too high combined with low income | Lower `tax_rate` in `config.json` and ensure enough income buildings are active. |

### Getting Help  

- **GitHub Issues**: https://github.com/your-repo/dark-fantasy-civilization-game/issues  
- **Discord Community**: Invite link in the repo’s README.  
- **Documentation**: Additional technical docs live in the `docs/` folder.

---

## Contributing  

We welcome contributions! Please:

1. Fork the repository.  
2. Create a feature branch (`git checkout -b feature/awesome‑feature`).  
3. Ensure code follows the existing style (PEP 8, docstrings).  
4. Add or update tests in `tests/`.  
5. Submit a pull request targeting the `development` branch.  

Read `CONTRIBUTING.md` for detailed guidelines.

---

## License  

This project is licensed under the **MIT License**. See the `LICENSE` file for full terms.  

---  

*Happy building, and may your civilization thrive amidst the shadows!*