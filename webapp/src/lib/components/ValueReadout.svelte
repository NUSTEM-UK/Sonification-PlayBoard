<script lang="ts">
  import { onMount } from "svelte";
  import { getRuntime } from "../graph/runtime";

  let { id }: { id: string } = $props();
  let value = $state(0);

  onMount(() => {
    let raf = 0;
    const tick = () => {
      value = getRuntime(id).value;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  });
</script>

<span class="readout">{value.toFixed(2)}</span>

<style>
  .readout {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: #e2e8f0;
  }
</style>
