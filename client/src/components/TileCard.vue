<template>
    <div class="p-2 bg-base-300 shadow-md w-full h-full border border-secondary rounded-md">
        <div class="flex flex-col justify-between gap-2">
            <h5 class="card-title">{{ tile.plant.name }}</h5>
            <p class="card-text">{{ tile.plant.description }}</p>
            <p class="card-text flex justify-between">
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