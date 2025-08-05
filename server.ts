import express from 'npm:express';
import { MultiplayerGardenGame, Tile } from './engine.ts';

const app = express();
app.use(express.json());

const GAME_SETTINGS = {
    GRID_SIZE: 5,
    MAX_RESOURCES: 5,
    MAX_INFESTATIONS: 3,
    DRAFT_SIZE: 4
};

let game: MultiplayerGardenGame | null = null;

app.post('/game/new', (req: express.Request, res: express.Response) => {
    const { playerIds } = req.body;
    if (!Array.isArray(playerIds) || playerIds.length < 2) {
        return res.status(400).json({ error: 'Need at least 2 player IDs' });
    }
    game = new MultiplayerGardenGame(playerIds, GAME_SETTINGS);
    res.json({ message: 'Game created', state: game.state });
});

app.post('/game/pick', (req: express.Request, res: express.Response) => {
    const { playerId, tileIndex } = req.body;
    if (!game) return res.status(400).json({ error: 'No game in progress' });

    const { success: tile, reason } = game.pickFromDraft(playerId, tileIndex);
    if (!tile) return res.status(400).json({ error: reason });

    res.json({ tile, state: game.state });
});

app.post('/game/place', (req: express.Request, res: express.Response) => {
    const { playerId, tile, x, y } = req.body;
    if (!game) return res.status(400).json({ error: 'No game in progress' });

    const { success, reason } = game.placeTile(playerId, tile as Tile, x, y);
    if (!success) return res.status(400).json({ error: reason });

    res.json({ success, state: game.state });
});

app.post('/game/grow', (req: express.Request, res: express.Response) => {
    const { playerId, x, y } = req.body;
    if (!game) return res.status(400).json({ error: 'No game in progress' });

    const { success, reason } = game.growPlant(playerId, x, y);
    if (!success) return res.status(400).json({ error: reason });

    res.json({ success, state: game.state });
});

app.post('/game/next-turn', (_req: express.Request, res: express.Response) => {
    if (!game) return res.status(400).json({ error: 'No game in progress' });

    game.nextTurn();
    if (game.isGameOver()) {
        const winner = game.getWinner();
        return res.json({ gameOver: true, winner, state: game.state });
    }

    res.json({ state: game.state });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));