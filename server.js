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
 * 1. AI GENERATIVE EVENTS - with visual effects data
 */
async function generateAIEvents() {
    const prompt = `Generate a dark fantasy civilization event with VISUAL EFFECT data.
    Current stats: Day ${worldState.day}, Population: ${worldState.population}, Treasury: ${worldState.treasury}, Tech: ${worldState.techPower}.
    
    Return ONLY JSON with this structure:
    {
        "event": "description text",
        "newPhilosophy": "philosophy name",
        "goldImpact": number (can be negative for losses, LARGE numbers for realism),
        "happinessImpact": number (-50 to +50),
        "techImpact": number,
        "visualEffect": "blood_moon" | "fire" | "storm" | "plague" | "drought" | "prosperity" | "war" | "none",
        "duration": number (days the effect lasts)
    }
    
    IMPORTANT:
    - Treasury is ${worldState.treasury} which is TOO HIGH - create events with LARGE negative goldImpact
    - Visual effects should match the event type
    - Duration between 10-100 days`;
    
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
    
    // Store active event for visual rendering
    if (parsed.visualEffect && parsed.visualEffect !== 'none') {
        worldState.activeEvents = worldState.activeEvents || [];
        worldState.activeEvents.push({
            type: parsed.visualEffect,
            description: parsed.event,
            endDay: worldState.day + (parsed.duration || 30)
        });
    }
    
    // Clean expired events
    if (worldState.activeEvents) {
        worldState.activeEvents = worldState.activeEvents.filter(e => e.endDay > worldState.day);
    }
    
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
 * 2. AI CODE IMPROVEMENT - PRIORITIZES GRAPHICS AND EVENTS
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
            case 0: // GRAPHICS CSS + EVENT VISUALS
                prompt = `REPLACE ENTIRE CSS with OPTIMIZED pixel art styles.
                Current: Day ${worldState.day}, Pop ${worldState.population}, Tech ${worldState.techPower}, Era: ${worldState.era}.
                
                PRIORITY: GRAPHICS QUALITY AND EVENT VISUALS
                
                RULES:
                - Complete replacement CSS (not additions)
                - Pixel art style with sharp edges
                - Include CSS animations for events: blood moon (red overlay), fire (orange glow), storm (dark clouds), plague (green tint), prosperity (golden glow)
                - Responsive for mobile and desktop
                - Maximum 250 lines
                
                Return ONLY valid CSS.`;
                break;
                
            case 1: // CANVAS JS + EVENT RENDERING
                prompt = `REPLACE ENTIRE canvas JavaScript with OPTIMIZED pixel art engine.
                Current: Day ${worldState.day}, Pop ${worldState.population}, Tech ${worldState.techPower}.
                Buildings: ${Math.floor(worldState.population / 5)}, Units: ${Math.floor(worldState.population / 10)}.
                
                PRIORITY: GRAPHICS QUALITY AND EVENT VISUALIZATION
                
                RULES:
                - Complete replacement JavaScript (not additions)
                - Draw pixel art buildings with windows, doors, roofs
                - Draw animated units walking
                - RENDER ACTIVE EVENTS from worldState.activeEvents:
                  - blood_moon: red overlay + red moon
                  - fire: orange flames + smoke particles
                  - storm: dark clouds + lightning
                  - plague: green fog + particles
                  - prosperity: golden sparkles
                - Clamp ALL positions within canvas
                - Handle resize without duplicates
                - Maximum 400 lines
                
                Return ONLY valid JavaScript.`;
                break;
                
            case 2: // HTML + EVENT DISPLAY
                prompt = `REPLACE ENTIRE HTML body with OPTIMIZED structure.
                Current: Day ${worldState.day}, Pop ${worldState.population}, Era: ${worldState.era}.
                
                PRIORITY: EVENT DISPLAY AND CIVILIZATION COMPLEXITY
                
                RULES:
                - Complete replacement HTML (not additions)
                - Show: day, era, population, treasury, tech, defenses, status
                - Add EVENT DISPLAY PANEL showing worldState.activeEvents
                - Add BUILDING LIST showing civilization buildings
                - Pixel art style
                - Maximum 150 lines
                
                Return ONLY valid HTML body.`;
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
            let improvedHtml = currentHtml;
            
            if (improvementType === 0) {
                improvedHtml = improvedHtml.replace(/<style>[\s\S]*?<\/style>/g, `<style>\n${codeToAdd}\n</style>`);
            } else if (improvementType === 1) {
                improvedHtml = improvedHtml.replace(/<script>[\s\S]*?<\/script>/g, `<script>\n${codeToAdd}\n</script>`);
            } else {
                improvedHtml = improvedHtml.replace(/<body>[\s\S]*?<\/body>/g, `<body>\n${codeToAdd}\n</body>`);
            }
            
            fs.writeFileSync(htmlPath, improvedHtml);
            console.log("✅ HTML REPLACED! New size:", improvedHtml.length);
        } else {
            fs.writeFileSync(htmlPath, getCleanHTML());
        }
        
        worldState.aiImprovements += 1;
        const improvementTypeName = improvementType === 0 ? "Graphics CSS" : improvementType === 1 ? "Event Canvas JS" : "Civilization HTML";
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
 * Returns clean HTML with event display support
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
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(protocol + '//' + window.location.host);
        let worldState = { day: 1, era: "Era 1", population: 10, treasury: 500, techPower: 1, tanks: 0, logs: [], inWar: false, activeEvents: [] };
        ws.onmessage = (event) => { const msg = JSON.parse(event.data); if (msg.type === 'WORLD_UPDATE') { worldState = msg.data; updateUI(); } };
        function updateUI() {
            document.getElementById('stat-day').innerText = worldState.day;
            document.getElementById('stat-era').innerText = worldState.era;
            document.getElementById('stat-pop').innerText = worldState.population;
            document.getElementById('stat-gold').innerText = Math.floor(worldState.treasury).toLocaleString();
            document.getElementById('stat-tech').innerText = Number(worldState.techPower).toFixed(1);
            document.getElementById('stat-tanks').innerText = worldState.tanks;
            document.getElementById('stat-status').innerText = worldState.inWar ? 'WAR' : 'PEACE';
            document.getElementById('stat-build').innerText = worldState.engineBuild || 'v2.0';
            // Event panel
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
        // Pixel Art Engine with event rendering
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
            // Terrain
            for (let x = 0; x < canvas.width; x += 12) {
                for (let y = 0; y < canvas.height; y += 12) {
                    ctx.fillStyle = ((x+y)%24===0) ? '#2a3a1a' : '#1a2a1a';
                    ctx.fillRect(x, y, 12, 12);
                }
            }
            // Event visual effects
            if (worldState.activeEvents) {
                worldState.activeEvents.forEach(evt => {
                    if (evt.type === 'blood_moon') { ctx.fillStyle = 'rgba(150,0,0,0.3)'; ctx.fillRect(0,0,canvas.width,canvas.height); }
                    if (evt.type === 'fire') { ctx.fillStyle = 'rgba(255,100,0,0.2)'; ctx.fillRect(0,0,canvas.width,canvas.height); }
                    if (evt.type === 'storm') { ctx.fillStyle = 'rgba(50,50,80,0.4)'; ctx.fillRect(0,0,canvas.width,canvas.height); }
                    if (evt.type === 'plague') { ctx.fillStyle = 'rgba(0,150,0,0.2)'; ctx.fillRect(0,0,canvas.width,canvas.height); }
                    if (evt.type === 'prosperity') { ctx.fillStyle = 'rgba(255,215,0,0.15)'; ctx.fillRect(0,0,canvas.width,canvas.height); }
                });
            }
            // Buildings
            buildings.forEach(b => {
                ctx.fillStyle = ['#8a8a8a','#c4a060','#6a6a6a','#7a7a7a'][b.type];
                ctx.fillRect(Math.round(b.x-6), Math.round(b.y-b.h), 12, b.h);
                ctx.fillStyle = '#ffff88';
                ctx.fillRect(Math.round(b.x-2), Math.round(b.y-b.h+4), 4, 4);
            });
            // Units
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

    // Clean expired events
    if (worldState.activeEvents) {
        worldState.activeEvents = worldState.activeEvents.filter(e => e.endDay > worldState.day);
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
    console.log("🎮 Pixel Art: Age of Empires style with event visuals");
    console.log("📊 Event system: blood moon, fire, storm, plague, prosperity");
    console.log("🔄 REPLACE mode: no duplicates, max 100KB HTML");
    
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