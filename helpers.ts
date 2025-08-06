// Debugging helpers

import { MultiplayerGameState, PlayerState, Tile } from './engine.ts';

// Map plant names to single characters for display
const plantCharMap: Record<string, string> = {
    Lavender: 'L',
    Sunflower: 'S',
    Mushroom: 'M',
    Tree: 'T',
    Daisy: 'D',
};

// Generate a visual representation of a player's board
export function drawPlayerBoard(player: PlayerState): string[] {
    const lines: string[] = [];

    // Resources bar
    const { water, light, compost } = player.resources;
    lines.push(
        `Player ${player.id}`
    );
    lines.push(`🐀: ${player.pestToPlace}  💧: ${water}  ☀️: ${light}  🌾: ${compost}`)
    lines.push(
        `Score: ${player.score} | Infestations: ${player.infestation}`
    )

    lines.push('   A  B  C  D  E'); // Column headers

    for (let y = 0; y < player.garden.length; y++) {
        let row = `${y + 1} `;
        for (let x = 0; x < player.garden[y].length; x++) {
            const tile = player.garden[y][x];
            row += getSymbol(tile) + ' ';
        }
        lines.push(row);
    }

    return lines;
}

// Returns a 2-character symbol for each tile
export function getSymbol(tile: Tile | null): string {
    if (!tile) return ' .';

    if (tile.type === 'compost') return ' C';
    if (tile.type === 'pest') return ' X';

    if (tile.type === 'plant') {
        const symbol = plantCharMap[tile.plant.name] || '?';
        return tile.grown ? ` ${symbol}` : ` ${symbol.toLowerCase()}`;
    }

    return '??'; // fallback
}

export function displayGame(state: MultiplayerGameState) {
    const output: string[] = [];

    // Display draft zone
    output.push('Draft Zone:');
    let draftLine = '';
    for (let i = 0; i < state.draftZone.length; i++) {
        const tile = state.draftZone[i];
        if (tile.type === "plant") {
            draftLine += `[${i}:${tile.plant.name}] `;
        } else {
            draftLine += `[${i}:${tile.type}] `;
        }
    }
    output.push(draftLine);
    output.push('');

    // Get all player boards
    const playerBoards = Object.values(state.players).map(player =>
        drawPlayerBoard(player)
    );

    // Find the maximum height of player boards
    const maxHeight = Math.max(...playerBoards.map(board => board.length));

    // Combine boards side by side
    for (let i = 0; i < maxHeight; i++) {
        let line = '';
        for (const board of playerBoards) {
            // Add padding between boards
            if (line) line += '    ';
            // Get line from board or empty string if board doesn't have this line
            line += (board[i] || '').padEnd(30);
        }
        output.push(line);
    }

    // Print current turn info
    output.push('');
    output.push(`Turn ${state.currentTurn} - Current Player: ${state.currentPlayer}`);

    // Display the last 3 log entries if any
    if (state.log.length > 0) {
        output.push('');
        output.push('Recent actions:');
        state.log.slice(-3).forEach(log => output.push(log));
    }

    // Print everything with proper alignment
    console.log(`
${output.join('\n')}
`);
}