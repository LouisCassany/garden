<template>
  <div class="flex flex-col w-full h-screen p-4 gap-4 px-72" v-if="state" data-theme="dark">
    <div class="flex w-full text-xl justify-center font-mono">
      Current player: <span class="font-bold"> {{ state.currentPlayer }}</span>
    </div>
    <div class="flex flex-col gap-2">
      <h1 class="text-lg ">Ressources</h1>
      <div class="grid grid-cols-6 w-full border-primary border rounded-md p-2">
        <span>⭐️: {{ state.players[playerId].score }}</span>
        <span>💧: {{ state.players[playerId].resources.water }}</span>
        <span>☀️: {{ state.players[playerId].resources.light }}</span>
        <span>🌾: {{ state.players[playerId].resources.compost }}</span>
        <span>🐀: {{ state.players[playerId].pestToPlace }}</span>
        <span>💣: {{ state.players[playerId].infestation }}</span>
      </div>
    </div>
    <div class="flex flex-col gap-2">
      <h1 class="text-lg ">Draft zone</h1>
      <div class="grid grid-cols-5 gap-2 w-full border-primary border rounded-md p-2">
        <label v-for="tile in state.draftZone" :key="tile.id"
          class="flex flex-col items-center cursor-pointer p-2 gap-2">
          <input type="radio" name="draft" class="radio radio-secondary" v-model="selectedTile" :value="tile"
            :disabled="playerId !== state.currentPlayer" />
          <TileCard :tile="tile" />
        </label>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <h1 class="text-lg ">Garden</h1>
      <div class="grid grid-cols-5 gap-2 w-full border-primary border rounded-md p-2">
        <div
          class="aspect-square flex items-center justify-center border border-secondary rounded-md hover:bg-secondary/20 cursor-pointer"
          v-for="(tile, index) in flattenGarden(state.players[playerId].garden)"
          @click="placeTile(index % 5, Math.floor(index / 5))">
          <TileCard v-if="tile" :tile="tile" />
          <div v-else>.</div>
        </div>
      </div>
    </div>

    <button class="btn btn-primary" @click="endturn">End turn</button>
  </div>
</template>

<script lang=ts setup>
import { ref } from "vue";
import TileCard from "./components/TileCard.vue";

import { type MultiplayerGameState, type Tile, type Grid, sendCommand, type PlantTile } from "../../engine.js";

const socket = new WebSocket('ws://localhost:3000/ws');
const state = ref<MultiplayerGameState | null>(null);
const selectedTile = ref<Tile | null>(null);

// Get current palyer name from query parameters
const urlParams = new URLSearchParams(window.location.search);
const playerId = urlParams.get('playerId') as string;

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  state.value = data.state as MultiplayerGameState;
  selectedTile.value = state.value.draftZone[0];
};

function tileName(tile: Tile) {
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

  const res = await sendCommand("placeTile", { playerId, tileIndex, x, y }).catch((err) => {
    console.error("Error sending command:", err);
  });

  if (res && res.success) {
    console.log("Tile placed successfully");
  } else {
    console.error("Failed to place tile:", res);
  }
}

async function endturn() {
  const res = await sendCommand("nextTurn", undefined).catch((err) => {
    console.error("Error sending command:", err);
  });
  if (res) console.log("End game triggered");
}
</script>