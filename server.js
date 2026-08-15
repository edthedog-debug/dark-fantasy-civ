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
const GITHUB_REPO = process.env.GITHUB_REPO;

APP.use(cors());
APP.use(express.static(path.join(__dirname, 'public')));

const SERVER = http.createServer(APP);
const WSS = new WebSocket.Server({ server: SERVER });
const STATE_FILE = path.join(__dirname, 'worldState.json');
const AI_STATE_FILE = path.join(__dirname, 'aiState.json');

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

// AI State - Track improvements and evolution
let aiState = {
    improvementCount: 0,
    lastImprovementDay: 0,
    aiEra: 1,
    aiComplexity: 1.0,
    aiCapabilities: ["basic_economy", "basic_simulation"],
    evolutionHistory: []
};

// Load world state
if (fs.existsSync(STATE_FILE)) {
    try {
        const rawData = fs.readFileSync(STATE_FILE, 'utf8');
        worldState = JSON.parse(rawData);
    } catch (e) {
        console.error("Error loading state file:", e);
    }
}

// Load AI state
if (fs.existsSync(AI_STATE_FILE)) {
    try {
        const rawData = fs.readFileSync(AI_STATE_FILE, 'utf8');
        aiState = JSON.parse(rawData);
        console.log("✅ AI State loaded - Improvements:", aiState.improvementCount);
    } catch (e) {
        console.error("Error loading AI state file:", e);
    }
}

function saveWorldState() {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(worldState, null, 2));
    } catch (err) {
        console.error("Error saving state:", err);
    }
}

function saveAIState() {
    try {
        fs.writeFileSync(AI_STATE_FILE, JSON.stringify(aiState, null, 2));
    } catch (err) {
        console.error("Error saving AI state:", err);
    }
}

function broadcastState() {
    const payload = JSON.stringify({ 
        type: 'WORLD_UPDATE', 
        data: worldState,
        aiState: aiState 
    });
    WSS.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

function addLog(msg) {
    const time = new Date().toLocaleTimeString();
    worldState.logs.push("[" + time + "] " + msg);
    if (worldState.logs.length > 25) worldState.logs.shift();
}

/**
 * GEMINI API - SIMPLIFIED - ALWAYS RETURNS SOMETHING
 */
async function queryGemini(prompt) {
    if (!AI_API_KEY) {
        console.error("❌ No GEMINI_API_KEY");
        return "// No API key - using default improvement\nconsole.log('AI System active');";
    }

    console.log("🔑 Key:", AI_API_KEY.substring(0, 10) + "...");
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${AI_API_KEY}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048
                }
            })
        });
        
        console.log("📊 Status:", response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log("📦 Full response:", JSON.stringify(data).substring(0, 500));
            
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (text && text.length > 0) {
                console.log("✅ Text:", text.substring(0, 200));
                return text;
            }
        } else {
            const errorText = await response.text();
            console.error("❌ Error:", response.status, errorText.substring(0, 300));
        }
    } catch (e) {
        console.error("❌ Fetch error:", e.message);
    }
    
    // ALWAYS return something
    return "// Gemini unavailable - using fallback improvement\nconsole.log('Dark Fantasy System - Day " + worldState.day + "');";
}

/**
 * 1. AI GENERATIVE EVENTS
 */
async function generateAIEvents() {
    const prompt = "Generate a dark fantasy civilization event. Return ONLY JSON: {\"event\":\"description\",\"newPhilosophy\":\"name\",\"goldImpact\":number,\"happinessImpact\":number,\"techImpact\":number}";
    
    let parsed = null;

    try {
        const rawText = await queryGemini(prompt);
        if (rawText && !rawText.startsWith("//")) {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    parsed = JSON.parse(jsonMatch[0]);
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
 * 2. AI CODE IMPROVEMENT - ALWAYS WORKS - INFINITE IMPROVEMENTS
 */
async function autoImproveGameCode() {
    console.log("\n🤖 AI CODE IMPROVEMENT...");
    addLog("[AI AUTO-CODING] Applying AI improvement...");

    try {
        const htmlPath = path.join(__dirname, 'public', 'index.html');
        
        if (!fs.existsSync(htmlPath)) {
            console.error("❌ index.html not found");
            addLog("[AI COMMIT ERROR] index.html not found.");
            return;
        }
        
        const currentHtml = fs.readFileSync(htmlPath, 'utf8');
        console.log("📄 Current HTML:", currentHtml.length, "chars");
        
        // Ask for improvement based on AI evolution level
        const prompt = `Generate a NEW unique JavaScript function that adds a visual effect to a canvas game. 
                       AI Evolution Level: ${aiState.aiEra}
                       Complexity: ${aiState.aiComplexity}
                       Previous improvements: ${aiState.improvementCount}
                       Return ONLY the code. Make it more complex than previous improvements.`;
        
        console.log("🔍 Asking Gemini...");
        const aiResponse = await queryGemini(prompt);
        
        console.log("✅ Got response! Length:", aiResponse.length);
        console.log("📝 Content:", aiResponse.substring(0, 200));
        
        // Clean the response
        let codeToAdd = aiResponse.replace(/```javascript/gi, '').replace(/```js/gi, '').replace(/```/g, '').trim();
        
        // If it's too short, add a default
        if (codeToAdd.length < 10) {
            codeToAdd = `// AI improvement #${aiState.improvementCount + 1}\nconsole.log('Dark Fantasy System improved to Era ${aiState.aiEra}');`;
        }
        
        // Apply to HTML
        let improvedHtml = currentHtml;
        const improvementBlock = `\n// === AI IMPROVEMENT #${aiState.improvementCount + 1} (Day ${worldState.day} - AI Era ${aiState.aiEra}) ===\n${codeToAdd}\n`;
        
        if (improvedHtml.includes('</script>')) {
            improvedHtml = improvedHtml.replace('</script>', improvementBlock + '</script>');
        } else if (improvedHtml.includes('</body>')) {
            improvedHtml = improvedHtml.replace('</body>', `<script>${improvementBlock}</script>\n</body>`);
        } else {
            improvedHtml += `\n<script>${improvementBlock}</script>`;
        }
        
        // Write improved HTML
        fs.writeFileSync(htmlPath, improvedHtml);
        console.log("✅ HTML improved! New size:", improvedHtml.length);
        addLog("[AI COMMIT SUCCESS] Code improved!");
        
        // Update AI State
        aiState.improvementCount++;
        aiState.lastImprovementDay = worldState.day;
        aiState.aiComplexity *= 1.1; // Increase complexity by 10% each time
        
        // Evolve AI Era every 10 improvements
        if (aiState.improvementCount % 10 === 0) {
            aiState.aiEra++;
            aiState.aiCapabilities.push(`advanced_system_${aiState.aiEra}`);
            worldState.era = `Aetheric Civilization Era ${aiState.aiEra + 1}`;
            
            aiState.evolutionHistory.push({
                day: worldState.day,
                era: aiState.aiEra,
                improvements: aiState.improvementCount,
                complexity: aiState.aiComplexity
            });
            
            addLog(`[AI EVOLUTION] AI evolved to Era ${aiState.aiEra}!`);
        }
        
        // Save AI state
        saveAIState();
        
        // Push to GitHub
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
                await executeGitCommand(`git commit -m "🤖 [AI] Improvement #${aiState.improvementCount} - Day ${worldState.day} - Era ${aiState.aiEra}"`);
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

// ASYNC SIMULATION TICK
async function runSimulationTick() {
    worldState.day += 1;

    // AI Evolution affects world
    const aiBonus = aiState.aiEra * 0.1; // AI improves world systems
    worldState.techPower += aiBonus;

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

    if (worldState.treasury > 1500 && worldState.day % 20 === 0) {
        worldState.treasury -= 400;
        worldState.techPower += 0.2;
        worldState.happiness = Math.min(100, worldState.happiness + 4);
        addLog("[ECONOMY] Reinvested 400 Gold into Tech R&D and Public Services.");
    }

    if (worldState.treasury > 2500 && worldState.tanks < 12 && worldState.day % 25 === 0) {
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

    // AI Event every 30 days
    if (worldState.day % 30 === 0) {
        await generateAIEvents();
    }

    // Code improvement every 50 days - INFINITE
    if (worldState.day % 50 === 0) {
        const patch = Math.floor(Math.random() * 9) + 1;
        worldState.engineBuild = `v${aiState.aiEra + 2}.${patch}.0-Gemini-2.5-Era${aiState.aiEra}`;
        
        // Update era name based on AI evolution
        if (aiState.aiEra > 1) {
            worldState.era = `Transcendent Civilization Era ${aiState.aiEra + 1}`;
        }
        
        await autoImproveGameCode();
    }

    saveWorldState();
    broadcastState();
}

setInterval(runSimulationTick, 4000);

WSS.on('connection', (ws) => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ 
            type: 'WORLD_UPDATE', 
            data: worldState,
            aiState: aiState 
        }));
    }
});

SERVER.listen(PORT, () => {
    console.log("🚀 Dark Fantasy Civilization active on port " + PORT);
    console.log(`📊 AI Evolution System initialized - Era ${aiState.aiEra}, ${aiState.improvementCount} improvements`);
    
    queryGemini("Say 'OK'")
        .then(response => {
            console.log("✅ Gemini response:", response.substring(0, 100));
            addLog("[SYSTEM] AI System ready. Continuing evolution from Day " + worldState.day);
        });
});