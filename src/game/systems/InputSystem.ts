// 键盘与虚拟摇杆的统一输入状态。键盘走 window 事件，摇杆由 Vue 的 TouchPad 组件写入。
export const inputState = {
  up: false,
  down: false,
  left: false,
  right: false,
  jx: 0,
  jy: 0,
  /** 归一化后的移动向量 */
  read(out: { x: number; y: number }) {
    let x = (this.right ? 1 : 0) - (this.left ? 1 : 0);
    let y = (this.down ? 1 : 0) - (this.up ? 1 : 0);
    if (x !== 0 || y !== 0) {
      const l = Math.hypot(x, y);
      x /= l;
      y /= l;
    } else {
      x = this.jx;
      y = this.jy;
    }
    out.x = x;
    out.y = y;
  },
  clear() {
    this.up = this.down = this.left = this.right = false;
    this.jx = this.jy = 0;
  },
};

const KEY_MAP: Record<string, 'up' | 'down' | 'left' | 'right'> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

export function bindKeyboard(actions: { ult: () => void; pause: () => void }) {
  const down = (e: KeyboardEvent) => {
    const k = KEY_MAP[e.code];
    if (k) {
      inputState[k] = true;
      e.preventDefault();
    } else if (e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) actions.ult();
    } else if (e.code === 'Escape') {
      if (!e.repeat) actions.pause();
    }
  };
  const up = (e: KeyboardEvent) => {
    const k = KEY_MAP[e.code];
    if (k) inputState[k] = false;
  };
  const blur = () => inputState.clear();
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', blur);
  };
}
