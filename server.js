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
 * 2. AI GRAPHICS & CODE REFACTOR ENGINE (GITHUB AUTO-COMMIT) - ROBUST FIX
 */
async function autoImproveGameCode() {
    if (!GITHUB_TOKEN || !GITHUB_REPO) {
        addLog("[AI COMMIT ERROR] Missing GITHUB_TOKEN or GITHUB_REPO in Render variables.");
        return;
    }

    console.log("🤖 AI starting Code Refactor & Graphics Upgrade cycle...");
    addLog("[AI AUTO-CODING] Analyzing frontend engine to improve rendering & feature set...");

    try {
        const cleanRepo = GITHUB_REPO.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
        const cleanToken = GITHUB_TOKEN.trim(); 
        const apiDomain = 'https://api.github.com/repos/';
        
        // First, verify repository access and get default branch
        const repoUrl = `${apiDomain}${cleanRepo}`;
        console.log("🔍 Testing repository access:", repoUrl);
        
        const repoCheck = await fetch(repoUrl, {
            headers: { 
                'Authorization': `Bearer ${cleanToken}`, 
                'User-Agent': 'Node-AI-Server',
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!repoCheck.ok) {
            const repoError = await repoCheck.json();
            console.error("❌ Repository access failed:", repoCheck.status, repoError.message);
            addLog(`[AI COMMIT ERROR] Repository access failed (${repoCheck.status}): ${repoError.message}`);
            return;
        }
        
        const repoInfo = await repoCheck.json();
        console.log("✅ Repository found:", repoInfo.full_name);
        console.log("📊 Default branch:", repoInfo.default_branch);

        // Try different possible file locations and branches
        const possibleBranches = [repoInfo.default_branch, 'main', 'master'];
        const possiblePaths = [
            'index.html',
            'public/index.html',
            'src/index.html',
            'dist/index.html',
            'frontend/index.html',
            'client/index.html',
            'web/index.html',
            'app/index.html',
            'views/index.html',
            'static/index.html'
        ];
        
        let fileFound = false;
        let currentSha = null;
        let selectedBranch = null;
        let selectedPath = null;

        // Search for the file in different locations and branches
        for (const branch of possibleBranches) {
            for (const filePath of possiblePaths) {
                const getUrl = `${apiDomain}${cleanRepo}/contents/${filePath}?ref=${branch}`;
                console.log(`🔍 Checking: ${filePath} on ${branch} branch`);
                
                const getFile = await fetch(getUrl, {
                    headers: { 
                        'Authorization': `Bearer ${cleanToken}`, 
                        'User-Agent': 'Node-AI-Server',
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (getFile.ok) {
                    const fileData = await getFile.json();
                    if (fileData.type === 'file' && fileData.name === 'index.html') {
                        currentSha = fileData.sha;
                        selectedBranch = branch;
                        selectedPath = filePath;
                        fileFound = true;
                        console.log(`✅ Found index.html at: ${filePath} on ${branch} branch`);
                        break;
                    }
                } else if (getFile.status !== 404) {
                    // If it's not a 404, log the actual error
                    console.error(`⚠️ Error checking ${filePath}:`, getFile.status);
                }
            }
            if (fileFound) break;
        }

        // If file not found directly, try to list repository contents
        if (!fileFound) {
            console.log("🔍 Trying to list repository root contents...");
            const rootUrl = `${apiDomain}${cleanRepo}/contents/?ref=${repoInfo.default_branch}`;
            const rootResponse = await fetch(rootUrl, {
                headers: { 
                    'Authorization': `Bearer ${cleanToken}`, 
                    'User-Agent': 'Node-AI-Server',
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (rootResponse.ok) {
                const rootContents = await rootResponse.json();
                console.log("📁 Repository root contents:", rootContents.map(item => item.name).join(', '));
                
                // Look for public folder
                const publicFolder = rootContents.find(item => item.type === 'dir' && item.name === 'public');
                if (publicFolder) {
                    console.log("🔍 Found public folder, listing its contents...");
                    const publicUrl = `${apiDomain}${cleanRepo}/contents/public?ref=${repoInfo.default_branch}`;
                    const publicResponse = await fetch(publicUrl, {
                        headers: { 
                            'Authorization': `Bearer ${cleanToken}`, 
                            'User-Agent': 'Node-AI-Server',
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    });
                    
                    if (publicResponse.ok) {
                        const publicContents = await publicResponse.json();
                        console.log("📁 Public folder contents:", publicContents.map(item => item.name).join(', '));
                        
                        const indexFile = publicContents.find(item => item.type === 'file' && item.name === 'index.html');
                        if (indexFile) {
                            currentSha = indexFile.sha;
                            selectedBranch = repoInfo.default_branch;
                            selectedPath = 'public/index.html';
                            fileFound = true;
                            console.log(`✅ Found index.html in public folder`);
                        }
                    }
                }
            }
        }

        if (!fileFound || !currentSha) {
            addLog("[AI COMMIT ERROR] GitHub GET failed: Could not locate index.html in repository. Please check file structure.");
            console.error("❌ Available paths checked:", possiblePaths.join(', '));
            return;
        }

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
        const putUrl = `${apiDomain}${cleanRepo}/contents/${selectedPath}`;

        console.log(`📝 Committing to: ${selectedPath} on ${selectedBranch} branch`);

        const commitResponse = await fetch(putUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${cleanToken}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Node-AI-Server',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: "🤖 [AI Auto-Upgrade] Refactored frontend engine to " + worldState.engineBuild,
                content: updatedContentBase64,
                sha: currentSha,
                branch: selectedBranch
            })
        });

        if (commitResponse.ok) {
            addLog("[AI COMMIT SUCCESS] Pushed graphics & engine improvements to GitHub!");
            console.log("✅ Commit successful!");
        } else {
            const commitErr = await commitResponse.json();
            addLog("[AI COMMIT ERROR] GitHub PUT failed (" + commitResponse.status + "): " + commitErr.message);
            console.error("❌ Commit failed:", commitErr);
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