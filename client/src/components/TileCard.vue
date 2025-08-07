<template>
    <div
        class="aspect-square p-4 bg-base-300 shadow-md w-full h-full border border-secondary rounded-md flex flex-col justify-between">
        <div class="flex w-full justify-between">
            <h5 class="card-title">{{ tile.plant.name }}</h5>
            <span>⭐️{{ tile.plant.basePoints }}</span>
        </div>
        <div class="flex flex-col gap-2 my-auto">
            <p class="card-text flex justify-between" v-if="canGrow(tile)">
                <span>💧{{ tile.plant.growthCost.water ?? 0 }}</span>
                <span>☀️{{ tile.plant.growthCost.light ?? 0 }}</span>
                <span>🌾{{ tile.plant.growthCost.compost ?? 0 }}</span>
            </p>
            <p class="card-text text-xs">{{ tile.plant.effect }}</p>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { type PlantTile } from '../../../engine.ts'

defineProps<{
    tile: PlantTile
}>()

function canGrow(tile: PlantTile) {
    return tile.plant.growthCost.water !== undefined || tile.plant.growthCost.light !== undefined || tile.plant.growthCost.compost !== undefined;
}
</script>