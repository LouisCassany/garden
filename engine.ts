type Resource = 'water' | 'light' | 'compost';
type PlantName = 'Lavender' | 'Sunflower' | 'Mushroom' | 'Tree' | 'Daisy' | 'Compost' | 'Pond' | 'Cactus' | 'Bamboo' | 'Vine' | 'Fern';
export type TurnState = 'PLACE' | 'GROW' | 'PEST' | 'END' | 'DONE';
type Result<T> = { success: T, reason?: string };

export type PlayerId = string;

export interface PlayerState {
    id: PlayerId;
    garden: Grid;
    score: number;
    resources: Record<Resource, number>;
    infestation: number;
    turnState: TurnState
    pestToPlace: number;
}

export interface MultiplayerGameState {
    players: Record<PlayerId, PlayerState>;
    deck: Tile[];
    draftZone: PlantTile[];
    currentTurn: number;
    currentPlayer: PlayerId;
    log: string[];
}

interface PlantData {
    name: PlantName;
    growthCost: Partial<Record<Resource, number>>;
    basePoints: number;
    placeEffect: (playerState: PlayerState) => void;
    growEffect: (neighbors: (Tile | null)[], playerState: PlayerState) => void;
    effect: string
    description: string;
    isPlant: boolean;
}

export interface PlantTile {
    id: string;
    type: 'plant';
    plant: PlantData;
    grown: boolean;
}

interface PestTile {
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
    placePlantTile: {
        args: Parameters<MultiplayerGardenGame["placePlantTile"]>;
        return: ReturnType<MultiplayerGardenGame["placePlantTile"]>;
    };
    nextTurn: {
        args: Parameters<MultiplayerGardenGame["nextTurn"]>;
        return: ReturnType<MultiplayerGardenGame["nextTurn"]>;
    };
    skipGrowPhase: {
        args: Parameters<MultiplayerGardenGame["skipGrowPhase"]>;
        return: ReturnType<MultiplayerGardenGame["skipGrowPhase"]>;
    };
    placePestTile: {
        args: Parameters<MultiplayerGardenGame["placePestTile"]>;
        return: ReturnType<MultiplayerGardenGame["placePestTile"]>;
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
    const res = await fetch("http://192.168.1.33:3000/cmd", {
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
            const neighborsCount = neighbors.filter(t => t?.type === 'plant' && t.plant.name !== 'Lavender' && t.plant.isPlant).length;
            if (neighborsCount > 0) {
                playerState.score += neighborsCount;
            }
        },
        placeEffect: () => { },
        description: 'Lavender thrives near other plants, but not near Lavender itself.',
        effect: '+1 point for each different plant neighbor',
        isPlant: true,
    },
    {
        name: 'Sunflower',
        growthCost: { light: 2 },
        basePoints: 2,
        growEffect: (neighbors, playerState) => {
            const neighborsCount = neighbors.some(t => t?.type === 'plant' && t.plant.name === 'Compost') ? 1 : 0;
            if (neighborsCount > 0) {
                playerState.resources.compost += 1;
            }
        },
        placeEffect: () => { },
        description: 'Sunflower loves compost.',
        effect: '+1 point for each compost neighbor',
        isPlant: true,
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
        effect: '+1 point for each Tree neighbor',
        description: 'Mushrooms grow well near trees.',
        isPlant: true,
    },
    {
        name: 'Tree',
        growthCost: {},
        basePoints: 3,
        placeEffect: () => { },
        growEffect: () => { },
        description: 'Trees are strong but require more resources.',
        effect: "",
        isPlant: true,
    },
    {
        name: 'Daisy',
        growthCost: { water: 1, light: 1 },
        basePoints: 1,
        growEffect: (neighbors, playerState) => {
            const neighborsCount = neighbors.some(t => t?.type === 'plant' && t.plant.isPlant) ? 1 : 0;
            if (neighborsCount > 0) {
                playerState.score += neighborsCount;
            }
        },
        placeEffect: () => { },
        description: 'Daisies love being around other plants.',
        effect: '+1 point for each plant neighbor',
        isPlant: true,
    },
    {
        name: 'Compost',
        growthCost: {},
        basePoints: 0,
        growEffect: () => { },
        placeEffect: (playerState) => {
            playerState.resources.compost += 1;
        },
        description: 'Compost is a nutritious resource that can be used to grow plants.',
        effect: '+1 compost resource',
        isPlant: false,
    },
    {
        name: 'Pond',
        growthCost: {},
        basePoints: 0,
        growEffect: () => { },
        placeEffect: (playerState) => {
            playerState.resources.water += 2;
        },
        description: 'Ponds are a source of water.',
        effect: '+2 water resources',
        isPlant: false,
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
        description: 'Cactus thrives in isolation.',
        effect: '+1 point for each empty adjacent space',
        isPlant: true,
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
        description: 'Bamboo grows in clusters.',
        effect: '+2 points for each adjacent Bamboo',
        isPlant: true,
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
        description: 'Vines benefit from grown plants.',
        effect: '+1 point for each grown neighbor',
        isPlant: true,
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
        description: 'Ferns grow in tree shade. ',
        effect: "+1 light resource when next to a Tree",
        isPlant: true,
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
                resources: { water: 1, light: 1, compost: 1 },
                infestation: 0,
                turnState: 'PLACE',
                pestToPlace: 0,
            };
        }

        this.state = {
            players,
            deck: this.generateDeck(playerIds.length),
            draftZone: [],
            currentTurn: 1,
            currentPlayer: playerIds[0],
            log: [],
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
        for (let i = 0; i < 3 * playerCount; i++) {
            for (const plant of plantLibrary) {
                deck.push({
                    id: generateId(),
                    type: 'plant',
                    plant,
                    grown: false,
                });
            }
        }

        for (let i = 0; i < 34 * playerCount; i++) {
            deck.push({ type: 'pest' });
        }

        return this.shuffle(deck);
    }

    // Player action
    growPlant({ playerId, x, y }: { playerId: PlayerId, x: number, y: number }): Result<boolean> {
        if (playerId !== this.state.currentPlayer) return { success: false, reason: 'Not your turn' };
        const playerState = this.state.players[playerId];
        if (!playerState || playerState.turnState !== 'GROW') return { success: false, reason: 'Cannot grow this turn' };

        const tile = playerState.garden[y][x];
        if (!this.isPlantTile(tile) || tile.grown) return { success: false, reason: 'Invalid tile to grow (not plant or already grown)' };

        // if the plant have no growth cost, it can't be grown
        const resourcesNeeded = tile.plant.growthCost;
        if (!resourcesNeeded || Object.keys(resourcesNeeded).length === 0) return { success: false, reason: 'Invalid tile to grow (no growth cost)' };

        const cost = tile.plant.growthCost;
        if (!this.hasResources(playerId, cost)) return { success: false, reason: 'Not enough resources' };

        // Spend the player resources
        this.spendResources(playerId, cost);
        tile.grown = true;

        // Trigger the plant's grow effect
        const neighbors = this.getNeighbors(playerState.garden, x, y);
        tile.plant.growEffect(neighbors, playerState);

        this.log(`Player ${playerId} grew ${tile.plant.name} at (${x}, ${y})`);
        this.nextTurnPhase(playerId);

        return { success: true, reason: undefined };
    }

    // Player action
    placePlantTile({ playerId, tileIndex, x, y }: { playerId: PlayerId, tileIndex: number, x: number, y: number }): Result<boolean> {
        if (playerId !== this.state.currentPlayer) return { success: false, reason: 'Not your turn' };
        const playerState = this.state.players[playerId];
        if (!playerState || playerState.turnState !== 'PLACE') return { success: false, reason: 'Cannot place tile this turn' };
        if (!this.inBounds(x, y)) return { success: false, reason: 'Out of bounds' };

        // Select the tile from the draft zone
        const tile = this.state.draftZone[tileIndex];
        if (!tile) return { success: false, reason: 'Invalid tile index' };

        const existing = playerState.garden[y][x];
        if (existing) return { success: false, reason: 'Tile already exists at this position' };

        playerState.garden[y][x] = tile;
        this.state.draftZone.splice(tileIndex, 1);

        // trigger the plant's place effect
        tile.plant.placeEffect(playerState);
        playerState.score += tile.plant.basePoints;
        this.nextTurnPhase(playerId);

        this.log(`Player ${playerId} placed ${tile.type} at (${x}, ${y})`);
        return { success: true, reason: undefined };
    }

    // Player action
    placePestTile({ playerId, x, y, tile }: { playerId: PlayerId, x: number, y: number, tile: PestTile }): Result<boolean> {
        if (playerId !== this.state.currentPlayer) return { success: false, reason: 'Not your turn' };
        const playerState = this.state.players[playerId];
        if (!playerState || playerState.turnState !== 'PEST') return { success: false, reason: 'Cannot place pest this turn' };

        if (!this.inBounds(x, y)) return { success: false, reason: 'Out of bounds' };

        const existing = playerState.garden[y][x];

        if (existing?.type === 'pest') {
            this.log(`Player ${playerId}: Cannot place pest on ${existing.type} at (${x}, ${y})`);
            return { success: false, reason: 'Cannot place pest on other pests' };
        }

        // If placing on a plant, reduce score by plant's base points
        if (existing) {
            playerState.score -= existing.plant.basePoints;
            this.log(`Player ${playerId}: Pest destroyed ${existing.grown ? 'grown' : 'ungrown'} ${existing.plant.name} at (${x}, ${y}), lost ${existing.plant.basePoints} points`);
        } else {
            this.log(`Player ${playerId}: Placed pest at empty space (${x}, ${y})`);
        }

        // Place pest and check for infestation
        playerState.garden[y][x] = tile;
        this.checkInfestation(playerId, x, y);
        // Decrease pest count
        playerState.pestToPlace--;
        this.nextTurnPhase(playerId);

        return { success: true, reason: undefined };
    }

    // Player action
    skipGrowPhase({ playerId }: { playerId: PlayerId }): Result<boolean> {
        if (playerId !== this.state.currentPlayer) return { success: false, reason: 'Not your turn' };
        const playerState = this.state.players[playerId];
        if (!playerState || playerState.turnState !== 'GROW') return { success: false, reason: 'Cannot skip grow phase this turn' };

        this.nextTurnPhase(playerId);
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

    private nextTurnPhase(playerId: PlayerId): void {
        const playerState = this.state.players[playerId];
        if (!playerState) return;
        if (playerState.turnState === 'PLACE') playerState.turnState = 'GROW';
        else if (playerState.turnState === 'GROW' && playerState.pestToPlace > 0) playerState.turnState = 'PEST';
        else if (playerState.turnState === 'GROW' && playerState.pestToPlace === 0) playerState.turnState = 'END';
        else if (playerState.turnState === 'PEST' && playerState.pestToPlace === 0) playerState.turnState = 'END';
        else if (playerState.turnState === 'END') {
            if (this.isPlayerDonePlaying(playerId)) playerState.turnState = 'DONE';
            else playerState.turnState = 'PLACE';
        }
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

    private getNeighbors(garden: Grid, x: number, y: number): (Tile | null)[] {
        const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        return dirs.map(([dx, dy]) => this.inBounds(x + dx, y + dy) ? garden[y + dy][x + dx] : null);
    }

    nextTurn({ playerId }: { playerId: PlayerId }): Result<boolean> {
        if (playerId !== this.state.currentPlayer || this.state.players[playerId].turnState !== 'END') return { success: false, reason: 'Not your turn' };

        const playerIds = Object.keys(this.state.players);
        const currentIndex = playerIds.indexOf(playerId);
        const nextIndex = (currentIndex + 1) % playerIds.length;

        if (nextIndex === 0) {
            this.state.currentTurn++;
        }

        // Set the next player as current
        this.state.currentPlayer = playerIds[nextIndex];

        // Draw a new tile and while we draw pest tiles, count them
        let newCard = this.drawTile();
        while (newCard?.type === 'pest') {
            // Increase pest count for all players
            for (const player of Object.values(this.state.players)) {
                player.pestToPlace++;
            }
            this.log(`All players gained a pest to place at the end of their turn`);
            newCard = this.drawTile();
        }
        if (newCard) {
            this.state.draftZone.push(newCard);
        }
        this.nextTurnPhase(playerId);
        this.gainRandomResource(playerId);
        this.gainRandomResource(playerId);
        return { success: true };
    }

    isPlayerDonePlaying(playerId: PlayerId): boolean {
        const playerState = this.state.players[playerId];
        if (!playerState) return false;
        // game ends if the player have a full garden or they hit the max infestation
        return playerState.garden.every(row => row.every(cell => cell !== null)) || playerState.infestation >= this.settings.MAX_INFESTATIONS;
    }


    getWinner(): PlayerId | null {
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

    private gainRandomResource(playerId: PlayerId) {
        const resources: Resource[] = ['water', 'light', 'compost'];
        const randomIndex = Math.floor(Math.random() * resources.length);
        const randomResource = resources[randomIndex];
        this.gainResource(playerId, randomResource, 1);
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