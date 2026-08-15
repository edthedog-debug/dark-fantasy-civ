const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { exec } = require('child_process');
const https = require('https');

const APP = express();
const PORT = process.env.PORT || 3000;

// ENVIRONMENT VARIABLES (Configured in Render)
const AI_API_KEY = process.env.GEMINI_API_KEY; 
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'edthedog-debug/dark-fantasy-civ';

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
    improvements: [],
    logs: [
        "[" + new Date().toLocaleTimeString() + "] Autonomous Cloud Engine Initialized."
    ]
};

/**
 * DOWNLOAD STATE FROM GITHUB
 */
async function downloadStateFromGitHub() {
    if (!GITHUB_TOKEN) {
        console.log("⚠️ No GITHUB_TOKEN, usando estado local");
        return null;
    }

    console.log("🔍 Descargando estado desde GitHub...");
    
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/worldState.json`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'User-Agent': 'Node-AI-Server',
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const content = Buffer.from(data.content, 'base64').toString('utf8');
            const savedState = JSON.parse(content);
            
            if (savedState && typeof savedState.day === 'number') {
                console.log("✅ Estado descargado desde GitHub: Día", savedState.day);
                return savedState;
            }
        } else if (response.status === 404) {
            console.log("⚠️ No hay estado en GitHub aún, usando estado inicial");
        } else {
            console.error("❌ Error descargando estado:", response.status);
        }
    } catch (e) {
        console.error("❌ Error:", e.message);
    }
    
    return null;
}

/**
 * UPLOAD STATE TO GITHUB
 */
async function uploadStateToGitHub() {
    if (!GITHUB_TOKEN) {
        return;
    }

    try {
        const content = Buffer.from(JSON.stringify(worldState, null, 2)).toString('base64');
        
        // Primero intentar obtener el SHA actual
        let currentSha = null;
        
        try {
            const getUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/worldState.json`;
            const getResponse = await fetch(getUrl, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'User-Agent': 'Node-AI-Server',
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (getResponse.ok) {
                const getData = await getResponse.json();
                currentSha = getData.sha;
            }
        } catch (e) {
            // File doesn't exist yet
        }
        
        // Subir o actualizar el archivo
        const putUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/worldState.json`;
        const body = {
            message: `💾 Estado guardado: Día ${worldState.day}`,
            content: content,
            branch: 'main'
        };
        
        if (currentSha) {
            body.sha = currentSha;
        }
        
        const putResponse = await fetch(putUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Node-AI-Server',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(body)
        });
        
        if (putResponse.ok) {
            console.log("💾 Estado subido a GitHub: Día", worldState.day);
        } else {
            console.error("❌ Error subiendo estado:", putResponse.status);
        }
    } catch (e) {
        console.error("❌ Error subiendo estado:", e.message);
    }
}

/**
 * LOAD STATE - FROM GITHUB OR LOCAL
 */
async function loadState() {
    // Primero intentar desde GitHub
    const githubState = await downloadStateFromGitHub();
    
    if (githubState) {
        worldState = githubState;
        console.log("✅ Estado restaurado desde GitHub");
        console.log("📅 Día:", worldState.day);
        console.log("👥 Población:", worldState.population);
        console.log("💰 Tesoro:", worldState.treasury);
        console.log("🎨 Mejoras:", worldState.improvements?.length || 0);
        return;
    }
    
    // Si no hay en GitHub, intentar local
    if (fs.existsSync(STATE_FILE)) {
        try {
            const rawData = fs.readFileSync(STATE_FILE, 'utf8');
            const savedState = JSON.parse(rawData);
            if (savedState && typeof savedState.day === 'number') {
                worldState = savedState;
                console.log("✅ Estado restaurado localmente: Día", worldState.day);
                return;
            }
        } catch (e) {
            console.error("❌ Error cargando estado local:", e.message);
        }
    }
    
    console.log("⚠️ Usando estado inicial: Día 1");
}

function saveWorldState() {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(worldState, null, 2));
    } catch (err) {
        console.error("❌ Error guardando local:", err);
    }
}

// Guardar en GitHub cada 10 ticks (40 segundos)
let tickCounter = 0;

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
                    temperature: 1.0,
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
        
        const appliedImprovements = worldState.improvements || [];
        const improvementNumber = appliedImprovements.length + 1;
        
        console.log("🎨 Creando mejora #" + improvementNumber + "...");
        
        const prompt = `You are a creative game developer for a dark fantasy civilization game.

Previous improvements already applied:
${appliedImprovements.length > 0 ? appliedImprovements.map((imp, i) => `${i + 1}. ${imp}`).join('\n') : "None yet"}

Create improvement #${improvementNumber} that is COMPLETELY DIFFERENT from all previous improvements.

Write JavaScript code for this new improvement. Return ONLY the JavaScript code.`;
        
        const aiResponse = await queryGemini(prompt);
        
        if (!aiResponse || aiResponse.length < 20) {
            console.error("❌ Gemini no generó mejora");
            addLog("[AI COMMIT ERROR] Gemini no generó mejora válida.");
            return;
        }
        
        let codeToAdd = aiResponse.replace(/```javascript/gi, '').replace(/```js/gi, '').replace(/```/g, '').trim();
        
        const improvementName = `Mejora #${improvementNumber} - Día ${worldState.day}`;
        worldState.improvements.push(improvementName);
        
        let improvedHtml = currentHtml;
        const improvementBlock = `\n// === ${improvementName} ===\n${codeToAdd}\n`;
        
        if (improvedHtml.includes('</script>')) {
            improvedHtml = improvedHtml.replace('</script>', improvementBlock + '</script>');
        } else if (improvedHtml.includes('</body>')) {
            improvedHtml = improvedHtml.replace('</body>', `<script>${improvementBlock}</script>\n</body>`);
        }
        
        saveWorldState();
        await uploadStateToGitHub();
        fs.writeFileSync(htmlPath, improvedHtml);
        
        console.log("✅ Mejora #" + improvementNumber + " aplicada!");
        addLog(`[AI CREATIVE] ${improvementName} aplicada!`);
        
    } catch (err) {
        console.error("Error:", err.message);
        addLog(`[AI COMMIT ERROR] ${err.message}`);
    }
}

// ASYNC SIMULATION TICK
async function runSimulationTick() {
    worldState.day += 1;
    tickCounter++;

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
    
    // Subir a GitHub cada 10 ticks (40 segundos)
    if (tickCounter % 10 === 0) {
        await uploadStateToGitHub();
    }
    
    broadcastState();
}

setInterval(runSimulationTick, 4000);

WSS.on('connection', (ws) => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'WORLD_UPDATE', data: worldState }));
    }
});

SERVER.listen(PORT, async () => {
    console.log("🚀 Dark Fantasy Civilization active on port " + PORT);
    
    // CARGAR ESTADO DESDE GITHUB AL INICIAR
    await loadState();
    
    console.log("📅 Día actual:", worldState.day);
    console.log("👥 Población:", worldState.population);
    console.log("💰 Tesoro:", worldState.treasury);
    console.log("🎨 Mejoras:", worldState.improvements?.length || 0);
    
    // Guardar estado inicial en GitHub
    await uploadStateToGitHub();
    
    queryGemini("Say 'OK'")
        .then(response => {
            if (response) {
                console.log("✅ Gemini connected!");
                addLog("[SYSTEM] AI System ready.");
            }
        });
});