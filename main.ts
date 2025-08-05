import { drawPlayerBoard, MultiplayerGardenGame } from './engine.ts';
import type { PlayerState, Tile } from './engine.ts';

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


// // Pick a random card from draft zone
// const draftSize = game.state.draftZone.length;
// if (draftSize > 0) {
//     const pickIndex = Math.floor(Math.random() * draftSize);
//     const tile = game.pickFromDraft(currentPlayer, pickIndex);

//     if (tile) {
//         // Find random empty cell in current player's garden
//         const playerState = game.state.players.get(currentPlayer)!;
//         const cell = findRandomEmptyCell(playerState.garden);

//         if (cell) {
//             const [x, y] = cell;
//             const placed = game.placeTile(currentPlayer, tile, x, y);
//             if (!placed) {
//                 console.log(`❌ Failed to place ${tile.type} at (${x}, ${y})`);
//             }
//         }

//         // Try to grow an ungrown plant (random)
//         const x = Math.floor(Math.random() * 5);
//         const y = Math.floor(Math.random() * 5);
//         game.growPlant(currentPlayer, x, y);
//     }
// }

// // Display all player boards
// console.log('\nCurrent Game State:');
// for (const [playerId, playerState] of game.state.players) {
//     console.log('\n' + drawPlayerBoard(playerState).join('\n'));
// }

// // Display draft zone
// console.log('\nDraft Zone:', game.state.draftZone.map(t =>
//     t.type === 'plant' ? t.plant.name : t.type
// ).join(', '));

// game.nextTurn();