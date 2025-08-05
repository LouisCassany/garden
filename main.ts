import { displayGame, Tile } from "./engine.ts";

// Create a class to handle sync readline
class ReadLineSync {
    private buffer: string[] = [];
    private decoder = new TextDecoder();

    async *[Symbol.asyncIterator]() {
        const buf = new Uint8Array(1024);

        while (true) {
            const n = await Deno.stdin.read(buf);
            if (n === null) break;

            const text = this.decoder.decode(buf.subarray(0, n));
            this.buffer.push(text);

            const lines = this.buffer.join("").split("\n");
            this.buffer = [lines.pop() || ""];

            for (const line of lines) {
                yield line.trim();
            }
        }
    }
}


// Add this at the top with other imports
const reader = new ReadLineSync();

const SERVER_URL = "http://localhost:3000";

async function post(endpoint: string, data: any) {
    const response = await fetch(`${SERVER_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return await response.json();
}

async function get(endpoint: string) {
    const response = await fetch(`${SERVER_URL}${endpoint}`);
    return await response.json();
}

function displayCommands() {
    console.log(`
        d[0-3] - Pick tile from draft zone
        p[xy]  - Place tile at position (x,y)
        g[xy]  - Grow plant at position (x,y)
        n      - Next turn
        q      - Quit
        `)
}

async function main() {
    // Start game
    const playerId = Deno.args[0];
    if (!playerId) {
        console.log("Please provide your player ID as argument");
        Deno.exit(1);
    }

    // Create a new game if first player
    if (playerId === "player1") {
        const result = await post("/game/new", { playerIds: ["player1", "player2"] });
        displayGame(result.state);
    }

    let pickedTile: Tile | null = null;

    displayCommands();

    // Connect to WebSocket
    const ws = new WebSocket("ws://localhost:3000/ws");
    ws.onopen = () => {
        console.log("Connected to WebSocket");
    };

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "update") {
            console.clear();
            displayGame(message.state);
            displayCommands();
            console.log("> ");
        }

    };

    // New game loop
    console.log("> ");
    for await (const line of reader) {
        const { shouldContinue, pickedTile: newPickedTile } =
            await handleCommand(line, playerId, pickedTile);

        if (!shouldContinue) break;
        pickedTile = newPickedTile;
        console.log("> ");
    }
}

// Replace the game loop with this version
async function handleCommand(command: string, playerId: string, pickedTile: Tile | null) {
    if (!command) return { shouldContinue: true, pickedTile };

    if (command === "q") return { shouldContinue: false, pickedTile };

    try {
        if (command === "h") {
            console.clear();
            displayGame((await get("/game/state")).state);
            displayCommands();
        } else if (command.startsWith("d")) {
            const index = parseInt(command.slice(1));
            const result = await post("/game/pick", { playerId, tileIndex: index });
            if (result.error) {
                console.log("Error:", result.error);
            } else {
                pickedTile = result.tile;
                // console.log('Picked tile:', pickedTile);
            }
        } else if (command.startsWith("p")) {
            if (!pickedTile) {
                console.log("No tile to place");
                return { shouldContinue: true, pickedTile };
            }
            const x = parseInt(command[1]);
            const y = parseInt(command[2]);
            const result = await post("/game/place", {
                playerId,
                tile: pickedTile,
                x,
                y
            });
            if (result.error) {
                console.log("Error:", result.error);
            } else {
                pickedTile = null;
                // console.log(`Placed tile at (${x}, ${y})`);
            }
        } else if (command.startsWith("g")) {
            const x = parseInt(command[1]);
            const y = parseInt(command[2]);
            const result = await post("/game/grow", { playerId, x, y });
            if (result.error) {
                console.log("Error:", result.error);
            } else {
                // console.log(`Grown plant at (${x}, ${y})`);
            }
        } else if (command === "n") {
            const result = await post("/game/next-turn", {});
            if (result.gameOver) {
                console.log(`Game Over! Winner: ${result.winner}`);
                return { shouldContinue: false, pickedTile: null };
            }
        }
    } catch (error) {
        if (error instanceof Error) {
            console.error("Error:", error.message);
        } else {
            console.error("Error:", error);
        }
    }
    return { shouldContinue: true, pickedTile };
}


// Run the program
main().catch(console.error);