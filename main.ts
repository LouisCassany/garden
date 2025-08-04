import { SharedGardenGame } from './engine.ts';
import type { GameState, Tile } from './engine.ts';

// Utility to find a random empty cell
function findRandomEmptyCell(grid: (any | null)[][]): [number, number] | null {
    const empty: [number, number][] = [];
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (!grid[y][x]) empty.push([x, y]);
        }
    }
    if (empty.length === 0) return null;
    return empty[Math.floor(Math.random() * empty.length)];
}

// Map plant names to single characters
const plantCharMap: Record<string, string> = {
    Lavender: 'L',
    Sunflower: 'S',
    Mushroom: 'M',
    Tree: 'T',
    Daisy: 'D',
};

// Generate a visual representation of the board
function drawBoardInline(state: GameState): string[] {
    const lines: string[] = [];

    // Resources bar
    const { water, light, compost } = state.resources;
    lines.push(
        `Resources — 💧: ${water}  ☀️: ${light}  🌾: ${compost} | Turn: ${state.turn} | Score: ${state.score} | Infestations: ${state.infestation}`
    );

    lines.push('   A  B  C  D  E'); // Column headers

    for (let y = 0; y < state.grid.length; y++) {
        let row = `${y + 1} `; // Row number
        for (let x = 0; x < state.grid[y].length; x++) {
            const tile = state.grid[y][x];
            row += getSymbol(tile) + ' ';
        }
        lines.push(row);
    }

    return lines;
}

// Returns a 2-character symbol for each tile
function getSymbol(tile: Tile | null): string {
    if (!tile) return ' .';

    if (tile.type === 'compost') return ' C';
    if (tile.type === 'pest') return ' X';

    if (tile.type === 'plant') {
        const symbol = plantCharMap[tile.plant.name] || '?';
        return tile.grown ? ` ${symbol}` : ` ${symbol.toLowerCase()}`;
    }

    return '??'; // fallback
}

// Create game
const game = new SharedGardenGame();

console.log('🌱 Starting Shared Garden simulation...\n');

// Game loop
while (!game.isGameOver() && !game.isVictory()) {

    game.gainRandomResource();

    const tile = game.drawTile();
    if (!tile) break;

    const cell = findRandomEmptyCell(game.state.grid);
    if (!cell) {
        console.log('Garden is full!');
        break;
    }

    const [x, y] = cell;

    const placed = game.placeTile(tile, x, y);
    if (!placed) {
        game.log(`❌ Failed to place ${tile.type} at (${x}, ${y})`);
    } else {
        if (tile.type === 'plant') {
            const grown = game.growPlant(x, y);
            if (!grown) {
                game.log(`🌿 Could not grow ${tile.plant.name} at (${x}, ${y}) due to resource limits.`);
            }
        }
    }


    // Add board snapshot to the log
    const layout = drawBoardInline(game.state);
    layout.forEach(line => game.log(line));

    game.endTurn();
}

// Final state output
console.log('\n🧾 Final Log:\n');
console.log(game.state.log.join('\n'));

console.log('\n📊 Final Score:', game.state.score);
console.log('🐛 Infestations:', game.state.infestation);
console.log('🔁 Turns:', game.state.turn - 1);

if (game.isVictory()) {
    console.log('\n🏆 You won the game!');
} else {
    console.log('\n💀 Game over.');
}