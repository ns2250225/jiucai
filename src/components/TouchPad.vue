<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { inputState } from '../game/systems/InputSystem';

// 虚拟摇杆：默认停在左下角，手指按下处即为摇杆中心，支持全屏滑动移动。
// 直接改 style，不走响应式，避免每次触摸移动都触发 Vue 更新。
const base = ref<HTMLElement | null>(null);
const knob = ref<HTMLElement | null>(null);
const R = 52;
let pointerId: number | null = null;
let cx = 0;
let cy = 0;

function restPos() {
  return { x: 96, y: window.innerHeight - 96 };
}
function placeBase(x: number, y: number) {
  if (base.value) {
    base.value.style.left = `${x}px`;
    base.value.style.top = `${y}px`;
  }
}
function setKnob(dx: number, dy: number) {
  if (knob.value) knob.value.style.transform = `translate(${dx}px, ${dy}px)`;
}
function down(e: PointerEvent) {
  if (pointerId !== null) return;
  pointerId = e.pointerId;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  cx = e.clientX;
  cy = e.clientY;
  placeBase(cx, cy);
  setKnob(0, 0);
}
function move(e: PointerEvent) {
  if (e.pointerId !== pointerId) return;
  let dx = e.clientX - cx;
  let dy = e.clientY - cy;
  const d = Math.hypot(dx, dy);
  if (d > R) {
    dx = (dx / d) * R;
    dy = (dy / d) * R;
  }
  setKnob(dx, dy);
  if (d < 6) {
    inputState.jx = inputState.jy = 0;
  } else {
    // 手指按得越远走得越快，超过一小段距离后保持全速
    const mag = Math.min(1, d / (R * 0.55));
    inputState.jx = (dx / (Math.hypot(dx, dy) || 1)) * mag;
    inputState.jy = (dy / (Math.hypot(dx, dy) || 1)) * mag;
  }
}
function up(e: PointerEvent) {
  if (e.pointerId !== pointerId) return;
  pointerId = null;
  inputState.jx = inputState.jy = 0;
  setKnob(0, 0);
  const p = restPos();
  placeBase(p.x, p.y);
}
function onResize() {
  if (pointerId === null) {
    const p = restPos();
    placeBase(p.x, p.y);
  }
}
onMounted(() => {
  onResize();
  window.addEventListener('resize', onResize);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  inputState.jx = inputState.jy = 0;
});
</script>

<template>
  <div class="touch-zone" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up">
    <div ref="base" class="joy-base">
      <div ref="knob" class="joy-knob"></div>
    </div>
  </div>
</template>
