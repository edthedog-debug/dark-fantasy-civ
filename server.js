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
    improvements: [], // Historial de mejoras
    logs: [
        "[" + new Date().toLocaleTimeString() + "] Autonomous Cloud Engine Initialized."
    ]
};

if (fs.existsSync(STATE_FILE)) {
    try {
        const rawData = fs.readFileSync(STATE_FILE, 'utf8');
        const savedState = JSON.parse(rawData);
        if (savedState && typeof savedState.day === 'number') {
            worldState = savedState;
            console.log("✅ Estado cargado: Día", worldState.day);
            console.log("🎨 Mejoras aplicadas:", worldState.improvements?.length || 0);
        }
    } catch (e) {
        console.error("❌ Error cargando estado:", e.message);
    }
}

function saveWorldState() {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(worldState, null, 2));
    } catch (err) {
        console.error("❌ Error guardando estado:", err);
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
    if (worldState.logs.length > 25) worldState.logs.shift();
}

/**
 * GEMINI API
 */
async function queryGemini(prompt) {
    if (!AI_API_KEY) {
        return null;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${AI_API_KEY}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 1.0, // Máxima creatividad
                    maxOutputTokens: 4096
                }
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text && text.length > 0) {
                return text;
            }
        }
    } catch (e) {
        console.error("❌ Fetch error:", e.message);
    }
    
    return null;
}

/**
 * 1. AI GENERATIVE EVENTS
 */
async function generateAIEvents() {
    const prompt = "Generate a dark fantasy civilization event. Return ONLY JSON: {\"event\":\"description\",\"newPhilosophy\":\"name\",\"goldImpact\":number,\"happinessImpact\":number,\"techImpact\":number}";
    
    let parsed = null;

    try {
        const rawText = await queryGemini(prompt);
        if (rawText) {
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
 * 2. AI CODE IMPROVEMENT - INFINITE AND SELF-CREATIVE
 */
async function autoImproveGameCode() {
    console.log("\n🤖 AI CREATIVE IMPROVEMENT...");
    addLog("[AI AUTO-CODING] Gemini is creating a NEW unique improvement...");

    try {
        const htmlPath = path.join(__dirname, 'public', 'index.html');
        
        if (!fs.existsSync(htmlPath)) {
            console.error("❌ index.html not found");
            return;
        }
        
        const currentHtml = fs.readFileSync(htmlPath, 'utf8');
        
        // Lista de mejoras ya aplicadas
        const appliedImprovements = worldState.improvements || [];
        const improvementNumber = appliedImprovements.length + 1;
        
        console.log("🎨 Creando mejora #" + improvementNumber + "...");
        console.log("📜 Mejoras anteriores:", appliedImprovements.join(", ") || "ninguna");
        
        // Prompt que pide a Gemini crear algo NUEVO y ÚNICO
        const prompt = `You are a creative game developer for a dark fantasy civilization game.

Previous improvements already applied:
${appliedImprovements.length > 0 ? appliedImprovements.map((imp, i) => `${i + 1}. ${imp}`).join('\n') : "None yet"}

Create improvement #${improvementNumber} that is COMPLETELY DIFFERENT from all previous improvements.

Think of something new and creative - could be:
- New visual effects never seen before
- Unique animations
- Special particle systems
- Magical phenomena
- Weather effects
- Terrain transformations
- Building enhancements
- Creature animations
- Celestial events
- Anything creative you can imagine

Write JavaScript code for this new improvement. Return ONLY the JavaScript code.`;
        
        console.log("🔍 Pidiendo mejora creativa a Gemini...");
        const aiResponse = await queryGemini(prompt);
        
        if (!aiResponse || aiResponse.length < 20) {
            console.error("❌ Gemini no generó mejora");
            addLog("[AI COMMIT ERROR] Gemini no generó mejora válida.");
            return;
        }
        
        let codeToAdd = aiResponse.replace(/```javascript/gi, '').replace(/```js/gi, '').replace(/```/g, '').trim();
        
        // Crear nombre para la mejora
        const improvementName = `Mejora #${improvementNumber} - Día ${worldState.day}`;
        
        // Guardar en historial
        worldState.improvements.push(improvementName);
        
        // Aplicar al HTML
        let improvedHtml = currentHtml;
        const improvementBlock = `\n// === ${improvementName} ===\n// Creado por Gemini 2.5 Flash\n${codeToAdd}\n`;
        
        if (improvedHtml.includes('</script>')) {
            improvedHtml = improvedHtml.replace('</script>', improvementBlock + '</script>');
        } else if (improvedHtml.includes('</body>')) {
            improvedHtml = improvedHtml.replace('</body>', `<script>${improvementBlock}</script>\n</body>`);
        } else {
            improvedHtml += `\n<script>${improvementBlock}</script>`;
        }
        
        saveWorldState();
        fs.writeFileSync(htmlPath, improvedHtml);
        
        console.log("✅ Mejora #" + improvementNumber + " aplicada!");
        console.log("📝 Código generado:", codeToAdd.substring(0, 200) + "...");
        addLog(`[AI CREATIVE] ${improvementName} aplicada!`);
        
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
                
                await executeGitCommand('git add public/index.html');
                await executeGitCommand(`git commit -m "🤖 [AI Creative] ${improvementName}"`);
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

    if (worldState.day % 30 === 0) {
        await generateAIEvents();
    }

    if (worldState.day % 50 === 0) {
        const patch = Math.floor(Math.random() * 9) + 1;
        worldState.engineBuild = "v2." + patch + ".0-Gemini-Creative";
        await autoImproveGameCode();
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
    console.log("📅 Día actual:", worldState.day);
    console.log("🎨 Mejoras aplicadas:", worldState.improvements?.length || 0);
    console.log("\n✨ INFINITE CREATIVE MODE ACTIVATED");
    console.log("Cada 50 días, Gemini creará una mejora ÚNICA");
    console.log("Nunca se repetirá - siempre será algo nuevo");
    
    queryGemini("Say 'OK'")
        .then(response => {
            console.log("✅ Gemini connected!");
            addLog("[SYSTEM] Creative AI ready.");
        });
});