// Types
type Resource = 'water' | 'light' | 'compost';
type TileType = 'plant' | 'compost' | 'pest';
type PlantName = 'Lavender' | 'Sunflower' | 'Mushroom' | 'Tree' | 'Daisy';

interface PlantData {
    name: PlantName;
    growthCost: Partial<Record<Resource, number>>;
    basePoints: number;
    synergy: (neighbors: Tile[]) => number;
}

interface TileBase {
    id: string;
    type: TileType;
    grown?: boolean;
}

export interface PlantTile extends TileBase {
    type: 'plant';
    plant: PlantData;
    pointsGenerated?: number; // Track points this tile contributed
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
const WIN_SCORE = 20;

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

// Game Engine
export class SharedGardenGame {
    state: GameState;

    constructor(seedDeck?: Tile[]) {
        this.state = {
            grid: Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null)),
            deck: seedDeck ?? this.generateDeck(),
            discardPile: [],
            resources: { water: 0, light: 0, compost: 0 },
            infestation: 0,
            score: 0,
            turn: 1,
            log: [],
        };
    }

    generateDeck(): Tile[] {
        const deck: Tile[] = [];

        // Add plants
        for (let i = 0; i < 4; i++) {
            for (const plant of plantLibrary) {
                deck.push({
                    id: generateId(),
                    type: 'plant',
                    plant,
                });
            }
        }

        // Add compost
        for (let i = 0; i < 5; i++) {
            deck.push({ id: generateId(), type: 'compost' });
        }

        // Add pests
        for (let i = 0; i < 5; i++) {
            deck.push({ id: generateId(), type: 'pest' });
        }

        return this.shuffle(deck);
    }

    shuffle<T>(array: T[]): T[] {
        return array.sort(() => Math.random() - 0.5);
    }

    drawTile(): Tile | null {
        const tile = this.state.deck.pop() ?? null;
        if (tile) this.log(`Drew tile: ${tile.type === 'plant' ? tile.plant.name : tile.type}`);
        return tile;
    }

    placeTile(tile: Tile, x: number, y: number): boolean {
        if (!this.inBounds(x, y)) return false;

        const existing = this.state.grid[y][x];

        if (tile.type === 'pest') {
            // Handle point loss if replacing a grown plant
            if (this.isPlantTile(existing) && existing.grown && existing.pointsGenerated) {
                this.state.score -= existing.pointsGenerated;
                this.log(`Pest destroyed grown ${existing.plant.name} at (${x}, ${y}) - lost ${existing.pointsGenerated} points`);
            } else if (this.isPlantTile(existing) && !existing.grown) {
                this.log(`Pest destroyed ungrown ${existing.plant.name} at (${x}, ${y})`);
            } else {
                this.log(`Pest placed at (${x}, ${y})`);
            }

            // Place pest regardless of target
            this.state.grid[y][x] = tile;
            this.checkInfestation(x, y);
            return true;
        }

        // Compost or Plant placement — only if empty
        if (existing) return false;

        this.state.grid[y][x] = tile;
        this.log(`Placed ${tile.type} at (${x}, ${y})`);

        if (tile.type === 'compost') {
            this.gainResource('compost', 1);
        }

        return true;
    }


    private isPlantTile(tile: Tile | null): tile is PlantTile {
        return tile !== null && tile.type === 'plant';
    }

    growPlant(x: number, y: number): boolean {
        const tile = this.state.grid[y][x];
        if (!tile || tile.type !== 'plant' || tile.grown) return false;

        const cost = tile.plant.growthCost;
        if (!this.hasResources(cost)) return false;

        this.spendResources(cost);
        tile.grown = true;

        // Base score + synergy
        const neighbors = this.getNeighbors(x, y);
        const bonus = tile.plant.synergy(neighbors);
        const points = tile.plant.basePoints + bonus;

        // Track points for this tile
        tile.pointsGenerated = points;

        this.state.score += points;
        this.log(`Grew ${tile.plant.name} at (${x}, ${y}) for ${points} points`);

        return true;
    }

    getNeighbors(x: number, y: number): Tile[] {
        const dirs = [
            [0, -1], [0, 1],
            [-1, 0], [1, 0],
        ];
        return dirs
            .map(([dx, dy]) => this.inBounds(x + dx, y + dy) ? this.state.grid[y + dy][x + dx] : null)
            .filter(Boolean) as Tile[];
    }

    gainRandomResource(): void {
        const resources: Resource[] = ['water', 'light', 'compost'];
        const rand = Math.floor(Math.random() * 3);
        const type = resources[rand];
        this.gainResource(type, 1);
    }

    gainResource(type: Resource, amount: number) {
        this.state.resources[type] = Math.min(MAX_RESOURCES, this.state.resources[type] + amount);
        this.log(`Gained ${amount} ${type}`);
    }

    hasResources(cost: Partial<Record<Resource, number>>): boolean {
        return Object.entries(cost).every(([key, val]) =>
            this.state.resources[key as Resource] >= (val ?? 0),
        );
    }

    spendResources(cost: Partial<Record<Resource, number>>) {
        for (const [res, amount] of Object.entries(cost)) {
            this.state.resources[res as Resource] -= amount!;
        }
    }

    checkInfestation(x: number, y: number) {
        const neighbors = this.getNeighbors(x, y);
        const pestNeighbors = neighbors.filter(t => t?.type === 'pest').length;
        if (pestNeighbors >= 1) {
            this.state.infestation += 1;
            this.log(`Infestation! Total: ${this.state.infestation}`);
        }
    }

    inBounds(x: number, y: number): boolean {
        return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
    }

    isGameOver(): boolean {
        if (this.state.infestation >= MAX_INFESTATIONS) return true;
        if (this.state.deck.length === 0 && this.state.score < WIN_SCORE) return true;
        const full = this.state.grid.every(row => row.every(cell => cell !== null));
        return full;
    }

    isVictory(): boolean {
        return this.state.score >= WIN_SCORE;
    }

    log(entry: string) {
        this.state.log.push(`[Turn ${this.state.turn}] ${entry}`);
    }

    endTurn() {
        this.state.turn++;
    }

    serialize(): string {
        return JSON.stringify(this.state);
    }

    static deserialize(data: string): SharedGardenGame {
        const game = new SharedGardenGame();
        game.state = JSON.parse(data);
        return game;
    }
}