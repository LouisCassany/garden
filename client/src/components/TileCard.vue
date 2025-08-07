<template>
    <div class="w-full h-full p-2 bg-base-300 shadow-md border border-secondary rounded-md">
        <div class="flex flex-col justify-between h-full gap-1">
            <h5 class="card-title text-sm truncate">{{ tile.plant.name }}</h5>
            <p class="card-text text-xs overflow-hidden flex-grow">{{ tile.plant.description }}</p>
            <p class="card-text flex justify-between text-sm">
                <span>⭐️{{ tile.plant.basePoints }}</span>
                <span>💧{{ tile.plant.growthCost.water ?? 0 }}</span>
                <span>☀️{{ tile.plant.growthCost.light ?? 0 }}</span>
                <span>🌾{{ tile.plant.growthCost.compost ?? 0 }}</span>
            </p>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { type PlantTile } from '../../../engine.ts'

defineProps<{
    tile: PlantTile
}>()
</script>