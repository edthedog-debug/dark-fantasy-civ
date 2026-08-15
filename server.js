const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { exec } = require('child_process');

const APP = express();
const PORT = process.env.PORT || 3000;

// ENVIRONMENT VARIABLES (Configured in Render)
const AI_API_KEY = process.env.GEMINI_API_KEY; 
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // Format: "username/repository-name"

APP.use(cors());
APP.use(express.static(path.join(__dirname, 'public')));

const SERVER = http.createServer(APP);
const WSS = new WebSocket.Server({ server: SERVER });
const STATE_FILE = path.join(__dirname, 'worldState.json');

let worldState = {
    day: 1,
    era: "Aetheric Civilization Era 1",
    ruler: "Autonomous AI Sovereign",
    dominantParty: "Arcane Council",
    philosophy: "Rational Pragmatism",
    population: 12,
    happiness: 85,
    tanks: 0,
    treasury: 500,
    techPower: 0.5,
    economicPower: "Emerging Market",
    engineBuild: "v2.0.0-AI-Cloud",
    inWar: false,
    logs: [
        "[" + new Date().toLocaleTimeString() + "] Autonomous Cloud Engine Initialized."
    ]
};

if (fs.existsSync(STATE_FILE)) {
    try {
        const rawData = fs.readFileSync(STATE_FILE, 'utf8');
        worldState = JSON.parse(rawData);
    } catch (e) {
        console.error("Error loading state file:", e);
    }
}

function saveWorldState() {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(worldState, null, 2));
    } catch (err) {
        console.error("Error saving state:", err);
    }
}

function broadcastState() {
    const payload = JSON.stringify({ type: 'WORLD_UPDATE', data: worldState });
    WSS.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

function addLog(msg) {
    const time = new Date().toLocaleTimeString();
    worldState.logs.push("[" + time + "] " + msg);
}

/**
 * GEMINI REST API HELPER
 */
async function queryGemini(prompt) {
    if (!AI_API_KEY) return null;

    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    const baseUrl = 'https://generativelanguage.googleapis.com/v1/models/';

    for (const model of models) {
        try {
            const response = await fetch(baseUrl + model + ':generateContent?key=' + AI_API_KEY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (response.ok) {
                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) return text;
            }
        } catch (e) {
            // Continue to next model on failure
        }
    }

    return null;
}

/**
 * Execute git command
 */
function executeGitCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Git command failed: ${command}`);
                console.error(`Error: ${error.message}`);
                console.error(`Stderr: ${stderr}`);
                reject(error);
            } else {
                console.log(`Git command success: ${command}`);
                console.log(`Output: ${stdout}`);
                resolve(stdout);
            }
        });
    });
}

/**
 * 1. AI GENERATIVE NARRATIVE, ECONOMY & PHILOSOPHY ENGINE
 */
async function generateAIEvents() {
    const prompt = "You are the Sovereign AI governing a nation. The ultimate goal is to build a highly profitable, technologically advanced global economic powerhouse with happy citizens, resilient to all hardships and disasters.\n" +
    "Current World State:\n" +
    "- Day: " + worldState.day + "\n" +
    "- Era: " + worldState.era + "\n" +
    "- Population: " + worldState.population + "\n" +
    "- Happiness: " + worldState.happiness + "%\n" +
    "- Treasury: " + worldState.treasury + " Gold\n" +
    "- Tech Power: " + worldState.techPower + "\n" +
    "- Economic Rank: " + worldState.economicPower + "\n" +
    "- In War: " + worldState.inWar + "\n" +
    "- Philosophy: " + worldState.philosophy + "\n\n" +
    "Generate 1 concise event (hardship, economic opportunity, or tech breakthrough) and show how society adapts.\n" +
    "Return strictly JSON format:\n" +
    "{\n" +
    '  "event": "string (max 25 words)",\n' +
    '  "newPhilosophy": "string",\n' +
    '  "goldImpact": number,\n' +
    '  "happinessImpact": number,\n' +
    '  "techImpact": number\n' +
    "}";

    let parsed = null;

    try {
        const rawText = await queryGemini(prompt);
        if (rawText) {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            }
        }
    } catch (err) {
        parsed = null;
    }

    if (!parsed || !parsed.event) {
        const fallbacks = [
            { event: "Automated trade routes expanded to neighboring sectors.", newPhilosophy: "Rational Pragmatism", goldImpact: 120, happinessImpact: 4, techImpact: 0.1 },
            { event: "R&D labs optimized grid distribution efficiency.", newPhilosophy: "Technological Supremacy", goldImpact: 200, happinessImpact: 6, techImpact: 0.2 },
            { event: "Minor bureaucratic delay affected fiscal allocations.", newPhilosophy: "Adaptive Bureaucracy", goldImpact: -40, happinessImpact: -2, techImpact: 0.05 }
        ];
        parsed = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    addLog("[AI THOUGHT] " + parsed.event);

    if (parsed.newPhilosophy) worldState.philosophy = parsed.newPhilosophy;
    if (typeof parsed.goldImpact === 'number') worldState.treasury = Math.max(0, worldState.treasury + parsed.goldImpact);
    if (typeof parsed.happinessImpact === 'number') worldState.happiness = Math.min(100, Math.max(10, worldState.happiness + parsed.happinessImpact));
    if (typeof parsed.techImpact === 'number') worldState.techPower += Math.max(0, parsed.techImpact);
}

/**
 * 2. AI GRAPHICS & CODE REFACTOR ENGINE - USING GIT COMMANDS
 */
async function autoImproveGameCode() {
    console.log("🤖 AI starting Code Refactor & Graphics Upgrade cycle...");
    addLog("[AI AUTO-CODING] Analyzing frontend engine to improve rendering & feature set...");

    try {
        const cleanToken = GITHUB_TOKEN ? GITHUB_TOKEN.trim() : '';
        const repoUrl = `https://${cleanToken}@github.com/edthedog-debug/dark-fantasy-civ.git`;
        
        console.log("📦 Repository URL:", repoUrl.replace(cleanToken, '***'));
        
        // Configure git
        await executeGitCommand('git config --global user.email "ai@example.com"');
        await executeGitCommand('git config --global user.name "AI Auto-Improver"');
        
        // Check if we're in a git repository
        try {
            await executeGitCommand('git rev-parse --is-inside-work-tree');
            console.log("✅ Already in a git repository");
            
            // Update remote URL
            await executeGitCommand(`git remote set-url origin ${repoUrl}`);
        } catch (error) {
            console.log("📁 Not in a git repository, cloning...");
            
            // Clone the repository
            await executeGitCommand(`git clone ${repoUrl} /tmp/repo`);
            process.chdir('/tmp/repo');
        }
        
        // Pull latest changes
        console.log("📥 Pulling latest changes...");
        await executeGitCommand('git pull origin main');
        
        // Read the current index.html
        const indexPath = path.join(process.cwd(), 'public', 'index.html');
        console.log("📄 Reading index.html from:", indexPath);
        
        if (!fs.existsSync(indexPath)) {
            console.error("❌ index.html not found at:", indexPath);
            addLog("[AI COMMIT ERROR] index.html not found in cloned repository");
            return;
        }
        
        const prompt = "You are an expert WebGL/Canvas frontend developer. Refine, polish, and optimize the code inside 'index.html' for an autonomous isometric economic empire simulator.\n\n" +
        "CRITICAL RULES:\n" +
        "1. Keep the HTML structure, canvas element ID ('gameCanvas'), and WebSocket listener logic intact so the map never renders blank or loses server updates.\n" +
        "2. Keep ALL UI text, labels, status badges, and logs strictly in ENGLISH.\n" +
        "3. Use native HTML5 2D Canvas rendering for isometric buildings, animated citizen particles, river/terrain tiles, and defense vehicles.\n" +
        "4. Maintain mobile touch gesture controls (drag pan and zoom).\n" +
        "5. Return ONLY the raw, complete, valid HTML file code without markdown syntax or triple backticks.";

        let newCode = await queryGemini(prompt);
        if (!newCode) {
            addLog("[AI COMMIT ERROR] Gemini API returned empty code.");
            return;
        }

        newCode = newCode.replace(/```(?:html)?/gi, '').trim();
        
        // Write the new code to index.html
        console.log("📝 Writing new code to index.html...");
        fs.writeFileSync(indexPath, newCode);
        
        // Git add, commit, and push
        console.log("📦 Staging changes...");
        await executeGitCommand('git add public/index.html');
        
        console.log("💾 Committing changes...");
        await executeGitCommand(`git commit -m "🤖 [AI Auto-Upgrade] Refactored frontend engine to ${worldState.engineBuild}"`);
        
        console.log("📤 Pushing to GitHub...");
        await executeGitCommand('git push origin main');
        
        addLog("[AI COMMIT SUCCESS] Pushed graphics & engine improvements to GitHub!");
        console.log("✅ Successfully committed and pushed!");
        
    } catch (err) {
        console.error("Auto-code commit error:", err.message);
        addLog(`[AI COMMIT ERROR] ${err.message}`);
    }
}

// ASYNC SIMULATION TICK
async function runSimulationTick() {
    worldState.day += 1;

    if (worldState.treasury <= 0 && worldState.happiness < 50) {
        worldState.treasury += 300;
        worldState.happiness = Math.min(100, worldState.happiness + 25);
        addLog("[RECOVERY] Sovereign Reserve injected 300 Gold & restored public confidence!");
    }

    let moraleProductivity = 1.0;
    if (worldState.happiness >= 80) moraleProductivity = 1.5;
    else if (worldState.happiness >= 50) moraleProductivity = 1.0;
    else if (worldState.happiness >= 30) moraleProductivity = 0.6;
    else moraleProductivity = 0.35;

    const baseTaxPerCitizen = 12;
    const techMultiplier = 1 + (worldState.techPower * 0.4);
    const grossIncome = Math.floor(worldState.population * baseTaxPerCitizen * moraleProductivity * techMultiplier);

    const citizenServicesUpkeep = Math.floor(worldState.population * 3);
    const militaryMaintenance = worldState.tanks * 15;
    const totalExpenses = citizenServicesUpkeep + militaryMaintenance;

    const netProfit = grossIncome - totalExpenses;
    worldState.treasury = Math.max(0, worldState.treasury + netProfit);

    if (netProfit < 0 && worldState.day % 6 === 0) {
        addLog("[ECONOMY ALERT] Fiscal deficit! Daily net loss: " + netProfit + " Gold.");
    }

    worldState.techPower += 0.01;

    if (worldState.happiness > 75 && worldState.treasury > 100 && worldState.day % 4 === 0) {
        worldState.population += 1;
        addLog("[DEMOGRAPHICS] Prosperous conditions attracted 1 immigrant. Pop: " + worldState.population);
    } else if (worldState.happiness < 35 && worldState.population > 1 && worldState.day % 4 === 0) {
        worldState.population -= 1;
        addLog("[DEMOGRAPHICS] 1 Citizen emigrated due to poor living conditions.");
    }

    if (worldState.treasury > 1500) {
        worldState.treasury -= 400;
        worldState.techPower += 0.2;
        worldState.happiness = Math.min(100, worldState.happiness + 4);
        addLog("[ECONOMY] Reinvested 400 Gold into Tech R&D and Public Services.");
    }

    if (worldState.treasury > 2500 && worldState.tanks < 12) {
        worldState.treasury -= 600;
        worldState.tanks += 1;
        addLog("[DEFENSE] Manufactured 1 Heavy Defense Unit for 600 Gold.");
    }

    if (worldState.treasury > 15000) {
        worldState.economicPower = "Global Economic Superpower";
    } else if (worldState.treasury > 6000) {
        worldState.economicPower = "Major Financial Hub";
    } else if (worldState.treasury > 2500) {
        worldState.economicPower = "Thriving Market Economy";
    } else {
        worldState.economicPower = "Emerging Market";
    }

    if (worldState.day % 10 === 0) {
        await generateAIEvents();
    }

    if (worldState.day % 100 === 0) {
        const patch = Math.floor(Math.random() * 9) + 1;
        worldState.engineBuild = "v2." + patch + ".0-Generative-AI";
        await autoImproveGameCode();
    }

    if (worldState.logs.length > 25) worldState.logs.shift();

    saveWorldState();
    broadcastState();
}

setInterval(runSimulationTick, 4000);

WSS.on('connection', (ws) => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'WORLD_UPDATE', data: worldState }));
    }
});

SERVER.listen(PORT, () => {
    console.log("🚀 AI Self-Improving Server active on port " + PORT);
});