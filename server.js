const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { exec } = require('child_process');

const APP = express();
const PORT = process.env.PORT || 3000;

// ENVIRONMENT VARIABLES
const GROQ_API_KEY = process.env.GROQ_API_KEY; 
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;

APP.use(cors());
APP.use(express.static(path.join(__dirname, 'public')));

const SERVER = http.createServer(APP);
const WSS = new WebSocket.Server({ server: SERVER, perMessageDeflate: false });
const STATE_FILE = path.join(__dirname, 'worldState.json');

// Rate limiter - 120 seconds
const rateLimiter = {
    lastCallTime: 0,
    minInterval: 120000,
    
    async waitForSlot() {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastCallTime;
        if (timeSinceLastCall < this.minInterval) {
            const waitTime = this.minInterval - timeSinceLastCall;
            console.log(`⏳ Rate limiter: waiting ${Math.round(waitTime/1000)}s...`);
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
    treasury: 5000,
    techPower: 0.5,
    economicPower: "Emerging Market",
    engineBuild: "v2.0.0-AI-Cloud",
    inWar: false,
    aiImprovements: 0,
    activeEvents: [],
    buildings: [],
    logs: [
        "[" + new Date().toLocaleTimeString() + "] Autonomous Cloud Engine Initialized."
    ]
};

if (fs.existsSync(STATE_FILE)) {
    try {
        const rawData = fs.readFileSync(STATE_FILE, 'utf8');
        const savedState = JSON.parse(rawData);
        worldState = { ...worldState, ...savedState };
        console.log("✅ State loaded - Day:", worldState.day, "| Improvements:", worldState.aiImprovements);
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
    let sentCount = 0;
    WSS.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
            sentCount++;
        }
    });
    console.log(`📤 Sent to ${sentCount} clients - Day ${worldState.day}`);
}

function addLog(msg) {
    const time = new Date().toLocaleTimeString();
    worldState.logs.push("[" + time + "] " + msg);
    if (worldState.logs.length > 50) worldState.logs.shift();
}

/**
 * GROQ API
 */
async function queryAI(prompt, taskType) {
    if (!GROQ_API_KEY) {
        console.error("❌ No GROQ_API_KEY");
        return null;
    }

    console.log("┌─────────────────────────────────────");
    console.log("│ 🤖 GROQ AI - " + taskType);
    console.log("│ 🧠 Model: qwen/qwen3.6-27b");
    console.log("└─────────────────────────────────────");
    
    try {
        await rateLimiter.waitForSlot();
        
        const url = 'https://api.groq.com/openai/v1/chat/completions';
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'qwen/qwen3.6-27b',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 4096
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log("│ 📊 Status: " + response.status);
        
        if (response.ok) {
            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;
            if (text && text.length > 10) {
                console.log("│ ✅ SUCCESS");
                console.log("└─────────────────────────────────────");
                return text;
            }
        } else {
            console.log("│ ❌ ERROR: " + response.status);
        }
    } catch (e) {
        console.log("│ ❌ FAILED: " + e.message);
    }
    
    console.log("└─────────────────────────────────────");
    return null;
}

/**
 * Execute git command
 */
function executeGitCommand(command, retries = 3) {
    return new Promise((resolve, reject) => {
        const attempt = (n) => {
            exec(command, { maxBuffer: 1024*1024*10, timeout: 60000 }, (error, stdout) => {
                if (error && n < retries) setTimeout(() => attempt(n+1), 10000*n);
                else if (error) reject(error);
                else resolve(stdout);
            });
        };
        attempt(1);
    });
}

/**
 * Push to GitHub
 */
async function pushToGitHub(htmlPath, type, day) {
    if (!GITHUB_TOKEN) return;
    try {
        const token = GITHUB_TOKEN.trim();
        const repoUrl = `https://${token}@github.com/edthedog-debug/dark-fantasy-civ.git`;
        
        await executeGitCommand('rm -rf /tmp/repo', 1);
        await executeGitCommand(`git clone --depth 1 ${repoUrl} /tmp/repo`, 4);
        
        const orig = process.cwd();
        process.chdir('/tmp/repo');
        await executeGitCommand('git config user.email "ai@example.com"');
        await executeGitCommand('git config user.name "AI Auto-Improver"');
        
        const pub = path.join('/tmp/repo', 'public');
        if (!fs.existsSync(pub)) fs.mkdirSync(pub, { recursive: true });
        
        fs.copyFileSync(htmlPath, path.join(pub, 'index.html'));
        fs.copyFileSync(STATE_FILE, path.join('/tmp/repo', 'worldState.json'));
        
        await executeGitCommand('git add public/index.html worldState.json');
        await executeGitCommand(`git commit -m "🤖 [AI] ${type} - Day ${day}" --allow-empty`);
        await executeGitCommand('git push origin main --force', 4);
        
        process.chdir(orig);
        console.log("✅ GitHub OK");
    } catch (e) {
        console.log("❌ GitHub:", e.message);
    }
}

/**
 * AI Events
 */
async function generateAIEvents() {
    const treasury = worldState.treasury;
    
    console.log("\n🎲 GENERATING AI EVENT...");
    
    const prompt = `Generate a dark fantasy event for a civilization simulation.
    Current: Day ${worldState.day}, Pop ${worldState.population}, Treasury ${treasury}.
    Return ONLY JSON: {"event":"description","goldImpact":number,"happinessImpact":number,"techImpact":number,"visualEffect":"blood_moon|fire|storm|plague|prosperity","duration":number}
    goldImpact should be a PERCENTAGE of treasury (e.g. -0.10 for 10% loss, +0.05 for 5% gain).`;
    
    const aiResult = await queryAI(prompt, "EVENT GENERATION");
    
    if (aiResult) {
        try {
            const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                console.log("✅ AI EVENT GENERATED");
                
                addLog("[AI EVENT] " + parsed.event);
                if (typeof parsed.goldImpact === 'number') worldState.treasury = Math.max(0, worldState.treasury + Math.floor(treasury * parsed.goldImpact));
                if (typeof parsed.happinessImpact === 'number') worldState.happiness = Math.min(100, Math.max(10, worldState.happiness + parsed.happinessImpact));
                if (typeof parsed.techImpact === 'number') worldState.techPower += Math.max(0, parsed.techImpact);
                
                if (parsed.visualEffect && parsed.visualEffect !== 'none') {
                    worldState.activeEvents = worldState.activeEvents || [];
                    worldState.activeEvents.push({ type: parsed.visualEffect, description: parsed.event, endDay: worldState.day + (parsed.duration || 30) });
                }
            }
        } catch (e) {
            console.log("⚠️ Parse failed:", e.message);
        }
    } else {
        addLog("[AI EVENT] Groq unavailable - skipped");
    }
    
    if (worldState.activeEvents) {
        worldState.activeEvents = worldState.activeEvents.filter(e => e.endDay > worldState.day);
    }
    
    if (worldState.techPower > 50) worldState.era = "Transcendent AI Era " + Math.floor(worldState.techPower / 10);
    else if (worldState.techPower > 20) worldState.era = "Advanced Magitech Era";
    else if (worldState.techPower > 10) worldState.era = "Industrial Magic Era";
    else if (worldState.techPower > 5) worldState.era = "Renaissance Arcana";
}

/**
 * SIMULATION TICK - BALANCED ECONOMY
 */
function runSimulationTick() {
    worldState.day += 1;

    if (worldState.treasury <= 0 && worldState.happiness < 30) {
        worldState.treasury += 3000;
        worldState.happiness = Math.min(100, worldState.happiness + 10);
        addLog("[RECOVERY] Emergency reserve injected 3,000 Gold!");
    }

    let moraleProductivity = 1.0;
    if (worldState.happiness >= 80) moraleProductivity = 1.2;
    else if (worldState.happiness >= 50) moraleProductivity = 1.0;
    else if (worldState.happiness >= 30) moraleProductivity = 0.8;
    else moraleProductivity = 0.5;

    // BALANCED ECONOMY
    const baseTaxPerCitizen = 8; // Increased from 5
    const techMultiplier = 1 + (worldState.techPower * 0.05);
    const tradeBonus = 1 + (worldState.population * 0.001);
    const grossIncome = Math.floor(worldState.population * baseTaxPerCitizen * moraleProductivity * techMultiplier * tradeBonus);
    
    const citizenServices = Math.floor(worldState.population * 3); // Reduced from 4
    const militaryMaintenance = worldState.tanks * 100; // Reduced from 200
    const infrastructureRepairs = Math.floor(worldState.treasury * 0.003); // Reduced from 0.005
    const totalExpenses = citizenServices + militaryMaintenance + infrastructureRepairs;
    
    const netProfit = grossIncome - totalExpenses;
    worldState.treasury = Math.max(0, worldState.treasury + netProfit);

    if (Math.abs(netProfit) > 1000 && worldState.day % 10 === 0) {
        const status = netProfit > 0 ? "PROFIT" : "LOSS";
        addLog("[ECONOMY] " + status + ": " + netProfit.toLocaleString() + " Gold (Day " + worldState.day + ")");
    }

    worldState.techPower += 0.008;

    if (worldState.happiness > 70 && worldState.treasury > 20000 && worldState.day % 8 === 0) {
        worldState.population += 1;
        addLog("[DEMOGRAPHICS] +1 immigrant. Pop: " + worldState.population);
    } else if (worldState.happiness < 30 && worldState.population > 1 && worldState.day % 8 === 0) {
        worldState.population -= 1;
        addLog("[DEMOGRAPHICS] -1 emigrated. Pop: " + worldState.population);
    }

    if (worldState.treasury > 30000 && worldState.day % 25 === 0) {
        worldState.treasury -= 3000;
        worldState.techPower += 0.3;
        addLog("[ECONOMY] Invested 3,000 Gold into R&D.");
    }

    if (worldState.treasury > 50000 && worldState.tanks < 15 && worldState.day % 40 === 0) {
        worldState.treasury -= 8000;
        worldState.tanks += 1;
        addLog("[DEFENSE] Built 1 Defense Unit for 8,000 Gold.");
    }

    if (worldState.tanks > 0) {
        const defenseUpkeep = worldState.tanks * 100; // Reduced from 150
        worldState.treasury = Math.max(0, worldState.treasury - defenseUpkeep);
    }

    if (worldState.activeEvents) {
        worldState.activeEvents = worldState.activeEvents.filter(e => e.endDay > worldState.day);
    }

    if (worldState.day % 250 === 0) {
        generateAIEvents();
    }

    if (worldState.day % 400 === 0) {
        autoImproveGameCode().catch(err => console.error(err.message));
    }

    saveWorldState();
    broadcastState();
}

setInterval(runSimulationTick, 4000);

// WebSocket
WSS.on('connection', (ws) => {
    console.log('🔗 Client connected');
    ws.send(JSON.stringify({ type: 'WORLD_UPDATE', data: worldState }));
});

/**
 * AI CODE IMPROVEMENT - WITH ACTUAL HTML AND GRAPHICS/MECHANICS PROMPT
 */
async function autoImproveGameCode() {
    const types = ["CSS STYLING", "MAP GRAPHICS & MECHANICS", "HTML STRUCTURE"];
    const improvementType = types[worldState.aiImprovements % 3];
    
    console.log("\n┌─────────────────────────────────────");
    console.log("│ 🤖 AI CODE IMPROVEMENT");
    console.log("│ 📋 Type: " + improvementType);
    console.log("└─────────────────────────────────────");
    
    addLog("[AI AUTO-CODING] " + improvementType + " improvement...");

    try {
        const htmlPath = path.join(__dirname, 'public', 'index.html');
        if (!fs.existsSync(htmlPath)) return;
        
        let currentHtml = fs.readFileSync(htmlPath, 'utf8');
        if (currentHtml.length > 100000) {
            currentHtml = getCleanHTML();
            fs.writeFileSync(htmlPath, currentHtml);
        }
        
        // IMPROVED PROMPT - includes graphics and mechanics
        const prompt = `You are improving the ${improvementType} of this dark fantasy civilization game.

HERE IS THE CURRENT HTML CODE:
\`\`\`html
${currentHtml}
\`\`\`

IMPROVEMENT GOALS:
${
    improvementType === "MAP GRAPHICS & MECHANICS" 
    ? `- ENHANCE the Canvas rendering: add more detailed pixel art buildings, animated water, particle effects (rain, embers, fog)
- IMPROVE unit animations: walking cycles, idle animations, different unit types (farmers, soldiers, mages)
- ADD atmospheric effects: day/night cycle, weather particles, ambient lighting
- ENHANCE terrain: multiple grass types, dirt paths, stone textures
- IMPROVE building details: windows, doors, roofs, flags, smoke from chimneys
- ADD resource visualization: gold mines with sparkle effects, trees with swaying`
    : improvementType === "CSS STYLING"
    ? `- ENHANCE the dark fantasy aesthetic with richer colors, glow effects, and atmospheric shadows
- IMPROVE the panel designs with pixel-art borders and medieval styling
- ADD smooth transitions and hover effects to stat cards
- ENHANCE the status indicators with pulsing glow effects
- IMPROVE typography with fantasy-themed fonts if available`
    : `- IMPROVE the layout structure for better visual hierarchy
- ADD semantic HTML elements for better organization
- ENHANCE the dashboard layout with better spacing
- IMPROVE the event panel and log container styling
- ADD responsive improvements for mobile`
}

CRITICAL RULES - DO NOT BREAK:
1. PRESERVE the WebSocket connection code EXACTLY (connect(), ws.onopen, ws.onmessage, ws.onclose)
2. PRESERVE all element IDs: stat-day, stat-era, stat-pop, stat-gold, stat-tech, stat-tanks, stat-status, stat-build, event-panel, log-stream, gameCanvas
3. KEEP dark background #070913 - NO white backgrounds
4. KEEP overflow: hidden and position: fixed on body
5. Return the COMPLETE modified HTML code`;

        const aiResponse = await queryAI(prompt, "CODE IMPROVEMENT - " + improvementType);
        
        if (aiResponse && aiResponse.length > 100) {
            const htmlMatch = aiResponse.match(/```html[\s\S]*?```/) || aiResponse.match(/<!DOCTYPE html>[\s\S]*?<\/html>/);
            
            if (htmlMatch) {
                let newHtml = htmlMatch[0].replace(/```html/g, '').replace(/```/g, '').trim();
                
                const hasWebSocket = /new WebSocket|ws\.onopen|ws\.onmessage/i.test(newHtml);
                const hasWhiteBg = /background:\s*(white|#fff|#ffffff)/i.test(newHtml);
                const hasScroll = /overflow:\s*(auto|scroll)/i.test(newHtml);
                const hasIDs = /stat-day|stat-era|stat-pop/i.test(newHtml);
                
                if (!hasWebSocket || hasWhiteBg || hasScroll || !hasIDs) {
                    console.log("⚠️ AI generated invalid HTML - REJECTED");
                    addLog("[AI] Invalid HTML rejected - keeping current");
                } else {
                    fs.writeFileSync(htmlPath, newHtml);
                    console.log("✅ AI HTML applied successfully");
                }
            }
        }
        
        worldState.aiImprovements += 1;
        addLog("[AI COMMIT SUCCESS] " + improvementType + " | Total: " + worldState.aiImprovements);
        
        pushToGitHub(htmlPath, improvementType, worldState.day).catch(() => {});
        
    } catch (err) {
        console.error("Error:", err.message);
    }
}

// START SERVER
SERVER.listen(PORT, () => {
    console.log("🚀 Dark Fantasy Civilization active on port " + PORT);
    console.log("📊 Day:", worldState.day, "| Population:", worldState.population);
    console.log("🤖 AI Model: qwen/qwen3.6-27b");
    console.log("⏱️ Events: every 250 days | Code: every 400 days | Rate: 120s");
    console.log("⚖️ Economy: Balanced (tax 8, services 3, military 100)");
    console.log("🎨 AI improves: CSS, Map Graphics & Mechanics, HTML");
    
    addLog("[SYSTEM] Simulation started.");
    broadcastState();
    
    console.log("\n🔌 Testing AI connection...");
    queryAI("Say OK", "CONNECTION TEST").then(response => {
        if (response) {
            console.log("✅ AI CONNECTION ESTABLISHED");
            addLog("[SYSTEM] AI System ready.");
        } else {
            console.log("⚠️ AI connection failed");
            addLog("[SYSTEM] AI unavailable.");
        }
        broadcastState();
    });
});

/**
 * Clean HTML - PROTECTED
 */
function getCleanHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Sovereign AI Engine</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; }
        body { background: #070913 !important; color: #e0e6ed; min-height: 100dvh; display: flex; flex-direction: column; padding: 10px; gap: 8px; overflow: hidden !important; position: fixed !important; inset: 0; }
        .dashboard { background: rgba(16,22,36,0.9); border: 1px solid rgba(0,210,255,0.25); border-radius: 10px; padding: 10px; flex-shrink: 0; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
        .stat-card { background: rgba(25,33,52,0.6); border-radius: 6px; padding: 6px; }
        .stat-label { font-size: 9px; color: #6b7c93; text-transform: uppercase; }
        .stat-value { font-size: 12px; font-weight: bold; color: #fff; }
        #map-container { flex: 1; background: #04060d; border: 1px solid rgba(0,210,255,0.25); border-radius: 10px; overflow: hidden; min-height: 0; }
        canvas { display: block; width: 100%; height: 100%; }
        .event-panel { background: rgba(12,17,29,0.95); border: 1px solid #ff4444; border-radius: 8px; padding: 8px; font-size: 10px; color: #ff6666; max-height: 60px; overflow-y: auto; flex-shrink: 0; }
        .log-container { height: 80px; background: rgba(12,17,29,0.95); border: 1px solid rgba(0,210,255,0.2); border-radius: 10px; padding: 8px; overflow-y: auto; font-family: monospace; font-size: 10px; flex-shrink: 0; }
        @media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-label">DAY</div><div class="stat-value" id="stat-day">-</div></div>
            <div class="stat-card"><div class="stat-label">ERA</div><div class="stat-value" id="stat-era">-</div></div>
            <div class="stat-card"><div class="stat-label">POP</div><div class="stat-value" id="stat-pop">-</div></div>
            <div class="stat-card"><div class="stat-label">GOLD</div><div class="stat-value" id="stat-gold">-</div></div>
            <div class="stat-card"><div class="stat-label">TECH</div><div class="stat-value" id="stat-tech">-</div></div>
            <div class="stat-card"><div class="stat-label">DEF</div><div class="stat-value" id="stat-tanks">-</div></div>
            <div class="stat-card"><div class="stat-label">STATUS</div><div class="stat-value" id="stat-status">-</div></div>
            <div class="stat-card"><div class="stat-label">BUILD</div><div class="stat-value" id="stat-build">-</div></div>
        </div>
    </div>
    <div id="map-container"><canvas id="gameCanvas"></canvas></div>
    <div class="event-panel" id="event-panel">No active events</div>
    <div class="log-container"><div id="log-stream">Connecting...</div></div>
    <script>
        let ws;
        let worldState = null;
        function connect() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(protocol + '//' + window.location.host);
            ws.onopen = () => { document.getElementById('log-stream').innerHTML = '<span style="color:#00ff88;">Connected</span>'; };
            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'WORLD_UPDATE') { worldState = msg.data; updateUI(); }
                } catch (e) {}
            };
            ws.onclose = () => { setTimeout(connect, 2000); };
        }
        function updateUI() {
            if (!worldState) return;
            document.getElementById('stat-day').innerText = worldState.day;
            document.getElementById('stat-era').innerText = worldState.era;
            document.getElementById('stat-pop').innerText = worldState.population;
            document.getElementById('stat-gold').innerText = Math.floor(worldState.treasury).toLocaleString();
            document.getElementById('stat-tech').innerText = Number(worldState.techPower).toFixed(1);
            document.getElementById('stat-tanks').innerText = worldState.tanks;
            document.getElementById('stat-status').innerText = worldState.inWar ? 'WAR' : 'PEACE';
            document.getElementById('stat-build').innerText = worldState.engineBuild || 'v2.0';
            const ep = document.getElementById('event-panel');
            if (worldState.activeEvents && worldState.activeEvents.length > 0) {
                ep.innerHTML = worldState.activeEvents.map(e => '⚡ ' + e.description).join(' | ');
                ep.style.borderColor = '#ff4444';
            } else {
                ep.innerHTML = 'No active events';
                ep.style.borderColor = '#00ff88';
            }
            const logBox = document.getElementById('log-stream');
            if (worldState.logs && worldState.logs.length > 0) {
                logBox.innerHTML = worldState.logs.map(l => '<div>' + l + '</div>').join('');
                logBox.scrollTop = logBox.scrollHeight;
            }
        }
        connect();
    </script>
</body>
</html>`;
}