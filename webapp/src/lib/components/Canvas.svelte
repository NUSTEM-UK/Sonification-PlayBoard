<script lang="ts">
  import { untrack } from "svelte";
  import { SvelteFlow, Background, Controls, MiniMap, useSvelteFlow } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";
  import {
    graph,
    isValidConnection,
    decorateConnection,
    audioTopologySignature,
  } from "../graph/graph.svelte";
  import { audioEngine } from "../audio/engine";
  import SourceNode from "./nodes/SourceNode.svelte";
  import TransformNode from "./nodes/TransformNode.svelte";
  import AdditionNode from "./nodes/AdditionNode.svelte";
  import AudioNode from "./nodes/AudioNode.svelte";

  const nodeTypes = {
    source: SourceNode,
    transform: TransformNode,
    addition: AdditionNode,
    audio: AudioNode,
  };

  const { screenToFlowPosition } = useSvelteFlow();

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    const raw = e.dataTransfer?.getData("application/playboard");
    if (!raw) return;
    const payload = JSON.parse(raw) as {
      kind: string;
      channelId?: string;
      type?: string;
      datasetId?: string;
    };
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    if (payload.kind === "source" && payload.channelId) {
      graph.addSourceNode(payload.channelId, position);
    } else if (payload.kind === "recorded-source" && payload.datasetId) {
      (graph as any).addRecordedSourceNode(payload.datasetId, position);
    } else if (payload.kind === "palette" && payload.type) {
      graph.addPaletteNode(payload.type, position);
    }
  }

  const sig = $derived(audioTopologySignature(graph.nodes, graph.edges));
  $effect(() => {
    sig;
    untrack(() => audioEngine.sync(graph.nodes, graph.edges));
  });
</script>

<div class="canvas" ondrop={onDrop} ondragover={onDragOver} role="application">
  <SvelteFlow
    bind:nodes={graph.nodes}
    bind:edges={graph.edges}
    {nodeTypes}
    {isValidConnection}
    onbeforeconnect={decorateConnection}
    ondelete={(d) => graph.onDelete(d)}
    fitView
    colorMode="dark"
    deleteKey={["Backspace", "Delete"]}
  >
    <Background gap={22} />
    <Controls />
    <MiniMap pannable zoomable />
  </SvelteFlow>
</div>

<style>
  .canvas {
    flex: 1;
    min-width: 0;
    height: 100%;
  }
  :global(.svelte-flow .edge-signal .svelte-flow__edge-path) {
    stroke: #a78bfa;
    stroke-width: 1.5;
  }
  :global(.svelte-flow .edge-audio .svelte-flow__edge-path) {
    stroke: #34d399;
    stroke-width: 3;
  }
  :global(.svelte-flow .h-audio) {
    width: 12px;
    height: 12px;
    background: #34d399;
    border: 2px solid #0b1220;
  }
  :global(.svelte-flow .h-param) {
    width: 9px;
    height: 9px;
    background: #a78bfa;
  }
  /* Signal in/out handles: default xyflow handles are a 5px dot — too small to
     reliably drop a connection onto. Give them a proper hit target. */
  :global(.svelte-flow .h-signal) {
    width: 11px;
    height: 11px;
    background: #a78bfa;
    border: 2px solid #0b1220;
  }
</style>
