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
const IMPROVEMENT_MEMORY_FILE = path.join(__dirname, 'ai_memory.json');

// Rate limiter - 600 seconds (10 minutes)
const rateLimiter = {
    lastCallTime: 0,
    minInterval: 600000,
    
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

// GLOBAL FLAG to prevent parallel AI requests
let isAIRequestInProgress = false;

// AI MEMORY SYSTEM - Tracks which files have been improved
let aiMemory = {
    filesImproved: [],
    currentFileIndex: 0,
    lastImprovementDay: 0,
    totalImprovements: 0,
    fileHistory: {}
};

// Load AI memory if exists
if (fs.existsSync(IMPROVEMENT_MEMORY_FILE)) {
    try {
        const rawMemory = fs.readFileSync(IMPROVEMENT_MEMORY_FILE, 'utf8');
        aiMemory = JSON.parse(rawMemory);
        console.log("🧠 AI Memory loaded - Files improved:", aiMemory.filesImproved.length);
    } catch (e) {
        console.error("Error loading AI memory:", e);
    }
}

// List of all project files the AI should improve one by one
const PROJECT_FILES = [
    {
        name: 'server.js',
        path: path.join(__dirname, 'server.js'),
        type: 'javascript',
        description: 'Main game server with simulation logic'
    },
    {
        name: 'public/index.html',
        path: path.join(__dirname, 'public', 'index.html'),
        type: 'html',
        description: 'Game interface with pixel art rendering'
    },
    {
        name: 'package.json',
        path: path.join(__dirname, 'package.json'),
        type: 'json',
        description: 'Project configuration and dependencies'
    },
    {
        name: 'worldState.json',
        path: path.join(__dirname, 'worldState.json'),
        type: 'json',
        description: 'Current world state data'
    },
    {
        name: 'README.md',
        path: path.join(__dirname, 'README.md'),
        type: 'markdown',
        description: 'Project documentation'
    }
];

function saveAIMemory() {
    try {
        fs.writeFileSync(IMPROVEMENT_MEMORY_FILE, JSON.stringify(aiMemory, null, 2));
    } catch (err) {
        console.error("Error saving AI memory:", err);
    }
}

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
    buildingsCount: 3,
    abandonedBuildings: 0,
    demolitionTimer: 0,
    successfulImprovements: 0,
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
 * GROQ AI - WITH GLOBAL LOCK (10 MINUTES WAIT)
 */
async function queryAI(prompt, taskType) {
    if (!GROQ_API_KEY) {
        console.error("❌ No GROQ_API_KEY");
        return null;
    }

    while (isAIRequestInProgress) {
        console.log("⏳ Another AI request in progress - waiting 600s...");
        await new Promise(resolve => setTimeout(resolve, 600000));
    }
    
    isAIRequestInProgress = true;

    console.log("┌─────────────────────────────────────");
    console.log("│ 🤖 GROQ AI - " + taskType);
    console.log("│ 🧠 Model: groq/compound");
    console.log("└─────────────────────────────────────");
    
    try {
        await rateLimiter.waitForSlot();
        
        const url = 'https://api.groq.com/openai/v1/chat/completions';
        
        const makeRequest = async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'groq/compound',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7,
                    max_tokens: 2048,
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response;
        };
        
        let response = await makeRequest();
        
        if (response.status === 429 || response.status === 413) {
            console.log("│ ⚠️ RATE LIMITED (" + response.status + ") - Waiting 120s...");
            await new Promise(resolve => setTimeout(resolve, 120000));
            response = await makeRequest();
        }
        
        console.log("│ 📊 Status: " + response.status);
        
        if (response.ok) {
            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;
            
            console.log("│ 📝 Text length:", text?.length);
            console.log("│ 📝 Text preview:", text ? text.substring(0, 100) : 'NULL');
            
            if (text && text.trim().length > 0) {
                console.log("│ ✅ SUCCESS");
                console.log("└─────────────────────────────────────");
                return text;
            } else {
                console.log("│ ⚠️ Empty response");
                console.log("│ Response:", JSON.stringify(data).substring(0, 200));
            }
        } else {
            const errorText = await response.text();
            console.log("│ ❌ ERROR: " + response.status);
            console.log("│ Error:", errorText.substring(0, 200));
        }
    } catch (e) {
        console.log("│ ❌ FAILED: " + e.message);
    } finally {
        isAIRequestInProgress = false;
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
 * Push to GitHub - ALL FILES
 */
async function pushToGitHub(type, day, specificFile = null) {
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
        
        if (specificFile) {
            // Only push the specific improved file
            const relativePath = path.relative(__dirname, specificFile);
            const destPath = path.join('/tmp/repo', relativePath);
            const destDir = path.dirname(destPath);
            
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }
            
            fs.copyFileSync(specificFile, destPath);
            await executeGitCommand(`git add ${relativePath}`);
        } else {
            // Push all files
            const filesToCopy = ['server.js', 'worldState.json', 'package.json', 'README.md', 'ai_memory.json'];
            
            filesToCopy.forEach(file => {
                const sourcePath = path.join(__dirname, file);
                if (fs.existsSync(sourcePath)) {
                    fs.copyFileSync(sourcePath, path.join('/tmp/repo', file));
                }
            });
            
            // Copy public folder
            const publicDir = path.join(__dirname, 'public');
            if (fs.existsSync(publicDir)) {
                const publicDest = path.join('/tmp/repo', 'public');
                if (!fs.existsSync(publicDest)) fs.mkdirSync(publicDest, { recursive: true });
                
                fs.readdirSync(publicDir).forEach(file => {
                    const sourceFile = path.join(publicDir, file);
                    const destFile = path.join(publicDest, file);
                    if (fs.statSync(sourceFile).isFile()) {
                        fs.copyFileSync(sourceFile, destFile);
                    }
                });
            }
            
            await executeGitCommand('git add .');
        }
        
        const commitMessage = specificFile 
            ? `🤖 [AI] Improved ${path.basename(specificFile)} - Day ${day}`
            : `🤖 [AI] ${type} - Day ${day} - Full Project Enhancement`;
            
        await executeGitCommand(`git commit -m "${commitMessage}" --allow-empty`);
        await executeGitCommand('git push origin main --force', 4);
        
        process.chdir(orig);
        console.log(`✅ GitHub OK - ${specificFile ? path.basename(specificFile) : 'Full project'} pushed`);
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
    
    const prompt = `Dark fantasy event JSON. Day ${worldState.day}, Pop ${worldState.population}, Gold ${treasury}. Format: {"event":"text","goldImpact":-0.1,"happinessImpact":5,"techImpact":0.2,"visualEffect":"storm","duration":30}`;
    
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
        addLog("[AI EVENT] AI unavailable - skipped");
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

    // Happiness recovery system
    if (worldState.happiness < 20 && worldState.treasury > 100000) {
        worldState.treasury -= 100000;
        worldState.happiness = Math.min(100, worldState.happiness + 15);
        addLog("[WELFARE] Invested 100,000 Gold in public welfare. Happiness +15");
    }
    else if (worldState.happiness < 40 && worldState.treasury > 50000 && worldState.day % 10 === 0) {
        worldState.treasury -= 50000;
        worldState.happiness = Math.min(100, worldState.happiness + 8);
        addLog("[WELFARE] Invested 50,000 Gold in public welfare. Happiness +8");
    }
    else if (worldState.happiness >= 40 && worldState.happiness < 70 && worldState.day % 20 === 0) {
        worldState.happiness = Math.min(100, worldState.happiness + 2);
        addLog("[WELFARE] Natural happiness recovery +2");
    }
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

    const marketFluctuation = (Math.random() * 0.08) - 0.03;
    
    const baseTaxPerCitizen = 8;
    const techMultiplier = 1 + (worldState.techPower * 0.05);
    const tradeBonus = 1 + (worldState.population * 0.001);
    const grossIncome = Math.floor(worldState.population * baseTaxPerCitizen * moraleProductivity * techMultiplier * tradeBonus * (1 + marketFluctuation));
    
    const citizenServices = Math.floor(worldState.population * 3);
    const militaryMaintenance = worldState.tanks * 100;
    const infrastructureRepairs = Math.floor(worldState.treasury * 0.003);
    const totalExpenses = citizenServices + militaryMaintenance + infrastructureRepairs;
    
    const netProfit = grossIncome - totalExpenses;
    worldState.treasury = Math.max(0, worldState.treasury + netProfit);

    if (Math.abs(netProfit) > 1000 && worldState.day % 5 === 0) {
        const status = netProfit > 0 ? "📈 PROFIT" : "📉 LOSS";
        const fluctuation = marketFluctuation >= 0 ? "+" + (marketFluctuation * 100).toFixed(1) + "%" : (marketFluctuation * 100).toFixed(1) + "%";
        addLog("[ECONOMY] " + status + ": " + netProfit.toLocaleString() + " Gold (Market: " + fluctuation + ")");
    }

    worldState.techPower += 0.008;

    // Population system
    if (worldState.happiness > 60 && worldState.treasury > 20000 && worldState.day % 8 === 0) {
        worldState.population += 1;
        addLog("[DEMOGRAPHICS] +1 immigrant. Pop: " + worldState.population);
    }
    else if (worldState.happiness < 15 && worldState.population > 10 && worldState.day % 8 === 0) {
        worldState.population -= 1;
        addLog("[DEMOGRAPHICS] -1 emigrated. Pop: " + worldState.population);
    }
    else if (worldState.happiness >= 50 && worldState.population > 10 && worldState.day % 25 === 0) {
        worldState.population += 1;
        addLog("[DEMOGRAPHICS] +1 natural growth. Pop: " + worldState.population);
    }

    // Buildings system
    const expectedBuildings = Math.floor(worldState.population / 100) + 2;
    
    if (worldState.buildingsCount < expectedBuildings && worldState.treasury > 10000 && worldState.day % 20 === 0) {
        worldState.treasury -= 10000;
        worldState.buildingsCount += 1;
        addLog("[BUILDING] Built new structure. Total: " + worldState.buildingsCount);
    }
    
    if (worldState.buildingsCount > expectedBuildings) {
        worldState.demolitionTimer = (worldState.demolitionTimer || 0) + 1;
        
        if (worldState.demolitionTimer >= 10) {
            worldState.buildingsCount -= 1;
            worldState.demolitionTimer = 0;
            worldState.abandonedBuildings = (worldState.abandonedBuildings || 0) + 1;
            addLog("[BUILDING] Abandoned structure demolished. Total: " + worldState.buildingsCount);
        }
    } else {
        worldState.demolitionTimer = 0;
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
        const defenseUpkeep = worldState.tanks * 100;
        worldState.treasury = Math.max(0, worldState.treasury - defenseUpkeep);
    }

    if (worldState.activeEvents) {
        worldState.activeEvents = worldState.activeEvents.filter(e => e.endDay > worldState.day);
    }

    if (worldState.day % 300 === 0) {
        generateAIEvents();
    }

    // IMPROVE NEXT FILE IN SEQUENCE every 100 days
    if (worldState.day % 100 === 0 && worldState.day > aiMemory.lastImprovementDay) {
        improveNextFile().catch(err => console.error(err.message));
        aiMemory.lastImprovementDay = worldState.day;
        saveAIMemory();
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
 * IMPROVE NEXT FILE IN SEQUENCE
 */
async function improveNextFile() {
    console.log("\n┌─────────────────────────────────────");
    console.log("│ 🤖 AI FILE-BY-FILE IMPROVEMENT");
    console.log("│ 📁 Memory: " + aiMemory.filesImproved.length + "/" + PROJECT_FILES.length + " files improved");
    console.log("└─────────────────────────────────────");
    
    // Find the next file to improve
    let nextFileIndex = aiMemory.currentFileIndex % PROJECT_FILES.length;
    let nextFile = PROJECT_FILES[nextFileIndex];
    
    // Skip files that don't exist yet
    while (!fs.existsSync(nextFile.path) && nextFile.name !== 'README.md') {
        console.log(`⏭️ Skipping ${nextFile.name} - doesn't exist yet`);
        aiMemory.currentFileIndex++;
        nextFileIndex = aiMemory.currentFileIndex % PROJECT_FILES.length;
        nextFile = PROJECT_FILES[nextFileIndex];
    }
    
    console.log(`\n📄 Improving: ${nextFile.name}`);
    console.log(`📄 Type: ${nextFile.type}`);
    console.log(`📄 Description: ${nextFile.description}`);
    
    addLog(`[AI] Improving ${nextFile.name} - ${nextFile.description}`);
    
    try {
        const improved = await improveSpecificFile(nextFile);
        
        if (improved) {
            // Update memory
            aiMemory.filesImproved.push({
                fileName: nextFile.name,
                day: worldState.day,
                timestamp: new Date().toISOString(),
                success: true
            });
            
            aiMemory.totalImprovements++;
            aiMemory.currentFileIndex++;
            
            // Track history
            if (!aiMemory.fileHistory[nextFile.name]) {
                aiMemory.fileHistory[nextFile.name] = [];
            }
            aiMemory.fileHistory[nextFile.name].push({
                day: worldState.day,
                timestamp: new Date().toISOString()
            });
            
            saveAIMemory();
            
            // Push to GitHub
            await pushToGitHub("File Improvement", worldState.day, nextFile.path);
            
            console.log(`✅ ${nextFile.name} improved and pushed to GitHub`);
            addLog(`[AI] ✅ ${nextFile.name} improved successfully`);
            
            worldState.aiImprovements++;
            worldState.successfulImprovements = (worldState.successfulImprovements || 0) + 1;
            saveWorldState();
        } else {
            console.log(`⚠️ ${nextFile.name} improvement failed - will retry next cycle`);
            addLog(`[AI] ⚠️ ${nextFile.name} improvement failed`);
        }
        
    } catch (err) {
        console.error(`❌ Error improving ${nextFile.name}:`, err.message);
        addLog(`[AI] ❌ Error improving ${nextFile.name}: ${err.message}`);
    }
}

/**
 * IMPROVE SPECIFIC FILE
 */
async function improveSpecificFile(fileInfo) {
    console.log(`\n📄 Processing: ${fileInfo.name}`);
    
    if (!fs.existsSync(fileInfo.path)) {
        console.log(`⚠️ File doesn't exist: ${fileInfo.path}`);
        return false;
    }
    
    const currentContent = fs.readFileSync(fileInfo.path, 'utf8');
    console.log(`📄 Current size: ${currentContent.length} characters`);
    
    // Limit size for prompt
    const maxSize = fileInfo.type === 'html' ? 30000 : 15000;
    const contentPreview = currentContent.substring(0, maxSize);
    
    // Generate prompt based on file type
    let prompt = '';
    
    switch(fileInfo.type) {
        case 'javascript':
            prompt = `Improve this dark fantasy civilization game server code (${fileInfo.name}).
            
Focus on:
1. Better game mechanics and balance
2. Enhanced economy system
3. More interesting events
4. Performance optimizations
5. Error handling

IMPORTANT:
- Keep all existing functionality
- Keep WebSocket implementation
- Maintain dark fantasy theme
- Add improvements, don't remove features

Current code:
\`\`\`javascript
${contentPreview}
\`\`\`

Return the complete improved JavaScript code.`;
            break;
            
        case 'html':
            prompt = `Enhance this dark fantasy pixel art game interface (${fileInfo.name}).

Focus on:
1. Better pixel art graphics
2. Atmospheric effects
3. More detailed buildings
4. Improved UI/UX
5. Particle effects

IMPORTANT:
- Keep all existing HTML IDs and functions
- Keep WebSocket functionality
- Keep canvas rendering
- Maintain dark fantasy atmosphere
- Use pixel art style

Current HTML:
\`\`\`html
${contentPreview}
\`\`\`

Return the complete improved HTML.`;
            break;
            
        case 'json':
            prompt = `Optimize this JSON configuration file (${fileInfo.name}).
            
Keep all existing fields and add any useful improvements while maintaining valid JSON format.

Current JSON:
\`\`\`json
${contentPreview}
\`\`\`

Return the complete improved JSON.`;
            break;
            
        case 'markdown':
            prompt = `Improve this documentation file (${fileInfo.name}).
            
Make it more comprehensive and clear while maintaining accurate information about this dark fantasy civilization game.

Current content:
${contentPreview}

Return the complete improved markdown documentation.`;
            break;
    }
    
    const aiResponse = await queryAI(prompt, `FILE: ${fileInfo.name}`);
    
    if (!aiResponse || aiResponse.length < 100) {
        console.log(`⚠️ AI response too short for ${fileInfo.name}`);
        return false;
    }
    
    // Extract content based on file type
    let newContent = aiResponse;
    
    const codePatterns = {
        'javascript': /```javascript[\s\S]*?```|```js[\s\S]*?```/,
        'html': /```html[\s\S]*?```|<!DOCTYPE html>[\s\S]*?<\/html>/,
        'json': /```json[\s\S]*?```/,
        'markdown': /```markdown[\s\S]*?```|```md[\s\S]*?```/
    };
    
    const pattern = codePatterns[fileInfo.type];
    if (pattern) {
        const match = aiResponse.match(pattern);
        if (match) {
            newContent = match[0].replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim();
        }
    }
    
    // Validate content
    if (fileInfo.type === 'json') {
        try {
            JSON.parse(newContent);
        } catch (e) {
            console.log(`⚠️ Invalid JSON for ${fileInfo.name}:`, e.message);
            return false;
        }
    }
    
    if (fileInfo.type === 'html') {
        if (!validateHTML(newContent)) {
            console.log(`⚠️ HTML validation failed for ${fileInfo.name}`);
            return false;
        }
    }
    
    // Create backup
    const backupPath = fileInfo.path + '.backup_' + worldState.day;
    fs.writeFileSync(backupPath, currentContent);
    console.log(`💾 Backup created: ${backupPath}`);
    
    // Save improved version
    fs.writeFileSync(fileInfo.path, newContent);
    console.log(`✅ ${fileInfo.name} improved (${currentContent.length} → ${newContent.length} chars)`);
    
    return true;
}

/**
 * Validate HTML
 */
function validateHTML(html) {
    const errors = [];
    
    if (!/new WebSocket|ws\.onopen|ws\.onmessage/i.test(html)) {
        errors.push("Missing WebSocket");
    }
    
    const requiredIds = ['stat-day', 'stat-era', 'stat-pop', 'stat-gold', 'stat-tech', 'stat-tanks', 'stat-status', 'stat-building-count', 'gameCanvas', 'event-panel', 'log-stream', 'connection-dot', 'connection-text'];
    requiredIds.forEach(id => {
        if (!html.includes('id="' + id + '"')) {
            errors.push("Missing ID: " + id);
        }
    });
    
    const requiredFunctions = ['connectWebSocket', 'updateUI', 'drawCastle', 'drawHouse', 'drawBarracks', 'drawTower', 'render', 'generateObjects'];
    requiredFunctions.forEach(func => {
        if (!html.includes('function ' + func) && !html.includes(func + ' =')) {
            errors.push("Missing function: " + func);
        }
    });
    
    if (/background:\s*(white|#fff|#ffffff)/i.test(html)) {
        errors.push("White background detected");
    }
    
    if (!/getContext\('2d'\)|getContext\("2d"\)/i.test(html)) {
        errors.push("Missing canvas context");
    }
    
    if (!/requestAnimationFrame/i.test(html)) {
        errors.push("Missing requestAnimationFrame");
    }
    
    if (errors.length > 0) {
        console.log("Validation errors:", errors);
    }
    
    return errors.length === 0;
}

/**
 * Clean HTML - PROTECTED
 */
function getCleanHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Sovereign AI Engine - World Map</title>
    <style>
        :root {
            --bg-primary: #070913;
            --bg-panel: rgba(16, 22, 36, 0.95);
            --bg-card: rgba(25, 33, 52, 0.7);
            --border-glow: rgba(0, 210, 255, 0.25);
            --text-primary: #e0e6ed;
            --accent-gold: #ffd700;
            --accent-green: #2ecc71;
            --accent-red: #e74c3c;
            --accent-cyan: #00d2ff;
            --accent-purple: #9b59b6;
            --accent-blue: #3498db;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background: #070913 !important; color: #e0e6ed; min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; padding: 10px; gap: 8px; overflow: hidden !important; position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; }
        .dashboard { background: rgba(16, 22, 36, 0.95); border: 1px solid rgba(0, 210, 255, 0.3); border-radius: 10px; padding: 10px; flex-shrink: 0; }
        .dash-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .status-badge { color: #00ff88; font-size: 11px; display: flex; align-items: center; gap: 5px; }
        .status-dot { width: 8px; height: 8px; background: #00ff88; border-radius: 50%; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { box-shadow: 0 0 5px #00ff88; } 50% { box-shadow: 0 0 15px #00ff88; } }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
        .stat-card { background: rgba(25, 33, 52, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 6px 8px; }
        .stat-label { font-size: 8px; color: #6b7c93; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-value { font-size: 13px; font-weight: bold; color: #fff; }
        #map-container { flex: 1; background: #04060d; border: 1px solid rgba(0, 210, 255, 0.25); border-radius: 10px; position: relative; overflow: hidden; min-height: 0; }
        canvas { display: block; width: 100%; height: 100%; touch-action: none; }
        .event-panel { background: rgba(12, 17, 29, 0.95); border: 1px solid #00ff88; border-radius: 8px; padding: 6px 10px; font-size: 10px; color: #00ff88; max-height: 40px; overflow-y: auto; flex-shrink: 0; }
        .log-container { height: 100px; background: rgba(12, 17, 29, 0.98); border: 1px solid rgba(0, 210, 255, 0.2); border-radius: 8px; padding: 8px; overflow-y: auto; font-family: 'Courier New', monospace; font-size: 10px; flex-shrink: 0; }
        .log-entry { color: #a0aec0; margin-bottom: 2px; line-height: 1.4; }
        .log-entry:last-child { color: #00d2ff; }
        @media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 4px; } .stat-value { font-size: 11px; } .log-container { height: 70px; } body { padding: 6px; gap: 6px; } }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="dash-header">
            <span style="color:#8a99ad;font-weight:bold;">SOVEREIGN AI ENGINE</span>
            <div class="status-badge">
                <div class="status-dot" id="connection-dot"></div>
                <span id="connection-text">CONNECTING...</span>
            </div>
        </div>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-label">DAY</div><div class="stat-value" id="stat-day">-</div></div>
            <div class="stat-card"><div class="stat-label">ERA</div><div class="stat-value" id="stat-era" style="color:#9b59b6;">-</div></div>
            <div class="stat-card"><div class="stat-label">POPULATION</div><div class="stat-value" id="stat-pop" style="color:#2ecc71;">-</div></div>
            <div class="stat-card"><div class="stat-label">TREASURY</div><div class="stat-value" id="stat-gold" style="color:#ffd700;">-</div></div>
            <div class="stat-card"><div class="stat-label">TECH</div><div class="stat-value" id="stat-tech" style="color:#3498db;">-</div></div>
            <div class="stat-card"><div class="stat-label">DEFENSES</div><div class="stat-value" id="stat-tanks">-</div></div>
            <div class="stat-card"><div class="stat-label">STATUS</div><div class="stat-value" id="stat-status" style="color:#2ecc71;">-</div></div>
            <div class="stat-card"><div class="stat-label">BUILDINGS</div><div class="stat-value" id="stat-building-count">-</div></div>
        </div>
    </div>
    <div id="map-container"><canvas id="gameCanvas"></canvas></div>
    <div class="event-panel" id="event-panel">No active events</div>
    <div class="log-container"><div id="log-stream" style="color:#6b7c93;">Connecting to server...</div></div>
    <script>
    (() => {
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        let worldState = null;
        let ws = null;
        let buildings = [];
        let units = [];
        let frameCount = 0;
        let camera = { x: 0, y: 0, zoom: 1 };
        let isDragging = false;
        let startX = 0, startY = 0;
        let lastRegeneration = 0;
        const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
        const px = (p, d) => (p / 100) * d;
        function resizeCanvas() { const container = document.getElementById('map-container'); canvas.width = container.clientWidth; canvas.height = container.clientHeight; }
        window.addEventListener('resize', () => setTimeout(resizeCanvas, 150));
        resizeCanvas();
        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(protocol + '//' + window.location.host);
            ws.onopen = () => { console.log('✅ WebSocket connected'); document.getElementById('log-stream').innerHTML = '<span style="color:#00ff88;">✅ Connected</span>'; document.getElementById('connection-dot').style.background = '#00ff88'; document.getElementById('connection-text').innerText = 'CONNECTED'; };
            ws.onmessage = (event) => { try { const msg = JSON.parse(event.data); if (msg.type === 'WORLD_UPDATE') { worldState = msg.data; updateUI(); const now = Date.now(); if (now - lastRegeneration > 5000) { lastRegeneration = now; generateObjects(); } } } catch (e) { console.error('❌ Parse error:', e); } };
            ws.onerror = () => { document.getElementById('log-stream').innerHTML = '<span style="color:#ff4444;">❌ Error</span>'; document.getElementById('connection-dot').style.background = '#e74c3c'; document.getElementById('connection-text').innerText = 'ERROR'; };
            ws.onclose = () => { document.getElementById('log-stream').innerHTML = '<span style="color:#ffcc00;">🔄 Reconnecting...</span>'; document.getElementById('connection-dot').style.background = '#ffcc00'; document.getElementById('connection-text').innerText = 'RECONNECTING'; setTimeout(connectWebSocket, 2000); };
        }
        function updateUI() {
            if (!worldState) return;
            document.getElementById('stat-day').innerText = worldState.day;
            document.getElementById('stat-era').innerText = worldState.era;
            document.getElementById('stat-pop').innerText = worldState.population;
            document.getElementById('stat-gold').innerText = Math.floor(worldState.treasury).toLocaleString() + ' G';
            document.getElementById('stat-tech').innerText = Number(worldState.techPower).toFixed(1);
            document.getElementById('stat-tanks').innerText = worldState.tanks;
            document.getElementById('stat-status').innerText = worldState.inWar ? 'WAR' : 'PEACE';
            document.getElementById('stat-status').style.color = worldState.inWar ? '#e74c3c' : '#2ecc71';
            document.getElementById('stat-building-count').innerText = worldState.buildingsCount || Math.floor(worldState.population / 100) + 2;
            const ep = document.getElementById('event-panel');
            if (worldState.activeEvents && worldState.activeEvents.length > 0) { ep.innerHTML = worldState.activeEvents.map(e => '⚡ ' + e.description).join(' | '); ep.style.borderColor = '#ff4444'; ep.style.color = '#ff6666'; } else { ep.innerHTML = 'No active events'; ep.style.borderColor = '#00ff88'; ep.style.color = '#00ff88'; }
            const logBox = document.getElementById('log-stream');
            if (worldState.logs && worldState.logs.length > 0) { logBox.innerHTML = worldState.logs.map(l => '<div class="log-entry">' + l + '</div>').join(''); logBox.scrollTop = logBox.scrollHeight; }
        }
        function generateObjects() {
            if (!worldState) return;
            buildings = [];
            units = [];
            const bCount = clamp(Math.floor(worldState.population / 100) + 2, 5, 80);
            const uCount = clamp(Math.floor(worldState.population / 10) + 2, 3, 50);
            for (let i = 0; i < bCount; i++) { buildings.push({ xPercent: 5 + ((i * 7) % 90), yPercent: 10 + ((i * 5) % 80), type: i % 4, heightPercent: 8 + (i % 5) * 3 }); }
            for (let u = 0; u < uCount; u++) { units.push({ xPercent: 5 + Math.random() * 90, yPercent: 10 + Math.random() * 80, color: ['#ff6666', '#6666ff', '#66ff66', '#ffff66', '#ff66ff'][u % 5] }); }
        }
        canvas.addEventListener('mousedown', (e) => { isDragging = true; startX = e.clientX - camera.x; startY = e.clientY - camera.y; });
        window.addEventListener('mouseup', () => isDragging = false);
        canvas.addEventListener('mousemove', (e) => { if (isDragging) { camera.x = e.clientX - startX; camera.y = e.clientY - startY; } });
        canvas.addEventListener('wheel', (e) => { e.preventDefault(); camera.zoom = clamp(camera.zoom * (e.deltaY < 0 ? 1.1 : 0.9), 0.5, 2.5); }, { passive: false });
        let lastTouchDist = 0;
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); if (e.touches.length === 1) { isDragging = true; startX = e.touches[0].clientX - camera.x; startY = e.touches[0].clientY - camera.y; } else if (e.touches.length === 2) { isDragging = false; lastTouchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); } });
        canvas.addEventListener('touchend', () => isDragging = false);
        canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (e.touches.length === 1 && isDragging) { camera.x = e.touches[0].clientX - startX; camera.y = e.touches[0].clientY - startY; } else if (e.touches.length === 2) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); camera.zoom = clamp(camera.zoom * (d / lastTouchDist), 0.5, 2.5); lastTouchDist = d; } }, { passive: false });
        function drawCastle(x, y, h) { ctx.fillStyle = '#8a8a8a'; ctx.fillRect(x - h * 0.3, y - h, h * 0.6, h); for (let i = -2; i <= 2; i++) { ctx.fillRect(x + i * h * 0.12, y - h - 4, 4, 4); } ctx.fillStyle = '#ffff88'; for (let w = 0; w < 3; w++) { ctx.fillRect(x - 3, y - h + 6 + w * 10, 6, 5); } ctx.fillStyle = '#3a1a0a'; ctx.fillRect(x - 4, y - 8, 8, 8); }
        function drawHouse(x, y, h) { ctx.fillStyle = '#c4a060'; ctx.fillRect(x - h * 0.35, y - h, h * 0.7, h); ctx.fillStyle = '#8a3a1a'; ctx.fillRect(x - h * 0.45, y - h - 3, h * 0.9, 4); ctx.fillStyle = '#ffff88'; ctx.fillRect(x - 3, y - h + 5, 5, 4); ctx.fillStyle = '#3a1a0a'; ctx.fillRect(x - 3, y - 5, 6, 5); }
        function drawBarracks(x, y, h) { ctx.fillStyle = '#6a6a6a'; ctx.fillRect(x - h * 0.4, y - h, h * 0.8, h); ctx.fillStyle = '#4a4a4a'; ctx.fillRect(x - h * 0.5, y - h - 2, h, 3); }
        function drawTower(x, y, h) { ctx.fillStyle = '#7a7a7a'; ctx.fillRect(x - h * 0.2, y - h, h * 0.4, h); ctx.fillStyle = '#5a5a5a'; ctx.fillRect(x - h * 0.3, y - h - 3, h * 0.6, 3); }
        function render() {
            frameCount++;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.translate(camera.x, camera.y);
            ctx.scale(camera.zoom, camera.zoom);
            for (let x = 0; x < canvas.width + 20; x += 20) { for (let y = 0; y < canvas.height + 20; y += 20) { ctx.fillStyle = ((x + y) % 40 === 0) ? '#1a3a1a' : '#1a2a1a'; ctx.fillRect(x, y, 20, 20); } }
            for (let y = 0; y < canvas.height; y += 4) { const wave = Math.sin((y * 0.04) + frameCount * 0.03) * 8; ctx.fillStyle = '#1a4a6a'; ctx.fillRect(canvas.width * 0.4 + wave, y, 16, 4); }
            const treePositions = [[8,15],[22,25],[45,12],[60,30],[75,18],[15,50],[38,45],[65,55],[85,40]];
            treePositions.forEach(t => { const tx = px(t[0], canvas.width); const ty = px(t[1], canvas.height); ctx.fillStyle = '#5a3a1a'; ctx.fillRect(tx, ty, 4, 12); ctx.fillStyle = '#1a5a1a'; ctx.fillRect(tx - 7, ty - 12, 18, 12); ctx.fillStyle = '#2a6a2a'; ctx.fillRect(tx - 4, ty - 16, 12, 5); });
            buildings.forEach(b => { const bx = px(b.xPercent, canvas.width); const by = px(b.yPercent, canvas.height); const bh = px(b.heightPercent, canvas.height); switch(b.type) { case 0: drawCastle(bx, by, bh); break; case 1: drawHouse(bx, by, bh * 0.6); break; case 2: drawBarracks(bx, by, bh * 0.7); break; case 3: drawTower(bx, by, bh * 1.2); break; } });
            units.forEach(u => { const ux = px(u.xPercent, canvas.width); const uy = px(u.yPercent, canvas.height); const legOffset = Math.sin(frameCount * 0.1 + ux) > 0 ? 0 : 3; ctx.fillStyle = u.color; ctx.fillRect(Math.round(ux), Math.round(uy - 6), 3, 6); ctx.fillStyle = '#ffcc99'; ctx.fillRect(Math.round(ux), Math.round(uy - 9), 3, 3); ctx.fillStyle = '#333'; ctx.fillRect(Math.round(ux), Math.round(uy), 1, 3 + legOffset); ctx.fillRect(Math.round(ux + 2), Math.round(uy), 1, 3 - legOffset); });
            if (worldState && worldState.activeEvents) { worldState.activeEvents.forEach(evt => { if (evt.type === 'blood_moon') { ctx.fillStyle = 'rgba(150,0,0,0.3)'; ctx.fillRect(0, 0, canvas.width, canvas.height); } if (evt.type === 'fire') { ctx.fillStyle = 'rgba(255,100,0,0.2)'; ctx.fillRect(0, 0, canvas.width, canvas.height); } if (evt.type === 'storm') { ctx.fillStyle = 'rgba(30,30,60,0.5)'; ctx.fillRect(0, 0, canvas.width, canvas.height); } if (evt.type === 'plague') { ctx.fillStyle = 'rgba(0,150,0,0.2)'; ctx.fillRect(0, 0, canvas.width, canvas.height); } if (evt.type === 'prosperity') { ctx.fillStyle = 'rgba(255,215,0,0.15)'; ctx.fillRect(0, 0, canvas.width, canvas.height); } }); }
            ctx.restore();
            requestAnimationFrame(render);
        }
        connectWebSocket();
        requestAnimationFrame(render);
    })();
    </script>
</body>
</html>`;
}

// START SERVER
SERVER.listen(PORT, () => {
    console.log("🚀 Dark Fantasy Civilization active on port " + PORT);
    console.log("📊 Day:", worldState.day, "| Population:", worldState.population);
    console.log("🤖 AI Model: groq/compound");
    console.log("🧠 AI Memory: " + aiMemory.filesImproved.length + "/" + PROJECT_FILES.length + " files improved");
    console.log("⏱️ Events: every 300 days | File Improvement: every 100 days | Rate: 600s");
    console.log("🔒 AI Lock: 10 minute wait between requests");
    console.log("📁 AI improves files one by one with memory");
    
    addLog("[SYSTEM] Simulation started with file-by-file AI improvement.");
    broadcastState();
    
    console.log("\n🔌 Testing AI connection...");
    queryAI("Say OK", "CONNECTION TEST").then(response => {
        if (response) {
            console.log("✅ AI CONNECTION ESTABLISHED");
            addLog("[SYSTEM] AI System ready for file-by-file improvement.");
        } else {
            console.log("⚠️ AI connection failed");
            addLog("[SYSTEM] AI unavailable.");
        }
        broadcastState();
    });
});