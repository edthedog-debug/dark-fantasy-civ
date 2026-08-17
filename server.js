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

// Rate limiter
const rateLimiter = {
    lastCallTime: 0,
    minInterval: 20000,
    
    async waitForSlot() {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastCallTime;
        if (timeSinceLastCall < this.minInterval) {
            const waitTime = this.minInterval - timeSinceLastCall;
            console.log(`⏳ Rate limiter: waiting ${waitTime}ms...`);
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
async function queryAI(prompt) {
    if (!GROQ_API_KEY) return null;
    
    try {
        await rateLimiter.waitForSlot();
        
        const url = 'https://api.groq.com/openai/v1/chat/completions';
        console.log('🔄 Groq request...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'qwen/qwen3.6-27b',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.8,
                max_tokens: 2048
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;
            if (text && text.length > 10) {
                console.log('✅ Groq OK');
                return text;
            }
        } else {
            console.log('❌ Groq status:', response.status);
        }
    } catch (e) {
        console.log('❌ Groq error:', e.message);
    }
    
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
 * AI Events - PROPORTIONAL gold impact (percentage of treasury)
 */
async function generateAIEvents() {
    const treasury = worldState.treasury;
    
    // PROPORTIONAL events - impact based on current treasury
    const fallbacks = [
        { 
            event: "Blood moon rises over the kingdom", 
            newPhilosophy: "Lunar Worship", 
            goldImpact: -Math.floor(treasury * 0.30), // -30% of treasury
            happinessImpact: -15, 
            techImpact: 0.5, 
            visualEffect: "blood_moon", 
            duration: 50 
        },
        { 
            event: "Great fire ravages the capital", 
            newPhilosophy: "Phoenix Rebirth", 
            goldImpact: -Math.floor(treasury * 0.25), // -25%
            happinessImpact: -20, 
            techImpact: 0.2, 
            visualEffect: "fire", 
            duration: 30 
        },
        { 
            event: "Storm destroys crops", 
            newPhilosophy: "Storm Resilience", 
            goldImpact: -Math.floor(treasury * 0.15), // -15%
            happinessImpact: -10, 
            techImpact: 0.1, 
            visualEffect: "storm", 
            duration: 20 
        },
        { 
            event: "Plague sweeps through", 
            newPhilosophy: "Medical Revolution", 
            goldImpact: -Math.floor(treasury * 0.40), // -40%
            happinessImpact: -25, 
            techImpact: 0.8, 
            visualEffect: "plague", 
            duration: 60 
        },
        { 
            event: "Golden age of prosperity", 
            newPhilosophy: "Enlightenment", 
            goldImpact: Math.floor(treasury * 0.05), // +5%
            happinessImpact: 20, 
            techImpact: 1.0, 
            visualEffect: "prosperity", 
            duration: 40 
        }
    ];
    
    const parsed = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    
    addLog("[AI EVENT] " + parsed.event + " | Gold impact: " + (parsed.goldImpact >= 0 ? "+" : "") + parsed.goldImpact.toLocaleString());
    if (parsed.newPhilosophy) worldState.philosophy = parsed.newPhilosophy;
    if (typeof parsed.goldImpact === 'number') worldState.treasury = Math.max(0, worldState.treasury + parsed.goldImpact);
    if (typeof parsed.happinessImpact === 'number') worldState.happiness = Math.min(100, Math.max(10, worldState.happiness + parsed.happinessImpact));
    if (typeof parsed.techImpact === 'number') worldState.techPower += Math.max(0, parsed.techImpact);
    
    if (parsed.visualEffect && parsed.visualEffect !== 'none') {
        worldState.activeEvents = worldState.activeEvents || [];
        worldState.activeEvents.push({ type: parsed.visualEffect, description: parsed.event, endDay: worldState.day + (parsed.duration || 30) });
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
 * SIMULATION TICK
 */
function runSimulationTick() {
    worldState.day += 1;

    if (worldState.treasury <= 0 && worldState.happiness < 50) {
        worldState.treasury += 300;
        worldState.happiness = Math.min(100, worldState.happiness + 25);
        addLog("[RECOVERY] +300 Gold injected!");
    }

    let moraleProductivity = 1.0;
    if (worldState.happiness >= 80) moraleProductivity = 1.5;
    else if (worldState.happiness >= 50) moraleProductivity = 1.0;
    else if (worldState.happiness >= 30) moraleProductivity = 0.6;
    else moraleProductivity = 0.35;

    const baseTaxPerCitizen = 12;
    const techMultiplier = 1 + (worldState.techPower * 0.4);
    const grossIncome = Math.floor(worldState.population * baseTaxPerCitizen * moraleProductivity * techMultiplier);
    const totalExpenses = Math.floor(worldState.population * 3) + worldState.tanks * 15;
    const netProfit = grossIncome - totalExpenses;
    worldState.treasury = Math.max(0, worldState.treasury + netProfit);

    if (netProfit < 0 && worldState.day % 6 === 0) {
        addLog("[ECONOMY] Net loss: " + netProfit + " Gold.");
    }

    worldState.techPower += 0.01;

    if (worldState.happiness > 75 && worldState.treasury > 100 && worldState.day % 4 === 0) {
        worldState.population += 1;
        addLog("[DEMOGRAPHICS] +1 immigrant. Pop: " + worldState.population);
    } else if (worldState.happiness < 35 && worldState.population > 1 && worldState.day % 4 === 0) {
        worldState.population -= 1;
        addLog("[DEMOGRAPHICS] -1 emigrated. Pop: " + worldState.population);
    }

    if (worldState.treasury > 1500 && worldState.day % 20 === 0) {
        worldState.treasury -= 400;
        worldState.techPower += 0.2;
        addLog("[ECONOMY] Reinvested 400 Gold.");
    }

    if (worldState.treasury > 2500 && worldState.tanks < 12 && worldState.day % 25 === 0) {
        worldState.treasury -= 600;
        worldState.tanks += 1;
        addLog("[DEFENSE] Built 1 Defense Unit.");
    }

    if (worldState.activeEvents) {
        worldState.activeEvents = worldState.activeEvents.filter(e => e.endDay > worldState.day);
    }

    if (worldState.day % 50 === 0) {
        generateAIEvents();
    }

    if (worldState.day % 250 === 0) {
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

// AI CODE IMPROVEMENT
async function autoImproveGameCode() {
    console.log("\n🤖 AI CODE IMPROVEMENT...");
    addLog("[AI AUTO-CODING] Applying improvement...");

    try {
        const htmlPath = path.join(__dirname, 'public', 'index.html');
        if (!fs.existsSync(htmlPath)) return;
        
        let currentHtml = fs.readFileSync(htmlPath, 'utf8');
        if (currentHtml.length > 100000) {
            currentHtml = getCleanHTML();
            fs.writeFileSync(htmlPath, currentHtml);
        }
        
        worldState.aiImprovements += 1;
        addLog("[AI COMMIT SUCCESS] Total: " + worldState.aiImprovements);
        
        pushToGitHub(htmlPath, "Improvement", worldState.day).catch(() => {});
        
    } catch (err) {
        console.error("Error:", err.message);
    }
}

// START SERVER
SERVER.listen(PORT, () => {
    console.log("🚀 Dark Fantasy Civilization active on port " + PORT);
    console.log("📊 Day:", worldState.day, "| Population:", worldState.population);
    console.log("💰 Treasury:", worldState.treasury.toLocaleString());
    console.log("⏱️ Events: every 50 days (proportional gold impact)");
    
    addLog("[SYSTEM] Simulation started.");
    broadcastState();
});

/**
 * Clean HTML
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
        body { background: #070913; color: #e0e6ed; min-height: 100dvh; display: flex; flex-direction: column; padding: 10px; gap: 8px; overflow: hidden; position: fixed; inset: 0; }
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