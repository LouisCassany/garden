// server.ts
import { MultiplayerGardenGame, Command } from "./engine.ts";

const GAME_SETTINGS = {
    GRID_SIZE: 5,
    MAX_RESOURCES: 5,
    MAX_INFESTATIONS: 3,
    DRAFT_SIZE: 4,
};

const game = new MultiplayerGardenGame(["louis", "melanie"], GAME_SETTINGS);
const sockets = new Set<WebSocket>();

function broadcastGameState() {
    if (!game) return;
    const message = JSON.stringify({ type: "update", state: game.state });
    console.log("Broadcasting game state to", sockets.size, "clients");
    for (const socket of sockets) {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(message);
        }
    }
}

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};


Deno.serve({ port: 3000 }, async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: corsHeaders,
        });
    }

    const { pathname } = new URL(req.url);
    const method = req.method;

    // Handle WebSocket upgrade
    if (pathname === "/ws") {
        const { response, socket } = Deno.upgradeWebSocket(req);
        socket.onopen = () => {
            // Send initial game state to the new client
            socket.send(JSON.stringify({ state: game.state }));
        }
        sockets.add(socket);
        return response;
    }

    if (method === "POST" && pathname === "/cmd") {
        try {
            const command: Command = await req.json();
            const method = command.type;
            const args = command.args;

            if (typeof (game as any)[method] !== "function") {
                return new Response(`Unknown command: ${method}`, { status: 400 });
            }

            const result = (game as any)[method](...args);
            broadcastGameState()
            return addCorsHeaders(new Response(JSON.stringify(result), {
                headers: { "Content-Type": "application/json" },
            }));
        } catch (err) {
            //@ts-ignore <err: unknown>
            return addCorsHeaders(new Response("Invalid request: " + err.message, { status: 400 }));
        }
    } else {
        return addCorsHeaders(new Response("Not found", { status: 404 }));
    }
});

function addCorsHeaders(response: Response): Response {
    for (const [key, value] of Object.entries(corsHeaders)) {
        response.headers.set(key, value);
    }
    return response;
}

function json(data: unknown): Response {
    return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
    });
}

console.log("🟢 Server running at http://localhost:3000");
