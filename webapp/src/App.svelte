<script lang="ts">
  import { onMount } from "svelte";
  import { SvelteFlowProvider } from "@xyflow/svelte";
  import Toolbar from "./lib/components/Toolbar.svelte";
  import SourcesPanel from "./lib/components/SourcesPanel.svelte";
  import ComponentWell from "./lib/components/ComponentWell.svelte";
  import Canvas from "./lib/components/Canvas.svelte";
  import { startTick, stopTick } from "./lib/graph/tick";
  import { audioEngine } from "./lib/audio/engine";
  import { audioState } from "./lib/audio/audioState.svelte";

  onMount(() => {
    startTick();

    // Resume the AudioContext on the first genuine user gesture anywhere.
    // `pointerdown` fires the moment you grab a palette item to drag (and is a
    // valid activation gesture, unlike `drop`), so audio is live by the time a
    // node lands on the canvas — no need to hunt for the Start-audio button.
    function unlock() {
      void audioEngine.start().then(() => {
        if (audioState.started) {
          window.removeEventListener("pointerdown", unlock);
          window.removeEventListener("keydown", unlock);
        }
      });
    }
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    return () => {
      stopTick();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
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
