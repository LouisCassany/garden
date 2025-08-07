type Resource = 'water' | 'light' | 'compost';
type TileType = 'plant' | 'pest';
type PlantName = 'Lavender' | 'Sunflower' | 'Mushroom' | 'Tree' | 'Daisy' | 'Compost' | 'Brook' | 'Cactus' | 'Bamboo' | 'Vine' | 'Fern';
type Result<T> = { success: T, reason?: string };

export type PlayerId = string;

export interface PlayerState {
    id: PlayerId;
    garden: Grid;
    score: number;
    resources: Record<Resource, number>;
    infestation: number;
    canGrow: boolean;
    canPlace: boolean;
    pestToPlace: 0,
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
    placeEffect: (playerState: PlayerState) => void;
    growEffect: (neighbors: Tile[], playerState: PlayerState) => void;
    description: string;
}

interface TileBase {
    id: string;
    type: TileType;
}

export interface PlantTile extends TileBase {
    type: 'plant';
    plant: PlantData;
    grown: boolean;
}

interface PestTile extends TileBase {
    type: 'pest';
}

export type Tile = PlantTile | PestTile;

export type Grid = (Tile | null)[][]; // 5x5 grid

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

// List of games commands to export for client-side usage
interface GameCommands {
    growPlant: {
        args: Parameters<MultiplayerGardenGame["growPlant"]>;
        return: ReturnType<MultiplayerGardenGame["growPlant"]>;
    };
    placeTile: {
        args: Parameters<MultiplayerGardenGame["placeTile"]>;
        return: ReturnType<MultiplayerGardenGame["placeTile"]>;
    };
    nextTurn: {
        args: [];
        return: ReturnType<MultiplayerGardenGame["nextTurn"]>;
    };
}

// Automatically derive command union
type CommandMap = {
    [K in keyof GameCommands]: {
        type: K;
        args: GameCommands[K]["args"];
        __return?: GameCommands[K]["return"]; // used only for inference
    };
};

// Strongly typed client-side command sender
export async function sendCommand<K extends keyof GameCommands>(
    type: K, args: GameCommands[K]["args"][0]
): Promise<Awaited<GameCommands[K]["return"]>> {
    const res = await fetch("http://localhost:3000/cmd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, args: [args] }),
    });
    if (!res.ok) {
        throw new Error(`Command failed: ${await res.text()}`);
    };
    return res.json();
}

export type Command = CommandMap[keyof CommandMap];

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
        growEffect: (neighbors, playerState) => {
            const neighborsCount = neighbors.filter(t => t?.type === 'plant' && t.plant.name !== 'Lavender').length;
            if (neighborsCount > 0) {
                playerState.score += neighborsCount;
            }
        },
        placeEffect: () => { },
        description: 'Lavender thrives near other plants, but not near Lavender itself. (+1 point for each different plant neighbor)',
    },
    {
        name: 'Sunflower',
        growthCost: { light: 2 },
        basePoints: 2,
        // placeEffect: (neighbors) => neighbors.some(t => t?.type === 'plant' && t.plant.name === 'Compost') ? 1 : 0,
        growEffect: (neighbors, playerState) => {
            const neighborsCount = neighbors.some(t => t?.type === 'plant' && t.plant.name === 'Compost') ? 1 : 0;
            if (neighborsCount > 0) {
                playerState.resources.compost += 1;
            }
        },
        placeEffect: () => { },
        description: 'Sunflower loves compost. (+1 point for each compost neighbor)',
    },
    {
        name: 'Mushroom',
        growthCost: { compost: 2 },
        basePoints: 1,
        growEffect: (neighbors, playerState) => {
            const neighborsCount = neighbors.some(t => t?.type === 'plant' && t.plant.name === 'Tree') ? 1 : 0;
            if (neighborsCount > 0) {
                playerState.score += 1;
            }
        },
        placeEffect: () => { },
        description: 'Mushrooms grow well near trees. (+1 point for each Tree neighbor)',
    },
    {
        name: 'Tree',
        growthCost: { water: 2, compost: 2 },
        basePoints: 3,
        placeEffect: () => { },
        growEffect: () => { },
        description: 'Trees are strong but require more resources.',
    },
    {
        name: 'Daisy',
        growthCost: { water: 1, light: 1 },
        basePoints: 1,
        growEffect: (neighbors, playerState) => {
            const neighborsCount = neighbors.some(t => t?.type === 'plant') ? 1 : 0;
            if (neighborsCount > 0) {
                playerState.score += neighborsCount;
            }
        },
        placeEffect: () => { },
        description: 'Daisies love being around other plants. (+1 point for each plant neighbor)',
    },
    {
        name: 'Compost',
        growthCost: {},
        basePoints: 0,
        growEffect: () => { },
        placeEffect: (playerState) => {
            playerState.resources.compost += 1;
        },
        description: 'Compost is a nutritious resource that can be used to grow plants. (+1 one compost resource)',
    },
    {
        name: 'Brook',
        growthCost: {},
        basePoints: 0,
        growEffect: () => { },
        placeEffect: (playerState) => {
            playerState.resources.water += 2;
        },
        description: 'Brooks are a source of water. (+1 water resource)',
    },
    {
        name: 'Cactus',
        growthCost: { light: 2 },
        basePoints: 1,
        growEffect: (neighbors, playerState) => {
            const emptySpaces = neighbors.filter(t => t === null).length;
            if (emptySpaces > 0) {
                playerState.score += emptySpaces;
            }
        },
        placeEffect: () => { },
        description: 'Cactus thrives in isolation. (+1 point for each empty adjacent space)',
    },
    {
        name: 'Bamboo',
        growthCost: { water: 1, compost: 1 },
        basePoints: 2,
        growEffect: (neighbors, playerState) => {
            const bambooNeighbors = neighbors.filter(t =>
                t?.type === 'plant' && t.plant.name === 'Bamboo'
            ).length;
            if (bambooNeighbors > 0) {
                playerState.score += bambooNeighbors * 2;
            }
        },
        placeEffect: () => { },
        description: 'Bamboo grows in clusters. (+2 points for each adjacent Bamboo)',
    },
    {
        name: 'Vine',
        growthCost: { water: 1, light: 1 },
        basePoints: 0,
        growEffect: (neighbors, playerState) => {
            const grownNeighbors = neighbors.filter(t =>
                t?.type === 'plant' && t.grown
            ).length;
            if (grownNeighbors > 0) {
                playerState.score += grownNeighbors;
            }
        },
        placeEffect: () => { },
        description: 'Vines benefit from grown plants. (+1 point for each grown neighbor)',
    },
    {
        name: 'Fern',
        growthCost: { water: 1 },
        basePoints: 1,
        growEffect: (neighbors, playerState) => {
            const treeNeighbors = neighbors.some(t =>
                t?.type === 'plant' && t.plant.name === 'Tree'
            );
            if (treeNeighbors) {
                playerState.resources.light += 1;
            }
        },
        placeEffect: () => { },
        description: 'Ferns grow in tree shade. (+1 light resource when next to a Tree)',
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
                canGrow: true,
                canPlace: true,
                pestToPlace: 0
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
            deck.push({ id: generateId(), type: 'pest' });
        }

        return this.shuffle(deck);
    }

    // Player action
    growPlant({ playerId, x, y }: { playerId: PlayerId, x: number, y: number }): Result<boolean> {
        if (playerId !== this.state.currentPlayer) return { success: false, reason: 'Not your turn' };
        const playerState = this.state.players[playerId];
        if (!playerState || !playerState.canGrow) return { success: false, reason: 'Cannot grow this turn' };

        const tile = playerState.garden[y][x];
        if (!this.isPlantTile(tile) || tile.grown) return { success: false, reason: 'Invalid tile to grow (not plant or already grown)' };

        const cost = tile.plant.growthCost;
        if (!this.hasResources(playerId, cost)) return { success: false, reason: 'Not enough resources' };

        // Spend the player resources
        this.spendResources(playerId, cost);
        tile.grown = true;

        // Trigger the plant's grow effect
        const neighbors = this.getNeighbors(playerState.garden, x, y);
        tile.plant.growEffect(neighbors, playerState);

        this.log(`Player ${playerId} grew ${tile.plant.name} at (${x}, ${y})`);
        playerState.canGrow = false;

        return { success: true, reason: undefined };
    }

    // Player action
    placeTile({ playerId, tileIndex, x, y }: { playerId: PlayerId, tileIndex: number, x: number, y: number }): Result<boolean> {
        if (playerId !== this.state.currentPlayer) return { success: false, reason: 'Not your turn' };
        const playerState = this.state.players[playerId];
        if (!playerState || !playerState.canPlace) return { success: false, reason: 'Cannot place tile this turn' };
        if (!this.inBounds(x, y)) return { success: false, reason: 'Out of bounds' };

        // Select the tile from the draft zone
        const tile = this.state.draftZone[tileIndex];
        if (!tile) return { success: false, reason: 'Invalid tile index' };

        const existing = playerState.garden[y][x];

        if (tile.type === 'pest') {
            // Don't allow pest placement on compost or other pests
            if (existing?.type === 'pest') {
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
        this.state.draftZone.splice(tileIndex, 1);
        // trigger the plant's place effect
        tile.plant.placeEffect(playerState);

        playerState.canPlace = false;
        this.log(`Player ${playerId} placed ${tile.type} at (${x}, ${y})`);
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
        this.state.players[this.state.currentPlayer].canGrow = true;
        this.state.players[this.state.currentPlayer].canPlace = true;
        this.state.players[this.state.currentPlayer].pestToPlace = 0;

        // Draw a new tile and while we draw pest tiles, count them
        let newCard = this.drawTile();
        while (newCard?.type === 'pest') {
            // Increase pest count for all players
            for (const player of Object.values(this.state.players)) {
                player.pestToPlace++;
            }
            this.log(`All players must place a pest tile this turn`);
            newCard = this.drawTile();
        }
        if (newCard) {
            this.state.draftZone.push(newCard);
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