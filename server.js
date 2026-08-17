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
    minInterval: 7000, // 7 seconds between calls (safe for Groq free tier)
    
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
 * GROQ API - Uses OpenAI GPT-OSS 120B model with rate limiting
 */
async function queryAI(prompt) {
    if (!GROQ_API_KEY) {
        console.error("❌ No GROQ_API_KEY");
        return null;
    }

    console.log("🔑 Groq Key:", GROQ_API_KEY.substring(0, 10) + "...");
    
    try {
        // Wait for rate limiter slot
        await rateLimiter.waitForSlot();
        
        const url = 'https://api.groq.com/openai/v1/chat/completions';
        
        console.log('🔄 Trying Groq (GPT-OSS 120B)...');
        
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
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
            // Rate limited - wait 60 seconds
            console.log('⏳ Rate limit (429). Waiting 60 seconds before retry...');
            await new Promise(resolve => setTimeout(resolve, 60000));
            
            // Retry once after waiting
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
 * 2. AI CODE IMPROVEMENT - IMPROVES BOTH HTML DESIGN AND FUNCTIONALITY
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
        
        // Alternate between different types of improvements
        const improvementType = worldState.aiImprovements % 3;
        
        let prompt;
        let codeToAdd;
        
        switch(improvementType) {
            case 0: // CSS/Design improvement - OPTIMIZE EXISTING
                prompt = `IMPROVE and OPTIMIZE the EXISTING CSS of this dark fantasy civilization game.
                Current stats: Day ${worldState.day}, Population: ${worldState.population}, Tech: ${worldState.techPower}.
                Era: ${worldState.era}
                
                IMPORTANT INSTRUCTIONS:
                - Do NOT add new CSS blocks that conflict with existing ones
                - FIX and OPTIMIZE the current styles
                - Improve the MAP graphics and overall web design
                - Make the map look like a real game map (like Age of Empires style)
                - Add terrain colors, resource indicators, and building icons
                - MUST work perfectly on BOTH desktop AND mobile
                - Use @media queries for mobile (max-width: 768px)
                - Dark fantasy theme: dark backgrounds, gold borders, mystical glow
                - Use CSS Grid and Flexbox for responsive layout
                - Add smooth animations and transitions
                - Use viewport units (vh, vw) for responsive sizing
                - Include hover effects for desktop and touch-friendly for mobile
                - Font sizes must be readable on mobile
                - Panels should stack vertically on mobile, side-by-side on desktop
                - IMPROVE the map with: terrain gradients, resource nodes, animated elements
                
                Return ONLY valid CSS code that REPLACES and IMPROVES existing styles.
                No explanations, no comments.`;
                break;
                
            case 1: // JavaScript functionality - MAP IMPROVEMENT
                prompt = `Add new interactive MAP functionality to this dark fantasy civilization game.
                Current stats: Day ${worldState.day}, Population: ${worldState.population}, Tech: ${worldState.techPower}.
                
                IMPROVE THE MAP GRAPHICS:
                - Create a canvas-based map with terrain
                - Add animated elements (water, trees, buildings)
                - Show population moving on the map
                - Add resource nodes that pulse/glow
                - Show buildings as icons on the map
                - Make it interactive (click/hover to see info)
                
                Return ONLY valid JavaScript code. No explanations, no comments.
                Make it work on both desktop and mobile.`;
                break;
                
            case 2: // UI/HTML structure improvement - MAP ENHANCEMENT
                prompt = `Add new MAP UI elements to this dark fantasy civilization game.
                Current stats: Day ${worldState.day}, Era: ${worldState.era}, Treasury: ${worldState.treasury}.
                
                IMPROVE THE MAP DISPLAY:
                - Add a map container with canvas element
                - Add map legend with resource types
                - Add minimap in the corner
                - Add building list overlay
                - Add resource counters overlay
                
                REQUIREMENTS:
                - MUST work on both desktop AND mobile
                - Use responsive HTML structure
                - Dark fantasy themed
                - Use CSS Grid/Flexbox classes
                
                Return ONLY valid HTML code. No explanations, no comments.`;
                break;
        }
        
        console.log("🔍 Asking Groq (GPT-OSS 120B) for", improvementType === 0 ? "CSS OPTIMIZATION" : improvementType === 1 ? "MAP JavaScript" : "MAP HTML", "improvement...");
        const aiResponse = await queryAI(prompt);
        
        // Check if AI response is valid
        if (aiResponse && !aiResponse.startsWith("//") && aiResponse.length > 20) {
            console.log("✅ Got valid AI response! Length:", aiResponse.length);
            console.log("📝 Content:", aiResponse.substring(0, 200));
            
            // Clean the response
            codeToAdd = aiResponse.replace(/```css/gi, '').replace(/```javascript/gi, '').replace(/```html/gi, '').replace(/```js/gi, '').replace(/```/g, '').trim();
        } else {
            console.log("⚠️ AI failed, using elaborate fallback");
            codeToAdd = null;
        }
        
        // If AI failed or code is too short, use elaborate RESPONSIVE fallback
        if (!codeToAdd || codeToAdd.length < 10) {
            if (improvementType === 0) {
                codeToAdd = `
/* OPTIMIZED RESPONSIVE Dark Fantasy Design - Day ${worldState.day} */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background: linear-gradient(135deg, #1a0a0a 0%, #2a1a1a 50%, #0a0a1a 100%);
    color: #d4c5a0;
    font-family: 'Cinzel', 'Georgia', serif;
    min-height: 100vh;
    overflow-x: hidden;
}

.game-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    padding: 20px;
    max-width: 1400px;
    margin: 0 auto;
}

.stats-panel {
    background: rgba(20, 10, 10, 0.85);
    border: 2px solid #8b6914;
    border-radius: 15px;
    padding: 20px;
    box-shadow: 0 0 25px rgba(139, 105, 20, 0.4);
    animation: glow 3s ease-in-out infinite;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
}

.stats-panel:hover {
    transform: translateY(-5px);
    box-shadow: 0 0 40px rgba(139, 105, 20, 0.7);
}

@keyframes glow {
    0%, 100% { box-shadow: 0 0 25px rgba(139, 105, 20, 0.4); }
    50% { box-shadow: 0 0 50px rgba(139, 105, 20, 0.8); }
}

/* MAP STYLES */
.map-container {
    position: relative;
    width: 100%;
    min-height: 300px;
    border: 2px solid #8b6914;
    border-radius: 10px;
    overflow: hidden;
    background: #0a0505;
}

#gameCanvas {
    width: 100%;
    height: 100%;
    display: block;
}

/* MOBILE RESPONSIVE */
@media (max-width: 768px) {
    .game-container {
        grid-template-columns: 1fr;
        gap: 15px;
        padding: 15px;
    }
    
    .stats-panel {
        padding: 15px;
        border-radius: 12px;
    }
    
    .map-container {
        min-height: 200px;
    }
    
    body {
        font-size: 14px;
    }
}

/* TABLET */
@media (min-width: 769px) and (max-width: 1024px) {
    .game-container {
        grid-template-columns: repeat(2, 1fr);
        gap: 18px;
    }
}`;
            } else if (improvementType === 1) {
                codeToAdd = `
// AI Map Functionality - Day ${worldState.day}
function createGameMap() {
    const canvas = document.getElementById('gameCanvas') || document.createElement('canvas');
    canvas.id = 'gameCanvas';
    
    if (!canvas.parentElement) {
        const mapContainer = document.createElement('div');
        mapContainer.className = 'map-container';
        mapContainer.appendChild(canvas);
        document.body.appendChild(mapContainer);
    }
    
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight || 300;
    
    // Draw terrain
    function drawTerrain() {
        // Water
        ctx.fillStyle = '#1a2a3a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Land masses
        ctx.fillStyle = '#2a3a1a';
        ctx.beginPath();
        ctx.ellipse(canvas.width * 0.3, canvas.height * 0.4, 200, 150, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#3a4a2a';
        ctx.beginPath();
        ctx.ellipse(canvas.width * 0.7, canvas.height * 0.6, 250, 180, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Resources (gold nodes)
        const goldSpots = [
            {x: 0.3, y: 0.4}, {x: 0.5, y: 0.5}, {x: 0.7, y: 0.6}
        ];
        
        goldSpots.forEach(spot => {
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(spot.x * canvas.width, spot.y * canvas.height, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Pulsing glow
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(spot.x * canvas.width, spot.y * canvas.height, 10 + Math.sin(Date.now() / 1000) * 5, 0, Math.PI * 2);
            ctx.stroke();
        });
    }
    
    function animate() {
        drawTerrain();
        requestAnimationFrame(animate);
    }
    
    animate();
}

createGameMap();`;
            } else {
                codeToAdd = `
<div class="game-container" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;padding:20px;max-width:1400px;margin:0 auto;">
    <div class="map-container" style="grid-column:1/-1;background:rgba(10,5,5,0.8);border:2px solid #8b6914;border-radius:15px;padding:20px;box-shadow:0 0 25px rgba(139,105,20,0.4);">
        <h3 style="color:#ffd700;margin-bottom:15px;text-align:center;">🗺️ Kingdom Map - Day ${worldState.day}</h3>
        <div style="position:relative;min-height:300px;border:1px solid #8b6914;border-radius:10px;overflow:hidden;background:#0a0505;">
            <canvas id="gameCanvas" style="width:100%;height:100%;display:block;"></canvas>
        </div>
    </div>
    
    <div class="stats-panel" style="background:rgba(20,10,10,0.85);border:2px solid #8b6914;border-radius:15px;padding:20px;box-shadow:0 0 25px rgba(139,105,20,0.4);">
        <h3 style="color:#ffd700;margin-bottom:15px;text-align:center;">⚔️ Kingdom Stats</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;">
            <div style="background:rgba(10,5,5,0.6);padding:10px;border-radius:8px;border:1px solid #8b6914;">
                <span style="color:#d4c5a0;">👥 Population</span>
                <span style="float:right;color:#ffd700;font-weight:bold;">${worldState.population}</span>
            </div>
            <div style="background:rgba(10,5,5,0.6);padding:10px;border-radius:8px;border:1px solid #8b6914;">
                <span style="color:#d4c5a0;">💰 Treasury</span>
                <span style="float:right;color:#ffd700;font-weight:bold;">${Math.floor(worldState.treasury)}</span>
            </div>
            <div style="background:rgba(10,5,5,0.6);padding:10px;border-radius:8px;border:1px solid #8b6914;">
                <span style="color:#d4c5a0;">⚡ Tech Power</span>
                <span style="float:right;color:#ffd700;font-weight:bold;">${worldState.techPower.toFixed(2)}</span>
            </div>
        </div>
    </div>
</div>`;
            }
        }
        
        // Apply to HTML based on type
        let improvedHtml = currentHtml;
        
        if (improvementType === 0) {
            // CSS improvement
            const cssBlock = `\n<!-- === AI CSS OPTIMIZATION (Day ${worldState.day}) === -->\n<style>\n${codeToAdd}\n</style>\n`;
            if (improvedHtml.includes('</head>')) {
                improvedHtml = improvedHtml.replace('</head>', cssBlock + '</head>');
            } else {
                improvedHtml = cssBlock + improvedHtml;
            }
        } else if (improvementType === 1) {
            // JavaScript improvement
            const jsBlock = `\n<!-- === AI MAP JS IMPROVEMENT (Day ${worldState.day}) === -->\n<script>\n${codeToAdd}\n</script>\n`;
            if (improvedHtml.includes('</body>')) {
                improvedHtml = improvedHtml.replace('</body>', jsBlock + '</body>');
            } else {
                improvedHtml += jsBlock;
            }
        } else {
            // HTML structure improvement
            const htmlBlock = `\n<!-- === AI MAP HTML IMPROVEMENT (Day ${worldState.day}) === -->\n${codeToAdd}\n`;
            if (improvedHtml.includes('</body>')) {
                improvedHtml = improvedHtml.replace('</body>', htmlBlock + '</body>');
            } else {
                improvedHtml += htmlBlock;
            }
        }
        
        // Write improved HTML
        fs.writeFileSync(htmlPath, improvedHtml);
        console.log("✅ HTML improved! New size:", improvedHtml.length);
        
        worldState.aiImprovements += 1;
        const improvementTypeName = improvementType === 0 ? "CSS Optimization" : improvementType === 1 ? "Map JavaScript" : "Map HTML";
        addLog(`[AI COMMIT SUCCESS] ${improvementTypeName} improved! Total: ${worldState.aiImprovements}`);
        
        // Push to GitHub
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
                
                // Also save the world state
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

    // AI Event every 150 days (non-blocking)
    if (worldState.day % 150 === 0) {
        generateAIEvents().catch(err => console.error("AI Event error:", err));
    }

    // Code improvement every 250 days (non-blocking)
    if (worldState.day % 250 === 0) {
        const patch = Math.floor(Math.random() * 9) + 1;
        worldState.engineBuild = "v" + (2 + Math.floor(worldState.aiImprovements / 10)) + "." + patch + ".0-Groq-GPT-OSS";
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
    console.log("📱 Responsive design: Desktop + Mobile optimized");
    console.log("🗺️ Map graphics: Canvas-based with terrain and resources");
    
    queryAI("Say 'OK'")
        .then(response => {
            if (response) {
                console.log("✅ Groq response:", response.substring(0, 100));
                addLog("[SYSTEM] AI System ready (Groq GPT-OSS 120B).");
            } else {
                console.log("⚠️ Groq not responding, using fallbacks");
                addLog("[SYSTEM] AI System in fallback mode.");
            }
        });
});