<template>
  <div class="flew w-full h-screen p-4" v-if="state" data-theme="dark">
    Current player: {{ state.currentPlayer }}
    <div class="flex flex-col gap-2">
      <h1 class="text-lg ">Draft zone</h1>
      <div class="grid grid-rows-4 gap-2 w-full border-primary border rounded-md p-2">
        <label v-for="tile in state.draftZone" :key="tile.id"
          class="flex items-center border border-secondary rounded-md cursor-pointer p-2 gap-2">
          <input type="radio" name="draft" class="radio radio-secondary" v-model="pickedTile" :value="tile" />
          {{ tileName(tile) }}
        </label>
      </div>
      <button class="btn btn-primary" @click="pickTile">Pick the tile</button>
    </div>
  </div>
</template>

<script lang=ts setup>
import { ref } from "vue";
import { type MultiplayerGameState, type Tile } from "../../engine.ts";

const socket = new WebSocket('ws://localhost:3000/ws');
const state = ref<MultiplayerGameState | null>(null);
const pickedTile = ref<Tile | null>(null);

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  state.value = data.state as MultiplayerGameState;
  pickedTile.value = state.value.draftZone[0];
};

function tileName(tile: Tile) {
  if (tile.type === "compost") return "Compost";
  if (tile.type === "pest") return "Pest";
  if (tile.type === "plant") return tile.plant.name
}

async function pickTile() {
  // Post request to server
  const response = await fetch('http://localhost:3000/game/pick', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ playerId: "louis", tileIndex: state.value?.draftZone.indexOf(pickedTile.value) })
  })

  if (!response.ok) {
    const body = await response.json();
    console.log("Error picking tile:", body.error);
  }
}
</script>