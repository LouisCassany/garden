# 🌱 Garden Game Rules
*A competitive tile-placement game for 2+ players about cultivating the most valuable garden.*

---

## 🎯 Objective

Compete against other players to achieve the highest score by strategically growing a personal garden. The game ends when the deck runs out, a player's garden is full, or a player reaches the maximum infestation limit. The player with the highest score wins.

---

## 🧩 Components

- **Player Boards**: Each player has their own personal garden grid (e.g., 5x5).
- **Garden Tiles**: A shared deck of tiles, with quantities scaling based on the number of players.
  - **Plant Tiles**: Various plants with different costs, points, and synergies.
  - **Compost Tiles**
  - **Pest Tiles**
- **Draft Zone**: A public area where tiles are drawn to be picked by players.

---

## Player State

Each player individually tracks:
- **Garden Grid**: Your personal 5x5 board.
- **Score**: Your current point total.
- **Resources**: Your private pool of 💧 Water, ☀️ Light, and 🌾 Compost.
- **Infestation Level**: Your personal count of pest infestations.

---

## 🔁 Turn Structure

Players take turns in a clockwise order. On your turn, you may perform **each of the following actions once**:

1.  **Pick a Tile**: Choose one tile from the public **Draft Zone**.
2.  **Place a Tile**: Place a tile from your hand onto an empty space in your garden.
3.  **Grow a Plant**: Spend resources to grow a plant already on your grid to score points.

After you have completed your actions, your turn ends. The turn passes to the next player, and the Draft Zone is replenished from the deck.

### Replenishing the Draft Zone
At the end of a turn, a new tile is drawn from the deck to refill the Draft Zone. If the drawn tile is a **Pest**, a "Pest Alert" is triggered:
- Every player receives a `pestToPlace` token, forcing them to place a Pest tile on a future turn.
- Another tile is drawn until a non-Pest tile is found to add to the Draft Zone.

---

## 🪴 Tile Types & Actions

### 1. Plant Tiles
Each plant has a name, growth cost, base point value, and a special synergy.

| Plant | Growth Cost | Points | Synergy Effect |
|---|---|---|---|
| 🪻 Lavender | 1💧 + 1☀️ | 2 | +1 pt for each adjacent plant of a *different* type. |
| 🌻 Sunflower | 2☀️ | 2 | +1 pt if next to any Compost tile. |
| 🍄 Mushroom | 2🌾 | 1 | +1 pt if next to a Tree. |
| 🌳 Tree | 2💧 + 2🌾 | 3 | No synergy. |
| 🌼 Daisy | 1💧 + 1☀️ | 1 | +1 pt if next to any other plant. |

- **Placing a Plant**: Must be on an empty square. It is initially "ungrown."
- **Growing a Plant**: Pay its resource cost. The plant is now "grown," and you immediately score its base points plus any synergy bonuses from adjacent tiles.

### 2. Compost Tiles
- **Placing a Compost Tile**: Must be on an empty square. When placed, you immediately gain **1🌾 resource**.

### 3. Pest Tiles
- **Placing a Pest Tile**:
  - Cannot be placed on a Compost or another Pest tile.
  - If placed on a **Plant tile** (whether grown or ungrown), the plant is destroyed, and you **lose that plant's base points** from your score.
  - If placed on an empty square, it has no effect on your score.
- **Infestation**: If a newly placed Pest is adjacent (not diagonally) to another Pest on your board, your personal **Infestation Counter increases by 1**.

---

## ✅ Game End

The game ends for all players immediately when **any** of the following conditions are met:
1.  The shared **tile deck runs out**.
2.  A player reaches the **maximum infestation limit**.
3.  A player's **garden grid is completely full**.

---

## 🏆 Winning the Game

Once the game ends, the player with the **highest score** is declared the winner.