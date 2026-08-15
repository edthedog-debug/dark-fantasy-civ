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
 * GEMINI API - QUERY WITH MODEL FALLBACK
 */
async function queryGemini(prompt) {
    if (!AI_API_KEY) {
        console.error("❌ No GEMINI_API_KEY");
        return null;
    }

    console.log("🔑 API key:", AI_API_KEY.substring(0, 15) + "...");
    
    // Try these models in order
    const models = [
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
        'gemini-1.5-pro',
        'gemini-pro',
        'gemini-1.0-pro'
    ];
    
    for (const model of models) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${AI_API_KEY}`;
        
        console.log(`\n🔍 Probando modelo: ${model}`);
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 8192,
                        topP: 0.95,
                        topK: 40
                    },
                    safetySettings: [
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                    ]
                })
            });
            
            console.log("📊 Status:", response.status);
            
            if (response.ok) {
                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                
                if (text && text.length > 0) {
                    console.log(`✅ ¡Éxito con ${model}!`);
                    console.log("📝 Longitud:", text.length, "caracteres");
                    return text;
                }
            } else if (response.status === 404 || response.status === 403) {
                console.log(`⚠️ ${model} no disponible, probando siguiente...`);
                continue;
            } else if (response.status === 429) {
                console.log("⚠️ Rate limit, esperando 2 segundos...");
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
            } else {
                const errorText = await response.text();
                console.error(`❌ Error ${response.status}:`, errorText.substring(0, 150));
            }
        } catch (e) {
            console.error(`❌ Error con ${model}:`, e.message);
        }
    }
    
    console.error("\n❌ Ningún modelo funcionó");
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
 * 2. AI CODE IMPROVEMENT - FIXED
 */
async function autoImproveGameCode() {
    console.log("\n🤖 AI CODE IMPROVEMENT...");
    addLog("[AI AUTO-CODING] Starting...");

    try {
        const htmlPath = path.join(__dirname, 'public', 'index.html');
        
        if (!fs.existsSync(htmlPath)) {
            console.error("❌ index.html not found");
            addLog("[AI COMMIT ERROR] index.html not found.");
            return;
        }
        
        const currentHtml = fs.readFileSync(htmlPath, 'utf8');
        console.log("📄 Current HTML:", currentHtml.length, "chars");
        
        // Ask Gemini for a specific improvement (easier than full HTML)
        const prompt = `Add particle effects to this HTML canvas game. Return ONLY the JavaScript code for particles that I can add to the existing code. Do NOT return the full HTML.`;
        
        console.log("🔍 Asking Gemini for improvement...");
        const improvement = await queryGemini(prompt);
        
        if (!improvement || improvement.length < 30) {
            console.error("❌ No improvement generated");
            console.error("📝 Response:", improvement?.substring(0, 200) || "empty");
            addLog("[AI COMMIT ERROR] No valid improvement generated.");
            return;
        }
        
        console.log("✅ Improvement generated! Length:", improvement.length);
        console.log("📝 First 150 chars:", improvement.substring(0, 150));
        
        // Clean the code
        let cleanCode = improvement.replace(/```javascript/gi, '').replace(/```/g, '').trim();
        
        // Apply the improvement to the HTML
        let improvedHtml = currentHtml;
        
        // Insert before closing script tag or before closing body
        if (improvedHtml.includes('</script>')) {
            improvedHtml = improvedHtml.replace('</script>', `\n// === AI IMPROVEMENT ===\n${cleanCode}\n</script>`);
        } else if (improvedHtml.includes('</body>')) {
            improvedHtml = improvedHtml.replace('</body>', `<script>\n${cleanCode}\n</script>\n</body>`);
        }
        
        // Write improved HTML
        fs.writeFileSync(htmlPath, improvedHtml);
        console.log("✅ HTML improved! New size:", improvedHtml.length);
        addLog("[AI COMMIT SUCCESS] Code improved with particle effects!");
        
        // Try to push to GitHub
        if (GITHUB_TOKEN) {
            try {
                const cleanToken = GITHUB_TOKEN.trim();
                
                await executeGitCommand('git config --global user.email "ai@example.com"');
                await executeGitCommand('git config --global user.name "AI Auto-Improver"');
                
                const repoUrl = `https://${cleanToken}@github.com/edthedog-debug/dark-fantasy-civ.git`;
                
                try {
                    await executeGitCommand('git rev-parse --is-inside-work-tree');
                    await executeGitCommand(`git remote set-url origin ${repoUrl}`);
                } catch (gitError) {
                    await executeGitCommand(`git clone ${repoUrl} /tmp/repo`);
                    process.chdir('/tmp/repo');
                }
                
                const targetPath = path.join(process.cwd(), 'public', 'index.html');
                fs.copyFileSync(htmlPath, targetPath);
                
                await executeGitCommand('git add public/index.html');
                await executeGitCommand(`git commit -m "🤖 [AI] Added particle effects"`);
                await executeGitCommand('git push origin main');
                
                console.log("✅ Pushed to GitHub!");
            } catch (gitError) {
                console.error("❌ Git push failed:", gitError.message);
            }
        }
        
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
    
    // Test Gemini on startup
    console.log("\n🔍 TESTING GEMINI...");
    queryGemini("Say 'OK' if you can read this")
        .then(response => {
            if (response) {
                console.log("✅ Gemini works! Response:", response.substring(0, 50));
                addLog("[SYSTEM] Gemini connected successfully.");
            } else {
                console.error("❌ Gemini not working");
                addLog("[SYSTEM ERROR] Gemini failed. Create new API key at https://aistudio.google.com/app/apikey");
            }
        });
});