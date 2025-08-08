<template>
    <div v-if="tile.type === 'plant'"
        class="shadow-md rounded-md flex flex-col justify-between relative overflow-hidden" :class="{
            'border-3 border-green-400': tile.grown,
            'border-3 border-yellow-400 cursor-pointer': !tile.grown && canBeGrown,
            'size-36': !compact,
            'aspect-square': compact,
        }">
        <!-- Background image -->
        <img alt="" :src="`/${tile.plant.name}.jpeg`" class="absolute inset-0 w-full h-full object-cover"
            v-if="!compact" />

        <!-- Non-compact overlay -->
        <div v-if="!compact"
            class="relative z-10 flex flex-col justify-between h-full backdrop-blur-[3px] text-white  p-1 rounded-md">
            <div class="flex w-full justify-between font-bold">
                <span>{{ tile.plant.name }}</span>
                <span>⭐️{{ tile.plant.basePoints }}</span>
            </div>
            <div v-if="tile.plant.effect" class="text-center bg-black/50 rounded-md">{{ tile.plant.effect }}</div>
            <div class="flex flex-col gap-1">
                <p class="flex justify-between" v-if="canGrow(tile)">
                    <span>💧{{ tile.plant.growthCost.water ?? 0 }}</span>
                    <span>☀️{{ tile.plant.growthCost.light ?? 0 }}</span>
                    <span>🌾{{ tile.plant.growthCost.compost ?? 0 }}</span>
                </p>
            </div>
        </div>

        <!-- Compact mode just the image + size change -->
        <div v-else class="absolute inset-0 flex items-center justify-center">
            <img alt="" :src="`/${tile.plant.name}.jpeg`" class="rounded-md size-full" />
        </div>
    </div>

    <div v-else-if="tile.type === 'pest'"
        class="aspect-square w-full bg-base-300 shadow-md border border-secondary rounded-md flex flex-col justify-between overflow-hidden p-1 text-xs">
        <div class="flex w-full justify-between">
            <h5 class="truncate">Pest</h5>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { type Tile, type PlantTile } from '../../../engine.ts'

defineProps<{
    tile: Tile
    canBeGrown: boolean
    compact?: boolean
}>()

function canGrow(tile: PlantTile) {
    return (
        tile.plant.growthCost.water !== undefined ||
        tile.plant.growthCost.light !== undefined ||
        tile.plant.growthCost.compost !== undefined
    );
}
</script>