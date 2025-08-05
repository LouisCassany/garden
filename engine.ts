type Resource = 'water' | 'light' | 'compost';
type TileType = 'plant' | 'compost' | 'pest';
type PlantName = 'Lavender' | 'Sunflower' | 'Mushroom' | 'Tree' | 'Daisy';
type Result<T> = { success: T, reason?: string };

export type PlayerId = string;

export interface PlayerState {
    id: PlayerId;
    garden: Grid;
    score: number;
    resources: Record<Resource, number>;
    infestation: number;
    canDraft: boolean
    canGrow: boolean;
    canPlace: boolean;
    mustPlacePest: boolean
}

export interface MultiplayerGameState {
    players: Record<PlayerId, PlayerState>;
    deck: Tile[];
    draftZone: Tile[];
    currentTurn: number;
    currentPlayer: PlayerId;
    log: string[];
}

interface PlantData {
    name: PlantName;
    growthCost: Partial<Record<Resource, number>>;
    basePoints: number;
    synergy: (neighbors: Tile[]) => number;
}

interface TileBase {
    id: string;
    type: TileType;
}

export interface PlantTile extends TileBase {
    type: 'plant';
    plant: PlantData;
    grown: boolean
}

interface CompostTile extends TileBase {
    type: 'compost';
}

interface PestTile extends TileBase {
    type: 'pest';
}

export type Tile = PlantTile | CompostTile | PestTile;

type Grid = (Tile | null)[][]; // 5x5 grid

export interface GameState {
    grid: Grid;
    deck: Tile[];
    resources: Record<Resource, number>;
    infestation: number;
    score: number;
    turn: number;
    log: string[];
}

type Settings = {
    GRID_SIZE: number;
    MAX_RESOURCES: number;
    MAX_INFESTATIONS: number;
    DRAFT_SIZE: number;
}

// Utility
function generateId(): string {
    return Math.random().toString(36).slice(2, 10);
}

// Plant definitions
const plantLibrary: PlantData[] = [
    {
        name: 'Lavender',
        growthCost: { water: 1, light: 1 },
        basePoints: 2,
        // Synergy: +1 for each different plant neighbor
        synergy: (neighbors) => neighbors.filter(t => t?.type === 'plant' && t.plant.name !== 'Lavender').length > 0 ? 1 : 0,
    },
    {
        name: 'Sunflower',
        growthCost: { light: 2 },
        basePoints: 2,
        // Synergy: +1 if any compost neighbor
        synergy: (neighbors) => neighbors.some(t => t?.type === 'compost') ? 1 : 0,
    },
    {
        name: 'Mushroom',
        growthCost: { compost: 2 },
        basePoints: 1,
        // Synergy: +1 if any Tree neighbor
        synergy: (neighbors) => neighbors.some(t => t?.type === 'plant' && t.plant.name === 'Tree') ? 1 : 0,
    },
    {
        name: 'Tree',
        growthCost: { water: 2, compost: 2 },
        basePoints: 3,
        synergy: () => 0,
    },
    {
        name: 'Daisy',
        growthCost: { water: 1, light: 1 },
        basePoints: 1,
        synergy: (neighbors) => neighbors.some(t => t?.type === 'plant') ? 1 : 0,
    },
];

export class MultiplayerGardenGame {
    state: MultiplayerGameState;
    private readonly settings: Settings

    constructor(playerIds: PlayerId[], settings: Settings) {
        this.settings = settings;

        const players: Record<PlayerId, PlayerState> = {};
        for (const id of playerIds) {
            players[id] = {
                id,
                garden: Array.from({ length: settings.GRID_SIZE }, () => Array(settings.GRID_SIZE).fill(null)),
                score: 0,
                resources: { water: 0, light: 0, compost: 0 },
                infestation: 0,
                canDraft: true,
                canGrow: true,
                canPlace: true,
                mustPlacePest: false
            };
        }

        this.state = {
            players,
            deck: this.generateDeck(playerIds.length),
            draftZone: [],
            currentTurn: 1,
            currentPlayer: playerIds[0],
            log: []
        };

        // Fill the draft zone with cards ensuring pest are not drawn first
        while (this.state.draftZone.length < settings.DRAFT_SIZE) {
            const tile = this.drawTile();
            if (tile) {
                // If it's a pest, put it back in the deck, shuffle the deck and refill the draft zone
                if (tile.type === 'pest') {
                    this.state.deck.push(tile);
                    this.shuffle(this.state.deck);
                } else {
                    this.state.draftZone.push(tile);
                }
            }
        }

    }

    // Init action
    private generateDeck(playerCount: number): Tile[] {
        const deck: Tile[] = [];

        // Scale cards with player count
        for (let i = 0; i < 4 * playerCount; i++) {
            for (const plant of plantLibrary) {
                deck.push({
                    id: generateId(),
                    type: 'plant',
                    plant,
                    grown: false,
                });
            }
        }

        for (let i = 0; i < 5 * playerCount; i++) {
            deck.push({ id: generateId(), type: 'compost' });
        }

        for (let i = 0; i < 5 * playerCount; i++) {
            deck.push({ id: generateId(), type: 'pest' });
        }

        return this.shuffle(deck);
    }

    // Player action
    pickFromDraft(playerId: PlayerId, tileIndex: number): Result<Tile | null> {
        if (playerId !== this.state.currentPlayer) return { success: null, reason: 'Not your turn' };
        const playerState = this.state.players[playerId];
        if (!playerState) return { success: null, reason: 'Player not found' };
        if (!playerState.canDraft) return { success: null, reason: 'Cannot draft this turn' };

        if (tileIndex < 0 || tileIndex >= this.state.draftZone.length) return { success: null, reason: 'Invalid tile index' };

        const tile = this.state.draftZone[tileIndex];
        this.state.draftZone.splice(tileIndex, 1);
        this.log(`Player ${playerId} picked ${tile.type === 'plant' ? tile.plant.name : tile.type}`);
        playerState.canDraft = false; // Disable drafting for this player
        return { success: tile, reason: undefined };
    }

    // Player action
    growPlant(playerId: PlayerId, x: number, y: number): Result<boolean> {
        if (playerId !== this.state.currentPlayer) return { success: false, reason: 'Not your turn' };
        const playerState = this.state.players[playerId];
        if (!playerState) return { success: false, reason: 'Player not found' };
        if (!playerState.canGrow) return { success: false, reason: 'Cannot grow this turn' };

        const tile = playerState.garden[y][x];
        if (!this.isPlantTile(tile) || tile.grown) return { success: false, reason: 'Invalid tile to grow (not plant or already grown)' };

        const cost = tile.plant.growthCost;
        if (!this.hasResources(playerId, cost)) return { success: false, reason: 'Not enough resources' };

        this.spendResources(playerId, cost);
        tile.grown = true;

        // Calculate points from base score + synergy bonus
        const neighbors = this.getNeighbors(playerState.garden, x, y);
        const bonus = tile.plant.synergy(neighbors);
        const points = tile.plant.basePoints + bonus;

        // Update player's score
        playerState.score += points;

        this.log(`Player ${playerId} grew ${tile.plant.name} at (${x}, ${y}) for ${points} points`);
        playerState.canGrow = false;

        return { success: true, reason: undefined };
    }

    // Player action
    placeTile(playerId: PlayerId, tile: Tile, x: number, y: number): Result<boolean> {
        if (playerId !== this.state.currentPlayer) return { success: false, reason: 'Not your turn' };
        const playerState = this.state.players[playerId];
        if (!playerState) return { success: false, reason: 'Player not found' };
        if (!playerState.canPlace) return { success: false, reason: 'Cannot place tile this turn' };

        if (!this.inBounds(x, y)) return { success: false, reason: 'Out of bounds' };
        const existing = playerState.garden[y][x];

        if (tile.type === 'pest') {
            // Don't allow pest placement on compost or other pests
            if (existing?.type === 'compost' || existing?.type === 'pest') {
                this.log(`Player ${playerId}: Cannot place pest on ${existing.type} at (${x}, ${y})`);
                return { success: false, reason: 'Cannot place pest on compost or other pests' };
            }

            // If placing on a plant, reduce score by plant's base points
            if (existing && this.isPlantTile(existing)) {
                playerState.score -= existing.plant.basePoints;
                this.log(`Player ${playerId}: Pest destroyed ${existing.grown ? 'grown' : 'ungrown'} ${existing.plant.name} at (${x}, ${y}), lost ${existing.plant.basePoints} points`);
            } else {
                this.log(`Player ${playerId}: Placed pest at empty space (${x}, ${y})`);
            }

            // Place pest and check for infestation
            playerState.garden[y][x] = tile;
            this.checkInfestation(playerId, x, y);
            playerState.canPlace = false;
            return { success: true, reason: undefined };
        }

        // For non-pest tiles, only allow placement on empty spaces
        if (existing) return { success: false, reason: 'Tile already exists at this position' };

        playerState.garden[y][x] = tile;
        this.log(`Player ${playerId} placed ${tile.type} at (${x}, ${y})`);

        if (tile.type === 'compost') {
            this.gainResource(playerId, 'compost', 1);
        }

        playerState.canPlace = false;
        return { success: true, reason: undefined };
    }

    // Game action
    drawTile(): Tile | null {
        if (this.state.deck.length === 0) return null;
        return this.state.deck.pop() || null;
    }

    // Game action
    private gainResource(playerId: PlayerId, type: Resource, amount: number): void {
        const playerState = this.state.players[playerId];
        if (!playerState) return;
        playerState.resources[type] = Math.min(this.settings.MAX_RESOURCES, playerState.resources[type] + amount);
    }

    // Game action
    private checkInfestation(playerId: PlayerId, x: number, y: number): void {
        const playerState = this.state.players[playerId];
        if (!playerState) return;

        const neighbors = this.getNeighbors(playerState.garden, x, y);
        const pestNeighbors = neighbors.filter(t => t?.type === 'pest').length;
        if (pestNeighbors >= 1) {
            playerState.infestation += 1;
            this.log(`Player ${playerId} infestation increased to ${playerState.infestation}`);
        }
    }

    private getNeighbors(garden: Grid, x: number, y: number): Tile[] {
        const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        return dirs
            .map(([dx, dy]) => this.inBounds(x + dx, y + dy) ? garden[y + dy][x + dx] : null)
            .filter(Boolean) as Tile[];
    }

    nextTurn(): boolean {
        const playerIds = Object.keys(this.state.players);
        const currentIndex = playerIds.indexOf(this.state.currentPlayer);
        const nextIndex = (currentIndex + 1) % playerIds.length;

        if (nextIndex === 0) {
            this.state.currentTurn++;
        }

        // New turn setup
        this.state.currentPlayer = playerIds[nextIndex];
        this.state.players[this.state.currentPlayer].canDraft = true;
        this.state.players[this.state.currentPlayer].canGrow = true;
        this.state.players[this.state.currentPlayer].canPlace = true;
        this.state.players[this.state.currentPlayer].mustPlacePest = false;

        const newCard = this.drawTile();
        if (newCard) {
            if (newCard.type == 'pest') {
                // All players must place a pest tile if available
                for (const player of Object.values(this.state.players)) {
                    player.mustPlacePest = true;
                }
                this.log(`All players must place a pest tile this turn`);
            } else {
                // Add the new card to the draft zone
                this.state.draftZone.push(newCard);
                this.log(`New card drawn: ${newCard.type === 'plant' ? newCard.plant.name : newCard.type}`);
            }
        }

        return this.isGameOver();
    }

    isGameOver(): boolean {
        // Game ends if any player hits the conditions

        return Array.from(Object.values(this.state.players)).some(player =>
            player.infestation >= this.settings.MAX_INFESTATIONS ||
            this.state.deck.length === 0 ||
            player.garden.every(row => row.every(cell => cell !== null))
        );
    }

    getWinner(): PlayerId | null {
        if (!this.isGameOver()) return null;

        let highestScore = -1;
        let winner: PlayerId | null = null;

        for (const [playerId, player] of Object.entries(this.state.players)) {
            if (player.score > highestScore) {
                highestScore = player.score;
                winner = playerId;
            }
        }

        return winner;
    }

    private log(message: string): void {
        this.state.log.push(`[Turn ${this.state.currentTurn}] ${message}`);
    }

    shuffle<T>(array: T[]): T[] {
        return array.sort(() => Math.random() - 0.5);
    }

    inBounds(x: number, y: number): boolean {
        return x >= 0 && x < this.settings.GRID_SIZE && y >= 0 && y < this.settings.GRID_SIZE;
    }

    private isPlantTile(tile: Tile | null): tile is PlantTile {
        return tile !== null && tile.type === 'plant';
    }

    private hasResources(playerId: PlayerId, cost: Partial<Record<Resource, number>>): boolean {
        const playerState = this.state.players[playerId];
        if (!playerState) return false;

        return Object.entries(cost).every(([resource, amount]) =>
            playerState.resources[resource as Resource] >= (amount ?? 0)
        );
    }

    private spendResources(playerId: PlayerId, cost: Partial<Record<Resource, number>>): void {
        const playerState = this.state.players[playerId];
        if (!playerState) return;

        for (const [resource, amount] of Object.entries(cost)) {
            playerState.resources[resource as Resource] -= amount!;
        }
    }

}

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
    lines.push(`💧: ${water}  ☀️: ${light}  🌾: ${compost}`)
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