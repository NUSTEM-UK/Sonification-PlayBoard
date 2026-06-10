<script lang="ts">
  import { onMount } from "svelte";
  import { SvelteFlowProvider } from "@xyflow/svelte";
  import Toolbar from "./lib/components/Toolbar.svelte";
  import SourcesPanel from "./lib/components/SourcesPanel.svelte";
  import ComponentWell from "./lib/components/ComponentWell.svelte";
  import Canvas from "./lib/components/Canvas.svelte";
  import { startTick, stopTick } from "./lib/graph/tick";

  onMount(() => {
    startTick();
    return () => stopTick();
  });
</script>

<div class="app">
  <Toolbar />
  <SvelteFlowProvider>
    <div class="body">
      <SourcesPanel />
      <Canvas />
      <ComponentWell />
    </div>
  </SvelteFlowProvider>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
  }
  .body {
    flex: 1;
    min-height: 0;
    display: flex;
  }
</style>
