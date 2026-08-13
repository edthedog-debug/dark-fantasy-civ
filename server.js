const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const APP = express();
const PORT = process.env.PORT || 3000;

// ENVIRONMENT VARIABLES (Configured in Render)
const AI_API_KEY = process.env.GEMINI_API_KEY; 
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // Format: "edthedog-debug/dark-fantasy-civ"

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
    happiness: 85, // Happiness percentage (0-100%)
    tanks: 0,
    treasury: 500,
    techPower: 0.5,
    economicPower: "Emerging Market", // Global Economic Tier
    engineBuild: "v1.0.0-AI-Cloud",
    inWar: false,
    logs: [
        `[${new Date().toLocaleTimeString()}] Autonomous Cloud Engine Initialized.`
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

/**
 * 1. AI GENERATIVE NARRATIVE, ECONOMY & PHILOSOPHY ENGINE
 * Calls Gemini LLM to write socio-political breakthroughs, handle global hardships,
 * and steer the empire toward becoming a profitable economic powerhouse.
 */
async function generateAIEvents() {
    if (!AI_API_KEY) return;

    const prompt = `You are the Sovereign AI governing a nation. The ultimate goal is to build a highly profitable, technologically advanced global economic powerhouse with happy citizens, resilient to all hardships and disasters.
    Current World State:
    - Day: ${worldState.day}
    - Era: ${worldState.era}
    - Population: ${worldState.population}
    - Happiness: ${worldState.happiness}%
    - Treasury: ${worldState.treasury} Gold
    - Tech Power: ${worldState.techPower}
    - Economic Rank: ${worldState.economicPower}
    - In War: ${worldState.inWar}
    - Philosophy: ${worldState.philosophy}

    Generate 1 concise event (hardship, economic opportunity, or tech breakthrough) and show how society adapts. 
    Return strictly JSON format: 
    {
      "event": "string (max 25 words)",
      "newPhilosophy": "string",
      "goldImpact": number (can be positive or negative),
      "happinessImpact": number (can be positive or negative),
      "techImpact": number (positive decimal)
    }`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${AI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const rawText = data.candidates[0].content.parts[0].text;
        const cleanedText = rawText.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanedText);

        if (parsed.event) {
            addLog(`[AI THOUGHT] ${parsed.event}`);
        }
        if (parsed.newPhilosophy) {
            worldState.philosophy = parsed.newPhilosophy;
        }

        // Apply AI economic & social impacts
        if (typeof parsed.goldImpact === 'number') {
            worldState.treasury = Math.max(0, worldState.treasury + parsed.goldImpact);
        }
        if (typeof parsed.happinessImpact === 'number') {
            worldState.happiness = Math.min(100, Math.max(10, worldState.happiness + parsed.happinessImpact));
        }
        if (typeof parsed.techImpact === 'number') {
            worldState.techPower += Math.max(0, parsed.techImpact);
        }

    } catch (err) {
        console.error("AI Narrative Generation Error:", err.message);
    }
}

/**
 * 2. AI GRAPHICS & CODE REFACTOR ENGINE (GITHUB AUTO-COMMIT)
 * Rewrites public/index.html on GitHub to improve game graphics & features automatically.
 */
async function autoImproveGameCode() {
    if (!GITHUB_TOKEN || !GITHUB_REPO || !AI_API_KEY) return;

    console.log("🤖 AI starting Code Refactor & Graphics Upgrade cycle...");
    addLog(`[AI AUTO-CODING] Analyzing frontend engine to improve rendering & feature set...`);

    try {
        const fileUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/public/index.html`;
        const getFile = await fetch(fileUrl, {
            headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'User-Agent': 'Node-AI-Server' }
        });
        const fileData = await getFile.json();
        const currentSha = fileData.sha;

        const prompt = `Improve the Pixi.js code for an isometric world simulator representing a booming economic superpower. As the civilization grows and available grid tiles run out, expand the map size into a larger country/global territory. Implement interactive mobile camera controls (touch drag/pan and pinch-zoom). Graphically showcase thriving trade hubs, banks, futuristic infrastructure, happy citizens, nature/rivers, and defensive military vehicles (tanks) protecting the wealth.
        Current build: ${worldState.engineBuild}. Return ONLY the raw complete valid HTML/JS code for public/index.html.`;

        const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${AI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const aiData = await aiResponse.json();
        let newCode = aiData.candidates[0].content.parts[0].text;
        newCode = newCode.replace(/```html|```/g, '').trim();

        const updatedContentBase64 = Buffer.from(newCode).toString('base64');
        const commitResponse = await fetch(fileUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Node-AI-Server'
            },
            body: JSON.stringify({
                message: `🤖 [AI Auto-Upgrade] Engine refactored to ${worldState.engineBuild}`,
                content: updatedContentBase64,
                sha: currentSha
            })
        });

        if (commitResponse.ok) {
            addLog(`[AI COMMIT SUCCESS] Pushed new graphics & feature code to GitHub! Auto-deploying...`);
        }
    } catch (err) {
        console.error("Auto-code commit error:", err.message);
    }
}

// 24/7 MAIN SIMULATION LOOP (Every 4 seconds = 1 World Day)
setInterval(() => {
    worldState.day += 1;

    // --- DYNAMIC ECONOMIC & WELLBEING ENGINE ---
    
    // 1. Revenue Scaling (Population & Tech Power generate income)
    const dailyRevenue = Math.floor((worldState.population * 8) * (1 + worldState.techPower * 0.5));
    
    // 2. Upkeep & Expenses (Population services + Military maintenance)
    const dailyUpkeep = Math.floor(worldState.population * 2) + (worldState.tanks * 10);
    
    // Net profit
    const netProfit = dailyRevenue - dailyUpkeep;
    worldState.treasury = Math.max(0, worldState.treasury + netProfit);

    // 3. Natural Tech Advancement
    worldState.techPower += 0.02;

    // 4. Strategic Reinvestment (Autonomously spends excess treasury to grow power & happiness)
    if (worldState.treasury > 1200) {
        worldState.treasury -= 300;
        worldState.techPower += 0.15; // R&D Investment
        worldState.happiness = Math.min(100, worldState.happiness + 2); // Public services boost
        addLog(`[ECONOMY] Reinvested 300 Gold into Tech R&D and Public Services.`);
    }

    // 5. Military Investment (Buys tanks if rich enough to defend wealth)
    if (worldState.treasury > 2000 && worldState.tanks < 10) {
        worldState.treasury -= 500;
        worldState.tanks += 1;
        addLog(`[DEFENSE] Manufactured 1 Heavy Defense Tank for 500 Gold.`);
    }

    // 6. Population Growth & Happiness Dynamics
    if (worldState.happiness > 70 && worldState.day % 5 === 0) {
        worldState.population += 1; // Population increases when happy
    }

    // Update Global Economic Standing Tier
    if (worldState.treasury > 10000) {
        worldState.economicPower = "Global Economic Superpower";
    } else if (worldState.treasury > 5000) {
        worldState.economicPower = "Major Financial Hub";
    } else if (worldState.treasury > 2000) {
        worldState.economicPower = "Thriving Market Economy";
    } else {
        worldState.economicPower = "Emerging Market";
    }

    // Trigger AI Narrative & Hardship Adaptation every 10 ticks (~40 seconds)
    if (worldState.day % 10 === 0) {
        generateAIEvents();
    }

    // Trigger AI Code Auto-Improvement every 100 ticks (~6.5 minutes)
    if (worldState.day % 100 === 0) {
        const patch = Math.floor(Math.random() * 9) + 1;
        worldState.engineBuild = `v2.${patch}.0-Generative-AI`;
        autoImproveGameCode();
    }

    if (worldState.logs.length > 25) worldState.logs.shift();

    saveWorldState();
    broadcastState();
}, 4000);

function addLog(msg) {
    const time = new Date().toLocaleTimeString();
    worldState.logs.push(`[${time}] ${msg}`);
}

WSS.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'WORLD_UPDATE', data: worldState }));
});

SERVER.listen(PORT, () => {
    console.log(`🚀 AI Self-Improving Server active on port ${PORT}`);
});
