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
const GROQ_API_KEY = process.env.GROQ_API_KEY; 
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;

APP.use(cors());
APP.use(express.static(path.join(__dirname, 'public')));

const SERVER = http.createServer(APP);
const WSS = new WebSocket.Server({ server: SERVER });
const STATE_FILE = path.join(__dirname, 'worldState.json');

// Rate limiter for Groq API
const rateLimiter = {
    lastCallTime: 0,
    minInterval: 7000,
    
    async waitForSlot() {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastCallTime;
        
        if (timeSinceLastCall < this.minInterval) {
            const waitTime = this.minInterval - timeSinceLastCall;
            console.log(`⏳ Rate limiter: waiting ${waitTime}ms before next call...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastCallTime = Date.now();
    }
};

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
 * GROQ API - Uses OpenAI GPT-OSS 120B model with rate limiting
 */
async function queryAI(prompt) {
    if (!GROQ_API_KEY) {
        console.error("❌ No GROQ_API_KEY");
        return null;
    }

    console.log("🔑 Groq Key:", GROQ_API_KEY.substring(0, 10) + "...");
    
    try {
        await rateLimiter.waitForSlot();
        
        const url = 'https://api.groq.com/openai/v1/chat/completions';
        
        console.log('🔄 Trying Groq (GPT-OSS 120B)...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.8,
                max_tokens: 4096
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('📊 Groq Status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('📦 Groq response received');
            
            const text = data.choices?.[0]?.message?.content;
            
            if (text && text.length > 0) {
                console.log('✅ Success with Groq!');
                console.log('📝 Text:', text.substring(0, 200));
                return text;
            }
        } else if (response.status === 429) {
            console.log('⏳ Rate limit (429). Waiting 60 seconds before retry...');
            await new Promise(resolve => setTimeout(resolve, 60000));
            
            console.log('🔄 Retrying Groq...');
            const retryResponse = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'openai/gpt-oss-120b',
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.8,
                    max_tokens: 4096
                })
            });
            
            if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                const retryText = retryData.choices?.[0]?.message?.content;
                
                if (retryText && retryText.length > 0) {
                    console.log('✅ Success with Groq on retry!');
                    return retryText;
                }
            }
        } else {
            const errorText = await response.text();
            console.error('❌ Groq Error:', response.status, errorText.substring(0, 300));
        }
    } catch (e) {
        console.error('❌ Groq Fetch error:', e.message);
    }
    
    console.error('❌ Groq failed');
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
        const rawText = await queryAI(prompt);
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
 * 2. AI CODE IMPROVEMENT - REPLACES ENTIRE FILE TO AVOID DUPLICATES
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
        console.log("📄 Current HTML size:", currentHtml.length, "chars");
        
        // If HTML is too large (>100KB), reset it to clean version first
        if (currentHtml.length > 100000) {
            console.log("⚠️ HTML too large, resetting to clean version...");
            currentHtml = getCleanHTML();
            fs.writeFileSync(htmlPath, currentHtml);
            addLog("[SYSTEM] HTML reset to clean version (was too large)");
        }
        
        const improvementType = worldState.aiImprovements % 3;
        
        let prompt;
        let codeToAdd;
        
        switch(improvementType) {
            case 0: // REPLACE ENTIRE CSS
                prompt = `REPLACE the ENTIRE CSS of this pixel art civilization game with OPTIMIZED code.
                Current stats: Day ${worldState.day}, Population: ${worldState.population}, Tech: ${worldState.techPower}.
                Era: ${worldState.era}
                
                CRITICAL RULES:
                - Return the COMPLETE replacement CSS (not additions)
                - Do NOT duplicate existing styles
                - Do NOT create new class names that conflict
                - KEEP existing class names: .dashboard, .stat-card, #map-container, .log-container
                - IMPROVE: pixel art style, sharp edges, dark fantasy colors
                - MUST work on desktop AND mobile (@media queries)
                - Use image-rendering: pixelated
                - Maximum 200 lines of CSS
                
                Return ONLY the complete valid CSS. No HTML, no explanations.`;
                break;
                
            case 1: // REPLACE ENTIRE CANVAS JS
                prompt = `REPLACE the ENTIRE canvas rendering JavaScript with OPTIMIZED pixel art code.
                Current stats: Day ${worldState.day}, Population: ${worldState.population}, Tech: ${worldState.techPower}.
                Buildings to draw: ${Math.floor(worldState.population / 5)}
                Units to draw: ${Math.floor(worldState.population / 10)}
                
                CRITICAL RULES:
                - Return the COMPLETE replacement JavaScript (not additions)
                - Do NOT create duplicate functions
                - Do NOT create a second canvas
                - USE the existing canvas #gameCanvas
                - REPLACE all draw functions with improved versions
                - Use ctx.imageSmoothingEnabled = false
                - Use fillRect for EVERYTHING (pixel art)
                - Draw buildings with windows, doors, roofs
                - Draw units with walking animation
                - Clamp all positions within canvas bounds
                - Maximum 300 lines of JavaScript
                
                Return ONLY the complete valid JavaScript. No HTML, no explanations.`;
                break;
                
            case 2: // REPLACE ENTIRE HTML STRUCTURE
                prompt = `REPLACE the ENTIRE HTML body structure with OPTIMIZED pixel art layout.
                Current stats: Day ${worldState.day}, Population: ${worldState.population}, Era: ${worldState.era}.
                
                CRITICAL RULES:
                - Return the COMPLETE replacement HTML body (not additions)
                - Do NOT duplicate existing elements
                - KEEP: #dashboard, #map-container, #gameCanvas, .log-container
                - Show building count: ${Math.floor(worldState.population / 5)}
                - Show population: ${worldState.population}
                - Use pixel art style
                - Maximum 100 lines of HTML
                
                Return ONLY the complete valid HTML body. No CSS, no JS, no explanations.`;
                break;
        }
        
        console.log("🔍 Asking Groq to REPLACE", improvementType === 0 ? "CSS" : improvementType === 1 ? "Canvas JS" : "HTML", "...");
        const aiResponse = await queryAI(prompt);
        
        if (aiResponse && !aiResponse.startsWith("//") && aiResponse.length > 50) {
            console.log("✅ Got valid AI response! Length:", aiResponse.length);
            codeToAdd = aiResponse.replace(/```css/gi, '').replace(/```javascript/gi, '').replace(/```html/gi, '').replace(/```js/gi, '').replace(/```/g, '').trim();
        } else {
            console.log("⚠️ AI failed, using fallback");
            codeToAdd = null;
        }
        
        if (codeToAdd && codeToAdd.length > 50) {
            // REPLACE the entire relevant section instead of appending
            let improvedHtml = currentHtml;
            
            if (improvementType === 0) {
                // Replace entire <style> block
                improvedHtml = improvedHtml.replace(/<style>[\s\S]*?<\/style>/g, `<style>\n${codeToAdd}\n</style>`);
            } else if (improvementType === 1) {
                // Replace entire <script> block (the main game engine)
                improvedHtml = improvedHtml.replace(/<script>[\s\S]*?<\/script>/g, `<script>\n${codeToAdd}\n</script>`);
            } else {
                // Replace entire <body> content
                improvedHtml = improvedHtml.replace(/<body>[\s\S]*?<\/body>/g, `<body>\n${codeToAdd}\n</body>`);
            }
            
            fs.writeFileSync(htmlPath, improvedHtml);
            console.log("✅ HTML REPLACED! New size:", improvedHtml.length);
        } else {
            console.log("⚠️ Using clean HTML reset");
            fs.writeFileSync(htmlPath, getCleanHTML());
        }
        
        worldState.aiImprovements += 1;
        const improvementTypeName = improvementType === 0 ? "Replaced CSS" : improvementType === 1 ? "Replaced Canvas JS" : "Replaced HTML";
        addLog(`[AI COMMIT SUCCESS] ${improvementTypeName}! Total: ${worldState.aiImprovements}`);
        
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

/**
 * Returns clean HTML template to avoid hyper-extended files
 */
function getCleanHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Sovereign AI Engine - World Map</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; }
        body { background: #070913; color: #e0e6ed; min-height: 100vh; display: flex; flex-direction: column; padding: 12px; gap: 10px; overflow: hidden; }
        .dashboard { background: rgba(16,22,36,0.9); border: 1px solid rgba(0,210,255,0.25); border-radius: 12px; padding: 12px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .stat-card { background: rgba(25,33,52,0.6); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 8px; }
        .stat-label { font-size: 10px; color: #6b7c93; text-transform: uppercase; }
        .stat-value { font-size: 14px; font-weight: bold; color: #fff; }
        #map-container { flex: 1; background: #04060d; border: 1px solid rgba(0,210,255,0.25); border-radius: 12px; position: relative; overflow: hidden; min-height: 300px; }
        canvas { display: block; width: 100%; height: 100%; touch-action: none; }
        .log-container { height: 100px; background: rgba(12,17,29,0.95); border: 1px solid rgba(0,210,255,0.2); border-radius: 12px; padding: 10px; overflow-y: auto; font-family: 'Courier New', monospace; font-size: 11px; }
        @media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="dash-header"><span>SOVEREIGN AI ENGINE</span><div class="status-badge">24/7 AUTONOMOUS</div></div>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-label">DAY</div><div class="stat-value" id="stat-day">1</div></div>
            <div class="stat-card"><div class="stat-label">ERA</div><div class="stat-value" id="stat-era">Era 1</div></div>
            <div class="stat-card"><div class="stat-label">POPULATION</div><div class="stat-value" id="stat-pop">0</div></div>
            <div class="stat-card"><div class="stat-label">TREASURY</div><div class="stat-value" id="stat-gold">0 G</div></div>
            <div class="stat-card"><div class="stat-label">TECH</div><div class="stat-value" id="stat-tech">0.0</div></div>
            <div class="stat-card"><div class="stat-label">DEFENSES</div><div class="stat-value" id="stat-tanks">0</div></div>
            <div class="stat-card"><div class="stat-label">STATUS</div><div class="stat-value" id="stat-status">PEACE</div></div>
            <div class="stat-card"><div class="stat-label">BUILD</div><div class="stat-value" id="stat-build">v2.0</div></div>
        </div>
    </div>
    <div id="map-container"><canvas id="gameCanvas"></canvas></div>
    <div class="log-container"><div id="log-stream">Connecting...</div></div>
    <script>
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(protocol + '//' + window.location.host);
        let worldState = { day: 1, era: "Era 1", population: 10, treasury: 500, techPower: 1, tanks: 0, logs: [], inWar: false };
        ws.onmessage = (event) => { const msg = JSON.parse(event.data); if (msg.type === 'WORLD_UPDATE') { worldState = msg.data; updateUI(); } };
        function updateUI() {
            document.getElementById('stat-day').innerText = worldState.day;
            document.getElementById('stat-era').innerText = worldState.era;
            document.getElementById('stat-pop').innerText = worldState.population;
            document.getElementById('stat-gold').innerText = worldState.treasury.toLocaleString() + ' G';
            document.getElementById('stat-tech').innerText = Number(worldState.techPower).toFixed(2);
            document.getElementById('stat-tanks').innerText = worldState.tanks;
            document.getElementById('stat-status').innerText = worldState.inWar ? 'WAR' : 'PEACE';
            document.getElementById('stat-build').innerText = worldState.engineBuild || 'v2.0';
            const logBox = document.getElementById('log-stream');
            if (worldState.logs && worldState.logs.length > 0) {
                logBox.innerHTML = worldState.logs.map(l => '<div>' + l + '</div>').join('');
            }
        }
        // Pixel Art Map Engine
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        let frameCount = 0;
        let buildings = [];
        let units = [];
        function resizeCanvas() { canvas.width = canvas.parentElement.clientWidth; canvas.height = canvas.parentElement.clientHeight; }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        function generateObjects() {
            buildings = []; units = [];
            const bCount = Math.min(80, Math.floor(worldState.population / 5) + 2);
            const uCount = Math.min(50, Math.floor(worldState.population / 10) + 2);
            for (let i = 0; i < bCount; i++) {
                buildings.push({ x: 20 + (i * 47) % (canvas.width - 40), y: 20 + (i * 31) % (canvas.height - 40), type: i % 4, height: 20 + (i % 5) * 8 });
            }
            for (let u = 0; u < uCount; u++) {
                units.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, tx: Math.random() * canvas.width, ty: Math.random() * canvas.height, speed: 0.5 + Math.random(), color: ['#f66','#66f','#6f6','#ff6','#f6f'][u%5] });
            }
        }
        generateObjects();
        function render() {
            frameCount++;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Terrain
            for (let x = 0; x < canvas.width; x += 12) {
                for (let y = 0; y < canvas.height; y += 12) {
                    ctx.fillStyle = ((x + y) % 24 === 0) ? '#2a3a1a' : '#1a2a1a';
                    ctx.fillRect(x, y, 12, 12);
                }
            }
            // Buildings
            buildings.forEach(b => {
                ctx.fillStyle = ['#8a8a8a', '#c4a060', '#6a6a6a', '#7a7a7a'][b.type];
                ctx.fillRect(b.x - 6, b.y - b.height, 12, b.height);
                ctx.fillStyle = '#ffff88';
                ctx.fillRect(b.x - 2, b.y - b.height + 4, 4, 4);
            });
            // Units
            units.forEach(u => {
                const dx = u.tx - u.x, dy = u.ty - u.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 5) { u.tx = Math.random() * canvas.width; u.ty = Math.random() * canvas.height; }
                else { u.x += dx / dist * u.speed; u.y += dy / dist * u.speed; }
                ctx.fillStyle = u.color;
                ctx.fillRect(Math.round(u.x), Math.round(u.y - 6), 3, 6);
                ctx.fillStyle = '#fc9';
                ctx.fillRect(Math.round(u.x), Math.round(u.y - 9), 3, 3);
            });
            requestAnimationFrame(render);
        }
        render();
    </script>
</body>
</html>`;
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

    if (worldState.day % 150 === 0) {
        generateAIEvents().catch(err => console.error("AI Event error:", err));
    }

    if (worldState.day % 250 === 0) {
        const patch = Math.floor(Math.random() * 9) + 1;
        worldState.engineBuild = "v" + (2 + Math.floor(worldState.aiImprovements / 10)) + "." + patch + ".0-Groq-PixelArt";
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
    console.log("🤖 Using Groq API (OpenAI GPT-OSS 120B)");
    console.log("📅 AI Events: every 150 days | Code Improvements: every 250 days");
    console.log("⏳ Rate limiter: 7 seconds minimum between calls");
    console.log("🎮 Pixel Art style: Age of Empires inspired");
    console.log("🔄 REPLACE mode: AI replaces code, never appends duplicates");
    console.log("📏 Max HTML size: 100KB (auto-reset if exceeded)");
    
    queryAI("Say 'OK'")
        .then(response => {
            if (response) {
                console.log("✅ Groq response:", response.substring(0, 100));
                addLog("[SYSTEM] AI System ready (Groq Pixel Art Engine).");
            } else {
                console.log("⚠️ Groq not responding, using fallbacks");
                addLog("[SYSTEM] AI System in fallback mode.");
            }
        });
});