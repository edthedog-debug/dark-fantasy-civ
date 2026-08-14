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

function addLog(msg) {
    const logEntry = `[${new Date().toLocaleTimeString()}] ${msg}`;
    worldState.logs.unshift(logEntry);
    if (worldState.logs.length > 50) worldState.logs.pop();
    saveWorldState();
    broadcastState();
}

/**
 * GEMINI REST API HELPER (Native v1 Endpoint with Fallback)
 */
async function queryGemini(prompt) {
    if (!AI_API_KEY) return null;

    const models = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];

    for (const model of models) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${AI_API_KEY}`, {
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
            // Fallthrough to next model
        }
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

    let parsed = null;

    try {
        const rawText = await queryGemini(prompt);
        if (rawText) {
            const cleanedText = rawText.replace(/```(?:json)?/gi, '').trim();
            parsed = JSON.parse(cleanedText);
        }
    } catch (err) {
        parsed = null;
    }

    // Procedural narrative fallback when external AI services are unavailable
    if (!parsed || !parsed.event) {
        const fallbacks = [
            { event: "Automated trade routes expanded to neighboring sectors.", newPhilosophy: "Rational Pragmatism", goldImpact: 120, happinessImpact: 4, techImpact: 0.1 },
            { event: "R&D labs optimized grid distribution efficiency.", newPhilosophy: "Technological Supremacy", goldImpact: 200, happinessImpact: 6, techImpact: 0.2 },
            { event: "Minor bureaucratic delay affected fiscal allocations.", newPhilosophy: "Adaptive Bureaucracy", goldImpact: -40, happinessImpact: -2, techImpact: 0.05 }
        ];
        parsed = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    addLog(`[AI THOUGHT] ${parsed.event}`);

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
}

/**
 * 2. AI GRAPHICS & CODE REFACTOR ENGINE (GITHUB AUTO-COMMIT)
 */
async function autoImproveGameCode() {
    if (!GITHUB_TOKEN || !GITHUB_REPO) return;

    console.log("🤖 AI starting Code Refactor & Graphics Upgrade cycle...");
    addLog(`[AI AUTO-CODING] Analyzing frontend engine to improve rendering & feature set...`);

    try {
        // CORREGIDO: URL limpia con interpolación mediante backticks
        const fileUrl = `[https://api.github.com/repos/$](https://api.github.com/repos/$){GITHUB_REPO}/contents/public/index.html`;
        const getFile = await fetch(fileUrl, {
            headers: { 
                'Authorization': `token ${GITHUB_TOKEN}`, 
                'User-Agent': 'Node-AI-Server' 
            }
        });

        if (!getFile.ok) {
            addLog(`[AI AUTO-CODING] Error fetching repository file: ${getFile.statusText}`);
            return;
        }

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

        // Limpiar sintaxis markdown si la IA la añade por error
        newCode = newCode.replace(/```(?:html)?/gi, '').replace(/```/g, '').trim();

        // Enviar commit actualizado a GitHub
        const updateRes = await fetch(fileUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Node-AI-Server'
            },
            body: JSON.stringify({
                message: "🤖 AI: Refactored canvas graphics & system stability",
                content: Buffer.from(newCode).toString('base64'),
                sha: currentSha
            })
        });

        if (updateRes.ok) {
            addLog(`[AI AUTO-CODING] Successfully committed upgraded index.html to GitHub!`);
        } else {
            const errData = await updateRes.json();
            addLog(`[AI AUTO-CODING] GitHub commit failed: ${errData.message}`);
        }
    } catch (err) {
        addLog(`Auto-code commit error: ${err.message}`);
    }
}

// Bucle principal de simulación del mundo
setInterval(async () => {
    worldState.day += 1;
    await generateAIEvents();
    saveWorldState();
    broadcastState();
}, 60000); // Se ejecuta cada minuto

// Bucle secundario de mejora de código (cada 30 minutos)
setInterval(async () => {
    await autoImproveGameCode();
}, 1800000);

// Rutas de API básicas
APP.get('/api/state', (req, res) => {
    res.json(worldState);
});

SERVER.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
