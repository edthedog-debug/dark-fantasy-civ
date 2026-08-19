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
 * GROQ AI - USING COMPOUND API ENDPOINT WITH GLOBAL LOCK (10 MINUTES WAIT)
 */
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
    console.log("│ 🤖 GROQ AI (COMPOUND) - " + taskType);
    console.log("│ 🧠 Model: llama-3.3-70b-versatile");
    console.log("└─────────────────────────────────────");
    
    try {
        await rateLimiter.waitForSlot();
        
        // USING GROQ COMPOUND API - wrapped endpoint for enhanced capabilities
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
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.8, // Increased for more creative changes
                    max_tokens: 2048, // Increased for more substantial modifications
                    // COMPOUND API ADDITIONS - leveraging advanced features
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
        
        let response = await makeRequest();
        
        // Handle rate limiting (429 and 413)
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
            console.log("│ 📝 Text preview:", text ? text.substring(0, 150) : 'NULL');
            
            if (text && text.trim().length > 0) {
                console.log("│ ✅ SUCCESS (COMPOUND)");
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

// ... (resto del código permanece igual) ...

/**
 * Execute git command - Disabled on Render
 */
function executeGitCommand(command, retries = 3) {
    return new Promise((resolve, reject) => {
        // Disable git operations on Render
        if (process.env.RENDER) {
            console.log("⚠️ Git operations disabled on Render");
            resolve("");
            return;
        }
        
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
 * Push to GitHub - Disabled on Render
 */
async function pushToGitHub(htmlPath, type, day) {
    if (!GITHUB_TOKEN || process.env.RENDER) {
        console.log("⚠️ GitHub push disabled");
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
        if (!fs.existsSync(pub)) fs.mkdirSync(pub, { recursive: true });
        
        fs.copyFileSync(htmlPath, path.join(pub, 'index.html'));
        fs.copyFileSync(STATE_FILE, path.join('/tmp/repo', 'worldState.json'));
        
        await executeGitCommand('git add public/index.html worldState.json');
        await executeGitCommand(`git commit -m "🤖 [AI] ${type} - Day ${day} - Deep Enhancement" --allow-empty`);
        await executeGitCommand('git push origin main --force', 4);
        
        process.chdir(orig);
        console.log("✅ GitHub OK");
    } catch (e) {
        console.log("❌ GitHub:", e.message);
    }
}

/**
 * AI Events - ENHANCED PROMPT FOR RICHER EVENTS
 */
async function generateAIEvents() {
    const treasury = worldState.treasury;
    const population = worldState.population;
    const happiness = worldState.happiness;
    const techPower = worldState.techPower;
    const era = worldState.era;
    
    console.log("\n🎲 GENERATING COMPLEX AI EVENT...");
    
    const prompt = `Create a COMPLEX and IMPACTFUL dark fantasy civilization event.

Current State:
- Day: ${worldState.day}
- Population: ${population}
- Treasury: ${treasury} gold
- Happiness: ${happiness}%
- Tech Power: ${techPower}
- Era: ${era}
- Buildings: ${worldState.buildingsCount}
- Defenses: ${worldState.tanks}

REQUIREMENTS:
1. Event must have SIGNIFICANT consequences (not trivial)
2. Include multiple effects (economic, social, technological)
3. Add visual atmosphere with unique effects
4. Consider current state when designing event
5. Make it MEMORABLE and IMPACTFUL
6. Include potential chain events or moral choices

Return JSON format:
{
    "event": "Detailed event description with narrative",
    "goldImpact": -0.15,
    "happinessImpact": -8,
    "techImpact": 0.5,
    "populationImpact": 2,
    "buildingImpact": -1,
    "defenseImpact": 1,
    "visualEffect": "blood_moon|storm|fire|plague|prosperity|darkness|frost|earthquake",
    "duration": 45,
    "rarity": "common|uncommon|rare|epic|legendary",
    "chainEvent": "Potential follow-up event description",
    "moralChoice": "A difficult decision for the civilization"
}`;
    
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
 * SIMULATION TICK - ECONOMY WITH DAILY FLUCTUATION
 */
function runSimulationTick() {
    worldState.day += 1;

    // ============ HAPPINESS RECOVERY SYSTEM ============
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

    // ============ POPULATION SYSTEM ============
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

    // ============ BUILDINGS SYSTEM ============
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
 * AI CODE IMPROVEMENT - ENHANCED PROMPTS FOR MEANINGFUL CHANGES
 */
async function autoImproveGameCode() {
    const types = [
        {
            name: "CSS STYLING & VISUAL EFFECTS",
            focus: "Complete visual overhaul with advanced effects",
            requirements: "Add particle systems, dynamic lighting, animated backgrounds, glass-morphism effects, custom animations, gradient meshes"
        },
        {
            name: "MAP GRAPHICS & GAME MECHANICS", 
            focus: "Advanced rendering techniques and interactive elements",
            requirements: "Implement day/night cycle, weather effects, terrain variations, building animations, unit AI movement, combat effects"
        },
        {
            name: "HTML STRUCTURE & UI/UX",
            focus: "Enhanced UI/UX with new features",
            requirements: "Add resource management panels, citizen happiness indicators, mini-map, tooltip system, achievement notifications, settings menu"
        }
    ];
    
    const improvementType = types[worldState.aiImprovements % 3];
    
    console.log("\n┌─────────────────────────────────────");
    console.log("│ 🤖 AI CODE IMPROVEMENT - DEEP REWRITE");
    console.log("│ 📋 Type: " + improvementType.name);
    console.log("│ 🎯 Focus: " + improvementType.focus);
    console.log("└─────────────────────────────────────");
    
    addLog(`[AI DEEP-CODING] ${improvementType.name}: ${improvementType.focus}`);

    try {
        const htmlPath = path.join(__dirname, 'public', 'index.html');
        if (!fs.existsSync(htmlPath)) {
            console.error("❌ HTML file not found");
            return;
        }
        
        let currentHtml = fs.readFileSync(htmlPath, 'utf8');
        
        // ANALYSIS PROMPT - Comprehensive code review
        const analysisPrompt = `Perform a DEEP code analysis of this dark fantasy civilization game's ${improvementType.name}. 

CRITICAL ANALYSIS REQUIREMENTS:
1. Identify ALL weaknesses in the current ${improvementType.name}
2. Find missing features that would significantly enhance gameplay
3. Detect performance bottlenecks
4. Identify accessibility issues
5. Find responsive design problems
6. Locate code duplication and inefficiencies
7. Analyze user experience and interaction flow

Return JSON with detailed findings:
{
    "criticalIssues": ["issue1", "issue2", "issue3"],
    "missingFeatures": ["feature1", "feature2", "feature3"],
    "performanceProblems": ["problem1", "problem2"],
    "accessibilityIssues": ["issue1", "issue2"],
    "codeQualityImprovements": ["improvement1", "improvement2"],
    "innovationOpportunities": ["idea1", "idea2", "idea3"]
}`;
        
        const analysisResult = await queryAI(analysisPrompt, "DEEP ANALYSIS - " + improvementType.name);
        
        if (!analysisResult) {
            addLog(`[AI] Analysis failed for ${improvementType.name}`);
            worldState.aiImprovements += 1;
            saveWorldState();
            return;
        }

        // IMPROVEMENT PROMPT - Aggressive enhancement
        const improvementPrompt = `MAJOR CODE TRANSFORMATION REQUIRED

You are DRAMATICALLY enhancing the ${improvementType.name} of a dark fantasy civilization game. 

ANALYSIS FINDINGS:
${analysisResult}

TRANSFORMATION REQUIREMENTS:
1. ${improvementType.requirements}
2. Implement at least 5 SIGNIFICANT new features or visual improvements
3. Optimize existing code for better performance (target 30% improvement)
4. Add smooth animations and transitions (minimum 3 new animations)
5. Improve mobile responsiveness significantly
6. Enhance user interaction with new UI elements
7. Add dynamic visual effects that respond to game state
8. Implement progressive enhancement techniques
9. Add error handling and edge cases
10. Improve code organization and readability

CRITICAL CONSTRAINTS:
- MUST preserve ALL existing WebSocket functionality
- MUST maintain these IDs: stat-day, stat-era, stat-pop, stat-gold, stat-tech, stat-tanks, stat-status, stat-building-count, gameCanvas, event-panel, log-stream, connection-dot, connection-text
- MUST keep these functions: connectWebSocket, updateUI, drawCastle, drawHouse, drawBarracks, drawTower, render, generateObjects
- Background must remain #070913 (dark theme)
- NO scrolling on body element
- Canvas must use 2D context
- Must use requestAnimationFrame
- Must maintain all existing game state variables

INNOVATION CHALLENGES:
- Create something visually stunning that wasn't there before
- Add at least 3 interactive elements
- Implement 2 new animations or effects
- Optimize rendering performance significantly
- Add responsive design improvements
- Enhance user feedback mechanisms

Current HTML code:
\`\`\`html
${currentHtml}
\`\`\`

Return the COMPLETE transformed HTML with ALL improvements applied. The changes should be DRAMATIC, IMMEDIATELY noticeable, and significantly improve the game experience.`;
        
        const aiResponse = await queryAI(improvementPrompt, "DEEP TRANSFORMATION - " + improvementType.name);
        
        if (aiResponse && aiResponse.length > 500) {
            const htmlMatch = aiResponse.match(/```html[\s\S]*?```/) || aiResponse.match(/<!DOCTYPE html>[\s\S]*?<\/html>/);
            
            if (htmlMatch) {
                let newHtml = htmlMatch[0].replace(/```html/g, '').replace(/```/g, '').trim();
                
                // Enhanced validation with quality metrics
                const validationResults = validateHTMLWithQualityMetrics(newHtml, currentHtml);
                
                if (validationResults.isValid && validationResults.qualityScore > 0.6) {
                    const backupPath = htmlPath + '.backup';
                    fs.writeFileSync(backupPath, currentHtml);
                    
                    fs.writeFileSync(htmlPath, newHtml);
                    console.log(`✅ AI HTML transformed - Quality Score: ${(validationResults.qualityScore * 100).toFixed(1)}%`);
                    console.log(`📊 Changes: ${validationResults.changesCount} lines, ${validationResults.newFeatures.length} new features`);
                    addLog(`[AI] HTML deep-transformed - ${improvementType.name} (Quality: ${(validationResults.qualityScore * 100).toFixed(0)}%)`);
                    
                    worldState.successfulImprovements = (worldState.successfulImprovements || 0) + 1;
                    worldState.lastImprovementDetails = {
                        type: improvementType.name,
                        qualityScore: validationResults.qualityScore,
                        changesCount: validationResults.changesCount,
                        newFeatures: validationResults.newFeatures,
                        timestamp: new Date().toISOString()
                    };
                } else {
                    console.log(`⚠️ HTML rejected - Quality Score: ${(validationResults.qualityScore * 100).toFixed(1)}%`);
                    console.log("Issues:", validationResults.errors);
                    addLog(`[AI] HTML rejected (Quality: ${(validationResults.qualityScore * 100).toFixed(0)}%) - ${validationResults.errors.slice(0, 3).join(', ')}`);
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
        
        // Push to GitHub if enabled
        if (!process.env.RENDER) {
            pushToGitHub(htmlPath, improvementType.name, worldState.day).catch(() => {});
        }
        
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
    
    // Score for significant changes
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
    
    // Detect new features
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
    
    // Detect performance optimizations
    if (/requestAnimationFrame|cancelAnimationFrame|performance\.now|requestIdleCallback/i.test(newHtml)) {
        if (!/requestAnimationFrame|cancelAnimationFrame|performance\.now|requestIdleCallback/i.test(oldHtml)) {
            qualityScore += 0.1;
            newFeatures.push("Performance Optimization");
        }
    }
    
    // Detect code quality improvements
    if (/const |let |=>|template literal|destructur|spread|rest/i.test(newHtml)) {
        if (!/const |let |=>|template literal|destructur|spread|rest/i.test(oldHtml)) {
            qualityScore += 0.1;
            newFeatures.push("Modern JS Patterns");
        }
    }
    
    // Ensure minimum quality threshold
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
    console.log("🤖 AI Model: llama-3.3-70b-versatile (COMPOUND API)");
    console.log("⏱️ Events: every 300 days | Code: every 500 days | Rate: 600s");
    console.log("🔒 AI Lock: prevents parallel requests");
    console.log("🌐 Environment:", process.env.RENDER ? "Render" : "Local");
    
    addLog("[SYSTEM] Simulation started.");
    broadcastState();
    
    console.log("\n🔌 Testing AI connection (COMPOUND)...");
    queryAI("Say OK", "CONNECTION TEST").then(response => {
        if (response) {
            console.log("✅ AI CONNECTION ESTABLISHED (COMPOUND)");
            addLog("[SYSTEM] AI System ready.");
        } else {
            console.log("⚠️ AI connection failed");
            addLog("[SYSTEM] AI unavailable.");
        }
        broadcastState();
    });
});