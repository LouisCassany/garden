# 🌱 Shared Garden  
*A cozy 2-player cooperative tile-placement game about growing a thriving garden together.*

---

## 🎯 Objective

Work together to grow plants in a shared 5x5 garden grid. You win by reaching **20 garden points** before:
- The **tile deck runs out**, or  
- You suffer **3 pest infestations**.

---

## 🧩 Components

- **1 Garden Grid**: 5x5 squares (initially empty)  
- **30 Garden Tiles**, shuffled as a deck:
  - 20 Plant Tiles  
  - 5 Compost Tiles  
  - 5 Pest Tiles  
- **Resource Tokens** (shared):
  - 💧 Water (max 5)  
  - ☀️ Light (max 5)  
  - 🌾 Compost (max 5)  
- **Infestation Counter**: starts at 0, game over at 3  
- **Score Tracker**: starts at 0, win at 20  

---

## 🔁 Turn Structure

Players alternate turns. On **your turn**, do the following steps in order:

1. **Draw 1 Tile** from the deck and reveal it  
2. **Place the Tile** on an empty space on the garden grid  
   - Placement must follow tile-specific rules  
3. **Spend Resources** (optional) to grow 1 or more plants  
4. **Gain 1 Random Resource** at the end of your turn  
5. **Check for Pest Effects** (if a pest tile is present)

---

## 🪴 Tile Types

### 1. Plant Tiles  
Each plant tile has:
- A **name**  
- A **growth cost** (combination of 💧, ☀️, 🌾)  
- A **base score** when grown (1–3 points)  
- A **synergy bonus** if placed next to specific tiles  

**Example Plants:**

| Plant       | Growth Cost     | Points | Synergy Effect                            |
|-------------|-----------------|--------|--------------------------------------------|
| 🪻 Lavender  | 1💧 + 1☀️       | 2      | +1 pt if next to another Flower            |
| 🌻 Sunflower | 2☀️             | 2      | +1 pt if next to Compost                   |
| 🍄 Mushroom  | 2🌾             | 1      | Doubles score if next to a Tree            |
| 🌳 Tree      | 2💧 + 2🌾       | 3      | No synergy                                 |
| 🌼 Daisy     | 1💧 + 1☀️       | 1      | +1 pt if next to another Plant (any kind)  |

- When grown, a plant becomes permanent and scores its full value.  
- A plant must be grown before it can provide synergy to others.

---

### 2. Compost Tiles  
- Provides **1🌾** immediately (added to resource pool)  
- Can be placed anywhere  
- No scoring or synergy effect  

---

### 3. Pest Tiles  
- Can be placed on **any tile or empty space**.  
- If placed on an **ungrown Plant**, that plant is **destroyed**.  
- If a newly placed Pest is **adjacent to another Pest**, increase the **Infestation Counter** by 1.  
- Max infestation: 3 → **Game Over**  

---

## ⚙️ Resource System

- The **resource pool is shared** between players  
- Max 5 of each type (💧, ☀️, 🌾)  
- You may **spend resources** on your turn to grow any number of plants  
- Grown plants **cannot be destroyed** by pests  

---

## 🎲 Gaining Resources

At the **end of your turn**, gain **1 random resource**:

- Roll a 6-sided die (or simulate):  
  - 1–2: gain 1💧  
  - 3–4: gain 1☀️  
  - 5–6: gain 1🌾  
- If that resource is at max (5), you gain nothing that turn

---

## 🧠 Strategy Tips

- Grow plants quickly to protect them from pests  
- Place synergistic plants near each other for bonus points  
- Use Compost Tiles early to boost 🌾 supply  
- Watch the Pest tiles! Avoid placing plants in high-risk zones  

---

## ✅ Win Condition

- The players win immediately when the garden reaches **20 points**.

---

## ❌ Lose Conditions

You lose the game if **any** of the following occur:

1. The **deck is empty** and you have **fewer than 20 points**  
2. You reach **3 Pest Infestations**  
3. The garden grid is full and **no further tiles can be placed**

---

## 🛠 Optional Variants

- **Solo Mode**: Play with one player, taking both turns  
- **Advanced Plants**: Introduce rare plants with special powers  
- **Garden Events**: Add weather or animal event cards each turn

---
