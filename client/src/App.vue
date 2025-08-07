<template>
  <div class="flex flex-col w-full h-screen p-4 gap-4 px-72" v-if="state" data-theme="dark">
    <div class="flex w-full text-xl justify-center font-mono">
      Current player: <span class="font-bold"> {{ state.currentPlayer }} ({{ turnState }})</span>
    </div>
    <button class="btn btn-primary" @click="endturn" :disabled="turnState !== 'END'">End turn</button>
    <button class="btn btn-primary" @click="skipGrowPhase" :disabled="turnState !== 'GROW'">Skip grow phase</button>
    <div class="flex flex-col gap-2">
      <h1 class="text-lg">Ressources</h1>
      <div class="grid grid-cols-6 w-full border-primary border rounded-md p-2">
        <div v-for="(resource, label) in resources" :key="label" class="resource-item">
          <span class="resource-icon">{{ resource.icon }}</span>
          <transition name="number">
            <span :key="resource.value" class="resource-value">
              {{ resource.value }}
            </span>
          </transition>
        </div>
      </div>
    </div>
    <div class="flex flex-col gap-2">
      <h1 class="text-lg ">Draft zone</h1>
      <div class="grid grid-cols-5 gap-2 w-full border-primary border rounded-md p-2">
        <label v-for="tile in state.draftZone" :key="tile.id"
          class="flex flex-col items-center cursor-pointer p-2 gap-2">
          <input type="radio" name="draft" class="radio radio-secondary" v-model="selectedTile" :value="tile"
            :disabled="turnState !== 'PLACE'" />
          <TileCard :tile="tile" :canBeGrown="false" />
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
          <TileCard v-if="tile" :tile="tile" :canBeGrown="canBeGrown(tile)" />
          <div v-else>.</div>
        </div>
      </div>
    </div>

  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from "vue";
import TileCard from "./components/TileCard.vue";

import { type MultiplayerGameState, type Tile, type Grid, sendCommand, type PlantTile, type TurnState } from "../../engine.js";

const socket = new WebSocket('ws://localhost:3000/ws');
const state = ref<MultiplayerGameState | null>(null);
const selectedTile = ref<PlantTile | null>(null);

// Get current palyer name from query parameters
const urlParams = new URLSearchParams(window.location.search);
const playerId = urlParams.get('playerId') as string;

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  state.value = data.state as MultiplayerGameState;
  selectedTile.value = state.value.draftZone[0];
};

function flattenGarden(garden: Grid): (Tile | null)[] {
  if (!garden) return [];
  return garden.flat();
}

async function placeTile(x: number, y: number) {
  if (!selectedTile.value) return;
  if (!state.value) return;
  const tileIndex = state.value.draftZone.indexOf(selectedTile.value)

  const res = await sendCommand("placePlantTile", { playerId, tileIndex, x, y }).catch((err) => {
    console.error("Error sending command:", err);
  });

  if (res && res.success) {
    console.log("Tile placed successfully");
  } else {
    console.error("Failed to place tile:", res);
  }
}

async function endturn() {
  const res = await sendCommand("nextTurn", { playerId }).catch((err) => {
    console.error("Error sending command:", err);
  });

  if (res && res.success) {
    console.log("Turn ended successfully");
  } else {
    console.error("Failed to end turn:", res);
  }
}

function canBeGrown(tile: Tile): boolean {
  if (!state.value) return false;
  if (turnState.value !== 'GROW') return false;
  if (!tile || tile.type !== 'plant') return false;
  const ressourcesNeeded = tile.plant.growthCost;
  if (ressourcesNeeded.water !== undefined && state.value.players[playerId].resources.water < ressourcesNeeded.water) return false;
  if (ressourcesNeeded.light !== undefined && state.value.players[playerId].resources.light < ressourcesNeeded.light) return false;
  if (ressourcesNeeded.compost !== undefined && state.value.players[playerId].resources.compost < ressourcesNeeded.compost) return false;
  return true;
}

async function skipGrowPhase() {
  const res = await sendCommand("skipGrowPhase", { playerId }).catch((err) => {
    console.error("Error sending command:", err);
  });

  if (res && res.success) {
    console.log("Skipped grow phase successfully");
  } else {
    console.error("Failed to skip grow phase:", res);
  }
}

const turnState = computed(() => {
  if (!state.value) return null;
  return state.value.players[playerId].turnState;
});

// Add this computed property
const resources = computed(() => ({
  score: {
    icon: '⭐️',
    value: state.value?.players[playerId].score
  },
  water: {
    icon: '💧',
    value: state.value?.players[playerId].resources.water
  },
  light: {
    icon: '☀️',
    value: state.value?.players[playerId].resources.light
  },
  compost: {
    icon: '🌾',
    value: state.value?.players[playerId].resources.compost
  },
  pest: {
    icon: '🐀',
    value: state.value?.players[playerId].pestToPlace
  },
  infestation: {
    icon: '💣',
    value: state.value?.players[playerId].infestation
  },
}));
</script>

<style scoped>
.resource-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  width: 4rem;
}

.resource-icon {
  font-size: 1.2rem;
}

.resource-value {
  position: absolute;
  left: 2rem;
  min-width: 2rem;
  text-align: left;
  font-weight: 600;
}

.number-enter-active {
  animation: bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.number-leave-active {
  animation: bounce-out 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes bounce-in {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }

  50% {
    transform: scale(2.5);
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes bounce-out {
  0% {
    transform: scale(1);
    opacity: 1;
  }

  100% {
    transform: scale(0.3);
    opacity: 0;
  }
}
</style>