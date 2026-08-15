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
const GITHUB_REPO = process.env.GITHUB_REPO;

APP.use(cors());
APP.use(express.static(path.join(__dirname, 'public')));

const SERVER = http.createServer(APP);
const WSS = new WebSocket.Server({ server: SERVER });
const STATE_FILE = path.join(__dirname, 'worldState.json');
const AI_STATE_FILE = path.join(__dirname, 'aiState.json');

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

// AI State - Track improvements and evolution
let aiState = {
    improvementCount: 0,
    lastImprovementDay: 0,
    aiEra: 1,
    aiComplexity: 1.0,
    aiCapabilities: ["basic_economy", "basic_simulation"],
    evolutionHistory: [],
    improvementHistory: []
};

// Load world state
if (fs.existsSync(STATE_FILE)) {
    try {
        const rawData = fs.readFileSync(STATE_FILE, 'utf8');
        worldState = JSON.parse(rawData);
        console.log("✅ World state loaded - Day:", worldState.day);
    } catch (e) {
        console.error("Error loading state file:", e);
    }
}

// Load AI state
if (fs.existsSync(AI_STATE_FILE)) {
    try {
        const rawData = fs.readFileSync(AI_STATE_FILE, 'utf8');
        aiState = JSON.parse(rawData);
        console.log("✅ AI State loaded - Improvements:", aiState.improvementCount);
    } catch (e) {
        console.error("Error loading AI state file:", e);
    }
}

function saveWorldState() {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(worldState, null, 2));
        console.log("💾 World state saved - Day:", worldState.day);
    } catch (err) {
        console.error("Error saving state:", err);
    }
}

function saveAIState() {
    try {
        fs.writeFileSync(AI_STATE_FILE, JSON.stringify(aiState, null, 2));
        console.log("💾 AI state saved - Improvements:", aiState.improvementCount);
    } catch (err) {
        console.error("Error saving AI state:", err);
    }
}

function broadcastState() {
    const payload = JSON.stringify({ 
        type: 'WORLD_UPDATE', 
        data: worldState,
        aiState: aiState 
    });
    WSS.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

function addLog(msg) {
    const time = new Date().toLocaleTimeString();
    worldState.logs.push("[" + time + "] " + msg);
    if (worldState.logs.length > 25) worldState.logs.shift();
}

/**
 * GEMINI API - SIMPLIFIED - ALWAYS RETURNS SOMETHING
 */
async function queryGemini(prompt) {
    if (!AI_API_KEY) {
        console.error("❌ No GEMINI_API_KEY");
        return "// No API key - using default improvement\nconsole.log('AI System active');";
    }

    console.log("🔑 Key:", AI_API_KEY.substring(0, 10) + "...");
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${AI_API_KEY}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048
                }
            })
        });
        
        console.log("📊 Status:", response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log("📦 Full response:", JSON.stringify(data).substring(0, 500));
            
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (text && text.length > 0) {
                console.log("✅ Text:", text.substring(0, 200));
                return text;
            }
        } else {
            const errorText = await response.text();
            console.error("❌ Error:", response.status, errorText.substring(0, 300));
        }
    } catch (e) {
        console.error("❌ Fetch error:", e.message);
    }
    
    // ALWAYS return something
    return "// Gemini unavailable - using fallback improvement\nconsole.log('Dark Fantasy System - Day " + worldState.day + "');";
}

/**
 * 1. AI GENERATIVE EVENTS
 */
async function generateAIEvents() {
    const prompt = "Generate a dark fantasy civilization event. Return ONLY JSON: {\"event\":\"description\",\"newPhilosophy\":\"name\",\"goldImpact\":number,\"happinessImpact\":number,\"techImpact\":number}";
    
    let parsed = null;

    try {
        const rawText = await queryGemini(prompt);
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
            { event: "Goblin uprising affected resource gathering.", newPhilosophy: "Military Discipline", goldImpact: -60, happinessImpact: -8, techImpact: 0.05 }
        ];
        parsed = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    addLog("[AI EVENT] " + parsed.event);
    
    if (parsed.newPhilosophy) worldState.philosophy = parsed.newPhilosophy;
    if (typeof parsed.goldImpact === 'number') worldState.treasury = Math.max(0, worldState.treasury + parsed.goldImpact);
    if (typeof parsed.happinessImpact === 'number') worldState.happiness = Math.min(100, Math.max(10, worldState.happiness + parsed.happinessImpact));
    if (typeof parsed.techImpact === 'number') worldState.techPower += Math.max(0, parsed.techImpact);
}

/**
 * Execute git command with better error handling
 */
function executeGitCommand(command) {
    return new Promise((resolve, reject) => {
        console.log("🔧 Executing:", command);
        exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) {
                console.error("❌ Git error:", error.message);
                console.error("❌ Stderr:", stderr);
                reject(error);
            } else {
                console.log("✅ Git success:", stdout.substring(0, 200));
                resolve(stdout);
            }
        });
    });
}

/**
 * Clean CSS code - Remove HTML tags and ensure proper CSS
 */
function cleanCSSCode(code) {
    // Remove any HTML tags that might be in the code
    code = code.replace(/<style>/gi, '').replace(/<\/style>/gi, '');
    code = code.replace(/<script>/gi, '').replace(/<\/script>/gi, '');
    code = code.replace(/```css/gi, '').replace(/```/g, '');
    
    // Remove any HTML comments
    code = code.replace(/<!--[\s\S]*?-->/g, '');
    
    // Remove any JavaScript comments
    code = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
    
    // Ensure it looks like CSS
    if (!code.includes('{') && !code.includes('}')) {
        code = `body { ${code} }`;
    }
    
    return code.trim();
}

/**
 * Clean JavaScript code - Remove HTML tags and ensure proper JS
 */
function cleanJSCode(code) {
    // Remove any HTML tags that might be in the code
    code = code.replace(/<script>/gi, '').replace(/<\/script>/gi, '');
    code = code.replace(/<style>/gi, '').replace(/<\/style>/gi, '');
    code = code.replace(/```javascript/gi, '').replace(/```js/gi, '').replace(/```/g, '');
    
    // Remove any HTML comments
    code = code.replace(/<!--[\s\S]*?-->/g, '');
    
    return code.trim();
}

/**
 * Clean HTML code - Ensure proper HTML structure
 */
function cleanHTMLCode(code) {
    // Remove any script or style tags if they're wrapping the content
    code = code.replace(/<script>/gi, '').replace(/<\/script>/gi, '');
    code = code.replace(/<style>/gi, '').replace(/<\/style>/gi, '');
    code = code.replace(/```html/gi, '').replace(/```/g, '');
    
    return code.trim();
}

/**
 * Push to GitHub with better error handling
 */
async function pushToGitHub(commitMessage) {
    console.log("\n📤 Attempting GitHub push...");
    
    if (!GITHUB_TOKEN) {
        console.error("❌ No GITHUB_TOKEN configured");
        addLog("[GITHUB ERROR] No token configured");
        return false;
    }
    
    if (!GITHUB_REPO) {
        console.error("❌ No GITHUB_REPO configured");
        addLog("[GITHUB ERROR] No repo configured");
        return false;
    }
    
    try {
        const cleanToken = GITHUB_TOKEN.trim();
        const cleanRepo = GITHUB_REPO.trim();
        
        // Configure git
        await executeGitCommand('git config --global user.email "ai@example.com"');
        await executeGitCommand('git config --global user.name "AI Auto-Improver"');
        
        // Check if we're in a git repo
        let isRepo = false;
        try {
            await executeGitCommand('git rev-parse --is-inside-work-tree');
            isRepo = true;
            console.log("✅ Already in a git repo");
        } catch (gitError) {
            console.log("📦 Not in a git repo, initializing...");
        }
        
        if (!isRepo) {
            // Initialize new repo
            await executeGitCommand('git init');
            await executeGitCommand('git add .');
            await executeGitCommand('git commit -m "Initial commit"');
        }
        
        // Set remote URL
        const repoUrl = `https://${cleanToken}@github.com/${cleanRepo}.git`;
        console.log("🔗 Repo URL:", repoUrl.replace(cleanToken, "***TOKEN***"));
        
        try {
            await executeGitCommand(`git remote remove origin`);
        } catch (e) {
            // No origin to remove
        }
        
        await executeGitCommand(`git remote add origin ${repoUrl}`);
        
        // Add all files
        await executeGitCommand('git add public/index.html');
        await executeGitCommand('git add worldState.json');
        await executeGitCommand('git add aiState.json');
        
        // Commit
        await executeGitCommand(`git commit -m "${commitMessage}"`);
        
        // Push
        try {
            await executeGitCommand('git push -u origin main');
            console.log("✅ Successfully pushed to GitHub!");
            addLog("[GITHUB SUCCESS] Code pushed to repository");
            return true;
        } catch (pushError) {
            console.log("⚠️ Push to main failed, trying master...");
            try {
                await executeGitCommand('git push -u origin master');
                console.log("✅ Successfully pushed to GitHub (master)!");
                addLog("[GITHUB SUCCESS] Code pushed to repository (master)");
                return true;
            } catch (masterError) {
                console.log("⚠️ Push failed, trying force push...");
                await executeGitCommand('git push -f origin main');
                console.log("✅ Force pushed to GitHub!");
                addLog("[GITHUB SUCCESS] Code force pushed to repository");
                return true;
            }
        }
    } catch (gitError) {
        console.error("❌ GitHub push failed:", gitError.message);
        addLog(`[GITHUB ERROR] ${gitError.message}`);
        return false;
    }
}

/**
 * 2. AI CODE IMPROVEMENT - IMPROVES ENTIRE HTML INTERFACE
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
        
        // Determine improvement type based on counter and era
        const improvementTypes = [
            'visual_effects',      // Canvas visual effects
            'ui_design',           // Interface design
            'css_styling',         // CSS styles
            'gameplay_mechanics',  // Game mechanics
            'animations',          // Animations
            'interactive_elements', // Interactive elements
            'performance_optimization', // Performance optimization
            'new_features'         // New features
        ];
        
        const improvementType = improvementTypes[aiState.improvementCount % improvementTypes.length];
        
        let prompt = "";
        
        switch(improvementType) {
            case 'visual_effects':
                prompt = `Generate a NEW unique JavaScript function for canvas visual effects. 
                         AI Evolution Level: ${aiState.aiEra}
                         Complexity: ${aiState.aiComplexity}
                         Return ONLY the JavaScript code without any HTML tags. Add particle effects, weather, or magical auras.`;
                break;
                
            case 'ui_design':
                prompt = `Generate HTML improvements for a dark fantasy game interface.
                         Create better panels, tooltips, or status displays.
                         AI Evolution Level: ${aiState.aiEra}
                         Return ONLY the HTML code without any script or style tags.`;
                break;
                
            case 'css_styling':
                prompt = `Generate CSS styling improvements for a dark fantasy civilization game.
                         Add gradients, shadows, borders, or animations.
                         AI Evolution Level: ${aiState.aiEra}
                         Return ONLY the CSS code without any HTML tags. Example: .panel { background: linear-gradient(...); }`;
                break;
                
            case 'gameplay_mechanics':
                prompt = `Create a new JavaScript function for dark fantasy game mechanics.
                         Add resource management, combat system, or diplomacy features.
                         AI Evolution Level: ${aiState.aiEra}
                         Return ONLY the JavaScript code without any HTML tags.`;
                break;
                
            case 'animations':
                prompt = `Generate JavaScript animations for UI elements.
                         Create smooth transitions, hover effects, or loading animations.
                         AI Evolution Level: ${aiState.aiEra}
                         Return ONLY the JavaScript code without any HTML tags.`;
                break;
                
            case 'interactive_elements':
                prompt = `Create interactive JavaScript elements for the game.
                         Add buttons, sliders, or clickable objects.
                         AI Evolution Level: ${aiState.aiEra}
                         Return ONLY the JavaScript code without any HTML tags.`;
                break;
                
            case 'performance_optimization':
                prompt = `Optimize the existing game code.
                         Improve rendering, reduce memory usage, or add caching.
                         Current HTML size: ${currentHtml.length} chars
                         AI Evolution Level: ${aiState.aiEra}
                         Return ONLY the JavaScript code without any HTML tags.`;
                break;
                
            case 'new_features':
                prompt = `Add a completely new feature to the dark fantasy game.
                         Create something innovative based on the current state.
                         Population: ${worldState.population}, Treasury: ${worldState.treasury}
                         Tech Power: ${worldState.techPower}, Era: ${worldState.era}
                         AI Evolution Level: ${aiState.aiEra}
                         Return ONLY the JavaScript code without any HTML tags.`;
                break;
                
            default:
                prompt = `Improve the game interface with new visual elements.
                         AI Evolution Level: ${aiState.aiEra}
                         Return ONLY the code without any HTML tags.`;
        }
        
        console.log(`🎨 Improvement Type: ${improvementType}`);
        console.log("🔍 Asking Gemini...");
        const aiResponse = await queryGemini(prompt);
        
        console.log("✅ Got response! Length:", aiResponse.length);
        
        // Clean the response based on type
        let codeToAdd;
        
        if (improvementType === 'css_styling') {
            codeToAdd = cleanCSSCode(aiResponse);
            console.log("🎨 Cleaned CSS:", codeToAdd.substring(0, 100));
        } else if (improvementType === 'ui_design') {
            codeToAdd = cleanHTMLCode(aiResponse);
            console.log("🎨 Cleaned HTML:", codeToAdd.substring(0, 100));
        } else {
            codeToAdd = cleanJSCode(aiResponse);
            console.log("🎨 Cleaned JS:", codeToAdd.substring(0, 100));
        }
        
        if (codeToAdd.length < 10) {
            if (improvementType === 'css_styling') {
                codeToAdd = `/* AI CSS improvement #${aiState.improvementCount + 1} */\n.ai-panel { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }`;
            } else if (improvementType === 'ui_design') {
                codeToAdd = `<div class="ai-panel">AI Enhanced Panel</div>`;
            } else {
                codeToAdd = `// AI improvement #${aiState.improvementCount + 1} (${improvementType})\nconsole.log('Improved: ${improvementType}');`;
            }
        }
        
        // Apply improvement based on type
        let improvedHtml = currentHtml;
        
        if (improvementType === 'css_styling') {
            // Add CSS to existing style block or create new one
            const cssBlock = `\n/* === AI CSS IMPROVEMENT #${aiState.improvementCount + 1} === */\n${codeToAdd}\n`;
            
            // Find existing style block
            const styleRegex = /<style[^>]*>[\s\S]*?<\/style>/gi;
            const existingStyles = improvedHtml.match(styleRegex);
            
            if (existingStyles && existingStyles.length > 0) {
                // Add to existing style block
                const lastStyle = existingStyles[existingStyles.length - 1];
                const updatedStyle = lastStyle.replace('</style>', cssBlock + '</style>');
                improvedHtml = improvedHtml.replace(lastStyle, updatedStyle);
            } else if (improvedHtml.includes('</head>')) {
                // Create new style block before </head>
                const newStyleBlock = `<style>\n${cssBlock}\n</style>\n`;
                improvedHtml = improvedHtml.replace('</head>', newStyleBlock + '</head>');
            } else {
                // Add at the beginning
                improvedHtml = `<style>\n${cssBlock}\n</style>\n` + improvedHtml;
            }
            
            console.log("✅ CSS applied correctly!");
            
        } else if (improvementType === 'ui_design') {
            // Add HTML for UI
            const uiBlock = `\n<!-- === AI UI IMPROVEMENT #${aiState.improvementCount + 1} === -->\n<div id="ai-ui-${aiState.improvementCount}" class="ai-generated-ui">\n${codeToAdd}\n</div>\n`;
            if (improvedHtml.includes('</body>')) {
                improvedHtml = improvedHtml.replace('</body>', uiBlock + '</body>');
            } else {
                improvedHtml += uiBlock;
            }
            
            console.log("✅ HTML UI applied correctly!");
            
        } else {
            // Add JavaScript
            const jsBlock = `\n// === AI IMPROVEMENT #${aiState.improvementCount + 1} (${improvementType}) ===\n${codeToAdd}\n`;
            
            // Find existing script blocks
            const scriptRegex = /<script[^>]*>[\s\S]*?<\/script>/gi;
            const existingScripts = improvedHtml.match(scriptRegex);
            
            if (existingScripts && existingScripts.length > 0) {
                // Add to the last script block
                const lastScript = existingScripts[existingScripts.length - 1];
                const updatedScript = lastScript.replace('</script>', jsBlock + '</script>');
                improvedHtml = improvedHtml.replace(lastScript, updatedScript);
            } else if (improvedHtml.includes('</body>')) {
                // Create new script block before </body>
                const newScriptBlock = `<script>\n${jsBlock}\n</script>\n`;
                improvedHtml = improvedHtml.replace('</body>', newScriptBlock + '</body>');
            } else {
                // Add at the end
                improvedHtml += `\n<script>\n${jsBlock}\n</script>`;
            }
            
            console.log("✅ JavaScript applied correctly!");
        }
        
        // Write improved HTML - SAVE BEFORE GIT OPERATIONS
        fs.writeFileSync(htmlPath, improvedHtml);
        console.log("✅ HTML improved! New size:", improvedHtml.length);
        addLog(`[AI COMMIT SUCCESS] ${improvementType} improved!`);
        
        // Update AI State
        aiState.improvementCount++;
        aiState.lastImprovementDay = worldState.day;
        aiState.aiComplexity *= 1.15; // 15% more complex each time
        
        // Record improvement type
        aiState.improvementHistory.push({
            id: aiState.improvementCount,
            type: improvementType,
            day: worldState.day,
            complexity: aiState.aiComplexity
        });
        
        // Evolve AI Era every 10 improvements
        if (aiState.improvementCount % 10 === 0) {
            aiState.aiEra++;
            aiState.aiCapabilities.push(`advanced_${improvementType}_era${aiState.aiEra}`);
            worldState.era = `Transcendent Civilization Era ${aiState.aiEra + 1}`;
            
            aiState.evolutionHistory.push({
                day: worldState.day,
                era: aiState.aiEra,
                improvements: aiState.improvementCount,
                lastType: improvementType,
                complexity: aiState.aiComplexity
            });
            
            addLog(`[AI EVOLUTION] AI evolved to Era ${aiState.aiEra}! New capabilities unlocked!`);
        }
        
        // Save states BEFORE git operations
        saveWorldState();
        saveAIState();
        
        // Push to GitHub
        const commitMessage = `🤖 [AI] ${improvementType} #${aiState.improvementCount} - Day ${worldState.day} - Era ${aiState.aiEra}`;
        await pushToGitHub(commitMessage);
        
        // Verify state is still correct after git operations
        console.log("📅 Day verification after improvement:", worldState.day);
        
    } catch (err) {
        console.error("Error:", err.message);
        addLog(`[AI COMMIT ERROR] ${err.message}`);
        // Make sure state is saved even if there's an error
        saveWorldState();
        saveAIState();
    }
}

// ASYNC SIMULATION TICK
async function runSimulationTick() {
    worldState.day += 1;
    console.log("📅 Day:", worldState.day);

    // AI Evolution affects world
    const aiBonus = aiState.aiEra * 0.1; // AI improves world systems
    worldState.techPower += aiBonus;

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

    // AI Event every 30 days
    if (worldState.day % 30 === 0) {
        await generateAIEvents();
    }

    // Code improvement every 50 days - INFINITE
    if (worldState.day % 50 === 0) {
        console.log("\n🎯 Day 50 reached - Starting code improvement...");
        const patch = Math.floor(Math.random() * 9) + 1;
        worldState.engineBuild = `v${aiState.aiEra + 2}.${patch}.0-Gemini-2.5-Era${aiState.aiEra}`;
        
        // Update era name based on AI evolution
        if (aiState.aiEra > 1) {
            worldState.era = `Transcendent Civilization Era ${aiState.aiEra + 1}`;
        }
        
        // Save state BEFORE improvement
        saveWorldState();
        saveAIState();
        
        await autoImproveGameCode();
        
        // Verify day hasn't been reset
        console.log("📅 Day after improvement:", worldState.day);
    }

    // Save state every tick
    saveWorldState();
    broadcastState();
}

setInterval(runSimulationTick, 4000);

WSS.on('connection', (ws) => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ 
            type: 'WORLD_UPDATE', 
            data: worldState,
            aiState: aiState 
        }));
    }
});

SERVER.listen(PORT, () => {
    console.log("🚀 Dark Fantasy Civilization active on port " + PORT);
    console.log(`📊 AI Evolution System initialized - Day ${worldState.day}, Era ${aiState.aiEra}, ${aiState.improvementCount} improvements`);
    console.log(`📦 GitHub Repo: ${GITHUB_REPO || 'Not configured'}`);
    console.log(`🔑 GitHub Token: ${GITHUB_TOKEN ? 'Configured ✓' : 'Missing ✗'}`);
    
    queryGemini("Say 'OK'")
        .then(response => {
            console.log("✅ Gemini response:", response.substring(0, 100));
            addLog("[SYSTEM] AI System ready. Continuing evolution from Day " + worldState.day);
        });
});