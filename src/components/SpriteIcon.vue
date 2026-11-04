<script setup lang="ts">
import { computed } from 'vue';
import { frameUrl } from '../game/art/Atlas';

const props = defineProps<{ name: string; size?: number; silhouette?: boolean }>();
const src = computed(() => frameUrl(props.name));
</script>

<template>
  <img :src="src" :class="{ silhouette }" :style="size ? { width: `${size}px`, height: `${size}px` } : undefined" alt="" draggable="false" />
</template>
