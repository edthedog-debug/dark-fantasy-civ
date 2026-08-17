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
 * 2. AI CODE IMPROVEMENT - IMPROVES EXISTING MAP WITH REAL STATS
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
        
        const improvementType = worldState.aiImprovements % 3;
        
        let prompt;
        let codeToAdd;
        
        switch(improvementType) {
            case 0: // IMPROVE EXISTING MAP CSS
                prompt = `IMPROVE the EXISTING map CSS for this pixel art civilization game.
                Current stats: Day ${worldState.day}, Population: ${worldState.population}, Tech: ${worldState.techPower}.
                Era: ${worldState.era}
                Treasury: ${worldState.treasury}
                
                CRITICAL INSTRUCTIONS:
                - MODIFY the existing map styles, do NOT create a new map
                - The map must show buildings proportional to population: ${worldState.population} people = MANY buildings
                - Show ${Math.floor(worldState.population / 5)} buildings on the map
                - Show ${Math.floor(worldState.population / 10)} pixel people walking
                - Buildings should be DENSE and DETAILED like a real city
                - Use pixel art style with sharp edges
                - Terrain colors must match the civilization era: ${worldState.era}
                - Add more detail to existing buildings (windows, doors, roofs)
                
                Return ONLY valid CSS improvements. No explanations.`;
                break;
                
            case 1: // IMPROVE EXISTING MAP CANVAS JAVASCRIPT
                prompt = `IMPROVE the EXISTING canvas map rendering for this pixel art game.
                Current stats: Day ${worldState.day}, Population: ${worldState.population}, Tech: ${worldState.techPower}.
                Era: ${worldState.era}
                Buildings: ${Math.floor(worldState.population / 5)}
                Units: ${Math.floor(worldState.population / 10)}
                
                CRITICAL INSTRUCTIONS:
                - MODIFY the existing draw functions, do NOT create new map
                - Draw ${Math.floor(worldState.population / 5)} buildings on the map (castles, houses, barracks)
                - Draw ${Math.floor(worldState.population / 10)} pixel people walking around
                - Buildings must be DETAILED: windows, doors, roofs, crenellations
                - Show population density - more buildings = bigger city
                - Tech power ${worldState.techPower} = more advanced buildings
                - Use ctx.imageSmoothingEnabled = false
                - Use fillRect for EVERYTHING (pixel art)
                - Animate units walking between buildings
                - Add smoke from chimneys, flags on castles
                
                Return ONLY valid JavaScript code that IMPROVES existing functions.`;
                break;
                
            case 2: // IMPROVE EXISTING MAP HTML
                prompt = `IMPROVE the EXISTING map HTML structure for this pixel art game.
                Current stats: Day ${worldState.day}, Population: ${worldState.population}, Era: ${worldState.era}.
                Treasury: ${worldState.treasury}
                
                CRITICAL INSTRUCTIONS:
                - MODIFY existing map containers, do NOT create new structure
                - Show building count: ${Math.floor(worldState.population / 5)}
                - Show population counter overlay on map
                - Show era name on map
                - Add building list panel showing what exists
                
                Return ONLY valid HTML that IMPROVES existing structure.`;
                break;
        }
        
        console.log("🔍 Asking Groq to IMPROVE EXISTING map for", improvementType === 0 ? "CSS" : improvementType === 1 ? "Canvas JS" : "HTML", "...");
        const aiResponse = await queryAI(prompt);
        
        if (aiResponse && !aiResponse.startsWith("//") && aiResponse.length > 20) {
            console.log("✅ Got valid AI response! Length:", aiResponse.length);
            codeToAdd = aiResponse.replace(/```css/gi, '').replace(/```javascript/gi, '').replace(/```html/gi, '').replace(/```js/gi, '').replace(/```/g, '').trim();
        } else {
            console.log("⚠️ AI failed, using elaborate fallback");
            codeToAdd = null;
        }
        
        if (!codeToAdd || codeToAdd.length < 10) {
            if (improvementType === 0) {
                codeToAdd = `
/* IMPROVED PIXEL ART MAP CSS - Day ${worldState.day} - Pop ${worldState.population} */
.game-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 4px;
    padding: 10px;
    max-width: 1400px;
    margin: 0 auto;
}

.map-container {
    border: 3px solid #8b6914;
    box-shadow: 4px 4px 0 #000;
    overflow: hidden;
    background: #0a0505;
    position: relative;
    min-height: 400px;
    image-rendering: pixelated;
}

#gameCanvas {
    width: 100%;
    height: 100%;
    display: block;
    image-rendering: pixelated;
}

.map-overlay {
    position: absolute;
    top: 5px;
    left: 5px;
    background: rgba(0,0,0,0.8);
    padding: 4px 8px;
    border: 2px solid #8b6914;
    font-size: 10px;
    color: #ffd700;
    z-index: 10;
}`;
            } else if (improvementType === 1) {
                codeToAdd = `
// IMPROVED PIXEL ART MAP ENGINE - Day ${worldState.day}
// Population: ${worldState.population} | Buildings: ${Math.floor(worldState.population / 5)} | Units: ${Math.floor(worldState.population / 10)}

function createPixelArtMap() {
    const canvas = document.getElementById('gameCanvas') || document.createElement('canvas');
    canvas.id = 'gameCanvas';
    
    if (!canvas.parentElement) {
        const mapContainer = document.createElement('div');
        mapContainer.className = 'map-container';
        mapContainer.appendChild(canvas);
        document.body.appendChild(mapContainer);
    }
    
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    
    function resizeCanvas() {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight || 400;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    const PIXEL = 3;
    let frameCount = 0;
    const buildings = [];
    const units = [];
    
    // Generate buildings based on population
    const buildingCount = Math.min(80, Math.floor(${worldState.population} / 5) + 2);
    for (let i = 0; i < buildingCount; i++) {
        buildings.push({
            x: (i * 47 + 20) % (canvas.width - 30),
            y: (i * 31 + 15) % (canvas.height - 40),
            type: i % 4,
            height: 20 + (i % 5) * 8 + Math.min(30, ${Math.floor(worldState.techPower)} * 0.5)
        });
    }
    
    // Generate units based on population
    const unitCount = Math.min(50, Math.floor(${worldState.population} / 10) + 2);
    for (let u = 0; u < unitCount; u++) {
        units.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            targetX: Math.random() * canvas.width,
            targetY: Math.random() * canvas.height,
            speed: 0.5 + Math.random() * 1.5,
            color: ['#ff6666', '#6666ff', '#66ff66', '#ffff66', '#ff66ff'][u % 5]
        });
    }
    
    function drawPixelCastle(x, y, h) {
        // Main tower
        ctx.fillStyle = '#8a8a8a';
        ctx.fillRect(x - 6, y - h, 12, h);
        // Crenellations
        for (let i = -6; i < 6; i += 3) {
            ctx.fillRect(x + i, y - h - 4, 3, 4);
        }
        // Windows
        ctx.fillStyle = '#ffff88';
        for (let w = 0; w < h / 10; w++) {
            ctx.fillRect(x - 2, y - h + 4 + w * 10, 4, 4);
        }
        // Door
        ctx.fillStyle = '#3a1a0a';
        ctx.fillRect(x - 3, y - 6, 6, 6);
        // Flag
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x + 6, y - h - 8, 5, 3);
    }
    
    function drawPixelHouse(x, y, h) {
        // Body
        ctx.fillStyle = '#c4a060';
        ctx.fillRect(x - 8, y - h, 16, h);
        // Roof
        ctx.fillStyle = '#8a3a1a';
        ctx.fillRect(x - 10, y - h - 3, 20, 3);
        ctx.fillRect(x - 6, y - h - 6, 12, 3);
        // Windows
        ctx.fillStyle = '#ffff88';
        ctx.fillRect(x - 4, y - h + 4, 3, 3);
        ctx.fillRect(x + 1, y - h + 4, 3, 3);
        // Door
        ctx.fillStyle = '#3a1a0a';
        ctx.fillRect(x - 2, y - 4, 4, 4);
    }
    
    function drawPixelBarracks(x, y, h) {
        // Body
        ctx.fillStyle = '#6a6a6a';
        ctx.fillRect(x - 10, y - h, 20, h);
        // Roof
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(x - 12, y - h - 2, 24, 2);
        // Sword icon (pixel)
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(x - 1, y - h + 2, 2, h - 4);
        ctx.fillRect(x - 3, y - h + 2, 6, 2);
    }
    
    function drawPixelTower(x, y, h) {
        // Tall tower
        ctx.fillStyle = '#7a7a7a';
        ctx.fillRect(x - 4, y - h, 8, h);
        // Top
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(x - 6, y - h - 2, 12, 2);
    }
    
    function drawPixelUnit(unit) {
        const legOffset = Math.sin(frameCount * 0.1 + unit.x) > 0 ? 0 : PIXEL;
        // Body
        ctx.fillStyle = unit.color;
        ctx.fillRect(unit.x, unit.y - PIXEL * 2, PIXEL, PIXEL * 2);
        // Head
        ctx.fillStyle = '#ffcc99';
        ctx.fillRect(unit.x, unit.y - PIXEL * 3, PIXEL, PIXEL);
        // Legs
        ctx.fillStyle = '#333';
        ctx.fillRect(unit.x, unit.y, PIXEL / 2, PIXEL + legOffset);
        ctx.fillRect(unit.x + PIXEL / 2, unit.y, PIXEL / 2, PIXEL - legOffset);
    }
    
    function updateUnits() {
        units.forEach(unit => {
            const dx = unit.targetX - unit.x;
            const dy = unit.targetY - unit.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 5) {
                unit.targetX = Math.random() * canvas.width;
                unit.targetY = Math.random() * canvas.height;
            } else {
                unit.x += (dx / dist) * unit.speed;
                unit.y += (dy / dist) * unit.speed;
            }
        });
    }
    
    function render() {
        frameCount++;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Terrain
        for (let x = 0; x < canvas.width; x += PIXEL * 6) {
            for (let y = 0; y < canvas.height; y += PIXEL * 6) {
                ctx.fillStyle = ((x + y) % 12 === 0) ? '#2a3a1a' : '#1a2a1a';
                ctx.fillRect(x, y, PIXEL * 6, PIXEL * 6);
            }
        }
        
        // Water river
        for (let y = 0; y < canvas.height; y += PIXEL) {
            const waveOffset = Math.sin((y * 0.05) + (frameCount * 0.03)) * PIXEL * 2;
            ctx.fillStyle = '#1a3a5a';
            ctx.fillRect(canvas.width * 0.35 + waveOffset, y, PIXEL * 4, PIXEL);
        }
        
        // Draw ALL buildings
        buildings.forEach(building => {
            switch(building.type) {
                case 0: drawPixelCastle(building.x, building.y, building.height); break;
                case 1: drawPixelHouse(building.x, building.y, building.height * 0.6); break;
                case 2: drawPixelBarracks(building.x, building.y, building.height * 0.7); break;
                case 3: drawPixelTower(building.x, building.y, building.height * 1.2); break;
            }
        });
        
        // Draw ALL units walking
        updateUnits();
        units.forEach(unit => drawPixelUnit(unit));
        
        // Gold mines
        const goldCount = 3 + Math.floor(${Math.floor(worldState.techPower)} / 5);
        for (let g = 0; g < Math.min(goldCount, 10); g++) {
            const gx = (g * 89 + 10) % (canvas.width - 15);
            const gy = (g * 67 + 10) % (canvas.height - 15);
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(gx, gy, PIXEL * 2, PIXEL * 2);
            ctx.fillRect(gx + PIXEL, gy - PIXEL, PIXEL, PIXEL * 3);
            ctx.fillRect(gx - PIXEL, gy + PIXEL, PIXEL * 2, PIXEL);
        }
        
        requestAnimationFrame(render);
    }
    
    render();
}

createPixelArtMap();`;
            } else {
                codeToAdd = `
<div class="map-container" style="grid-column:1/-1;border:3px solid #8b6914;box-shadow:4px 4px 0 #000;overflow:hidden;background:#0a0505;position:relative;min-height:400px;">
    <canvas id="gameCanvas" style="width:100%;height:100%;display:block;image-rendering:pixelated;"></canvas>
    <div class="map-overlay" style="position:absolute;top:5px;left:5px;background:rgba(0,0,0,0.8);padding:4px 8px;border:2px solid #8b6914;font-size:10px;color:#ffd700;">
        DAY ${worldState.day} | POP ${worldState.population} | BUILDINGS ${Math.floor(worldState.population / 5)}
    </div>
    <div class="map-overlay" style="position:absolute;top:5px;right:5px;background:rgba(0,0,0,0.8);padding:4px 8px;border:2px solid #8b6914;font-size:10px;color:#ffd700;">
        ERA: ${worldState.era}
    </div>
</div>`;
            }
        }
        
        let improvedHtml = currentHtml;
        
        if (improvementType === 0) {
            const cssBlock = `\n<!-- === AI IMPROVED MAP CSS (Day ${worldState.day}) === -->\n<style>\n${codeToAdd}\n</style>\n`;
            if (improvedHtml.includes('</head>')) {
                improvedHtml = improvedHtml.replace('</head>', cssBlock + '</head>');
            } else {
                improvedHtml = cssBlock + improvedHtml;
            }
        } else if (improvementType === 1) {
            const jsBlock = `\n<!-- === AI IMPROVED MAP JS (Day ${worldState.day}) === -->\n<script>\n${codeToAdd}\n</script>\n`;
            if (improvedHtml.includes('</body>')) {
                improvedHtml = improvedHtml.replace('</body>', jsBlock + '</body>');
            } else {
                improvedHtml += jsBlock;
            }
        } else {
            const htmlBlock = `\n<!-- === AI IMPROVED MAP HTML (Day ${worldState.day}) === -->\n${codeToAdd}\n`;
            if (improvedHtml.includes('</body>')) {
                improvedHtml = improvedHtml.replace('</body>', htmlBlock + '</body>');
            } else {
                improvedHtml += htmlBlock;
            }
        }
        
        fs.writeFileSync(htmlPath, improvedHtml);
        console.log("✅ HTML improved! New size:", improvedHtml.length);
        
        worldState.aiImprovements += 1;
        const improvementTypeName = improvementType === 0 ? "Improved Map CSS" : improvementType === 1 ? "Improved Map Canvas JS" : "Improved Map HTML";
        addLog(`[AI COMMIT SUCCESS] ${improvementTypeName} improved! Total: ${worldState.aiImprovements}`);
        
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
    console.log("🏗️ Map shows buildings proportional to population");
    console.log("🚶 Units walk between buildings");
    
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