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
 * GEMINI REST API HELPER - CORRECTED
 */
async function queryGemini(prompt) {
    if (!AI_API_KEY) {
        console.error("❌ No GEMINI_API_KEY provided");
        return null;
    }

    console.log("🔑 Gemini API Key:", AI_API_KEY.substring(0, 10) + "...");
    
    // Use only gemini-1.5-flash which is more stable
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-001'];
    
    for (const model of models) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${AI_API_KEY}`;
        
        console.log(`🔍 Trying model: ${model}`);
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048,
                    }
                })
            });

            console.log(`📊 ${model} status:`, response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log("✅ Gemini response received");
                
                // Check different response formats
                let text = null;
                
                if (data.candidates && data.candidates[0]) {
                    if (data.candidates[0].content && data.candidates[0].content.parts) {
                        text = data.candidates[0].content.parts[0].text;
                    } else if (data.candidates[0].output) {
                        text = data.candidates[0].output;
                    }
                }
                
                if (text) {
                    console.log("📝 Text length:", text.length);
                    return text;
                } else {
                    console.error("❌ No text in response:", JSON.stringify(data).substring(0, 200));
                }
            } else {
                const errorText = await response.text();
                console.error(`❌ Gemini API error (${response.status}):`, errorText.substring(0, 200));
                
                // If 404, the model doesn't exist
                if (response.status === 404) {
                    console.log("⚠️ Model not found, trying next model...");
                    continue;
                }
            }
        } catch (e) {
            console.error(`❌ Fetch error with ${model}:`, e.message);
        }
    }

    return null;
}

/**
 * 1. AI GENERATIVE NARRATIVE, ECONOMY & PHILOSOPHY ENGINE
 */
async function generateAIEvents() {
    const prompt = "You are the Sovereign AI governing a nation. Return a JSON object with an event description. Format: {\"event\":\"description\",\"newPhilosophy\":\"philosophy\",\"goldImpact\":number,\"happinessImpact\":number,\"techImpact\":number}";
    
    let parsed = null;

    try {
        const rawText = await queryGemini(prompt);
        if (rawText) {
            console.log("📝 Raw response:", rawText.substring(0, 200));
            
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
                console.log("✅ Parsed JSON:", parsed);
            } else {
                console.error("❌ No JSON found in response");
            }
        } else {
            console.error("❌ Gemini returned null");
        }
    } catch (err) {
        console.error("❌ JSON parse error:", err.message);
        parsed = null;
    }

    // Always use fallback if parsing fails
    if (!parsed || !parsed.event) {
        console.log("⚠️ Using fallback events");
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
 * Execute git command
 */
function executeGitCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Git command failed: ${command}`);
                console.error(`Error: ${error.message}`);
                reject(error);
            } else {
                console.log(`Git command success: ${command}`);
                resolve(stdout);
            }
        });
    });
}

/**
 * 2. AI GRAPHICS & CODE REFACTOR ENGINE - FIXED
 */
async function autoImproveGameCode() {
    console.log("🤖 AI starting Code Refactor & Graphics Upgrade cycle...");
    addLog("[AI AUTO-CODING] Analyzing frontend engine to improve rendering & feature set...");

    try {
        const cleanToken = GITHUB_TOKEN ? GITHUB_TOKEN.trim() : '';
        
        // First, generate the improved code
        const prompt = "You are an expert WebGL/Canvas frontend developer. Create a complete HTML file for an autonomous isometric economic empire simulator.\n\n" +
        "REQUIREMENTS:\n" +
        "1. Include a canvas element with ID 'gameCanvas'\n" +
        "2. Include WebSocket connection logic\n" +
        "3. Use English for all UI text\n" +
        "4. Use native HTML5 2D Canvas rendering for isometric buildings and terrain\n" +
        "5. Include mobile touch gesture controls\n" +
        "6. Return ONLY the raw HTML code without markdown syntax";
        
        console.log("🔍 Querying Gemini for code improvements...");
        let newCode = await queryGemini(prompt);
        
        if (!newCode) {
            console.error("❌ Gemini returned empty response");
            addLog("[AI COMMIT ERROR] Gemini API returned empty code. Using fallback.");
            return;
        }
        
        // Clean the code
        newCode = newCode.replace(/```(?:html)?/gi, '').replace(/```/g, '').trim();
        
        if (newCode.length < 100) {
            console.error("❌ Generated code too short:", newCode.length, "characters");
            addLog("[AI COMMIT ERROR] Generated code too short.");
            return;
        }
        
        console.log("✅ Generated code length:", newCode.length, "characters");
        
        // Write to local file first
        const localPath = path.join(__dirname, 'public', 'index.html');
        fs.writeFileSync(localPath, newCode);
        console.log("✅ Written to local file:", localPath);
        
        // Try to push to GitHub using git
        if (cleanToken) {
            console.log("📤 Pushing to GitHub...");
            
            try {
                // Configure git
                await executeGitCommand('git config --global user.email "ai@example.com"');
                await executeGitCommand('git config --global user.name "AI Auto-Improver"');
                
                // Check if git repo exists
                const repoUrl = `https://${cleanToken}@github.com/edthedog-debug/dark-fantasy-civ.git`;
                
                try {
                    await executeGitCommand('git rev-parse --is-inside-work-tree');
                    console.log("✅ Already in git repository");
                    
                    // Update remote
                    await executeGitCommand(`git remote set-url origin ${repoUrl}`);
                } catch (gitError) {
                    console.log("📁 Cloning repository...");
                    await executeGitCommand(`git clone ${repoUrl} /tmp/repo`);
                    process.chdir('/tmp/repo');
                }
                
                // Copy the file
                const targetPath = path.join(process.cwd(), 'public', 'index.html');
                fs.copyFileSync(localPath, targetPath);
                
                // Git operations
                await executeGitCommand('git add public/index.html');
                await executeGitCommand(`git commit -m "🤖 [AI Auto-Upgrade] Refactored frontend engine to ${worldState.engineBuild}"`);
                await executeGitCommand('git push origin main');
                
                addLog("[AI COMMIT SUCCESS] Pushed graphics & engine improvements to GitHub!");
                console.log("✅ Successfully committed and pushed!");
            } catch (gitError) {
                console.error("❌ Git push failed:", gitError.message);
                addLog(`[AI COMMIT ERROR] Git push failed: ${gitError.message}`);
            }
        } else {
            console.log("⚠️ No GitHub token, only local file updated");
            addLog("[AI COMMIT WARNING] No GitHub token, only local file updated");
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