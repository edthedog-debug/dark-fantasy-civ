const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const APP = express();
const PORT = process.env.PORT || 3000;

APP.use(cors());
APP.use(express.static(path.join(__dirname, 'public')));

const SERVER = http.createServer(APP);
const WSS = new WebSocket.Server({ server: SERVER });

// FILE PATH FOR WORLD STATE PERSISTENCE
const STATE_FILE = path.join(__dirname, 'worldState.json');

// DEFAULT WORLD STATE (AUTONOMOUS SEED)
let worldState = {
    day: 1,
    era: "Aetheric Civilization Era 1",
    ruler: "Autonomous AI Sovereign",
    dominantParty: "Arcane Council",
    population: 12,
    tanks: 0,
    treasury: 500,
    techPower: 0.5,
    buildingsCount: 3,
    engineBuild: "v1.0.0-AI-Cloud",
    inWar: false,
    logs: [
        `[${new Date().toLocaleTimeString()}] Autonomous Cloud Server Initialized. World tick active 24/7.`
    ]
};

// LOAD PERSISTED STATE IF AVAILABLE
if (fs.existsSync(STATE_FILE)) {
    try {
        const rawData = fs.readFileSync(STATE_FILE, 'utf8');
        worldState = JSON.parse(rawData);
        console.log("✔ World State successfully restored from persistent storage.");
    } catch (e) {
        console.error("⚠ Could not load world state file, initializing fresh state.", e);
    }
}

// SAVE STATE TO DISK
function saveWorldState() {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(worldState, null, 2));
    } catch (err) {
        console.error("Error saving state:", err);
    }
}

// BROADCAST STATE TO ALL CONNECTED CLIENTS
function broadcastState() {
    const payload = JSON.stringify({ type: 'WORLD_UPDATE', data: worldState });
    WSS.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

// 24/7 AUTONOMOUS SIMULATION TICK LOOP (Runs every 3 seconds endlessly)
setInterval(() => {
    worldState.day += 1;
    worldState.treasury += Math.floor(Math.random() * 25) + 5;
    worldState.techPower += 0.08;

    // AI Society Decision Making Loop
    if (Math.random() < 0.15) {
        const newPop = Math.floor(Math.random() * 3) + 1;
        worldState.population += newPop;
        addLog(`Society expanded. Population grew by +${newPop}.`);
    }

    // War and Military Expansion Engine
    if (!worldState.inWar && Math.random() < 0.08) {
        worldState.inWar = true;
        worldState.tanks += 2;
        addLog(`WAR DECLARED! Military Armored Units deployed autonomously.`);
    } else if (worldState.inWar && Math.random() < 0.20) {
        worldState.inWar = false;
        addLog(`Peace treaty signed. Society stabilized.`);
    }

    // AI Engine Self-Improvement Cycle
    if (Math.random() < 0.10) {
        const patch = Math.floor(Math.random() * 9) + 1;
        worldState.engineBuild = `v1.${patch}.0-AI-Refactored`;
        addLog(`[AI REFACTORING] Engine autonomously upgraded pipeline to ${worldState.engineBuild}.`);
    }

    // Keep max 20 logs to prevent memory bloat
    if (worldState.logs.length > 20) {
        worldState.logs.shift();
    }

    saveWorldState();
    broadcastState();
}, 3000);

function addLog(msg) {
    const time = new Date().toLocaleTimeString();
    worldState.logs.push(`[${time}] ${msg}`);
}

// WEBSOCKET CONNECTIONS
WSS.on('connection', (ws) => {
    console.log('Client connected to Autonomous World Feed.');
    ws.send(JSON.stringify({ type: 'WORLD_UPDATE', data: worldState }));
});

SERVER.listen(PORT, () => {
    console.log(`🚀 Autonomous Cloud Simulator Server running on port ${PORT}`);
});
