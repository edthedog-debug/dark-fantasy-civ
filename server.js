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
 * 2. AI CODE IMPROVEMENT - PIXEL ART STYLE AGE OF EMPIRES
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
            case 0: // PIXEL ART CSS
                prompt = `Create PIXEL ART style CSS for an Age of Empires inspired dark fantasy game.
                Current stats: Day ${worldState.day}, Population: ${worldState.population}, Tech: ${worldState.techPower}.
                Era: ${worldState.era}
                
                PIXEL ART REQUIREMENTS:
                - Use image-rendering: pixelated for all elements
                - Use pixel-style borders (box-shadow with steps)
                - Retro color palette (browns, greens, golds - like Age of Empires)
                - Sharp edges, NO border-radius (or very minimal 2px)
                - Use pixel-style fonts if possible
                - Blocky shadows and highlights
                - Responsive with @media queries for mobile
                - CSS Grid for layout
                
                Return ONLY valid CSS code. No explanations.`;
                break;
                
            case 1: // PIXEL ART JAVASCRIPT CANVAS
                prompt = `Create PIXEL ART JavaScript canvas rendering for an Age of Empires style game map.
                Current stats: Day ${worldState.day}, Population: ${worldState.population}, Tech: ${worldState.techPower}.
                
                PIXEL ART CANVAS REQUIREMENTS:
                - Draw EVERYTHING as pixel art (NO icons, NO emojis)
                - Use fillRect for pixel blocks to create buildings, trees, units
                - Buildings: castles with crenellations, houses with roofs, barracks
                - Trees: pixelated green triangles with brown trunks
                - Water: animated blue pixels with wave effect
                - Units: tiny pixel people (2-3px wide) moving
                - Resources: gold mines as yellow pixel clusters
                - Terrain: grass, dirt, stone as different colored pixels
                - Use ctx.imageSmoothingEnabled = false for crisp pixels
                - Animate water, trees swaying, units moving
                - Isometric perspective like Age of Empires
                
                Return ONLY valid JavaScript code. No explanations.`;
                break;
                
            case 2: // PIXEL ART HTML STRUCTURE
                prompt = `Add PIXEL ART style HTML structure for an Age of Empires inspired game.
                Current stats: Day ${worldState.day}, Era: ${worldState.era}, Treasury: ${worldState.treasury}.
                
                PIXEL ART HTML REQUIREMENTS:
                - Use pixel-style panels with sharp corners
                - Add canvas element for the game map (NO icons, NO emojis in map)
                - Add resource counter panels (gold, wood, stone, food)
                - Add minimap canvas in corner
                - Add unit selection panel
                - All elements pixel-art themed
                
                Return ONLY valid HTML code. No explanations.`;
                break;
        }
        
        console.log("🔍 Asking Groq for", improvementType === 0 ? "PIXEL ART CSS" : improvementType === 1 ? "PIXEL ART CANVAS JS" : "PIXEL ART HTML", "improvement...");
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
/* PIXEL ART Dark Fantasy - Day ${worldState.day} */
* {
    image-rendering: pixelated;
    image-rendering: crisp-edges;
}

body {
    background: #1a0a0a;
    color: #d4c5a0;
    font-family: 'Press Start 2P', 'Courier New', monospace;
    min-height: 100vh;
    overflow-x: hidden;
}

.game-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 4px;
    padding: 10px;
    max-width: 1400px;
    margin: 0 auto;
}

.stats-panel {
    background: #2a1a0a;
    border: 3px solid #8b6914;
    padding: 15px;
    box-shadow: 4px 4px 0 #000;
    image-rendering: pixelated;
}

.stats-panel h2 {
    color: #ffd700;
    font-size: 14px;
    text-transform: uppercase;
    margin-bottom: 10px;
}

.map-container {
    border: 3px solid #8b6914;
    box-shadow: 4px 4px 0 #000;
    overflow: hidden;
    background: #0a0505;
    image-rendering: pixelated;
}

#gameCanvas {
    width: 100%;
    height: 100%;
    display: block;
    image-rendering: pixelated;
}

@media (max-width: 768px) {
    .game-container {
        grid-template-columns: 1fr;
        gap: 3px;
        padding: 5px;
    }
    .stats-panel {
        padding: 10px;
    }
}`;
            } else if (improvementType === 1) {
                codeToAdd = `
// PIXEL ART MAP ENGINE - Day ${worldState.day}
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
        canvas.height = canvas.parentElement.clientHeight || 300;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    const PIXEL = 4;
    let frameCount = 0;
    
    function drawPixelTree(px, py) {
        // Trunk
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(px, py, PIXEL, PIXEL * 3);
        // Canopy (pixel layers)
        ctx.fillStyle = '#1a5a1a';
        ctx.fillRect(px - PIXEL * 2, py - PIXEL * 3, PIXEL * 5, PIXEL * 3);
        ctx.fillStyle = '#2a6a2a';
        ctx.fillRect(px - PIXEL, py - PIXEL * 4, PIXEL * 3, PIXEL);
    }
    
    function drawPixelCastle(px, py) {
        // Main tower
        ctx.fillStyle = '#8a8a8a';
        ctx.fillRect(px - PIXEL * 3, py - PIXEL * 6, PIXEL * 6, PIXEL * 7);
        // Crenellations (top)
        for (let i = -3; i < 3; i += 2) {
            ctx.fillRect(px + i * PIXEL, py - PIXEL * 8, PIXEL, PIXEL * 2);
        }
        // Door
        ctx.fillStyle = '#3a1a0a';
        ctx.fillRect(px - PIXEL, py - PIXEL * 2, PIXEL * 2, PIXEL * 3);
        // Flag
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(px + PIXEL * 2, py - PIXEL * 9, PIXEL * 2, PIXEL);
    }
    
    function drawPixelHouse(px, py) {
        // Body
        ctx.fillStyle = '#c4a060';
        ctx.fillRect(px - PIXEL * 2, py - PIXEL * 2, PIXEL * 4, PIXEL * 3);
        // Roof
        ctx.fillStyle = '#8a3a1a';
        ctx.fillRect(px - PIXEL * 3, py - PIXEL * 3, PIXEL * 6, PIXEL);
        ctx.fillRect(px - PIXEL * 2, py - PIXEL * 4, PIXEL * 4, PIXEL);
        // Door
        ctx.fillStyle = '#3a1a0a';
        ctx.fillRect(px - PIXEL, py - PIXEL * 1, PIXEL, PIXEL * 2);
    }
    
    function drawPixelUnit(px, py, color) {
        // Body
        ctx.fillStyle = color;
        ctx.fillRect(px, py - PIXEL * 2, PIXEL, PIXEL * 2);
        // Head
        ctx.fillStyle = '#ffcc99';
        ctx.fillRect(px, py - PIXEL * 3, PIXEL, PIXEL);
        // Legs animation
        const legOffset = Math.sin(frameCount * 0.1) > 0 ? 0 : PIXEL;
        ctx.fillStyle = '#333';
        ctx.fillRect(px, py, PIXEL / 2, PIXEL + legOffset);
        ctx.fillRect(px + PIXEL / 2, py, PIXEL / 2, PIXEL - legOffset);
    }
    
    function render() {
        frameCount++;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw pixel terrain
        for (let x = 0; x < canvas.width; x += PIXEL * 4) {
            for (let y = 0; y < canvas.height; y += PIXEL * 4) {
                ctx.fillStyle = ((x + y) % 8 === 0) ? '#1a3a1a' : '#1a2a1a';
                ctx.fillRect(x, y, PIXEL * 4, PIXEL * 4);
            }
        }
        
        // Water river
        for (let y = 0; y < canvas.height; y += PIXEL) {
            const waveOffset = Math.sin((y * 0.1) + (frameCount * 0.05)) * PIXEL;
            ctx.fillStyle = '#1a3a5a';
            ctx.fillRect(canvas.width * 0.4 + waveOffset, y, PIXEL * 3, PIXEL);
        }
        
        // Trees
        const treeCount = 10 + Math.floor(worldState.population / 10);
        for (let i = 0; i < treeCount; i++) {
            const tx = (i * 73) % (canvas.width - 20);
            const ty = (i * 47) % (canvas.height - 30) + 10;
            drawPixelTree(tx, ty);
        }
        
        // Buildings (castles and houses)
        const buildingCount = Math.min(20, Math.floor(worldState.population / 5) + 2);
        for (let i = 0; i < buildingCount; i++) {
            const bx = (i * 97) % (canvas.width - 40) + 20;
            const by = (i * 53) % (canvas.height - 40) + 20;
            if (i % 3 === 0) {
                drawPixelCastle(bx, by);
            } else {
                drawPixelHouse(bx, by);
            }
        }
        
        // Units (pixel people)
        const unitCount = Math.min(20, Math.floor(worldState.population / 20));
        for (let u = 0; u < unitCount; u++) {
            const ux = (u * 137 + frameCount) % (canvas.width - 10);
            const uy = (u * 89) % (canvas.height - 10) + 10;
            const colors = ['#ff4444', '#4444ff', '#44ff44', '#ffff44'];
            drawPixelUnit(ux, uy, colors[u % 4]);
        }
        
        // Gold mines (pixel clusters)
        const goldSpots = 3 + Math.floor(worldState.techPower / 10);
        for (let g = 0; g < goldSpots; g++) {
            const gx = (g * 67) % (canvas.width - 20) + 10;
            const gy = (g * 101) % (canvas.height - 20) + 10;
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(gx, gy, PIXEL * 2, PIXEL * 2);
            ctx.fillRect(gx + PIXEL, gy - PIXEL, PIXEL, PIXEL * 3);
            ctx.fillRect(gx - PIXEL, gy + PIXEL, PIXEL, PIXEL);
        }
        
        requestAnimationFrame(render);
    }
    
    render();
}

createPixelArtMap();`;
            } else {
                codeToAdd = `
<div class="game-container" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:4px;padding:10px;max-width:1400px;margin:0 auto;">
    <div class="map-container" style="grid-column:1/-1;border:3px solid #8b6914;box-shadow:4px 4px 0 #000;overflow:hidden;background:#0a0505;position:relative;">
        <canvas id="gameCanvas" style="width:100%;height:100%;display:block;image-rendering:pixelated;"></canvas>
        <div style="position:absolute;top:5px;left:5px;background:rgba(0,0,0,0.8);padding:4px 8px;border:2px solid #8b6914;font-size:10px;color:#ffd700;">DAY ${worldState.day}</div>
    </div>
    
    <div class="stats-panel" style="background:#2a1a0a;border:3px solid #8b6914;padding:15px;box-shadow:4px 4px 0 #000;">
        <h2 style="color:#ffd700;font-size:14px;margin-bottom:10px;">RESOURCES</h2>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
            <div style="background:#1a0a0a;padding:8px;border:2px solid #5a3a1a;">
                <span style="color:#d4c5a0;">💰 Gold</span>
                <span style="float:right;color:#ffd700;">${Math.floor(worldState.treasury)}</span>
            </div>
            <div style="background:#1a0a0a;padding:8px;border:2px solid #5a3a1a;">
                <span style="color:#d4c5a0;">👥 Pop</span>
                <span style="float:right;color:#44ff44;">${worldState.population}</span>
            </div>
            <div style="background:#1a0a0a;padding:8px;border:2px solid #5a3a1a;">
                <span style="color:#d4c5a0;">⚡ Tech</span>
                <span style="float:right;color:#4488ff;">${worldState.techPower.toFixed(1)}</span>
            </div>
            <div style="background:#1a0a0a;padding:8px;border:2px solid #5a3a1a;">
                <span style="color:#d4c5a0;">🏛️ Era</span>
                <span style="float:right;color:#ff44ff;">${worldState.era.split(' ').slice(0,2).join(' ')}</span>
            </div>
        </div>
    </div>
</div>`;
            }
        }
        
        let improvedHtml = currentHtml;
        
        if (improvementType === 0) {
            const cssBlock = `\n<!-- === AI PIXEL ART CSS (Day ${worldState.day}) === -->\n<style>\n${codeToAdd}\n</style>\n`;
            if (improvedHtml.includes('</head>')) {
                improvedHtml = improvedHtml.replace('</head>', cssBlock + '</head>');
            } else {
                improvedHtml = cssBlock + improvedHtml;
            }
        } else if (improvementType === 1) {
            const jsBlock = `\n<!-- === AI PIXEL ART MAP JS (Day ${worldState.day}) === -->\n<script>\n${codeToAdd}\n</script>\n`;
            if (improvedHtml.includes('</body>')) {
                improvedHtml = improvedHtml.replace('</body>', jsBlock + '</body>');
            } else {
                improvedHtml += jsBlock;
            }
        } else {
            const htmlBlock = `\n<!-- === AI PIXEL ART HTML (Day ${worldState.day}) === -->\n${codeToAdd}\n`;
            if (improvedHtml.includes('</body>')) {
                improvedHtml = improvedHtml.replace('</body>', htmlBlock + '</body>');
            } else {
                improvedHtml += htmlBlock;
            }
        }
        
        fs.writeFileSync(htmlPath, improvedHtml);
        console.log("✅ HTML improved! New size:", improvedHtml.length);
        
        worldState.aiImprovements += 1;
        const improvementTypeName = improvementType === 0 ? "Pixel Art CSS" : improvementType === 1 ? "Pixel Art Canvas JS" : "Pixel Art HTML";
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
    console.log("🗺️ Map: Canvas-based pixel art (NO icons, NO emojis)");
    
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