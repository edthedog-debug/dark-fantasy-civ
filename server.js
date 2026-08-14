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
 * GEMINI API HELPER (Compatible with Google Interactions API & v1beta Fallback)
 */
async function queryGemini(prompt) {
    if (!AI_API_KEY) {
        console.error("GEMINI_API_KEY is missing in environment variables.");
        return null;
    }

    // Attempt 1: New Google Interactions API
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions?key=${AI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-2.5-flash',
                input: prompt
            })
        });

        if (res.ok) {
            const data = await res.json();
            if (data.output) return data.output;
            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                return data.candidates[0].content.parts[0].text;
            }
        }
    } catch (e) {
        console.error("Interactions API error:", e.message);
    }

    // Attempt 2: Direct v1beta REST fallback
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${AI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (res.ok) {
            const data = await res.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        }
    } catch (e) {
        console.error("v1beta Fallback error:", e.message);
    }

    return null;
}

/**
 * 1. AI GENERATIVE NARRATIVE, ECONOMY & PHILOSOPHY ENGINE
 */
async function generateAIEvents() {
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
        const rawText = await queryGemini(prompt);
        if (!rawText) return;

        const cleanedText = rawText.replace(/```(?:json)?/gi, '').trim();
        const parsed = JSON.parse(cleanedText);

        if (parsed.event) {
            addLog(`[AI THOUGHT] ${parsed.event}`);
        }
        if (parsed.newPhilosophy) {
            worldState.philosophy = parsed.newPhilosophy;
        }

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
 */
async function autoImproveGameCode() {
    if (!GITHUB_TOKEN || !GITHUB_REPO) return;

    console.log("🤖 AI starting Code Refactor & Graphics Upgrade cycle...");
    addLog(`[AI AUTO-CODING] Analyzing frontend engine to improve rendering & feature set...`);

    try {
        const fileUrl = `[https://api.github.com/repos/$](https://api.github.com/repos/$){GITHUB_REPO}/contents/public/index.html`;
        const getFile = await fetch(fileUrl, {
            headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'User-Agent': 'Node-AI-Server' }
        });
        const fileData = await getFile.json();
        const currentSha = fileData.sha;

        const prompt = `You are an expert WebGL/Canvas frontend developer. Refine, polish, and optimize the code inside 'public/index.html' for an autonomous isometric economic empire simulator.
        
        CRITICAL RULES:
        1. Keep the HTML structure, canvas element ID ('gameCanvas'), and WebSocket listener logic intact so the map never renders blank or loses server updates.
        2. Keep ALL UI text, labels, status badges, and logs strictly in ENGLISH.
        3. Use native HTML5 2D Canvas rendering for isometric buildings, animated citizen particles, river/terrain tiles, and defense vehicles.
        4. Maintain mobile touch gesture controls (drag pan and zoom).
        5. Return ONLY the raw, complete, valid HTML file code without markdown syntax or triple backticks.`;

        let newCode = await queryGemini(prompt);
        if (!newCode) return;

        newCode = newCode.replace(/```(?:html)?/gi, '').trim();

        const updatedContentBase64 = Buffer.from(newCode).toString('base64');
        const commitResponse = await fetch(fileUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Node-AI-Server'
            },
            body: JSON.stringify({
                message: `🤖 [AI Auto-Upgrade] Refactored frontend engine to ${worldState.engineBuild}`,
                content: updatedContentBase64,
                sha: currentSha
            })
        });

        if (commitResponse.ok) {
            addLog(`[AI COMMIT SUCCESS] Pushed graphics & engine improvements to GitHub! Auto-deploying...`);
        } else {
            const commitErr = await commitResponse.json();
            console.error("GitHub Commit Error:", commitErr.message);
        }
    } catch (err) {
        console.error("Auto-code commit error:", err.message);
    }
}

// 24/7 MAIN SIMULATION LOOP (Every 4 seconds = 1 World Day)
setInterval(() => {
    worldState.day += 1;

    let moraleProductivity = 1.0;
    if (worldState.happiness >= 80) {
        moraleProductivity = 1.5;
    } else if (worldState.happiness >= 50) {
        moraleProductivity = 1.0;
    } else if (worldState.happiness >= 30) {
        moraleProductivity = 0.4;
    } else {
        moraleProductivity = 0.05;
    }

    const baseTaxPerCitizen = 12;
    const techMultiplier = 1 + (worldState.techPower * 0.4);
    const grossIncome = Math.floor(worldState.population * baseTaxPerCitizen * moraleProductivity * techMultiplier);

    const citizenServicesUpkeep = Math.floor(worldState.population * 3);
    const militaryMaintenance = worldState.tanks * 15;
    const totalExpenses = citizenServicesUpkeep + militaryMaintenance;

    const netProfit = grossIncome - totalExpenses;
    worldState.treasury = Math.max(0, worldState.treasury + netProfit);

    if (netProfit < 0 && worldState.day % 6 === 0) {
        addLog(`[ECONOMY ALERT] Fiscal deficit! Daily net loss: ${netProfit} Gold.`);
    }

    worldState.techPower += 0.01;

    if (worldState.happiness > 75 && worldState.treasury > 100 && worldState.day % 4 === 0) {
        worldState.population += 1;
        addLog(`[DEMOGRAPHICS] Prosperous conditions attracted 1 immigrant. Pop: ${worldState.population}`);
    } else if (worldState.happiness < 35 && worldState.population > 1 && worldState.day % 4 === 0) {
        worldState.population -= 1;
        addLog(`[DEMOGRAPHICS] 1 Citizen emigrated due to poor living conditions.`);
    }

    if (worldState.treasury > 1500) {
        worldState.treasury -= 400;
        worldState.techPower += 0.2;
        worldState.happiness = Math.min(100, worldState.happiness + 4);
        addLog(`[ECONOMY] Reinvested 400 Gold into Tech R&D and Public Services.`);
    }

    if (worldState.treasury > 2500 && worldState.tanks < 12) {
        worldState.treasury -= 600;
        worldState.tanks += 1;
        addLog(`[DEFENSE] Manufactured 1 Heavy Defense Unit for 600 Gold.`);
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
        generateAIEvents();
    }

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
