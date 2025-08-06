<template>
  <div class="flew w-full h-screen p-4" v-if="state" data-theme="dark">
    Current player: {{ state.currentPlayer }}
    <div class="flex flex-col gap-2">
      <h1 class="text-lg ">Draft zone</h1>
      <div class="grid grid-rows-4 gap-2 w-full border-primary border rounded-md p-2">
        <label v-for="tile in state.draftZone" :key="tile.id"
          class="flex items-center border border-secondary rounded-md cursor-pointer p-2 gap-2">
          <input type="radio" name="draft" class="radio radio-secondary" v-model="selectedTile" :value="tile" />
          {{ tileName(tile) }}
        </label>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <h1 class="text-lg ">Garden</h1>
      <div class="grid grid-cols-5 gap-2 w-full border-primary border rounded-md p-2">
        <div
          class="aspect-square w-full h-full flex items-center justify-center border border-secondary rounded-md hover:bg-secondary/20 cursor-pointer"
          v-for="(tile, index) in flattenGarden(state.players[state.currentPlayer].garden)"
          @click="placeTile(index % 5, Math.floor(index / 5))">
          {{ tile ? tileName(tile) : "." }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang=ts setup>
import { ref } from "vue";
import { type MultiplayerGameState, type Tile, type Grid } from "../../engine.ts";

const socket = new WebSocket('ws://localhost:3000/ws');
const state = ref<MultiplayerGameState | null>(null);
const selectedTile = ref<Tile | null>(null);

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  state.value = data.state as MultiplayerGameState;
  selectedTile.value = state.value.draftZone[0];
};

function tileName(tile: Tile) {
  if (tile.type === "compost") return "Compost";
  if (tile.type === "pest") return "Pest";
  if (tile.type === "plant") return tile.plant.name
}

function flattenGarden(garden: Grid): (Tile | null)[] {
  if (!garden) return [];
  return garden.flat();
}

async function placeTile(x: number, y: number) {
  if (!selectedTile.value) return;
  if (!state.value) return;
  const tileIndex = state.value.draftZone.indexOf(selectedTile.value)

  // Post request to server
  const response = await fetch('http://localhost:3000/game/place', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ playerId: "louis", x, y, tileIndex: tileIndex })
  })

  if (!response.ok) {
    const body = await response.json();
    console.log("Error placing tile:", body.error);
  }
}
</script>