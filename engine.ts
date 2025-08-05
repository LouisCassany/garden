// Types
type Resource = 'water' | 'light' | 'compost';
type TileType = 'plant' | 'compost' | 'pest';
type PlantName = 'Lavender' | 'Sunflower' | 'Mushroom' | 'Tree' | 'Daisy';

type PlayerId = string;

export interface PlayerState {
    id: PlayerId;
    garden: Grid;
    score: number;
    resources: Record<Resource, number>;
    infestation: number;
}

interface MultiplayerGameState {
    players: Map<PlayerId, PlayerState>;
    deck: Tile[];
    draftZone: Tile[];
    discardPile: Tile[];
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
    discardPile: Tile[];
    resources: Record<Resource, number>;
    infestation: number;
    score: number;
    turn: number;
    log: string[];
}

// Constants
const GRID_SIZE = 5;
const MAX_RESOURCES = 5;
const MAX_INFESTATIONS = 3;
const DRAFT_SIZE = 4;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;

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

    constructor(playerIds: PlayerId[]) {
        if (playerIds.length < MIN_PLAYERS || playerIds.length > MAX_PLAYERS) {
            throw new Error(`Game requires ${MIN_PLAYERS}-${MAX_PLAYERS} players`);
        }

        const players = new Map<PlayerId, PlayerState>();
        for (const id of playerIds) {
            players.set(id, {
                id,
                garden: Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null)),
                score: 0,
                resources: { water: 0, light: 0, compost: 0 },
                infestation: 0
            });
        }

        this.state = {
            players,
            deck: this.generateDeck(playerIds.length),
            draftZone: [],
            discardPile: [],
            currentTurn: 1,
            currentPlayer: playerIds[0],
            log: []
        };

        // Fill the draft zone with cards ensuring pest are not drawn first
        for (let i = 0; i < DRAFT_SIZE; i++) {
            if (!this.refillDraftZone()) {
                // If a pest is drawn, refill the draft zone with a new tile
                this.refillDraftZone();
            }
        }
    }

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

    refillDraftZone(): boolean {
        // If we draw a pest, return false, otherwise return true
        const tile = this.state.deck.pop()!;
        if (tile.type === 'pest') {
            this.log(`Pest revealed! All players must place it.`);
            return false;
        }
        this.state.draftZone.push(tile);
        return true;
    }

    pickFromDraft(playerId: PlayerId, tileIndex: number): Tile | null {
        if (playerId !== this.state.currentPlayer) return null;
        if (tileIndex < 0 || tileIndex >= this.state.draftZone.length) return null;

        const tile = this.state.draftZone[tileIndex];
        this.state.draftZone.splice(tileIndex, 1);
        this.log(`Player ${playerId} picked ${tile.type === 'plant' ? tile.plant.name : tile.type}`);
        return tile;
    }

    placeTile(playerId: PlayerId, tile: Tile, x: number, y: number): boolean {
        const playerState = this.state.players.get(playerId);
        if (!playerState) return false;

        if (!this.inBounds(x, y)) return false;
        const existing = playerState.garden[y][x];

        if (tile.type === 'pest') {
            // Don't allow pest placement on compost or other pests
            if (existing?.type === 'compost' || existing?.type === 'pest') {
                this.log(`Player ${playerId}: Cannot place pest on ${existing.type} at (${x}, ${y})`);
                return false;
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
            return true;
        }

        // For non-pest tiles, only allow placement on empty spaces
        if (existing) return false;

        playerState.garden[y][x] = tile;
        this.log(`Player ${playerId} placed ${tile.type} at (${x}, ${y})`);

        if (tile.type === 'compost') {
            this.gainResource(playerId, 'compost', 1);
        }

        return true;
    }

    shuffle<T>(array: T[]): T[] {
        return array.sort(() => Math.random() - 0.5);
    }

    private gainResource(playerId: PlayerId, type: Resource, amount: number): void {
        const playerState = this.state.players.get(playerId);
        if (!playerState) return;
        playerState.resources[type] = Math.min(MAX_RESOURCES, playerState.resources[type] + amount);
    }

    private checkInfestation(playerId: PlayerId, x: number, y: number): void {
        const playerState = this.state.players.get(playerId);
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

    nextTurn(): void {
        const playerIds = Array.from(this.state.players.keys());
        const currentIndex = playerIds.indexOf(this.state.currentPlayer);
        const nextIndex = (currentIndex + 1) % playerIds.length;

        if (nextIndex === 0) {
            this.state.currentTurn++;
        }

        this.state.currentPlayer = playerIds[nextIndex];
    }

    isGameOver(): boolean {
        // Game ends if any player hits the conditions
        return Array.from(this.state.players.values()).some(player =>
            player.infestation >= MAX_INFESTATIONS ||
            this.state.deck.length === 0 ||
            player.garden.every(row => row.every(cell => cell !== null))
        );
    }

    getWinner(): PlayerId | null {
        if (!this.isGameOver()) return null;

        let highestScore = -1;
        let winner: PlayerId | null = null;

        for (const [playerId, player] of this.state.players) {
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

    inBounds(x: number, y: number): boolean {
        return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
    }

    private isPlantTile(tile: Tile | null): tile is PlantTile {
        return tile !== null && tile.type === 'plant';
    }

    growPlant(playerId: PlayerId, x: number, y: number): boolean {
        const playerState = this.state.players.get(playerId);
        if (!playerState) return false;

        const tile = playerState.garden[y][x];
        if (!this.isPlantTile(tile) || tile.grown) return false;

        const cost = tile.plant.growthCost;
        if (!this.hasResources(playerId, cost)) return false;

        this.spendResources(playerId, cost);
        tile.grown = true;

        // Calculate points from base score + synergy bonus
        const neighbors = this.getNeighbors(playerState.garden, x, y);
        const bonus = tile.plant.synergy(neighbors);
        const points = tile.plant.basePoints + bonus;

        // Update player's score
        playerState.score += points;

        this.log(`Player ${playerId} grew ${tile.plant.name} at (${x}, ${y}) for ${points} points`);

        return true;
    }

    private hasResources(playerId: PlayerId, cost: Partial<Record<Resource, number>>): boolean {
        const playerState = this.state.players.get(playerId);
        if (!playerState) return false;

        return Object.entries(cost).every(([resource, amount]) =>
            playerState.resources[resource as Resource] >= (amount ?? 0)
        );
    }

    private spendResources(playerId: PlayerId, cost: Partial<Record<Resource, number>>): void {
        const playerState = this.state.players.get(playerId);
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