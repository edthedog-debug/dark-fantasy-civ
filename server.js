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
    aiImprovements: 0,
    logs: [
        "[" + new Date().toLocaleTimeString() + "] Autonomous Cloud Engine Initialized."
    ]
};

if (fs.existsSync(STATE_FILE)) {
    try {
        const rawData = fs.readFileSync(STATE_FILE, 'utf8');
        const savedState = JSON.parse(rawData);
        // Merge saved state with defaults to ensure new fields exist
        worldState = { ...worldState, ...savedState };
        console.log("✅ State loaded - Day:", worldState.day, "AI Improvements:", worldState.aiImprovements);
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
    if (worldState.logs.length > 50) worldState.logs.shift();
}

/**
 * GEMINI API - FIXED - Returns null on failure
 */
async function queryGemini(prompt) {
    if (!AI_API_KEY) {
        console.error("❌ No GEMINI_API_KEY");
        return null;
    }

    console.log("🔑 Key:", AI_API_KEY.substring(0, 10) + "...");
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${AI_API_KEY}`;
    
    try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 4096
                }
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
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
    
    // Return null on failure
    return null;
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
 * 1. AI GENERATIVE EVENTS
 */
async function generateAIEvents() {
    const prompt = "Generate a dark fantasy civilization event based on current state. Return ONLY JSON: {\"event\":\"description\",\"newPhilosophy\":\"name\",\"goldImpact\":number,\"happinessImpact\":number,\"techImpact\":number}";
    
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
            { event: "Goblin uprising affected resource gathering.", newPhilosophy: "Military Discipline", goldImpact: -60, happinessImpact: -8, techImpact: 0.05 },
            { event: "Ancient ruins revealed forgotten technologies.", newPhilosophy: "Archaeological Innovation", goldImpact: 300, happinessImpact: 10, techImpact: 0.4 },
            { event: "Mystical plague struck the population.", newPhilosophy: "Medical Research", goldImpact: -100, happinessImpact: -15, techImpact: 0.3 }
        ];
        parsed = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    addLog("[AI EVENT] " + parsed.event);
    
    if (parsed.newPhilosophy) worldState.philosophy = parsed.newPhilosophy;
    if (typeof parsed.goldImpact === 'number') worldState.treasury = Math.max(0, worldState.treasury + parsed.goldImpact);
    if (typeof parsed.happinessImpact === 'number') worldState.happiness = Math.min(100, Math.max(10, worldState.happiness + parsed.happinessImpact));
    if (typeof parsed.techImpact === 'number') worldState.techPower += Math.max(0, parsed.techImpact);
    
    // Update era based on tech power
    if (worldState.techPower > 50) {
        worldState.era = "Transcendent AI Era " + Math.floor(worldState.techPower / 10);
    } else if (worldState.techPower > 20) {
        worldState.era = "Advanced Magitech Era";
    } else if (worldState.techPower > 10) {
        worldState.era = "Industrial Magic Era";
    } else if (worldState.techPower > 5) {
        worldState.era = "Renaissance Arcana";
    }
}

/**
 * 2. AI CODE IMPROVEMENT - IMPROVES BOTH HTML DESIGN AND FUNCTIONALITY
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
        
        // Alternate between different types of improvements
        const improvementType = worldState.aiImprovements % 3;
        
        let prompt;
        let codeToAdd;
        
        switch(improvementType) {
            case 0: // CSS/Design improvement
                prompt = `Improve the visual design of this dark fantasy civilization game. 
                Current stats: Day ${worldState.day}, Population: ${worldState.population}, Tech: ${worldState.techPower}.
                Era: ${worldState.era}
                Return ONLY CSS code that enhances the visual appearance, adds animations, or improves the layout.
                Make it dark fantasy themed with mystical elements.`;
                break;
                
            case 1: // JavaScript functionality
                prompt = `Add new interactive functionality to this dark fantasy civilization game.
                Current stats: Day ${worldState.day}, Population: ${worldState.population}, Tech: ${worldState.techPower}.
                Return ONLY JavaScript code that adds new features, animations, or gameplay mechanics.`;
                break;
                
            case 2: // UI/HTML structure improvement
                prompt = `Add new UI elements to this dark fantasy civilization game.
                Current stats: Day ${worldState.day}, Era: ${worldState.era}, Treasury: ${worldState.treasury}.
                Return ONLY HTML code that adds new displays, panels, or information widgets.
                Make it thematically appropriate for a dark fantasy setting.`;
                break;
        }
        
        console.log("🔍 Asking Gemini for", improvementType === 0 ? "CSS" : improvementType === 1 ? "JavaScript" : "HTML", "improvement...");
        const aiResponse = await queryGemini(prompt);
        
        // Check if AI response is valid
        if (aiResponse && !aiResponse.startsWith("//") && aiResponse.length > 20) {
            console.log("✅ Got valid AI response! Length:", aiResponse.length);
            console.log("📝 Content:", aiResponse.substring(0, 200));
            
            // Clean the response
            codeToAdd = aiResponse.replace(/```css/gi, '').replace(/```javascript/gi, '').replace(/```html/gi, '').replace(/```js/gi, '').replace(/```/g, '').trim();
        } else {
            console.log("⚠️ AI failed, using elaborate fallback");
            codeToAdd = null;
        }
        
        // If AI failed or code is too short, use elaborate fallback
        if (!codeToAdd || codeToAdd.length < 10) {
            if (improvementType === 0) {
                codeToAdd = `
/* AI Design Improvement - Dark Fantasy Theme - Day ${worldState.day} */
body {
    background: linear-gradient(135deg, #1a0a0a 0%, #2a1a1a 50%, #1a0a0a 100%);
    color: #d4c5a0;
    font-family: 'Cinzel', 'MedievalSharp', serif;
    text-shadow: 0 0 10px rgba(212, 197, 160, 0.5);
}

.stats-panel {
    background: rgba(20, 10, 10, 0.8);
    border: 2px solid #8b6914;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 0 20px rgba(139, 105, 20, 0.5);
    animation: glow 3s ease-in-out infinite;
}

@keyframes glow {
    0%, 100% { box-shadow: 0 0 20px rgba(139, 105, 20, 0.5); }
    50% { box-shadow: 0 0 40px rgba(139, 105, 20, 0.8); }
}`;
            } else if (improvementType === 1) {
                codeToAdd = `
// AI Functionality Improvement - Day ${worldState.day}
function createMagicEffect() {
    const effect = document.createElement('div');
    effect.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:200px;height:200px;background:radial-gradient(circle,rgba(139,105,20,0.6),transparent);border-radius:50%;pointer-events:none;z-index:9999;animation:magicPulse 2s ease-out infinite;';
    document.body.appendChild(effect);
    
    const style = document.createElement('style');
    style.textContent = '@keyframes magicPulse { 0% { transform:translate(-50%,-50%) scale(0); opacity:1; } 100% { transform:translate(-50%,-50%) scale(3); opacity:0; } }';
    document.head.appendChild(style);
}
createMagicEffect();`;
            } else {
                codeToAdd = `
<div class="ai-panel" style="position:fixed;bottom:20px;right:20px;background:rgba(20,10,10,0.9);border:1px solid #8b6914;border-radius:10px;padding:15px;z-index:9998;">
    <h4 style="color:#ffd700;margin:0 0 10px 0;">⚔️ AI Enhancement #${worldState.aiImprovements + 1}</h4>
    <p style="color:#d4c5a0;margin:5px 0;">Era: ${worldState.era}</p>
    <p style="color:#d4c5a0;margin:5px 0;">Tech Power: ${worldState.techPower.toFixed(2)}</p>
    <p style="color:#d4c5a0;margin:5px 0;">Population: ${worldState.population}</p>
</div>`;
            }
        }
        
        // Apply to HTML based on type
        let improvedHtml = currentHtml;
        
        if (improvementType === 0) {
            // CSS improvement
            const cssBlock = `\n<!-- === AI CSS IMPROVEMENT (Day ${worldState.day}) === -->\n<style>\n${codeToAdd}\n</style>\n`;
            if (improvedHtml.includes('</head>')) {
                improvedHtml = improvedHtml.replace('</head>', cssBlock + '</head>');
            } else {
                improvedHtml = cssBlock + improvedHtml;
            }
        } else if (improvementType === 1) {
            // JavaScript improvement
            const jsBlock = `\n<!-- === AI JS IMPROVEMENT (Day ${worldState.day}) === -->\n<script>\n${codeToAdd}\n</script>\n`;
            if (improvedHtml.includes('</body>')) {
                improvedHtml = improvedHtml.replace('</body>', jsBlock + '</body>');
            } else {
                improvedHtml += jsBlock;
            }
        } else {
            // HTML structure improvement
            const htmlBlock = `\n<!-- === AI HTML IMPROVEMENT (Day ${worldState.day}) === -->\n${codeToAdd}\n`;
            if (improvedHtml.includes('</body>')) {
                improvedHtml = improvedHtml.replace('</body>', htmlBlock + '</body>');
            } else {
                improvedHtml += htmlBlock;
            }
        }
        
        // Write improved HTML
        fs.writeFileSync(htmlPath, improvedHtml);
        console.log("✅ HTML improved! New size:", improvedHtml.length);
        
        worldState.aiImprovements += 1;
        const improvementTypeName = improvementType === 0 ? "CSS Design" : improvementType === 1 ? "JavaScript Functionality" : "HTML Structure";
        addLog(`[AI COMMIT SUCCESS] ${improvementTypeName} improved! Total: ${worldState.aiImprovements}`);
        
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
                
                // Also save the world state
                const stateTargetPath = path.join(process.cwd(), 'worldState.json');
                fs.copyFileSync(STATE_FILE, stateTargetPath);
                
                await executeGitCommand('git add public/index.html worldState.json');
                await executeGitCommand(`git commit -m "🤖 [AI] ${improvementTypeName} - Day ${worldState.day}"`);
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

// ASYNC SIMULATION TICK - Non-blocking version
function runSimulationTick() {
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

    // AI Event every 30 days (non-blocking)
    if (worldState.day % 30 === 0) {
        generateAIEvents().catch(err => console.error("AI Event error:", err));
    }

    // Code improvement every 50 days (non-blocking)
    if (worldState.day % 50 === 0) {
        const patch = Math.floor(Math.random() * 9) + 1;
        worldState.engineBuild = "v2." + patch + ".0-Gemini-2.5";
        autoImproveGameCode().catch(err => console.error("AI Improvement error:", err));
    }

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
    console.log("🚀 Dark Fantasy Civilization active on port " + PORT);
    console.log("📊 Current state - Day:", worldState.day, "AI Improvements:", worldState.aiImprovements);
    
    queryGemini("Say 'OK'")
        .then(response => {
            if (response) {
                console.log("✅ Gemini response:", response.substring(0, 100));
                addLog("[SYSTEM] AI System ready.");
            } else {
                console.log("⚠️ Gemini not responding, using fallbacks");
                addLog("[SYSTEM] AI System in fallback mode.");
            }
        });
});