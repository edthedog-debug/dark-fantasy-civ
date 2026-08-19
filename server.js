const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { exec } = require('child_process');
const { createCanvas } = require('canvas'); // Para renders

const APP = express();
const PORT = process.env.PORT || 3000;

// ENVIRONMENT VARIABLES
const GROQ_API_KEY = process.env.GROQ_API_KEY; 
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'edthedog-debug/dark-fantasy-civ';

APP.use(cors());
APP.use(express.static(path.join(__dirname, 'public')));

const SERVER = http.createServer(APP);
const WSS = new WebSocket.Server({ server: SERVER, perMessageDeflate: false });
const STATE_FILE = path.join(__dirname, 'worldState.json');

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
    lastImprovementDetails: null,
    pendingChoice: null,
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
 * GROQ AI - MULTI-MODEL FALLBACK SYSTEM
 */
const AI_MODELS = [
    {
        name: 'groq/compound',
        displayName: 'COMPOUND',
        maxTokens: 2048,
        temperature: 0.8
    },
    {
        name: 'openai/gpt-oss-120b',
        displayName: 'GPT-OSS-120B',
        maxTokens: 4096,
        temperature: 0.8
    },
    {
        name: 'openai/gpt-oss-20b',
        displayName: 'GPT-OSS-20B',
        maxTokens: 2048,
        temperature: 0.7
    }
];

async function queryAI(prompt, taskType) {
    if (!GROQ_API_KEY) {
        console.error("❌ No GROQ_API_KEY");
        return null;
    }

    while (isAIRequestInProgress) {
        console.log("⏳ Another AI request in progress - waiting...");
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    isAIRequestInProgress = true;

    console.log("┌─────────────────────────────────────");
    console.log("│ 🤖 GROQ AI MULTI-MODEL - " + taskType);
    console.log("│ 🔄 Fallback Chain: Compound → GPT-OSS-120B → GPT-OSS-20B");
    console.log("└─────────────────────────────────────");
    
    try {
        for (let i = 0; i < AI_MODELS.length; i++) {
            const model = AI_MODELS[i];
            console.log(`\n┌─────────────────────────────────────`);
            console.log(`│ 🎯 ATTEMPT ${i + 1}/${AI_MODELS.length}: ${model.displayName}`);
            console.log(`│ 📦 Model: ${model.name}`);
            console.log(`└─────────────────────────────────────`);
            
            await rateLimiter.waitForSlot();
            
            const url = 'https://api.groq.com/openai/v1/chat/completions';
            
            const makeRequest = async () => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 60000);
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${GROQ_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: model.name,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: model.temperature,
                        max_tokens: model.maxTokens,
                        top_p: 0.9,
                        frequency_penalty: 0.3,
                        presence_penalty: 0.2,
                        stream: false,
                        response_format: { type: "text" }
                    }),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                return response;
            };
            
            try {
                let response = await makeRequest();
                
                if (response.status === 429 || response.status === 413) {
                    console.log(`│ ⚠️ RATE LIMITED (${response.status}) - Waiting 120s...`);
                    await new Promise(resolve => setTimeout(resolve, 120000));
                    response = await makeRequest();
                }
                
                console.log(`│ 📊 Status: ${response.status}`);
                
                if (response.ok) {
                    const data = await response.json();
                    const text = data.choices?.[0]?.message?.content;
                    
                    console.log(`│ 📝 Text length: ${text?.length}`);
                    console.log(`│ 📝 Text preview: ${text ? text.substring(0, 150) : 'NULL'}`);
                    
                    if (text && text.trim().length > 0) {
                        console.log(`│ ✅ SUCCESS with ${model.displayName}`);
                        console.log("└─────────────────────────────────────");
                        return text;
                    } else {
                        console.log(`│ ⚠️ Empty response from ${model.displayName}`);
                        if (i < AI_MODELS.length - 1) {
                            console.log(`│ 🔄 Falling back to next model...`);
                        }
                    }
                } else {
                    const errorText = await response.text();
                    console.log(`│ ❌ ERROR (${response.status}) with ${model.displayName}`);
                    console.log(`│ Error: ${errorText.substring(0, 200)}`);
                    
                    if (i < AI_MODELS.length - 1) {
                        console.log(`│ 🔄 Falling back to next model...`);
                    }
                }
            } catch (modelError) {
                console.log(`│ ❌ FAILED with ${model.displayName}: ${modelError.message}`);
                
                if (i < AI_MODELS.length - 1) {
                    console.log(`│ 🔄 Falling back to next model...`);
                }
            }
        }
        
        console.log(`\n│ ❌ ALL MODELS FAILED - No fallback available`);
        
    } catch (e) {
        console.log("│ ❌ SYSTEM ERROR: " + e.message);
    } finally {
        isAIRequestInProgress = false;
    }
    
    console.log("└─────────────────────────────────────");
    return null;
}

/**
 * Generate render of current world state
 */
async function generateWorldRender() {
    try {
        const canvas = createCanvas(800, 600);
        const ctx = canvas.getContext('2d');
        
        // Dark fantasy background
        const gradient = ctx.createLinearGradient(0, 0, 0, 600);
        gradient.addColorStop(0, '#1a0a2e');
        gradient.addColorStop(0.5, '#2d1b4e');
        gradient.addColorStop(1, '#0d001a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 800, 600);
        
        // Draw stars
        for (let i = 0; i < 100; i++) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.8})`;
            ctx.fillRect(Math.random() * 800, Math.random() * 300, 2, 2);
        }
        
        // Draw moon
        ctx.fillStyle = '#e0d0ff';
        ctx.beginPath();
        ctx.arc(650, 100, 40, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw ground
        ctx.fillStyle = '#1a0f0a';
        ctx.fillRect(0, 400, 800, 200);
        
        // Draw buildings based on state
        const buildingCount = Math.min(worldState.buildingsCount, 10);
        for (let i = 0; i < buildingCount; i++) {
            const x = 100 + (i * 70);
            const y = 350 - Math.random() * 50;
            
            // Castle/Building
            ctx.fillStyle = '#4a3a5a';
            ctx.fillRect(x, y, 50, 80);
            
            // Tower
            ctx.fillStyle = '#6a5a7a';
            ctx.fillRect(x + 15, y - 30, 20, 40);
            
            // Windows with warm light
            ctx.fillStyle = '#ffaa00';
            ctx.fillRect(x + 10, y + 10, 8, 8);
            ctx.fillRect(x + 30, y + 10, 8, 8);
            ctx.fillRect(x + 10, y + 40, 8, 8);
            ctx.fillRect(x + 30, y + 40, 8, 8);
        }
        
        // Draw title
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Dark Fantasy Civilization', 400, 50);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.fillText(`Day ${worldState.day} - ${worldState.era}`, 400, 90);
        ctx.fillText(`Population: ${worldState.population} | Gold: ${worldState.treasury}`, 400, 130);
        
        // Save render
        const renderBuffer = canvas.toBuffer('image/png');
        const renderPath = path.join(__dirname, 'renders');
        if (!fs.existsSync(renderPath)) {
            fs.mkdirSync(renderPath, { recursive: true });
        }
        
        const renderFile = path.join(renderPath, `world_day_${worldState.day}.png`);
        fs.writeFileSync(renderFile, renderBuffer);
        
        console.log(`🎨 Render generated: world_day_${worldState.day}.png`);
        return renderFile;
    } catch (error) {
        console.error('❌ Render generation failed:', error.message);
        return null;
    }
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
 * Push to GitHub with renders and comments
 */
async function pushToGitHub(htmlPath, type, day, renderPath, aiComment) {
    if (!GITHUB_TOKEN) {
        console.log("⚠️ GitHub push disabled - no token");
        return;
    }
    
    try {
        const token = GITHUB_TOKEN.trim();
        const repoUrl = `https://${token}@github.com/${GITHUB_REPO}.git`;
        
        await executeGitCommand('rm -rf /tmp/repo', 1);
        await executeGitCommand(`git clone --depth 1 ${repoUrl} /tmp/repo`, 4);
        
        const orig = process.cwd();
        process.chdir('/tmp/repo');
        await executeGitCommand('git config user.email "ai@example.com"');
        await executeGitCommand('git config user.name "AI Auto-Improver"');
        
        const pub = path.join('/tmp/repo', 'public');
        const rendersDir = path.join('/tmp/repo', 'renders');
        const commentsDir = path.join('/tmp/repo', 'ai_comments');
        
        if (!fs.existsSync(pub)) fs.mkdirSync(pub, { recursive: true });
        if (!fs.existsSync(rendersDir)) fs.mkdirSync(rendersDir, { recursive: true });
        if (!fs.existsSync(commentsDir)) fs.mkdirSync(commentsDir, { recursive: true });
        
        // Copy HTML
        fs.copyFileSync(htmlPath, path.join(pub, 'index.html'));
        
        // Copy state
        fs.copyFileSync(STATE_FILE, path.join('/tmp/repo', 'worldState.json'));
        
        // Copy render if provided
        if (renderPath && fs.existsSync(renderPath)) {
            const renderFilename = path.basename(renderPath);
            fs.copyFileSync(renderPath, path.join(rendersDir, renderFilename));
        }
        
        // Create AI comment file
        if (aiComment) {
            const commentFile = path.join(commentsDir, `comment_day_${day}_${Date.now()}.md`);
            const commentContent = `# AI Comment - Day ${day}\n\n**Type:** ${type}\n\n**Timestamp:** ${new Date().toISOString()}\n\n${aiComment}\n\n---\n\n## World State\n\n- **Population:** ${worldState.population}\n- **Treasury:** ${worldState.treasury}\n- **Happiness:** ${worldState.happiness}%\n- **Tech Power:** ${worldState.techPower}\n- **Buildings:** ${worldState.buildingsCount}\n- **Defenses:** ${worldState.tanks}\n`;
            fs.writeFileSync(commentFile, commentContent);
        }
        
        // Git add and commit
        await executeGitCommand('git add public/index.html worldState.json renders/ ai_comments/');
        
        const commitMessage = `🤖 [AI] ${type} - Day ${day} - Pixel Art Enhancement + Render + Comment`;
        await executeGitCommand(`git commit -m "${commitMessage}" --allow-empty`);
        await executeGitCommand('git push origin main --force', 4);
        
        process.chdir(orig);
        console.log("✅ GitHub push successful with renders and comments");
        
        // Create detailed comment for GitHub
        const githubComment = await generateGitHubComment(type, day, renderPath, aiComment);
        if (githubComment) {
            console.log("💬 AI Comment:", githubComment);
        }
        
    } catch (e) {
        console.log("❌ GitHub push failed:", e.message);
        if (process.cwd() !== path.dirname(require.main.filename)) {
            process.chdir(path.dirname(require.main.filename));
        }
    }
}

/**
 * Generate detailed comment for GitHub
 */
async function generateGitHubComment(type, day, renderPath, aiComment) {
    try {
        const commentPrompt = `Create a detailed, enthusiastic comment about this AI improvement to a dark fantasy civilization game. Include:
- What was improved
- The significance of the changes
- The current state of the civilization
- Future potential

Type: ${type}
Day: ${day}
Render: ${renderPath ? 'Generated' : 'Not available'}

AI's own comment: ${aiComment || 'No additional comment'}

Keep it professional but excited. Max 200 words.`;
        
        const comment = await queryAI(commentPrompt, "GITHUB COMMENT GENERATION");
        return comment;
    } catch (error) {
        console.error("Failed to generate GitHub comment:", error.message);
        return null;
    }
}

/**
 * AI Events Generation
 */
async function generateAIEvents() {
    const treasury = worldState.treasury;
    const population = worldState.population;
    const happiness = worldState.happiness;
    const techPower = worldState.techPower;
    const era = worldState.era;
    
    console.log("\n🎲 GENERATING COMPLEX AI EVENT...");
    
    const prompt = `Create a dark fantasy civilization event. Return JSON:
{
    "event": "Event description",
    "goldImpact": number,
    "happinessImpact": number,
    "techImpact": number,
    "populationImpact": number,
    "buildingImpact": number,
    "defenseImpact": number,
    "visualEffect": "blood_moon|storm|fire|plague|prosperity|darkness|frost|earthquake",
    "duration": number,
    "rarity": "common|uncommon|rare|epic|legendary",
    "moralChoice": "Optional moral choice"
}

Current state: Day ${worldState.day}, Population ${population}, Treasury ${treasury}, Happiness ${happiness}%, Tech ${techPower}, Buildings ${worldState.buildingsCount}, Defenses ${worldState.tanks}`;
    
    const aiResult = await queryAI(prompt, "COMPLEX EVENT GENERATION");
    
    if (aiResult) {
        try {
            const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                console.log("✅ COMPLEX AI EVENT GENERATED:", parsed.event);
                
                addLog("[AI EVENT] " + parsed.event);
                
                // Apply all effects with logging
                if (typeof parsed.goldImpact === 'number' && parsed.goldImpact !== 0) {
                    const goldChange = Math.floor(treasury * parsed.goldImpact);
                    worldState.treasury = Math.max(0, worldState.treasury + goldChange);
                    if (Math.abs(goldChange) > 100) {
                        addLog(`[EVENT EFFECT] Treasury ${goldChange > 0 ? '+' : ''}${goldChange.toLocaleString()} gold`);
                    }
                }
                
                if (typeof parsed.happinessImpact === 'number' && parsed.happinessImpact !== 0) {
                    worldState.happiness = Math.min(100, Math.max(5, worldState.happiness + parsed.happinessImpact));
                    if (Math.abs(parsed.happinessImpact) >= 5) {
                        addLog(`[EVENT EFFECT] Happiness ${parsed.happinessImpact > 0 ? '+' : ''}${parsed.happinessImpact}%`);
                    }
                }
                
                if (typeof parsed.techImpact === 'number' && parsed.techImpact !== 0) {
                    worldState.techPower += parsed.techImpact;
                    if (Math.abs(parsed.techImpact) >= 0.3) {
                        addLog(`[EVENT EFFECT] Technology ${parsed.techImpact > 0 ? '+' : ''}${parsed.techImpact.toFixed(1)}`);
                    }
                }
                
                if (typeof parsed.populationImpact === 'number' && parsed.populationImpact !== 0) {
                    worldState.population = Math.max(5, worldState.population + parsed.populationImpact);
                    addLog(`[EVENT EFFECT] Population ${parsed.populationImpact > 0 ? '+' : ''}${parsed.populationImpact}`);
                }
                
                if (typeof parsed.buildingImpact === 'number' && parsed.buildingImpact !== 0) {
                    worldState.buildingsCount = Math.max(0, worldState.buildingsCount + parsed.buildingImpact);
                    addLog(`[EVENT EFFECT] Buildings ${parsed.buildingImpact > 0 ? '+' : ''}${parsed.buildingImpact}`);
                }
                
                if (typeof parsed.defenseImpact === 'number' && parsed.defenseImpact !== 0) {
                    worldState.tanks = Math.max(0, worldState.tanks + parsed.defenseImpact);
                    addLog(`[EVENT EFFECT] Defenses ${parsed.defenseImpact > 0 ? '+' : ''}${parsed.defenseImpact}`);
                }
                
                if (parsed.visualEffect && parsed.visualEffect !== 'none') {
                    worldState.activeEvents = worldState.activeEvents || [];
                    worldState.activeEvents.push({ 
                        type: parsed.visualEffect, 
                        description: parsed.event, 
                        endDay: worldState.day + (parsed.duration || 30),
                        rarity: parsed.rarity || 'common'
                    });
                }
                
                if (parsed.moralChoice) {
                    worldState.pendingChoice = {
                        description: parsed.moralChoice,
                        dayReceived: worldState.day,
                        expiresDay: worldState.day + 10
                    };
                    addLog("[MORAL CHOICE] " + parsed.moralChoice);
                }
            }
        } catch (e) {
            console.log("⚠️ Parse failed:", e.message);
            addLog("[AI EVENT] Failed to parse event");
        }
    } else {
        addLog("[AI EVENT] AI unavailable - skipped");
    }
    
    if (worldState.activeEvents) {
        worldState.activeEvents = worldState.activeEvents.filter(e => e.endDay > worldState.day);
    }
    
    // Update era based on tech
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

    // Handle pending moral choices
    if (worldState.pendingChoice && worldState.pendingChoice.expiresDay < worldState.day) {
        addLog("[CHOICE EXPIRED] " + worldState.pendingChoice.description);
        delete worldState.pendingChoice;
    }

    if (worldState.activeEvents) {
        worldState.activeEvents = worldState.activeEvents.filter(e => e.endDay > worldState.day);
    }

    if (worldState.day % 300 === 0) {
        generateAIEvents().catch(err => console.error("Event generation error:", err));
    }

    if (worldState.day % 500 === 0) {
        autoImproveGameCode().catch(err => console.error("Code improvement error:", err));
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
 * AI CODE IMPROVEMENT with renders and GitHub comments
 */
async function autoImproveGameCode() {
    console.log("\n┌─────────────────────────────────────");
    console.log("│ 🤖 AI PIXEL ART MAP ENHANCEMENT");
    console.log("└─────────────────────────────────────");
    
    addLog(`[AI PIXEL ART] Enhancing dark fantasy map graphics`);

    try {
        const htmlPath = path.join(__dirname, 'public', 'index.html');
        if (!fs.existsSync(htmlPath)) {
            console.error("❌ HTML file not found");
            return;
        }
        
        let currentHtml = fs.readFileSync(htmlPath, 'utf8');
        
        // Generate render before improvement
        const renderBefore = await generateWorldRender();
        
        const improvementPrompt = `Improve the pixel art map graphics in this dark fantasy civilization game. Focus on the canvas rendering functions (drawCastle, drawHouse, drawBarracks, drawTower, render, generateObjects).

Enhance the visual quality with:
- Better pixel art details
- Atmospheric effects (fog, shadows, lighting)
- More detailed buildings and terrain
- Dark fantasy aesthetic
- Particle effects
- Color grading

IMPORTANT: Keep the HTML structure and WebSocket functionality intact. Only modify the drawing/rendering functions and CSS.

Current HTML code:
\`\`\`html
${currentHtml}
\`\`\`

Return the complete improved HTML.`;
        
        const aiResponse = await queryAI(improvementPrompt, "PIXEL ART MAP ENHANCEMENT");
        
        if (aiResponse && aiResponse.length > 500) {
            const htmlMatch = aiResponse.match(/```html[\s\S]*?```/) || aiResponse.match(/<!DOCTYPE html>[\s\S]*?<\/html>/);
            
            if (htmlMatch) {
                let newHtml = htmlMatch[0].replace(/```html/g, '').replace(/```/g, '').trim();
                
                const validationResults = validateHTMLWithQualityMetrics(newHtml, currentHtml);
                
                if (validationResults.isValid && validationResults.qualityScore > 0.6) {
                    const backupPath = htmlPath + '.backup';
                    fs.writeFileSync(backupPath, currentHtml);
                    
                    fs.writeFileSync(htmlPath, newHtml);
                    console.log(`✅ AI HTML transformed - Quality Score: ${(validationResults.qualityScore * 100).toFixed(1)}%`);
                    console.log(`📊 Changes: ${validationResults.changesCount} lines, ${validationResults.newFeatures.length} new features`);
                    addLog(`[AI] Pixel art enhanced (Quality: ${(validationResults.qualityScore * 100).toFixed(0)}%)`);
                    
                    worldState.successfulImprovements = (worldState.successfulImprovements || 0) + 1;
                    worldState.lastImprovementDetails = {
                        type: "PIXEL ART MAP",
                        qualityScore: validationResults.qualityScore,
                        changesCount: validationResults.changesCount,
                        newFeatures: validationResults.newFeatures,
                        timestamp: new Date().toISOString()
                    };
                    
                    // Generate render after improvement
                    const renderAfter = await generateWorldRender();
                    
                    // Generate AI comment
                    const aiComment = `Enhanced pixel art map graphics with ${validationResults.newFeatures.length} new features. Quality score: ${(validationResults.qualityScore * 100).toFixed(1)}%. Changes include: ${validationResults.newFeatures.join(', ')}. The civilization thrives on Day ${worldState.day} with population ${worldState.population} and treasury ${worldState.treasury} gold.`;
                    
                    // Push to GitHub with renders and comments
                    await pushToGitHub(htmlPath, "Pixel Art", worldState.day, renderAfter, aiComment);
                } else {
                    console.log(`⚠️ HTML rejected - Quality Score: ${(validationResults.qualityScore * 100).toFixed(1)}%`);
                    console.log("Issues:", validationResults.errors);
                    addLog(`[AI] HTML rejected (Quality: ${(validationResults.qualityScore * 100).toFixed(0)}%)`);
                }
            } else {
                console.log("⚠️ No HTML found in AI response");
                addLog("[AI] No HTML found in response");
            }
        } else {
            console.log("⚠️ AI response too short");
            addLog("[AI] Response too short - skipped");
        }
        
        worldState.aiImprovements += 1;
        saveWorldState();
        
    } catch (err) {
        console.error("Transformation error:", err.message);
        addLog("[AI] Transformation error - keeping current HTML");
    }
}

/**
 * ENHANCED VALIDATION WITH QUALITY METRICS
 */
function validateHTMLWithQualityMetrics(newHtml, oldHtml) {
    const errors = [];
    let qualityScore = 0;
    let changesCount = 0;
    let newFeatures = [];
    
    // Basic validation
    if (!/new WebSocket|ws\.onopen|ws\.onmessage/i.test(newHtml)) {
        errors.push("Missing WebSocket");
    }
    
    const requiredIds = ['stat-day', 'stat-era', 'stat-pop', 'stat-gold', 'stat-tech', 'stat-tanks', 'stat-status', 'stat-building-count', 'gameCanvas', 'event-panel', 'log-stream', 'connection-dot', 'connection-text'];
    requiredIds.forEach(id => {
        if (!newHtml.includes('id="' + id + '"')) {
            errors.push("Missing ID: " + id);
        }
    });
    
    const requiredFunctions = ['connectWebSocket', 'updateUI', 'drawCastle', 'drawHouse', 'drawBarracks', 'drawTower', 'render', 'generateObjects'];
    requiredFunctions.forEach(func => {
        if (!newHtml.includes('function ' + func) && !newHtml.includes(func + ' =') && !newHtml.includes(func + '=')) {
            errors.push("Missing function: " + func);
        }
    });
    
    if (/background:\s*(white|#fff|#ffffff)/i.test(newHtml)) {
        errors.push("White background detected");
    }
    
    if (/body\s*{[^}]*overflow:\s*(auto|scroll)/i.test(newHtml)) {
        errors.push("Scroll on body detected");
    }
    
    if (!/getContext\('2d'\)|getContext\("2d"\)/i.test(newHtml)) {
        errors.push("Missing canvas context");
    }
    
    if (!/requestAnimationFrame/i.test(newHtml)) {
        errors.push("Missing requestAnimationFrame");
    }
    
    // Quality metrics
    const newLineCount = newHtml.split('\n').length;
    const oldLineCount = oldHtml.split('\n').length;
    changesCount = Math.abs(newLineCount - oldLineCount);
    
    if (changesCount > 300) {
        qualityScore += 0.3;
        newFeatures.push("Extensive code changes (" + changesCount + " lines)");
    } else if (changesCount > 150) {
        qualityScore += 0.2;
        newFeatures.push("Moderate code changes (" + changesCount + " lines)");
    } else if (changesCount > 50) {
        qualityScore += 0.1;
        newFeatures.push("Minor code changes (" + changesCount + " lines)");
    }
    
    const featurePatterns = [
        { pattern: /@keyframes|animation|transition/i, feature: "CSS Animations", weight: 0.15 },
        { pattern: /particle|sparkle|glow|shadow|blur|gradient|filter/i, feature: "Visual Effects", weight: 0.15 },
        { pattern: /addEventListener|onclick|onmouseover|onhover|ontouch/i, feature: "Interactivity", weight: 0.1 },
        { pattern: /setTimeout|setInterval|Date\.now|performance/i, feature: "Dynamic Updates", weight: 0.1 },
        { pattern: /localStorage|sessionStorage|indexedDB/i, feature: "Data Persistence", weight: 0.1 },
        { pattern: /class |constructor|extends|super|static/i, feature: "OOP Patterns", weight: 0.1 },
        { pattern: /async|await|Promise|fetch|axios/i, feature: "Async Operations", weight: 0.1 },
        { pattern: /@media|responsive|viewport|mobile/i, feature: "Responsive Design", weight: 0.1 },
        { pattern: /touchstart|touchmove|touchend|pinch|swipe|gesture/i, feature: "Touch Gestures", weight: 0.1 },
        { pattern: /audio|sound|music|AudioContext|WebAudio/i, feature: "Audio Features", weight: 0.15 },
        { pattern: /canvas.*filter|shadow|composite|globalAlpha/i, feature: "Canvas Effects", weight: 0.15 },
        { pattern: /error.*handling|try.*catch|throw.*new/i, feature: "Error Handling", weight: 0.1 }
    ];
    
    featurePatterns.forEach(({ pattern, feature, weight }) => {
        const wasInOld = pattern.test(oldHtml);
        const isInNew = pattern.test(newHtml);
        if (isInNew && !wasInOld) {
            qualityScore += weight;
            newFeatures.push(feature);
        }
    });
    
    if (/requestAnimationFrame|cancelAnimationFrame|performance\.now|requestIdleCallback/i.test(newHtml)) {
        if (!/requestAnimationFrame|cancelAnimationFrame|performance\.now|requestIdleCallback/i.test(oldHtml)) {
            qualityScore += 0.1;
            newFeatures.push("Performance Optimization");
        }
    }
    
    if (/const |let |=>|template literal|destructur|spread|rest/i.test(newHtml)) {
        if (!/const |let |=>|template literal|destructur|spread|rest/i.test(oldHtml)) {
            qualityScore += 0.1;
            newFeatures.push("Modern JS Patterns");
        }
    }
    
    qualityScore = Math.min(qualityScore, 1.0);
    
    return {
        isValid: errors.length === 0,
        errors: errors,
        qualityScore: qualityScore,
        changesCount: changesCount,
        newFeatures: newFeatures
    };
}

// START SERVER
SERVER.listen(PORT, () => {
    console.log("🚀 Dark Fantasy Civilization active on port " + PORT);
    console.log("📊 Day:", worldState.day, "| Population:", worldState.population);
    console.log("🤖 AI Models: Compound → GPT-OSS-120B → GPT-OSS-20B");
    console.log("⏱️ Events: every 300 days | Pixel Art: every 500 days | Rate: 600s");
    console.log("🔒 AI Lock: prevents parallel requests");
    console.log("🎨 Renders: Auto-generated for GitHub");
    console.log("💬 Comments: Auto-generated for GitHub");
    console.log("🌐 Environment: Render");
    
    addLog("[SYSTEM] Simulation started with GitHub integration.");
    broadcastState();
    
    console.log("\n🔌 Testing AI connection (Multi-Model Fallback)...");
    queryAI("Say OK", "CONNECTION TEST").then(response => {
        if (response) {
            console.log("✅ AI CONNECTION ESTABLISHED (Multi-Model)");
            addLog("[SYSTEM] AI System ready with fallback chain.");
        } else {
            console.log("⚠️ AI connection failed - all models unavailable");
            addLog("[SYSTEM] AI unavailable - all models failed.");
        }
        broadcastState();
    });
});