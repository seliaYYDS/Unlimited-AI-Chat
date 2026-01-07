<template>
  <span class="icon-wrapper" v-html="iconSvg" :style="{ width: size, height: size }"></span>
</template>

<script setup>
import { computed } from 'vue';
import { getIcon } from '../utils/iconMap.js';

const props = defineProps({
  emoji: {
    type: String,
    required: true
  },
  size: {
    type: String,
    default: '16px'
  }
});

const iconSvg = computed(() => {
  return getIcon(props.emoji) || props.emoji;
});
</script>

<style scoped>
.icon-wrapper {
  display: inline-block;
  vertical-align: middle;
  line-height: 1;
}

.icon-wrapper :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
</style>