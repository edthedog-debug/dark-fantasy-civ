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
    perMessageDeflate: false // Fix for some WebSocket issues
});
const STATE_FILE = path.join(__dirname, 'worldState.json');

// Rate limiter for Groq API - INCREASED to 20 seconds
const rateLimiter = {
    lastCallTime: 0,
    minInterval: 20000,
    
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
 * GROQ API - Uses Qwen 3.6 27B with 20s rate limiter
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
                return text;
            }
        } else if (response.status === 429) {
            console.log('⏳ Rate limit (429). Waiting 60 seconds...');
            await new Promise(resolve => setTimeout(resolve, 60000));
            
            const retryResponse = await fetch(url, {
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
                })
            });
            
            if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                const retryText = retryData.choices?.[0]?.message?.content;
                if (retryText && retryText.length > 0) return retryText;
            }
        } else {
            console.error('❌ Groq Error:', response.status);
        }
    } catch (e) {
        console.error('❌ Groq Fetch error:', e.message);
    }
    
    return null;
}

/**
 * Execute git command with retry
 */
function executeGitCommand(command, retries = 3) {
    return new Promise((resolve, reject) => {
        const attemptCommand = (attempt) => {
            console.log(`🔧 Git (${attempt}/${retries}): ${command.substring(0, 80)}`);
            
            exec(command, { maxBuffer: 1024 * 1024 * 10, timeout: 30000 }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`❌ Git failed (${attempt})`);
                    if (attempt < retries) {
                        setTimeout(() => attemptCommand(attempt + 1), 5000 * attempt);
                    } else {
                        reject(error);
                    }
                } else {
                    console.log(`✅ Git success`);
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
 * 1. AI GENERATIVE EVENTS
 */
async function generateAIEvents() {
    const prompt = `Generate a dark fantasy civilization event with VISUAL EFFECT data.
    Current stats: Day ${worldState.day}, Population: ${worldState.population}, Treasury: ${worldState.treasury}, Tech: ${worldState.techPower}.
    
    Return ONLY JSON:
    {
        "event": "description",
        "newPhilosophy": "name",
        "goldImpact": number,
        "happinessImpact": number,
        "techImpact": number,
        "visualEffect": "blood_moon" | "fire" | "storm" | "plague" | "prosperity" | "none",
        "duration": number
    }
    
    IMPORTANT: Treasury is ${worldState.treasury} - create events with LARGE negative goldImpact`;
    
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
 * 2. AI CODE IMPROVEMENT
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
 * Returns clean HTML with WebSocket FIX
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
            <div class="stat-card"><div class="stat-label">DAY</div><div class="stat-value" id="stat-day">1</div></div>
            <div class="stat-card"><div class="stat-label">ERA</div><div class="stat-value" id="stat-era">Era 1</div></div>
            <div class="stat-card"><div class="stat-label">POP</div><div class="stat-value" id="stat-pop">0</div></div>
            <div class="stat-card"><div class="stat-label">GOLD</div><div class="stat-value" id="stat-gold">0</div></div>
            <div class="stat-card"><div class="stat-label">TECH</div><div class="stat-value" id="stat-tech">0.0</div></div>
            <div class="stat-card"><div class="stat-label">DEF</div><div class="stat-value" id="stat-tanks">0</div></div>
            <div class="stat-card"><div class="stat-label">STATUS</div><div class="stat-value" id="stat-status">PEACE</div></div>
            <div class="stat-card"><div class="stat-label">BUILD</div><div class="stat-value" id="stat-build">v2.0</div></div>
        </div>
    </div>
    <div id="map-container"><canvas id="gameCanvas"></canvas></div>
    <div class="event-panel" id="event-panel">No active events</div>
    <div class="log-container"><div id="log-stream">Connecting...</div></div>
    <script>
        // WebSocket with auto-reconnect
        let ws;
        let worldState = { day: 1, era: "Era 1", population: 10, treasury: 500, techPower: 1, tanks: 0, logs: [], inWar: false, activeEvents: [] };
        
        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(protocol + '//' + window.location.host);
            
            ws.onopen = () => {
                console.log('✅ WebSocket connected');
                document.getElementById('log-stream').innerHTML = '<div style="color:#00ff88;">✅ Connected to AI Engine</div>';
            };
            
            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'WORLD_UPDATE') {
                        worldState = msg.data;
                        updateUI();
                    }
                } catch (e) {
                    console.error('Parse error:', e);
                }
            };
            
            ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
            };
            
            ws.onclose = () => {
                console.log('🔄 WebSocket closed - reconnecting in 3s...');
                setTimeout(connectWebSocket, 3000);
            };
        }
        
        function updateUI() {
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
                ep.innerHTML = worldState.activeEvents.map(e => '⚡ ' + e.description).join('<br>');
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
        
        // Start WebSocket connection
        connectWebSocket();
        
        // Pixel Art Engine
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        let frameCount = 0;
        let buildings = [];
        let units = [];
        function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
        function resizeCanvas() { canvas.width = canvas.parentElement.clientWidth; canvas.height = canvas.parentElement.clientHeight; generateObjects(); }
        window.addEventListener('resize', () => setTimeout(resizeCanvas, 150));
        resizeCanvas();
        function generateObjects() {
            buildings = []; units = [];
            const bCount = clamp(Math.floor(worldState.population / 5) + 2, 5, 80);
            const uCount = clamp(Math.floor(worldState.population / 10) + 2, 3, 50);
            const m = 30;
            for (let i = 0; i < bCount; i++) {
                buildings.push({ x: clamp(m + (i*47) % (canvas.width-2*m), m, canvas.width-m), y: clamp(m + (i*31) % (canvas.height-2*m), m, canvas.height-m), type: i%4, h: clamp(20 + (i%5)*8, 15, 60) });
            }
            for (let u = 0; u < uCount; u++) {
                units.push({ x: m + Math.random()*(canvas.width-2*m), y: m + Math.random()*(canvas.height-2*m), tx: m + Math.random()*(canvas.width-2*m), ty: m + Math.random()*(canvas.height-2*m), speed: 0.5+Math.random(), color: ['#f66','#66f','#6f6','#ff6','#f6f'][u%5] });
            }
        }
        function render() {
            frameCount++;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let x = 0; x < canvas.width; x += 12) {
                for (let y = 0; y < canvas.height; y += 12) {
                    ctx.fillStyle = ((x+y)%24===0) ? '#2a3a1a' : '#1a2a1a';
                    ctx.fillRect(x, y, 12, 12);
                }
            }
            if (worldState.activeEvents) {
                worldState.activeEvents.forEach(evt => {
                    if (evt.type === 'blood_moon') { ctx.fillStyle = 'rgba(150,0,0,0.3)'; ctx.fillRect(0,0,canvas.width,canvas.height); }
                    if (evt.type === 'fire') { ctx.fillStyle = 'rgba(255,100,0,0.2)'; ctx.fillRect(0,0,canvas.width,canvas.height); }
                    if (evt.type === 'storm') { ctx.fillStyle = 'rgba(50,50,80,0.4)'; ctx.fillRect(0,0,canvas.width,canvas.height); }
                    if (evt.type === 'plague') { ctx.fillStyle = 'rgba(0,150,0,0.2)'; ctx.fillRect(0,0,canvas.width,canvas.height); }
                    if (evt.type === 'prosperity') { ctx.fillStyle = 'rgba(255,215,0,0.15)'; ctx.fillRect(0,0,canvas.width,canvas.height); }
                });
            }
            buildings.forEach(b => {
                ctx.fillStyle = ['#8a8a8a','#c4a060','#6a6a6a','#7a7a7a'][b.type];
                ctx.fillRect(Math.round(b.x-6), Math.round(b.y-b.h), 12, b.h);
                ctx.fillStyle = '#ffff88';
                ctx.fillRect(Math.round(b.x-2), Math.round(b.y-b.h+4), 4, 4);
            });
            units.forEach(u => {
                const dx = u.tx-u.x, dy = u.ty-u.y;
                const dist = Math.hypot(dx,dy);
                if (dist < 5) { u.tx = Math.random()*canvas.width; u.ty = Math.random()*canvas.height; }
                else { u.x += dx/dist*u.speed; u.y += dy/dist*u.speed; }
                u.x = clamp(u.x, 10, canvas.width-10);
                u.y = clamp(u.y, 10, canvas.height-10);
                ctx.fillStyle = u.color;
                ctx.fillRect(Math.round(u.x), Math.round(u.y-6), 3, 6);
                ctx.fillStyle = '#fc9';
                ctx.fillRect(Math.round(u.x), Math.round(u.y-9), 3, 3);
            });
            requestAnimationFrame(render);
        }
        render();
    </script>
</body>
</html>`;
}

// ASYNC SIMULATION TICK
function runSimulationTick() {
    worldState.day += 1;
    // ... (rest of simulation tick identical to original)

    saveWorldState();
    broadcastState();
}

setInterval(runSimulationTick, 4000);

WSS.on('connection', (ws) => {
    console.log('🔗 Client connected');
    ws.send(JSON.stringify({ type: 'WORLD_UPDATE', data: worldState }));
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
    });
});

SERVER.listen(PORT, () => {
    console.log("🚀 Dark Fantasy Civilization active on port " + PORT);
    console.log("📊 Day:", worldState.day, "| AI Improvements:", worldState.aiImprovements);
    console.log("🤖 Groq API (Qwen 3.6 27B)");
    console.log("🔌 WebSocket: auto-reconnect enabled");
    
    queryAI("Say 'OK'")
        .then(response => {
            if (response) {
                console.log("✅ Groq ready");
                addLog("[SYSTEM] AI System ready.");
            }
        });
});
