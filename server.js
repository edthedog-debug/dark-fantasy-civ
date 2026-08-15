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
 * GEMINI REST API HELPER - DIAGNOSTIC VERSION
 */
async function queryGemini(prompt) {
    if (!AI_API_KEY) {
        console.error("❌ GEMINI_API_KEY is not set");
        return null;
    }

    console.log("🔑 Gemini API Key:", AI_API_KEY.substring(0, 8) + "..." + AI_API_KEY.substring(AI_API_KEY.length - 4));
    console.log("🔑 Key length:", AI_API_KEY.length);
    
    // Try different API versions and models
    const attempts = [
        {
            name: "v1beta-gemini-1.5-flash",
            url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
            model: "gemini-1.5-flash"
        },
        {
            name: "v1-gemini-1.5-flash",
            url: `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent`,
            model: "gemini-1.5-flash"
        },
        {
            name: "v1beta-gemini-1.0-pro",
            url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent`,
            model: "gemini-1.0-pro"
        },
        {
            name: "v1-gemini-pro",
            url: `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent`,
            model: "gemini-pro"
        }
    ];

    for (const attempt of attempts) {
        console.log(`\n🔍 Trying: ${attempt.name}`);
        console.log(`📍 URL: ${attempt.url}`);
        
        try {
            const response = await fetch(`${attempt.url}?key=${AI_API_KEY}`, {
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
                        maxOutputTokens: 8192,
                        topP: 0.8,
                        topK: 10
                    }
                })
            });

            console.log(`📊 Status: ${response.status}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log("✅ Response received!");
                console.log("📦 Response keys:", Object.keys(data));
                
                // Extract text from different possible response formats
                let text = null;
                
                if (data.candidates && data.candidates[0]) {
                    console.log("📦 Candidate keys:", Object.keys(data.candidates[0]));
                    
                    if (data.candidates[0].content) {
                        console.log("📦 Content keys:", Object.keys(data.candidates[0].content));
                        
                        if (data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
                            console.log("📦 Parts keys:", Object.keys(data.candidates[0].content.parts[0]));
                            text = data.candidates[0].content.parts[0].text;
                        }
                    }
                    
                    if (!text && data.candidates[0].output) {
                        text = data.candidates[0].output;
                    }
                }
                
                if (text && text.length > 0) {
                    console.log("✅ Extracted text length:", text.length);
                    console.log("📝 First 100 chars:", text.substring(0, 100));
                    return text;
                } else {
                    console.error("❌ No text extracted from response");
                    console.error("📦 Full response:", JSON.stringify(data).substring(0, 500));
                }
            } else {
                const errorText = await response.text();
                console.error(`❌ Error ${response.status}:`, errorText.substring(0, 300));
                
                // Check for specific error types
                if (response.status === 400) {
                    console.error("❌ Bad Request - Check API key and model name");
                } else if (response.status === 401) {
                    console.error("❌ Unauthorized - API key is invalid");
                } else if (response.status === 403) {
                    console.error("❌ Forbidden - API key doesn't have access to this model");
                } else if (response.status === 404) {
                    console.error("❌ Not Found - Model doesn't exist");
                } else if (response.status === 429) {
                    console.error("❌ Rate Limited - Too many requests");
                }
            }
        } catch (e) {
            console.error(`❌ Fetch error with ${attempt.name}:`, e.message);
        }
    }

    console.error("\n❌ All Gemini API attempts failed");
    return null;
}

/**
 * 1. AI GENERATIVE NARRATIVE, ECONOMY & PHILOSOPHY ENGINE
 */
async function generateAIEvents() {
    console.log("\n🎭 GENERATING AI EVENTS...");
    
    const prompt = `Generate a random event for a dark fantasy civilization simulator. 
    Return ONLY a JSON object with this exact format:
    {
        "event": "brief event description",
        "newPhilosophy": "philosophy name",
        "goldImpact": number,
        "happinessImpact": number,
        "techImpact": number
    }`;
    
    let parsed = null;

    try {
        const rawText = await queryGemini(prompt);
        if (rawText) {
            console.log("📝 Raw response:", rawText);
            
            // Try to find JSON in the response
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    parsed = JSON.parse(jsonMatch[0]);
                    console.log("✅ Successfully parsed JSON:", parsed);
                } catch (parseError) {
                    console.error("❌ JSON parse error:", parseError.message);
                    console.error("📝 Attempted to parse:", jsonMatch[0]);
                }
            } else {
                console.error("❌ No JSON found in response");
            }
        }
    } catch (err) {
        console.error("❌ Error in generateAIEvents:", err.message);
    }

    // Use fallback if parsing failed
    if (!parsed || !parsed.event) {
        console.log("⚠️ Using fallback events");
        const fallbacks = [
            { event: "Ancient dragon discovered new trade routes.", newPhilosophy: "Draconic Commerce", goldImpact: 150, happinessImpact: 5, techImpact: 0.15 },
            { event: "Dark wizards optimized mana distribution.", newPhilosophy: "Arcane Efficiency", goldImpact: 250, happinessImpact: 7, techImpact: 0.25 },
            { event: "Goblin uprising affected resource gathering.", newPhilosophy: "Military Discipline", goldImpact: -60, happinessImpact: -8, techImpact: 0.05 }
        ];
        parsed = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        console.log("📝 Using fallback:", parsed.event);
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
                console.error(`Git command failed: ${command}`);
                console.error(`Error: ${error.message}`);
                console.error(`Stderr: ${stderr}`);
                reject(error);
            } else {
                console.log(`Git command success: ${command}`);
                resolve(stdout);
            }
        });
    });
}

/**
 * 2. AI GRAPHICS & CODE REFACTOR ENGINE - USING GEMINI
 */
async function autoImproveGameCode() {
    console.log("\n🤖 AI CODE IMPROVEMENT CYCLE...");
    addLog("[AI AUTO-CODING] Starting code improvement...");

    try {
        // Read current HTML
        const currentHtmlPath = path.join(__dirname, 'public', 'index.html');
        const currentHtml = fs.readFileSync(currentHtmlPath, 'utf8');
        console.log("📄 Current HTML size:", currentHtml.length, "characters");
        
        // Create prompt for Gemini to improve the code
        const prompt = `Improve this HTML canvas game code. Add better graphics, animations, and visual effects.
        Current code:
        ${currentHtml.substring(0, 5000)}
        
        Requirements:
        1. Keep canvas ID as 'gameCanvas'
        2. Keep WebSocket connection logic
        3. Keep all UI text in English
        4. Add better isometric rendering
        5. Add particle effects
        6. Add day/night cycle
        7. Return ONLY the complete HTML code`;
        
        console.log("🔍 Asking Gemini to improve code...");
        let improvedCode = await queryGemini(prompt);
        
        if (!improvedCode || improvedCode.length < 100) {
            console.error("❌ Gemini failed to generate code");
            addLog("[AI COMMIT ERROR] Gemini API failed. Cannot improve code.");
            return;
        }
        
        // Clean the code
        improvedCode = improvedCode.replace(/```html/gi, '').replace(/```/g, '').trim();
        
        if (improvedCode.length < 500) {
            console.error("❌ Generated code too short:", improvedCode.length);
            addLog("[AI COMMIT ERROR] Generated code too short.");
            return;
        }
        
        console.log("✅ Generated code length:", improvedCode.length, "characters");
        
        // Write to local file
        fs.writeFileSync(currentHtmlPath, improvedCode);
        console.log("✅ Written to local file");
        
        // Push to GitHub
        if (GITHUB_TOKEN) {
            console.log("📤 Pushing to GitHub...");
            
            try {
                const cleanToken = GITHUB_TOKEN.trim();
                
                await executeGitCommand('git config --global user.email "ai@example.com"');
                await executeGitCommand('git config --global user.name "AI Auto-Improver"');
                
                const repoUrl = `https://${cleanToken}@github.com/edthedog-debug/dark-fantasy-civ.git`;
                
                try {
                    await executeGitCommand('git rev-parse --is-inside-work-tree');
                    console.log("✅ Already in git repository");
                    await executeGitCommand(`git remote set-url origin ${repoUrl}`);
                } catch (gitError) {
                    console.log("📁 Cloning repository...");
                    await executeGitCommand(`git clone ${repoUrl} /tmp/repo`);
                    process.chdir('/tmp/repo');
                }
                
                const targetPath = path.join(process.cwd(), 'public', 'index.html');
                fs.copyFileSync(currentHtmlPath, targetPath);
                
                await executeGitCommand('git add public/index.html');
                await executeGitCommand(`git commit -m "🤖 [AI Auto-Upgrade] Improved code to ${worldState.engineBuild}"`);
                await executeGitCommand('git push origin main');
                
                addLog("[AI COMMIT SUCCESS] Pushed improvements to GitHub!");
                console.log("✅ Successfully committed and pushed!");
            } catch (gitError) {
                console.error("❌ Git push failed:", gitError.message);
                addLog(`[AI COMMIT ERROR] Git push failed: ${gitError.message}`);
            }
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
    console.log("🚀 AI Self-Improving Server active on port " + PORT);
    console.log("📝 Checking Gemini API connection...");
    
    // Test Gemini connection on startup
    queryGemini("Say 'OK' if you can read this").then(response => {
        if (response) {
            console.log("✅ Gemini API is working!");
            addLog("[SYSTEM] Gemini API connected successfully.");
        } else {
            console.error("❌ Gemini API is not working. Check your API key.");
            addLog("[SYSTEM ERROR] Gemini API not accessible. Check GEMINI_API_KEY.");
        }
    });
});