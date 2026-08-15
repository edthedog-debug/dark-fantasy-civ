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
const GITHUB_REPO = process.env.GITHUB_REPO; // Format: "username/repository-name"

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
    logs: [
        "[" + new Date().toLocaleTimeString() + "] Autonomous Cloud Engine Initialized."
    ]
};

if (fs.existsSync(STATE_FILE)) {
    try {
        const rawData = fs.readFileSync(STATE_FILE, 'utf8');
        worldState = JSON.parse(rawData);
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
}

/**
 * GEMINI REST API HELPER - SIMPLIFIED
 */
async function queryGemini(prompt) {
    if (!AI_API_KEY) {
        console.log("⚠️ No GEMINI_API_KEY, using fallback");
        return null;
    }

    console.log("🔑 Testing Gemini API...");
    
    try {
        // Try with a simple test first
        const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${AI_API_KEY}`;
        
        const response = await fetch(testUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        console.log("📊 Gemini status:", response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log("✅ Gemini response received");
            
            // Extract text from response
            let text = null;
            if (data.candidates && data.candidates[0]) {
                if (data.candidates[0].content && data.candidates[0].content.parts) {
                    text = data.candidates[0].content.parts[0].text;
                }
            }
            
            if (text && text.length > 0) {
                console.log("📝 Generated text length:", text.length);
                return text;
            }
        } else {
            const errorText = await response.text();
            console.error("❌ Gemini error:", response.status, errorText.substring(0, 200));
        }
    } catch (e) {
        console.error("❌ Gemini fetch error:", e.message);
    }

    return null;
}

/**
 * Generate improved HTML code locally
 */
function generateImprovedCode() {
    console.log("🔧 Generating improved HTML code locally...");
    
    // This is a improved version of the HTML with better graphics
    const improvedHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Dark Fantasy Civilization - AI Empire</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            background: #1a1a2e;
            font-family: 'Arial', sans-serif;
            overflow: hidden;
            height: 100vh;
            width: 100vw;
            touch-action: none;
            user-select: none;
            -webkit-user-select: none;
        }
        
        #gameCanvas {
            display: block;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            cursor: grab;
        }
        
        #gameCanvas:active {
            cursor: grabbing;
        }
        
        #ui-overlay {
            position: fixed;
            top: 10px;
            left: 10px;
            right: 10px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            z-index: 10;
            pointer-events: none;
        }
        
        .stat-card {
            background: rgba(0, 0, 0, 0.8);
            border: 1px solid #4a4a6a;
            border-radius: 8px;
            padding: 8px 12px;
            color: #fff;
            font-size: 12px;
            pointer-events: auto;
            backdrop-filter: blur(5px);
        }
        
        .stat-label {
            color: #8888aa;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .stat-value {
            font-size: 16px;
            font-weight: bold;
            color: #ffd700;
        }
        
        #log-container {
            position: fixed;
            bottom: 10px;
            left: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            border: 1px solid #4a4a6a;
            border-radius: 8px;
            padding: 10px;
            max-height: 150px;
            overflow-y: auto;
            z-index: 10;
            pointer-events: auto;
            backdrop-filter: blur(5px);
        }
        
        .log-entry {
            color: #cccccc;
            font-size: 11px;
            margin-bottom: 4px;
            font-family: monospace;
        }
        
        .log-entry:last-child {
            margin-bottom: 0;
        }
        
        .building {
            fill: #8b4513;
            stroke: #ffd700;
            stroke-width: 1;
        }
        
        .road {
            stroke: #666;
            stroke-width: 2;
            fill: none;
        }
        
        .terrain {
            fill: #2d4a2d;
            stroke: #1a3a1a;
            stroke-width: 1;
        }
        
        .water {
            fill: #1a3a5a;
            stroke: #0a2a4a;
            stroke-width: 1;
        }
    </style>
</head>
<body>
    <canvas id="gameCanvas"></canvas>
    
    <div id="ui-overlay">
        <div class="stat-card">
            <div class="stat-label">Day</div>
            <div class="stat-value" id="day-display">1</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Population</div>
            <div class="stat-value" id="population-display">12</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Happiness</div>
            <div class="stat-value" id="happiness-display">85%</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Treasury</div>
            <div class="stat-value" id="treasury-display">500 Gold</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Tech Power</div>
            <div class="stat-value" id="tech-display">0.5</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Economy</div>
            <div class="stat-value" id="economy-display">Emerging Market</div>
        </div>
    </div>
    
    <div id="log-container"></div>
    
    <script>
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        let worldState = {
            day: 1,
            population: 12,
            happiness: 85,
            treasury: 500,
            techPower: 0.5,
            economicPower: "Emerging Market",
            logs: []
        };
        
        let camera = {
            x: 0,
            y: 0,
            zoom: 1
        };
        
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;
        
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            drawGame();
        }
        
        window.addEventListener('resize', resizeCanvas);
        
        function drawIsometricTile(x, y, size, color) {
            ctx.save();
            ctx.translate(canvas.width / 2 + camera.x, canvas.height / 2 + camera.y);
            ctx.scale(camera.zoom, camera.zoom);
            
            const isoX = (x - y) * size;
            const isoY = (x + y) * size / 2;
            
            ctx.beginPath();
            ctx.moveTo(isoX, isoY);
            ctx.lineTo(isoX + size, isoY + size / 2);
            ctx.lineTo(isoX, isoY + size);
            ctx.lineTo(isoX - size, isoY + size / 2);
            ctx.closePath();
            
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            ctx.restore();
        }
        
        function drawBuilding(x, y, size, height) {
            ctx.save();
            ctx.translate(canvas.width / 2 + camera.x, canvas.height / 2 + camera.y);
            ctx.scale(camera.zoom, camera.zoom);
            
            const isoX = (x - y) * size;
            const isoY = (x + y) * size / 2;
            
            // Draw building
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(isoX - size / 2, isoY - height, size, height + size / 2);
            
            // Draw roof
            ctx.beginPath();
            ctx.moveTo(isoX - size / 2, isoY - height);
            ctx.lineTo(isoX, isoY - height - size / 2);
            ctx.lineTo(isoX + size / 2, isoY - height);
            ctx.closePath();
            ctx.fillStyle = '#a0522d';
            ctx.fill();
            
            ctx.restore();
        }
        
        function drawGame() {
            // Clear canvas
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw grid
            const gridSize = 8;
            const tileSize = 30;
            
            for (let x = 0; x < gridSize; x++) {
                for (let y = 0; y < gridSize; y++) {
                    const color = (x + y) % 2 === 0 ? '#2d4a2d' : '#2a442a';
                    drawIsometricTile(x, y, tileSize, color);
                }
            }
            
            // Draw some buildings
            drawBuilding(3, 3, 20, 30);
            drawBuilding(4, 4, 25, 40);
            drawBuilding(5, 3, 15, 25);
            
            // Draw roads
            ctx.save();
            ctx.translate(canvas.width / 2 + camera.x, canvas.height / 2 + camera.y);
            ctx.scale(camera.zoom, camera.zoom);
            
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(200, 100);
            ctx.stroke();
            
            ctx.restore();
        }
        
        function updateUI() {
            document.getElementById('day-display').textContent = worldState.day;
            document.getElementById('population-display').textContent = worldState.population;
            document.getElementById('happiness-display').textContent = worldState.happiness + '%';
            document.getElementById('treasury-display').textContent = worldState.treasury + ' Gold';
            document.getElementById('tech-display').textContent = worldState.techPower.toFixed(2);
            document.getElementById('economy-display').textContent = worldState.economicPower;
            
            // Update logs
            const logContainer = document.getElementById('log-container');
            logContainer.innerHTML = '';
            worldState.logs.slice(-10).forEach(log => {
                const logEntry = document.createElement('div');
                logEntry.className = 'log-entry';
                logEntry.textContent = log;
                logContainer.appendChild(logEntry);
            });
        }
        
        // WebSocket connection
        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = protocol + '//' + window.location.host;
            const ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                console.log('WebSocket connected');
            };
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'WORLD_UPDATE') {
                    worldState = data.data;
                    updateUI();
                    drawGame();
                }
            };
            
            ws.onclose = () => {
                console.log('WebSocket disconnected, reconnecting...');
                setTimeout(connectWebSocket, 3000);
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        }
        
        // Touch/Mouse controls
        canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (isDragging) {
                camera.x += e.clientX - lastX;
                camera.y += e.clientY - lastY;
                lastX = e.clientX;
                lastY = e.clientY;
                drawGame();
            }
        });
        
        canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                isDragging = true;
                lastX = e.touches[0].clientX;
                lastY = e.touches[0].clientY;
            }
        });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (isDragging && e.touches.length === 1) {
                camera.x += e.touches[0].clientX - lastX;
                camera.y += e.touches[0].clientY - lastY;
                lastX = e.touches[0].clientX;
                lastY = e.touches[0].clientY;
                drawGame();
            }
        });
        
        canvas.addEventListener('touchend', () => {
            isDragging = false;
        });
        
        // Pinch zoom
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            camera.zoom = Math.max(0.5, Math.min(2, camera.zoom * zoomFactor));
            drawGame();
        });
        
        // Initialize
        resizeCanvas();
        connectWebSocket();
        drawGame();
        updateUI();
    </script>
</body>
</html>`;
    
    return improvedHTML;
}

/**
 * 1. AI GENERATIVE NARRATIVE, ECONOMY & PHILOSOPHY ENGINE
 */
async function generateAIEvents() {
    const prompt = "Generate a brief event for a civilization simulator. Return JSON with fields: event, newPhilosophy, goldImpact, happinessImpact, techImpact";
    
    let parsed = null;

    try {
        const rawText = await queryGemini(prompt);
        if (rawText) {
            console.log("📝 Raw response:", rawText.substring(0, 200));
            
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
                console.log("✅ Parsed JSON:", parsed);
            }
        }
    } catch (err) {
        console.error("❌ JSON parse error:", err.message);
        parsed = null;
    }

    // Always use fallback if parsing fails
    if (!parsed || !parsed.event) {
        console.log("⚠️ Using fallback events");
        const fallbacks = [
            { event: "Automated trade routes expanded to neighboring sectors.", newPhilosophy: "Rational Pragmatism", goldImpact: 120, happinessImpact: 4, techImpact: 0.1 },
            { event: "R&D labs optimized grid distribution efficiency.", newPhilosophy: "Technological Supremacy", goldImpact: 200, happinessImpact: 6, techImpact: 0.2 },
            { event: "Minor bureaucratic delay affected fiscal allocations.", newPhilosophy: "Adaptive Bureaucracy", goldImpact: -40, happinessImpact: -2, techImpact: 0.05 }
        ];
        parsed = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    addLog("[AI THOUGHT] " + parsed.event);

    if (parsed.newPhilosophy) worldState.philosophy = parsed.newPhilosophy;
    if (typeof parsed.goldImpact === 'number') worldState.treasury = Math.max(0, worldState.treasury + parsed.goldImpact);
    if (typeof parsed.happinessImpact === 'number') worldState.happiness = Math.min(100, Math.max(10, worldState.happiness + parsed.happinessImpact));
    if (typeof parsed.techImpact === 'number') worldState.techPower += Math.max(0, parsed.techImpact);
}

/**
 * Execute git command
 */
function executeGitCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Git command failed: ${command}`);
                console.error(`Error: ${error.message}`);
                reject(error);
            } else {
                console.log(`Git command success: ${command}`);
                resolve(stdout);
            }
        });
    });
}

/**
 * 2. AI GRAPHICS & CODE REFACTOR ENGINE - LOCAL GENERATION
 */
async function autoImproveGameCode() {
    console.log("🤖 AI starting Code Refactor & Graphics Upgrade cycle...");
    addLog("[AI AUTO-CODING] Generating improved frontend code...");

    try {
        // Generate improved code locally
        const newCode = generateImprovedCode();
        
        if (!newCode || newCode.length < 100) {
            console.error("❌ Generated code too short");
            addLog("[AI COMMIT ERROR] Generated code too short.");
            return;
        }
        
        console.log("✅ Generated code length:", newCode.length, "characters");
        
        // Write to local file
        const localPath = path.join(__dirname, 'public', 'index.html');
        fs.writeFileSync(localPath, newCode);
        console.log("✅ Written to local file:", localPath);
        
        // Try to push to GitHub
        if (GITHUB_TOKEN) {
            console.log("📤 Pushing to GitHub...");
            
            try {
                const cleanToken = GITHUB_TOKEN.trim();
                
                // Configure git
                await executeGitCommand('git config --global user.email "ai@example.com"');
                await executeGitCommand('git config --global user.name "AI Auto-Improver"');
                
                const repoUrl = `https://${cleanToken}@github.com/edthedog-debug/dark-fantasy-civ.git`;
                
                try {
                    await executeGitCommand('git rev-parse --is-inside-work-tree');
                    console.log("✅ Already in git repository");
                    await executeGitCommand(`git remote set-url origin ${repoUrl}`);
                } catch (gitError) {
                    console.log("📁 Cloning repository...");
                    await executeGitCommand(`git clone ${repoUrl} /tmp/repo`);
                    process.chdir('/tmp/repo');
                }
                
                // Copy the file
                const targetPath = path.join(process.cwd(), 'public', 'index.html');
                fs.copyFileSync(localPath, targetPath);
                
                // Git operations
                await executeGitCommand('git add public/index.html');
                await executeGitCommand(`git commit -m "🤖 [AI Auto-Upgrade] Improved frontend to ${worldState.engineBuild}"`);
                await executeGitCommand('git push origin main');
                
                addLog("[AI COMMIT SUCCESS] Pushed improvements to GitHub!");
                console.log("✅ Successfully committed and pushed!");
            } catch (gitError) {
                console.error("❌ Git push failed:", gitError.message);
                addLog(`[AI COMMIT ERROR] Git push failed: ${gitError.message}`);
            }
        } else {
            console.log("⚠️ No GitHub token, only local file updated");
            addLog("[AI COMMIT WARNING] No GitHub token, only local file updated");
        }
        
    } catch (err) {
        console.error("Auto-code commit error:", err.message);
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

    if (worldState.treasury > 1500) {
        worldState.treasury -= 400;
        worldState.techPower += 0.2;
        worldState.happiness = Math.min(100, worldState.happiness + 4);
        addLog("[ECONOMY] Reinvested 400 Gold into Tech R&D and Public Services.");
    }

    if (worldState.treasury > 2500 && worldState.tanks < 12) {
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

    if (worldState.day % 10 === 0) {
        await generateAIEvents();
    }

    if (worldState.day % 100 === 0) {
        const patch = Math.floor(Math.random() * 9) + 1;
        worldState.engineBuild = "v2." + patch + ".0-Local-Generation";
        await autoImproveGameCode();
    }

    if (worldState.logs.length > 25) worldState.logs.shift();

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
    console.log("🚀 AI Self-Improving Server active on port " + PORT);
});