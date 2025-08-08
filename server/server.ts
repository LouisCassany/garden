import express from "express";
import expressWs from "express-ws";
import cors from "cors";
import bodyParser from "body-parser";
import { MultiplayerGardenGame, Command } from "../engine";

const app = express();
expressWs(app); // Enable WebSocket support

const PORT = 3000;

const GAME_SETTINGS = {
    GRID_SIZE: 5,
    MAX_RESOURCES: 5,
    MAX_INFESTATIONS: 3,
    DRAFT_SIZE: 5,
};

const game = new MultiplayerGardenGame(["louis"], GAME_SETTINGS);
const sockets = new Set<WebSocket>();

app.use(cors());
app.use(bodyParser.json());

// WebSocket route
//@ts-ignore
app.ws("/ws", (ws, _req) => {
    // Send initial state
    ws.send(JSON.stringify({ state: game.state }));
    sockets.add(ws as unknown as WebSocket);

    ws.on("close", () => {
        sockets.delete(ws as unknown as WebSocket);
    });
});

// Broadcast function
function broadcastGameState() {
    const message = JSON.stringify({ type: "update", state: game.state });
    for (const socket of sockets) {
        if (socket.readyState === 1) { // 1 = OPEN
            socket.send(message);
        }
    }
}

// Command route
app.post("/cmd", (req, res) => {
    const command: Command = req.body;

    if (typeof (game as any)[command.type] !== "function") {
        return res.status(400).send(`Unknown command: ${command.type}`);
    }

    try {
        const result = (game as any)[command.type](...command.args);
        broadcastGameState();
        res.json(result);
    } catch (err: any) {
        res.status(400).send("Invalid request: " + err.message);
    }
});

// Fallback route
app.use((_, res) => {
    res.status(404).send("Not found");
});

app.listen(PORT, () => {
    console.log(`🟢 Server running at http://localhost:${PORT}`);
});
