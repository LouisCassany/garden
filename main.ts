import { displayGame, Tile } from "./engine.ts";

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

    // Game loop
    while (true) {
        const command = prompt("> ");
        if (!command) continue;

        if (command === "q") break;

        try {

            if (command === "h") {
                console.clear()
                displayGame((await get("/game/state")).state);
            } else if (command.startsWith("d")) {
                const index = parseInt(command.slice(1));
                const result = await post("/game/pick", { playerId, tileIndex: index });
                if (result.error) {
                    console.log("Error:", result.error);
                } else {
                    pickedTile = result.tile;
                    console.log('Picked tile:', pickedTile);
                }
            } else if (command.startsWith("p")) {
                if (!pickedTile) {
                    console.log("No tile to place");
                    continue;
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
                    console.log(`Placed tile at (${x}, ${y})`);
                }
            } else if (command.startsWith("g")) {
                const x = parseInt(command[1]);
                const y = parseInt(command[2]);
                const result = await post("/game/grow", { playerId, x, y });
                if (result.error) {
                    console.log("Error:", result.error);
                } else {
                    console.log(`Grown plant at (${x}, ${y})`);
                }
            } else if (command === "n") {
                const result = await post("/game/next-turn", {});
                if (result.gameOver) {
                    console.log(`Game Over! Winner: ${result.winner}`);
                    break;
                }
            }
        } catch (error) {
            if (error instanceof Error) {
                console.error("Error:", error.message);
            } else {
                console.error("Error:", error);
            }
        }
    }
}
// Run the program
main().catch(console.error);