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
 * 2. AI GRAPHICS & CODE REFACTOR ENGINE - TESTING WITHOUT AUTH FIRST
 */
async function autoImproveGameCode() {
    console.log("🤖 AI starting Code Refactor & Graphics Upgrade cycle...");
    addLog("[AI AUTO-CODING] Analyzing frontend engine to improve rendering & feature set...");

    try {
        const cleanRepo = GITHUB_REPO ? GITHUB_REPO.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '') : 'edthedog-debug/dark-fantasy-civ';
        const cleanToken = GITHUB_TOKEN ? GITHUB_TOKEN.trim() : '';
        
        console.log("📦 Using repository:", cleanRepo);
        console.log("🔑 Token available:", cleanToken ? "Yes (starts with " + cleanToken.substring(0, 7) + "...)" : "No");
        
        // Test 1: Without authentication (for public repos)
        console.log("🔍 Test 1: Accessing without authentication...");
        let response = await fetch(`https://api.github.com/repos/${cleanRepo}/contents/public/index.html`, {
            headers: {
                'User-Agent': 'Node-AI-Server',
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        let fileData = null;
        
        if (response.ok) {
            fileData = await response.json();
            console.log("✅ Success without authentication!");
        } else {
            console.log("⚠️ Without auth failed with status:", response.status);
            
            // Test 2: With Bearer token
            if (cleanToken) {
                console.log("🔍 Test 2: Accessing with Bearer token...");
                response = await fetch(`https://api.github.com/repos/${cleanRepo}/contents/public/index.html`, {
                    headers: {
                        'Authorization': `Bearer ${cleanToken}`,
                        'User-Agent': 'Node-AI-Server',
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (response.ok) {
                    fileData = await response.json();
                    console.log("✅ Success with Bearer token!");
                } else {
                    console.log("⚠️ Bearer token failed with status:", response.status);
                    
                    // Test 3: With token keyword
                    console.log("🔍 Test 3: Accessing with token keyword...");
                    response = await fetch(`https://api.github.com/repos/${cleanRepo}/contents/public/index.html`, {
                        headers: {
                            'Authorization': `token ${cleanToken}`,
                            'User-Agent': 'Node-AI-Server',
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    });
                    
                    if (response.ok) {
                        fileData = await response.json();
                        console.log("✅ Success with token keyword!");
                    } else {
                        console.log("⚠️ Token keyword failed with status:", response.status);
                        
                        // Test 4: Try to list repository root
                        console.log("🔍 Test 4: Listing repository root...");
                        response = await fetch(`https://api.github.com/repos/${cleanRepo}/contents/`, {
                            headers: {
                                'User-Agent': 'Node-AI-Server',
                                'Accept': 'application/vnd.github.v3+json'
                            }
                        });
                        
                        if (response.ok) {
                            const contents = await response.json();
                            console.log("📁 Repository contents:", contents.map(c => c.name).join(', '));
                        } else {
                            console.log("❌ Cannot list repository contents. Status:", response.status);
                        }
                    }
                }
            }
        }
        
        if (!fileData || !fileData.sha) {
            console.error("❌ Could not access file with any method");
            addLog("[AI COMMIT ERROR] Could not access index.html. Check if repository is public and file exists.");
            return;
        }
        
        const currentSha = fileData.sha;
        console.log("✅ File accessed successfully!");
        console.log("📝 SHA:", currentSha);
        console.log("📄 Path:", fileData.path);
        console.log("📊 Size:", fileData.size, "bytes");

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
        const updatedContentBase64 = Buffer.from(newCode).toString('base64');
        
        console.log("📝 Committing changes...");
        
        // Try commit with token if available
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Node-AI-Server',
            'Accept': 'application/vnd.github.v3+json'
        };
        
        if (cleanToken) {
            headers['Authorization'] = `Bearer ${cleanToken}`;
        }
        
        const commitResponse = await fetch(`https://api.github.com/repos/${cleanRepo}/contents/public/index.html`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({
                message: "🤖 [AI Auto-Upgrade] Refactored frontend engine to " + worldState.engineBuild,
                content: updatedContentBase64,
                sha: currentSha
            })
        });

        if (commitResponse.ok) {
            addLog("[AI COMMIT SUCCESS] Pushed graphics & engine improvements to GitHub!");
            console.log("✅ Commit successful!");
        } else {
            const commitErr = await commitResponse.json().catch(() => ({}));
            console.error("❌ Commit failed:", commitResponse.status, commitErr);
            addLog(`[AI COMMIT ERROR] GitHub PUT failed (${commitResponse.status}): ${commitErr.message || 'Unknown error'}`);
        }
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