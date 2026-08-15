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
    lastCommitDay: 0,
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
    
    // ALWAYS return something
    return "// Gemini unavailable - using fallback improvement\nconsole.log('Dark Fantasy System - Day " + worldState.day + "');";
}

/**
 * Execute git command with Promise
 */
function executeGitCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, { maxBuffer: 1024 * 1024 * 10, timeout: 30000 }, (error, stdout, stderr) => {
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
 * Push to GitHub in background
 */
async function pushToGitHub(htmlPath, improvementNumber, day) {
    if (!GITHUB_TOKEN) {
        console.log("⚠️ No GITHUB_TOKEN, skipping git push");
        return;
    }
    
    console.log("🔄 Starting git push in background...");
    
    try {
        const cleanToken = GITHUB_TOKEN.trim();
        
        // Configure git
        await executeGitCommand('git config --global user.email "ai@example.com"');
        await executeGitCommand('git config --global user.name "AI Auto-Improver"');
        
        const repoUrl = `https://${cleanToken}@github.com/edthedog-debug/dark-fantasy-civ.git`;
        
        // Check if we're in a git repo
        let isInRepo = false;
        try {
            await executeGitCommand('git rev-parse --is-inside-work-tree');
            isInRepo = true;
            console.log("📁 Already in git repo");
        } catch (gitError) {
            console.log("⚠️ Not in git repo, will clone");
        }
        
        if (!isInRepo) {
            // Clone the repo to /tmp
            try {
                await executeGitCommand(`rm -rf /tmp/repo`);
                await executeGitCommand(`git clone ${repoUrl} /tmp/repo`);
                process.chdir('/tmp/repo');
                console.log("✅ Cloned to /tmp/repo");
            } catch (cloneError) {
                console.error("❌ Clone failed:", cloneError.message);
                return;
            }
        }
        
        // Copy the improved HTML
        const targetPath = path.join(process.cwd(), 'public', 'index.html');
        console.log("📄 Copying to:", targetPath);
        
        // Ensure directory exists
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        
        fs.copyFileSync(htmlPath, targetPath);
        console.log("✅ File copied");
        
        // Also save the world state
        const stateTargetPath = path.join(process.cwd(), 'worldState.json');
        fs.copyFileSync(STATE_FILE, stateTargetPath);
        console.log("✅ State file copied");
        
        // Git operations
        await executeGitCommand('git add public/index.html worldState.json');
        console.log("✅ Added to git");
        
        await executeGitCommand(`git commit -m "🤖 [AI] Day ${day} - Improvement #${improvementNumber} - Population: ${worldState.population}, Tech: ${worldState.techPower.toFixed(2)}"`);
        console.log("✅ Committed");
        
        await executeGitCommand('git push origin main --force');
        console.log("✅ Pushed to GitHub!");
        
        // Update last commit day
        worldState.lastCommitDay = day;
        saveWorldState();
        
    } catch (gitError) {
        console.error("❌ Git push failed:", gitError.message);
    }
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
 * 2. AI CODE IMPROVEMENT - INFINITE IMPROVEMENTS (NON-BLOCKING)
 */
async function autoImproveGameCode() {
    console.log("\n🤖 AI CODE IMPROVEMENT...");
    addLog("[AI AUTO-CODING] Applying AI improvement #" + (worldState.aiImprovements + 1));

    try {
        const htmlPath = path.join(__dirname, 'public', 'index.html');
        
        if (!fs.existsSync(htmlPath)) {
            console.error("❌ index.html not found");
            addLog("[AI COMMIT ERROR] index.html not found.");
            return;
        }
        
        const currentHtml = fs.readFileSync(htmlPath, 'utf8');
        console.log("📄 Current HTML:", currentHtml.length, "chars");
        
        // Use fallback immediately if no API key
        let codeToAdd;
        
        if (!AI_API_KEY) {
            console.log("⚠️ No API key, using fallback");
            const fallbackImprovements = [
                "// AI Improvement: Dynamic particle system\nfunction createParticles() {\n    const canvas = document.createElement('canvas');\n    canvas.style.position = 'fixed';\n    canvas.style.top = '0';\n    canvas.style.left = '0';\n    canvas.style.pointerEvents = 'none';\n    canvas.style.zIndex = '9999';\n    document.body.appendChild(canvas);\n    const ctx = canvas.getContext('2d');\n    canvas.width = window.innerWidth;\n    canvas.height = window.innerHeight;\n    \n    const particles = [];\n    for(let i = 0; i < 50; i++) {\n        particles.push({\n            x: Math.random() * canvas.width,\n            y: Math.random() * canvas.height,\n            vx: (Math.random() - 0.5) * 2,\n            vy: (Math.random() - 0.5) * 2,\n            size: Math.random() * 3 + 1,\n            color: `hsl(${Math.random() * 360}, 70%, 50%)`\n        });\n    }\n    \n    function animate() {\n        ctx.clearRect(0, 0, canvas.width, canvas.height);\n        particles.forEach(p => {\n            p.x += p.vx;\n            p.y += p.vy;\n            if(p.x < 0 || p.x > canvas.width) p.vx *= -1;\n            if(p.y < 0 || p.y > canvas.height) p.vy *= -1;\n            ctx.beginPath();\n            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);\n            ctx.fillStyle = p.color;\n            ctx.fill();\n        });\n        requestAnimationFrame(animate);\n    }\n    animate();\n}\ncreateParticles();",
                
                "// AI Improvement: Interactive tooltip system\nfunction createTooltips() {\n    const tooltip = document.createElement('div');\n    tooltip.style.cssText = 'position:fixed;background:rgba(0,0,0,0.8);color:white;padding:10px;border-radius:5px;pointer-events:none;z-index:10000;display:none;';\n    document.body.appendChild(tooltip);\n    \n    document.addEventListener('mouseover', (e) => {\n        if(e.target.textContent && e.target.textContent.length > 0) {\n            tooltip.textContent = '🏰 ' + e.target.textContent;\n            tooltip.style.display = 'block';\n            tooltip.style.left = e.pageX + 10 + 'px';\n            tooltip.style.top = e.pageY + 10 + 'px';\n        }\n    });\n    \n    document.addEventListener('mousemove', (e) => {\n        if(tooltip.style.display === 'block') {\n            tooltip.style.left = e.pageX + 10 + 'px';\n            tooltip.style.top = e.pageY + 10 + 'px';\n        }\n    });\n    \n    document.addEventListener('mouseout', () => {\n        tooltip.style.display = 'none';\n    });\n}\ncreateTooltips();",
                
                "// AI Improvement: Dynamic background\nfunction createDynamicBackground() {\n    const bg = document.createElement('div');\n    bg.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;';\n    document.body.insertBefore(bg, document.body.firstChild);\n    \n    function updateBackground() {\n        const hue = (Date.now() / 100) % 360;\n        bg.style.background = `linear-gradient(${hue}deg, hsl(${hue}, 30%, 20%), hsl(${(hue + 60) % 360}, 30%, 30%))`;\n        requestAnimationFrame(updateBackground);\n    }\n    updateBackground();\n}\ncreateDynamicBackground();"
            ];
            codeToAdd = fallbackImprovements[worldState.aiImprovements % fallbackImprovements.length];
        } else {
            // Ask for improvement based on current state with timeout
            const prompt = `Create a unique JavaScript improvement for a dark fantasy civilization game. 
            Current stats: Day ${worldState.day}, Population: ${worldState.population}, Tech: ${worldState.techPower}, 
            Treasury: ${worldState.treasury}, Happiness: ${worldState.happiness}.
            Improvement #${worldState.aiImprovements + 1}
            Return ONLY JavaScript code that adds new visual effects, gameplay mechanics, or UI improvements.`;
            
            console.log("🔍 Asking Gemini...");
            const aiResponse = await Promise.race([
                queryGemini(prompt),
                new Promise(resolve => setTimeout(() => resolve("// Timeout - using fallback"), 8000))
            ]);
            
            console.log("✅ Got response! Length:", aiResponse.length);
            console.log("📝 Content:", aiResponse.substring(0, 200));
            
            // Clean the response
            codeToAdd = aiResponse.replace(/```javascript/gi, '').replace(/```js/gi, '').replace(/```/g, '').trim();
        }
        
        // If it's too short, add a default
        if (!codeToAdd || codeToAdd.length < 10) {
            const fallbackImprovements = [
                "// AI Improvement: Dynamic particle system\nfunction createParticles() {\n    const canvas = document.createElement('canvas');\n    canvas.style.position = 'fixed';\n    canvas.style.top = '0';\n    canvas.style.left = '0';\n    canvas.style.pointerEvents = 'none';\n    canvas.style.zIndex = '9999';\n    document.body.appendChild(canvas);\n    const ctx = canvas.getContext('2d');\n    canvas.width = window.innerWidth;\n    canvas.height = window.innerHeight;\n    \n    const particles = [];\n    for(let i = 0; i < 50; i++) {\n        particles.push({\n            x: Math.random() * canvas.width,\n            y: Math.random() * canvas.height,\n            vx: (Math.random() - 0.5) * 2,\n            vy: (Math.random() - 0.5) * 2,\n            size: Math.random() * 3 + 1,\n            color: `hsl(${Math.random() * 360}, 70%, 50%)`\n        });\n    }\n    \n    function animate() {\n        ctx.clearRect(0, 0, canvas.width, canvas.height);\n        particles.forEach(p => {\n            p.x += p.vx;\n            p.y += p.vy;\n            if(p.x < 0 || p.x > canvas.width) p.vx *= -1;\n            if(p.y < 0 || p.y > canvas.height) p.vy *= -1;\n            ctx.beginPath();\n            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);\n            ctx.fillStyle = p.color;\n            ctx.fill();\n        });\n        requestAnimationFrame(animate);\n    }\n    animate();\n}\ncreateParticles();",
                
                "// AI Improvement: Interactive tooltip system\nfunction createTooltips() {\n    const tooltip = document.createElement('div');\n    tooltip.style.cssText = 'position:fixed;background:rgba(0,0,0,0.8);color:white;padding:10px;border-radius:5px;pointer-events:none;z-index:10000;display:none;';\n    document.body.appendChild(tooltip);\n    \n    document.addEventListener('mouseover', (e) => {\n        if(e.target.textContent && e.target.textContent.length > 0) {\n            tooltip.textContent = '🏰 ' + e.target.textContent;\n            tooltip.style.display = 'block';\n            tooltip.style.left = e.pageX + 10 + 'px';\n            tooltip.style.top = e.pageY + 10 + 'px';\n        }\n    });\n    \n    document.addEventListener('mousemove', (e) => {\n        if(tooltip.style.display === 'block') {\n            tooltip.style.left = e.pageX + 10 + 'px';\n            tooltip.style.top = e.pageY + 10 + 'px';\n        }\n    });\n    \n    document.addEventListener('mouseout', () => {\n        tooltip.style.display = 'none';\n    });\n}\ncreateTooltips();",
                
                "// AI Improvement: Dynamic background\nfunction createDynamicBackground() {\n    const bg = document.createElement('div');\n    bg.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;';\n    document.body.insertBefore(bg, document.body.firstChild);\n    \n    function updateBackground() {\n        const hue = (Date.now() / 100) % 360;\n        bg.style.background = `linear-gradient(${hue}deg, hsl(${hue}, 30%, 20%), hsl(${(hue + 60) % 360}, 30%, 30%))`;\n        requestAnimationFrame(updateBackground);\n    }\n    updateBackground();\n}\ncreateDynamicBackground();"
            ];
            codeToAdd = fallbackImprovements[worldState.aiImprovements % fallbackImprovements.length];
        }
        
        // Apply to HTML
        let improvedHtml = currentHtml;
        const improvementBlock = `\n<!-- === AI IMPROVEMENT #${worldState.aiImprovements + 1} (Day ${worldState.day}) === -->\n<script>\n${codeToAdd}\n</script>\n`;
        
        if (improvedHtml.includes('</body>')) {
            improvedHtml = improvedHtml.replace('</body>', improvementBlock + '</body>');
        } else {
            improvedHtml += improvementBlock;
        }
        
        // Write improved HTML
        fs.writeFileSync(htmlPath, improvedHtml);
        console.log("✅ HTML improved! New size:", improvedHtml.length);
        
        worldState.aiImprovements += 1;
        const improvementNumber = worldState.aiImprovements;
        const currentDay = worldState.day;
        
        addLog("[AI COMMIT SUCCESS] Code improvement #" + improvementNumber + " applied!");
        
        // Push to GitHub ONLY every 50 days (main updates)
        if (worldState.day % 50 === 0 && worldState.lastCommitDay !== worldState.day) {
            console.log("🎯 Day 50 milestone reached - pushing to GitHub");
            pushToGitHub(htmlPath, improvementNumber, currentDay).catch(err => {
                console.error("❌ Background git push error:", err.message);
            });
        }
        
    } catch (err) {
        console.error("Error:", err.message);
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

    // Code improvement every 10 days (non-blocking)
    if (worldState.day % 10 === 0) {
        const patch = Math.floor(Math.random() * 9) + 1;
        worldState.engineBuild = "v" + (2 + worldState.aiImprovements) + "." + patch + ".0-Gemini-2.5";
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
            console.log("✅ Gemini response:", response.substring(0, 100));
            addLog("[SYSTEM] AI System ready.");
        });
});