// server.ts
import { MultiplayerGardenGame, Tile } from "./engine.ts";

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

    const json = async () => {
        try {
            return await req.json();
        } catch {
            return null;
        }
    };

    const handleRequest = async () => {
        // if (method === "POST" && pathname === "/game/new") {
        //     const body = await json();
        //     const { playerIds } = body ?? {};
        //     if (!Array.isArray(playerIds) || playerIds.length < 2) {
        //         return Response.json({ error: "Need at least 2 player IDs" }, { status: 400 });
        //     }
        //     game = new MultiplayerGardenGame(playerIds, GAME_SETTINGS);
        //     broadcastGameState();
        //     return Response.json({ state: game.state });
        // }

        if (method === "POST" && pathname === "/game/pick") {
            if (!game) return Response.json({ error: "No game in progress" }, { status: 400 });

            const body = await json();
            const { playerId, tileIndex } = body ?? {};
            const { success: tile, reason } = game.pickFromDraft(playerId, tileIndex);
            if (!tile) return Response.json({ error: reason }, { status: 400 });

            broadcastGameState();
            return Response.json({ tile, state: game.state });
        }

        if (method === "POST" && pathname === "/game/place") {
            if (!game) return Response.json({ error: "No game in progress" }, { status: 400 });

            const body = await json();
            const { playerId, tile, x, y } = body ?? {};
            const { success, reason } = game.placeTile(playerId, tile as Tile, x, y);
            if (!success) return Response.json({ error: reason }, { status: 400 });

            broadcastGameState();
            return Response.json({ state: game.state });
        }

        if (method === "POST" && pathname === "/game/grow") {
            if (!game) return Response.json({ error: "No game in progress" }, { status: 400 });

            const body = await json();
            const { playerId, x, y } = body ?? {};
            const { success, reason } = game.growPlant(playerId, x, y);
            if (!success) return Response.json({ error: reason }, { status: 400 });

            broadcastGameState();
            return Response.json({ state: game.state });
        }

        if (method === "POST" && pathname === "/game/next-turn") {
            if (!game) return Response.json({ error: "No game in progress" }, { status: 400 });

            const isGameOver = game.nextTurn();
            const winner = isGameOver ? game.getWinner() : undefined;

            broadcastGameState();
            return Response.json({ isGameOver, winner, state: game.state });
        }

        if (method === "GET" && pathname === "/game/state") {
            if (!game) return Response.json({ error: "No game in progress" }, { status: 400 });
            return Response.json({ state: game.state });
        }

        return new Response("Not found", { status: 404 });
    };

    const response = await handleRequest();
    for (const [key, value] of Object.entries(corsHeaders)) {
        response.headers.set(key, value);
    }
    return response;
});

console.log("🟢 Server running at http://localhost:3000");
