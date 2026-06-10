<script lang="ts">
  import { onMount } from "svelte";
  import { getRuntime } from "../graph/runtime";

  let {
    id,
    accent = "#38bdf8",
    width = 168,
    height = 40,
  }: { id: string; accent?: string; width?: number; height?: number } = $props();

  let canvas: HTMLCanvasElement;

  onMount(() => {
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    let raf = 0;

    function draw() {
      const { history } = getRuntime(id);
      const cap = history.capacity;
      ctx.clearRect(0, 0, width, height);

      // midline (0.5)
      ctx.strokeStyle = "rgba(148,163,184,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      if (history.length > 1) {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.6;
        ctx.lineJoin = "round";
        ctx.beginPath();
        history.forEach((v, i) => {
          const x = (i / (cap - 1)) * width;
          const y = height - Math.max(0, Math.min(1, v)) * height;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  });
</script>

<canvas bind:this={canvas} style="width:{width}px;height:{height}px"></canvas>

<style>
  canvas {
    display: block;
    border-radius: 6px;
    background: rgba(15, 23, 42, 0.55);
  }
</style>
