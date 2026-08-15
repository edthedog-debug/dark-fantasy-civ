const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { exec } = require('child_process');
const https = require('https');

const APP = express();
const PORT = process.env.PORT || 3000;

// ENVIRONMENT VARIABLES (Configured in Render)
const AI_API_KEY = process.env.GEMINI_API_KEY; 
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;

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
 * GEMINI API - DETAILED DEBUG
 */
async function queryGemini(prompt) {
    if (!AI_API_KEY) {
        console.error("❌ No GEMINI_API_KEY");
        console.error("📋 Create one at: https://aistudio.google.com/app/apikey");
        return null;
    }

    console.log("🔑 API key:", AI_API_KEY.substring(0, 20) + "...");
    console.log("🔑 Key length:", AI_API_KEY.length);
    console.log("🔑 Key starts with AIza:", AI_API_KEY.startsWith('AIza'));
    
    // Try the simplest possible request
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${AI_API_KEY}`;
    
    console.log("\n🔍 Trying simple request to gemini-2.0-flash...");
    console.log("📍 URL:", url.replace(AI_API_KEY, "***"));
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });
        
        console.log("📊 Status:", response.status);
        
        const responseText = await response.text();
        console.log("📝 Raw response:", responseText.substring(0, 500));
        
        if (response.ok) {
            try {
                const data = JSON.parse(responseText);
                console.log("📦 Response keys:", Object.keys(data));
                
                // Check different response formats
                if (data.candidates && data.candidates[0]) {
                    console.log("📦 Candidate keys:", Object.keys(data.candidates[0]));
                    
                    if (data.candidates[0].content) {
                        console.log("📦 Content keys:", Object.keys(data.candidates[0].content));
                        
                        if (data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
                            console.log("📦 Part keys:", Object.keys(data.candidates[0].content.parts[0]));
                            console.log("📝 Text:", data.candidates[0].content.parts[0].text);
                            return data.candidates[0].content.parts[0].text;
                        }
                    }
                    
                    // Try other formats
                    if (data.candidates[0].output) {
                        console.log("📝 Output:", data.candidates[0].output);
                        return data.candidates[0].output;
                    }
                }
                
                // Try direct text
                if (data.text) {
                    console.log("📝 Direct text:", data.text);
                    return data.text;
                }
                
                console.error("❌ No text found in response");
                console.error("📦 Full response:", JSON.stringify(data, null, 2));
                
            } catch (parseError) {
                console.error("❌ JSON parse error:", parseError.message);
                console.error("📝 Raw:", responseText.substring(0, 500));
            }
        } else {
            console.error("❌ HTTP error:", response.status);
            console.error("📝 Error body:", responseText.substring(0, 500));
        }
    } catch (e) {
        console.error("❌ Fetch error:", e.message);
    }
    
    return null;
}

/**
 * 1. AI GENERATIVE NARRATIVE, ECONOMY & PHILOSOPHY ENGINE
 */
async function generateAIEvents() {
    const prompt = "Generate a random event for a dark fantasy civilization. Return ONLY JSON: {\"event\":\"description\",\"newPhilosophy\":\"name\",\"goldImpact\":number,\"happinessImpact\":number,\"techImpact\":number}";
    
    let parsed = null;

    try {
        const rawText = await queryGemini(prompt);
        if (rawText) {
            console.log("📝 Raw response:", rawText.substring(0, 300));
            
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    parsed = JSON.parse(jsonMatch[0]);
                    console.log("✅ Evento:", parsed.event);
                } catch (parseError) {
                    console.error("❌ Parse error:", parseError.message);
                }
            }
        }
    } catch (err) {
        console.error("❌ Error:", err.message);
    }

    if (!parsed || !parsed.event) {
        console.log("⚠️ Usando fallback");
        const fallbacks = [
            { event: "Ancient dragon discovered new trade routes.", newPhilosophy: "Draconic Commerce", goldImpact: 150, happinessImpact: 5, techImpact: 0.15 },
            { event: "Dark wizards optimized mana distribution.", newPhilosophy: "Arcane Efficiency", goldImpact: 250, happinessImpact: 7, techImpact: 0.25 },
            { event: "Goblin uprising affected resource gathering.", newPhilosophy: "Military Discipline", goldImpact: -60, happinessImpact: -8, techImpact: 0.05 }
        ];
        parsed = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    addLog("[AI EVENT] " + parsed.event);
    
    if (parsed.newPhilosophy) worldState.philosophy = parsed.newPhilosophy;
    if (typeof parsed.goldImpact === 'number') worldState.treasury = Math.max(0, worldState.treasury + parsed.goldImpact);
    if (typeof parsed.happinessImpact === 'number') worldState.happiness = Math.min(100, Math.max(10, worldState.happiness + parsed.happinessImpact));
    if (typeof parsed.techImpact === 'number') worldState.techPower += Math.max(0, parsed.techImpact);
}

/**
 * Execute git command
 */
function executeGitCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

/**
 * 2. AI CODE IMPROVEMENT - SIMPLIFIED
 */
async function autoImproveGameCode() {
    console.log("\n🤖 AI CODE IMPROVEMENT...");
    addLog("[AI AUTO-CODING] Starting...");

    try {
        const htmlPath = path.join(__dirname, 'public', 'index.html');
        
        if (!fs.existsSync(htmlPath)) {
            console.error("❌ index.html not found");
            return;
        }
        
        const currentHtml = fs.readFileSync(htmlPath, 'utf8');
        console.log("📄 Current HTML:", currentHtml.length, "chars");
        
        // Ask Gemini for a simple improvement
        const prompt = "Write JavaScript code to add floating particles to a canvas. Return only the code.";
        
        console.log("🔍 Asking Gemini...");
        const improvement = await queryGemini(prompt);
        
        if (!improvement) {
            console.error("❌ Gemini returned no improvement");
            addLog("[AI COMMIT ERROR] Gemini returned empty response. Check API key.");
            return;
        }
        
        console.log("✅ Got improvement! Length:", improvement.length);
        
        // Apply whatever Gemini returned
        let improvedHtml = currentHtml;
        const codeToAdd = improvement.replace(/```/g, '').trim();
        
        if (improvedHtml.includes('</script>')) {
            improvedHtml = improvedHtml.replace('</script>', `\n// AI Improvement\n${codeToAdd}\n</script>`);
        }
        
        fs.writeFileSync(htmlPath, improvedHtml);
        console.log("✅ HTML updated!");
        addLog("[AI COMMIT SUCCESS] Code improved!");
        
    } catch (err) {
        console.error("Error:", err.message);
        addLog(`[AI COMMIT ERROR] ${err.message}`);
    }
}

// ASYNC SIMULATION TICK (unchanged)
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
        worldState.engineBuild = "v2." + patch + ".0-Gemini-AI";
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
    console.log("🚀 Server active on port " + PORT);
    console.log("\n═══════════════════════════════════════");
    console.log("🔍 GEMINI DIAGNOSTIC TEST");
    console.log("═══════════════════════════════════════\n");
    
    queryGemini("Say 'OK'")
        .then(response => {
            if (response) {
                console.log("\n✅ GEMINI WORKS!");
                console.log("📝 Response:", response);
                addLog("[SYSTEM] Gemini connected successfully.");
            } else {
                console.log("\n❌ GEMINI FAILED");
                console.log("\n📋 TROUBLESHOOTING:");
                console.log("1. Check API key is correct (starts with AIza...)");
                console.log("2. Go to: https://aistudio.google.com/app/apikey");
                console.log("3. Create NEW API key");
                console.log("4. Make sure project is: gen-lang-client-0370706376");
                console.log("5. Update GEMINI_API_KEY in Render");
                console.log("6. Restart service");
                addLog("[SYSTEM ERROR] Gemini failed. Create new API key.");
            }
        });
});