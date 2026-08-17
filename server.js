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
const WSS = new WebSocket.Server({ 
    server: SERVER,
    perMessageDeflate: false
});
const STATE_FILE = path.join(__dirname, 'worldState.json');

// Rate limiter for Groq API
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
        console.log("✅ State loaded - Day:", worldState.day);
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
    console.log(`📤 Broadcast sent to ${sentCount} clients - Day ${worldState.day}, Logs: ${worldState.logs.length}`);
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
    if (!GROQ_API_KEY) {
        console.error("❌ No GROQ_API_KEY");
        return null;
    }

    console.log("🔑 Groq Key:", GROQ_API_KEY.substring(0, 10) + "...");
    
    try {
        await rateLimiter.waitForSlot();
        
        const url = 'https://api.groq.com/openai/v1/chat/completions';
        
        console.log('🔄 Trying Groq (Qwen 3.6 27B)...');
        
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
                temperature: 0.8,
                max_tokens: 4096
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('📊 Groq Status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;
            if (text && text.length > 0) {
                console.log('✅ Success with Groq!');
                return text;
            }
        } else if (response.status === 429) {
            console.log('⏳ Rate limit, waiting 60s...');
            await new Promise(resolve => setTimeout(resolve, 60000));
        } else {
            console.error('❌ Groq Error:', response.status);
        }
    } catch (e) {
        console.error('❌ Groq Fetch error:', e.message);
    }
    
    return null;
}

/**
 * Execute git command
 */
function executeGitCommand(command, retries = 3) {
    return new Promise((resolve, reject) => {
        const attemptCommand = (attempt) => {
            exec(command, { maxBuffer: 1024 * 1024 * 10, timeout: 30000 }, (error, stdout, stderr) => {
                if (error) {
                    if (attempt < retries) {
                        setTimeout(() => attemptCommand(attempt + 1), 5000 * attempt);
                    } else {
                        reject(error);
                    }
                } else {
                    resolve(stdout);
                }
            });
        };
        attemptCommand(1);
    });
}

/**
 * Push to GitHub
 */
async function pushToGitHub(htmlPath, improvementTypeName, day) {
    if (!GITHUB_TOKEN) return false;
    
    console.log("🔄 Starting GitHub push...");
    
    try {
        const cleanToken = GITHUB_TOKEN.trim();
        const repoUrl = `https://${cleanToken}@github.com/edthedog-debug/dark-fantasy-civ.git`;
        
        await executeGitCommand('rm -rf /tmp/repo', 1);
        await executeGitCommand(`git clone --depth 1 ${repoUrl} /tmp/repo`, 2);
        
        const originalDir = process.cwd();
        process.chdir('/tmp/repo');
        
        await executeGitCommand('git config user.email "ai@example.com"');
        await executeGitCommand('git config user.name "AI Auto-Improver"');
        
        const targetPublicDir = path.join('/tmp/repo', 'public');
        if (!fs.existsSync(targetPublicDir)) fs.mkdirSync(targetPublicDir, { recursive: true });
        
        fs.copyFileSync(htmlPath, path.join(targetPublicDir, 'index.html'));
        fs.copyFileSync(STATE_FILE, path.join('/tmp/repo', 'worldState.json'));
        
        await executeGitCommand('git add public/index.html worldState.json');
        await executeGitCommand(`git commit -m "🤖 [AI] ${improvementTypeName} - Day ${day}" --allow-empty`);
        await executeGitCommand('git push origin main --force', 2);
        
        console.log("✅ Pushed to GitHub!");
        process.chdir(originalDir);
        return true;
        
    } catch (gitError) {
        console.error("❌ GitHub push failed:", gitError.message);
        return false;
    }
}

/**
 * AI GENERATIVE EVENTS
 */
async function generateAIEvents() {
    const prompt = `Generate a dark fantasy civilization event with VISUAL EFFECT data.
    Current stats: Day ${worldState.day}, Population: ${worldState.population}, Treasury: ${worldState.treasury}, Tech: ${worldState.techPower}.
    Return ONLY JSON with event, newPhilosophy, goldImpact, happinessImpact, techImpact, visualEffect, duration`;
    
    let parsed = null;
    try {
        const rawText = await queryAI(prompt);
        if (rawText && !rawText.startsWith("//")) {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try { parsed = JSON.parse(jsonMatch[0]); } catch (e) {}
            }
        }
    } catch (err) {}

    if (!parsed || !parsed.event) {
        const fallbacks = [
            { event: "Blood moon rises over the kingdom", newPhilosophy: "Lunar Worship", goldImpact: -50000000000, happinessImpact: -15, techImpact: 0.5, visualEffect: "blood_moon", duration: 50 },
            { event: "Great fire ravages the capital", newPhilosophy: "Phoenix Rebirth", goldImpact: -30000000000, happinessImpact: -20, techImpact: 0.2, visualEffect: "fire", duration: 30 },
            { event: "Devastating storm destroys crops", newPhilosophy: "Storm Resilience", goldImpact: -20000000000, happinessImpact: -10, techImpact: 0.1, visualEffect: "storm", duration: 20 },
            { event: "Plague sweeps through population", newPhilosophy: "Medical Revolution", goldImpact: -40000000000, happinessImpact: -25, techImpact: 0.8, visualEffect: "plague", duration: 60 },
            { event: "Golden age of prosperity", newPhilosophy: "Enlightenment", goldImpact: 5000000000, happinessImpact: 20, techImpact: 1.0, visualEffect: "prosperity", duration: 40 }
        ];
        parsed = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    addLog("[AI EVENT] " + parsed.event);
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
 * AI CODE IMPROVEMENT
 */
async function autoImproveGameCode() {
    console.log("\n🤖 AI CODE IMPROVEMENT...");
    addLog("[AI AUTO-CODING] Applying AI improvement...");

    try {
        const htmlPath = path.join(__dirname, 'public', 'index.html');
        if (!fs.existsSync(htmlPath)) return;
        
        let currentHtml = fs.readFileSync(htmlPath, 'utf8');
        if (currentHtml.length > 100000) {
            currentHtml = getCleanHTML();
            fs.writeFileSync(htmlPath, currentHtml);
        }
        
        const improvementType = worldState.aiImprovements % 3;
        let prompt, codeToAdd;
        
        switch(improvementType) {
            case 0:
                prompt = `Enhance CSS for Dark Fantasy game. PRESERVE ALL IDs. Return ONLY valid CSS (max 250 lines).`;
                break;
            case 1:
                prompt = `Improve Canvas rendering. PRESERVE ALL FUNCTIONALITY. Return ONLY valid JavaScript (max 400 lines).`;
                break;
            case 2:
                prompt = `Polish HTML layout. PRESERVE ALL IDs. Return ONLY valid HTML body (max 150 lines).`;
                break;
        }
        
        const aiResponse = await queryAI(prompt);
        
        if (aiResponse && aiResponse.length > 50) {
            codeToAdd = aiResponse.replace(/```css/gi, '').replace(/```javascript/gi, '').replace(/```html/gi, '').replace(/```js/gi, '').replace(/```/g, '').trim();
        } else {
            codeToAdd = null;
        }
        
        if (codeToAdd && codeToAdd.length > 50) {
            let improvedHtml = currentHtml;
            if (improvementType === 0) {
                improvedHtml = improvedHtml.replace(/<style>[\s\S]*?<\/style>/g, `<style>\n${codeToAdd}\n</style>`);
            } else if (improvementType === 1) {
                improvedHtml = improvedHtml.replace(/<script>[\s\S]*?<\/script>/g, `<script>\n${codeToAdd}\n</script>`);
            } else {
                improvedHtml = improvedHtml.replace(/<body>[\s\S]*?<\/body>/g, `<body>\n${codeToAdd}\n</body>`);
            }
            fs.writeFileSync(htmlPath, improvedHtml);
        } else {
            fs.writeFileSync(htmlPath, getCleanHTML());
        }
        
        worldState.aiImprovements += 1;
        const improvementTypeName = improvementType === 0 ? "Graphics CSS" : improvementType === 1 ? "Event Canvas JS" : "Civilization HTML";
        addLog(`[AI COMMIT SUCCESS] ${improvementTypeName}! Total: ${worldState.aiImprovements}`);
        
        await pushToGitHub(htmlPath, improvementTypeName, worldState.day);
        
    } catch (err) {
        console.error("Error:", err.message);
    }
}

/**
 * Clean HTML
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
        body { background: #070913; color: #e0e6ed; min-height: 100dvh; display: flex; flex-direction: column; padding: 10px; gap: 8px; overflow: hidden; position: fixed; inset: 0; }
        .dashboard { background: rgba(16,22,36,0.9); border: 1px solid rgba(0,210,255,0.25); border-radius: 10px; padding: 10px; flex-shrink: 0; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
        .stat-card { background: rgba(25,33,52,0.6); border-radius: 6px; padding: 6px; }
        .stat-label { font-size: 9px; color: #6b7c93; text-transform: uppercase; }
        .stat-value { font-size: 12px; font-weight: bold; color: #fff; }
        #map-container { flex: 1; background: #04060d; border: 1px solid rgba(0,210,255,0.25); border-radius: 10px; position: relative; overflow: hidden; min-height: 0; }
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
        
        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(protocol + '//' + window.location.host);
            
            ws.onopen = () => {
                console.log('WebSocket connected');
                document.getElementById('log-stream').innerHTML = '<span style="color:#00ff88;">Connected - waiting for data...</span>';
            };
            
            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'WORLD_UPDATE') {
                        worldState = msg.data;
                        updateUI();
                        generateObjects();
                    }
                } catch (e) {
                    console.error('Parse error:', e);
                }
            };
            
            ws.onerror = () => {
                document.getElementById('log-stream').innerHTML = '<span style="color:#ff4444;">Connection error</span>';
            };
            
            ws.onclose = () => {
                document.getElementById('log-stream').innerHTML = '<span style="color:#ffcc00;">Reconnecting...</span>';
                setTimeout(connectWebSocket, 2000);
            };
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
            document.getElementById('stat-status').style.color = worldState.inWar ? '#e74c3c' : '#2ecc71';
            document.getElementById('stat-build').innerText = worldState.engineBuild || 'v2.0';
            
            const ep = document.getElementById('event-panel');
            if (worldState.activeEvents && worldState.activeEvents.length > 0) {
                ep.innerHTML = worldState.activeEvents.map(e => '⚡ ' + e.description).join(' | ');
                ep.style.borderColor = '#ff4444';
                ep.style.color = '#ff6666';
            } else {
                ep.innerHTML = 'No active events';
                ep.style.borderColor = '#00ff88';
                ep.style.color = '#00ff88';
            }
            
            const logBox = document.getElementById('log-stream');
            if (worldState.logs && worldState.logs.length > 0) {
                logBox.innerHTML = worldState.logs.map(l => '<div class="log-entry">' + l + '</div>').join('');
                logBox.scrollTop = logBox.scrollHeight;
            }
        }
        
        // Canvas
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        let frameCount = 0;
        let buildings = [];
        let units = [];
        
        function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
        function px(p, d) { return (p / 100) * d; }
        
        function generateObjects() {
            if (!worldState) return;
            buildings = []; units = [];
            const bCount = clamp(Math.floor(worldState.population / 5) + 2, 5, 80);
            const uCount = clamp(Math.floor(worldState.population / 10) + 2, 3, 50);
            for (let i = 0; i < bCount; i++) {
                buildings.push({ xPercent: 5 + ((i * 7) % 90), yPercent: 10 + ((i * 5) % 80), type: i % 4, heightPercent: 8 + (i % 5) * 3 });
            }
            for (let u = 0; u < uCount; u++) {
                units.push({ xPercent: 5 + Math.random() * 90, yPercent: 10 + Math.random() * 80, color: ['#f66','#66f','#6f6','#ff6','#f6f'][u%5] });
            }
        }
        
        function resizeCanvas() {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
        }
        window.addEventListener('resize', () => setTimeout(resizeCanvas, 150));
        resizeCanvas();
        
        function render() {
            frameCount++;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Terrain
            for (let x = 0; x < canvas.width; x += 16) {
                for (let y = 0; y < canvas.height; y += 16) {
                    ctx.fillStyle = ((x + y) % 32 === 0) ? '#1a3a1a' : '#1a2a1a';
                    ctx.fillRect(x, y, 16, 16);
                }
            }
            
            // River
            for (let y = 0; y < canvas.height; y += 4) {
                const wave = Math.sin((y * 0.04) + frameCount * 0.03) * 8;
                ctx.fillStyle = '#1a4a6a';
                ctx.fillRect(canvas.width * 0.4 + wave, y, 16, 4);
            }
            
            // Buildings
            buildings.forEach(b => {
                const bx = px(b.xPercent, canvas.width);
                const by = px(b.yPercent, canvas.height);
                const bh = px(b.heightPercent, canvas.height);
                ctx.fillStyle = ['#8a8a8a','#c4a060','#6a6a6a','#7a7a7a'][b.type];
                ctx.fillRect(Math.round(bx - 6), Math.round(by - bh), 12, bh);
                ctx.fillStyle = '#ffff88';
                ctx.fillRect(Math.round(bx - 2), Math.round(by - bh + 5), 4, 4);
            });
            
            // Units
            units.forEach(u => {
                const ux = px(u.xPercent, canvas.width);
                const uy = px(u.yPercent, canvas.height);
                const legOffset = Math.sin(frameCount * 0.1 + ux) > 0 ? 0 : 3;
                ctx.fillStyle = u.color;
                ctx.fillRect(Math.round(ux), Math.round(uy - 6), 3, 6);
                ctx.fillStyle = '#fc9';
                ctx.fillRect(Math.round(ux), Math.round(uy - 9), 3, 3);
            });
            
            // Event overlays
            if (worldState && worldState.activeEvents) {
                worldState.activeEvents.forEach(evt => {
                    if (evt.type === 'blood_moon') { ctx.fillStyle = 'rgba(150,0,0,0.3)'; ctx.fillRect(0,0,canvas.width,canvas.height); }
                    if (evt.type === 'fire') { ctx.fillStyle = 'rgba(255,100,0,0.2)'; ctx.fillRect(0,0,canvas.width,canvas.height); }
                    if (evt.type === 'storm') { ctx.fillStyle = 'rgba(30,30,60,0.5)'; ctx.fillRect(0,0,canvas.width,canvas.height); }
                    if (evt.type === 'plague') { ctx.fillStyle = 'rgba(0,150,0,0.2)'; ctx.fillRect(0,0,canvas.width,canvas.height); }
                    if (evt.type === 'prosperity') { ctx.fillStyle = 'rgba(255,215,0,0.15)'; ctx.fillRect(0,0,canvas.width,canvas.height); }
                });
            }
            
            requestAnimationFrame(render);
        }
        
        connectWebSocket();
        requestAnimationFrame(render);
    </script>
</body>
</html>`;
}

// SIMULATION TICK
function runSimulationTick() {
    worldState.day += 1;

    if (worldState.treasury <= 0 && worldState.happiness < 50) {
        worldState.treasury += 300;
        worldState.happiness = Math.min(100, worldState.happiness + 25);
        addLog("[RECOVERY] Sovereign Reserve injected 300 Gold!");
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
        addLog("[ECONOMY ALERT] Daily net loss: " + netProfit + " Gold.");
    }

    worldState.techPower += 0.01;

    if (worldState.happiness > 75 && worldState.treasury > 100 && worldState.day % 4 === 0) {
        worldState.population += 1;
        addLog("[DEMOGRAPHICS] +1 immigrant. Pop: " + worldState.population);
    } else if (worldState.happiness < 35 && worldState.population > 1 && worldState.day % 4 === 0) {
        worldState.population -= 1;
        addLog("[DEMOGRAPHICS] -1 emigrated. Pop: " + worldState.population);
    }

    if (worldState.activeEvents) {
        worldState.activeEvents = worldState.activeEvents.filter(e => e.endDay > worldState.day);
    }

    if (worldState.day % 150 === 0) {
        generateAIEvents().catch(err => console.error("AI Event error:", err));
    }

    if (worldState.day % 250 === 0) {
        autoImproveGameCode().catch(err => console.error("AI Improvement error:", err));
    }

    saveWorldState();
    broadcastState();
}

setInterval(runSimulationTick, 4000);

WSS.on('connection', (ws) => {
    console.log('🔗 Client connected');
    ws.send(JSON.stringify({ type: 'WORLD_UPDATE', data: worldState }));
    console.log('📤 Initial state sent - Day:', worldState.day, 'Logs:', worldState.logs.length);
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
    });
});

SERVER.listen(PORT, () => {
    console.log("🚀 Dark Fantasy Civilization active on port " + PORT);
    console.log("📊 Day:", worldState.day, "| AI Improvements:", worldState.aiImprovements);
    console.log("🤖 Groq API (Qwen 3.6 27B)");
    console.log("🔌 WebSocket: ready");
    
    queryAI("Say 'OK'")
        .then(response => {
            if (response) {
                console.log("✅ Groq ready");
                addLog("[SYSTEM] AI System ready.");
                broadcastState();
            }
        });
});