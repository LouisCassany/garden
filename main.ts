import { drawPlayerBoard, MultiplayerGardenGame } from './engine.ts';
import type { Tile } from './engine.ts';

// Utility to find a random empty cell
function findRandomEmptyCell(grid: (Tile | null)[][]): [number, number] | null {
    const empty: [number, number][] = [];
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (!grid[y][x]) empty.push([x, y]);
        }
    }
    if (empty.length === 0) return null;
    return empty[Math.floor(Math.random() * empty.length)];
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const playerIds = ['Alice', 'Bob'];
const game = new MultiplayerGardenGame(playerIds);


const currentPlayer = game.state.currentPlayer;

// Test picking a tile from the draft zone
console.log(`Current player: ${currentPlayer}`);
const draftIndex = randomInt(0, game.state.draftZone.length - 1);
displayDraftZone()
const pickedTile = game.pickFromDraft(currentPlayer, draftIndex);
console.log(`Player ${currentPlayer} picked tile at index ${draftIndex}`);
displayDraftZone()

// Test random placement of the picked tile
const tile = findRandomEmptyCell(game.state.players.get(currentPlayer)!.garden);
if (tile && pickedTile) {
    game.placeTile(currentPlayer, pickedTile, tile[0], tile[1]);
}
console.log(drawPlayerBoard(game.state.players.get(currentPlayer)!));

function displayDraftZone() {
    console.log(`\nCurrent draft zone: ${game.state.draftZone.map(t => {
        if (t.type === 'plant') {
            return `${t.plant.name}`;
        }
        return t.type;
    }).join(', ')}`);
}