<template>
  <div class="flex flex-col w-full gap-2 p-4" v-if="state" data-theme="dark">

    <div class="flex flex-col w-full gap-2">
      <div class="flex w-full text-xl justify-center font-mono">
        Current player: <span class="font-bold"> {{ state.currentPlayer }} ({{ turnState }})</span>
      </div>
      <button class="btn btn-primary" @click="skipGrowPhase" :disabled="turnState !== 'GROW'">Skip grow phase</button>
      <button class="btn btn-primary" @click="endturn" :disabled="turnState !== 'END'">End turn</button>
      <div class="flex flex-col gap-2 border-primary border rounded-md p-2">
        <h1 class="text-lg">Ressources</h1>
        <div class="grid grid-cols-6 w-full">
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
    </div>

    <div class="flex flex-col gap-2 w-full border-primary border rounded-md p-2 ">
      <h1 class="text-lg">Draft zone</h1>
      <div class="flex gap-2 w-full  h-full overflow-y-auto pb-2">
        <label v-for="tile in state.draftZone" :key="tile.id" class="flex flex-col items-center cursor-pointer gap-2">
          <input type="radio" name="draft" class="radio radio-secondary" v-model="selectedTile" :value="tile"
            :disabled="turnState !== 'PLACE'" />
          <TileCard :tile="tile" :canBeGrown="false" />
        </label>
      </div>
    </div>

    <div class="flex flex-col gap-2 w-full h-full border-primary border rounded-md p-2">
      <h1 class="text-lg ">Garden</h1>
      <div class="grid grid-cols-5 gap-2 w-full">
        <template v-for="(tile, index) in flattenGarden(state.players[playerId].garden)">
          <!-- <TileCard v-if="tile" :tile="tile" :canBeGrown="canBeGrown(tile)" :compact="true"
            @click="growTile(index % 5, Math.floor(index / 5))" /> -->
          <TileCard v-if="tile" :tile="tile" :canBeGrown="canBeGrown(tile)" :compact="true"
            @click="openModal(tile, index)" />
          <div class="aspect-square justify-center items-center flex border border-secondary rounded-md cursor-pointer"
            @click="placeTile(index % 5, Math.floor(index / 5))" v-else></div>
        </template>
      </div>
    </div>

    <dialog id="my_modal_2" class="modal modal-bottom">
      <div class="modal-box">
        <div v-if="modalTile?.type === 'plant'" class=" flex flex-col gap-2 w-full">
          <div class="flex w-full justify-between">
            <h3 class="text-lg font-bold">{{ modalTile?.plant.name }}</h3>
            <span>⭐️{{ modalTile?.plant.basePoints }}</span>
          </div>
          <div class="flex gap-4 w-full">
            <img :src="`/${modalTile?.plant.name}.jpeg`" class="h-24 rounded-md" />
            <div class="flex flex-col gap-1 w-full">
              <p class="flex justify-between">
                <span>💧{{ modalTile?.plant.growthCost.water ?? 0 }}</span>
                <span>☀️{{ modalTile?.plant.growthCost.light ?? 0 }}</span>
                <span>🌾{{ modalTile?.plant.growthCost.compost ?? 0 }}</span>
              </p>
              <div>
                {{ modalTile?.plant.effect }}
              </div>
              <button class="btn btn-sm btn-primary" :disabled="!canBeGrown(modalTile)"
                @click="growTile(modalTileIndex! % 5, Math.floor(modalTileIndex! / 5))">Grow</button>
            </div>
          </div>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from "vue";
import TileCard from "./components/TileCard.vue";

import { type MultiplayerGameState, type Tile, type Grid, sendCommand, type PlantTile } from "../../engine.js";

const socket = new WebSocket('ws://192.168.1.33:3000/ws');
const state = ref<MultiplayerGameState | null>(null);
const selectedTile = ref<PlantTile | null>(null);
const modalTile = ref<Tile | null>(null);
const modalTileIndex = ref<number | null>(null);

// Get current palyer name from query parameters
// const urlParams = new URLSearchParams(window.location.search);
// const playerId = urlParams.get('playerId') as string;
const playerId = 'louis';

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  state.value = data.state as MultiplayerGameState;
  selectedTile.value = state.value.draftZone[0];
};

function flattenGarden(garden: Grid): (Tile | null)[] {
  if (!garden) return [];
  return garden.flat();
}

function openModal(plant: Tile, index: number) {
  modalTile.value = plant;
  modalTileIndex.value = index;
  (document.getElementById("my_modal_2") as HTMLDialogElement).showModal();
}

async function growTile(x: number, y: number) {
  if (!selectedTile.value) return;
  if (!state.value) return;
  const res = await sendCommand("growPlant", { playerId, x, y }).catch((err) => {
    console.error("Error sending command:", err);
  });

  if (res && res.success) {
    console.log("Tile grown successfully");
    (document.getElementById("my_modal_2") as HTMLDialogElement).close();
  } else {
    console.error("Failed to grow tile:", res);
  }
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

  const resourcesNeeded = tile.plant.growthCost;
  // If no cost, can't be grown
  if (!resourcesNeeded || Object.keys(resourcesNeeded).length === 0) return false;
  // if grown, can't be grown
  if (tile.grown) return false;

  const playerResources = state.value.players[playerId].resources;

  if (resourcesNeeded.water !== undefined && playerResources.water < resourcesNeeded.water) return false;
  if (resourcesNeeded.light !== undefined && playerResources.light < resourcesNeeded.light) return false;
  if (resourcesNeeded.compost !== undefined && playerResources.compost < resourcesNeeded.compost) return false;

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