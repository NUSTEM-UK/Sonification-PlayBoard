<script lang="ts">
  import { Handle, Position, type NodeProps } from "@xyflow/svelte";
  import { asNodeData, formatParamValue, nodeSpec } from "./nodeModel";
  import Sparkline from "../Sparkline.svelte";
  import ValueReadout from "../ValueReadout.svelte";

  let { id, data }: NodeProps = $props();
  const d = $derived(asNodeData(data));
  const spec = $derived(nodeSpec(d));
</script>

<div class="node transform" style="--accent:{spec.accent}">
  <header>
    <span class="title">{spec.label}</span>
    <ValueReadout {id} />
  </header>

  <Sparkline {id} accent={spec.accent} />

  <div class="params">
    {#each spec.params as p (p.key)}
      <label class="param">
        <span class="pname">{p.label}</span>
        <input
          class="nodrag"
          type="range"
          min={p.min}
          max={p.max}
          step={p.step ?? 0.01}
          bind:value={d.params[p.key]}
        />
        <span class="pval">{formatParamValue(d.params[p.key], p.step)}</span>
      </label>
    {/each}
  </div>

  <Handle type="target" position={Position.Left} id="signal-in" />
  <Handle type="source" position={Position.Right} id="signal-out" />
</div>

<style>
  .node {
    width: 210px;
    background: #0f172a;
    border: 1px solid var(--accent);
    border-radius: 10px;
    padding: 8px 10px 10px;
    color: #e2e8f0;
    font: 12px/1.4 system-ui, sans-serif;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  }
  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 6px;
    margin-bottom: 6px;
  }
  .title {
    font-weight: 600;
    color: var(--accent);
  }
  .params {
    margin-top: 8px;
    display: grid;
    gap: 5px;
  }
  .param {
    display: grid;
    grid-template-columns: 64px 1fr 34px;
    align-items: center;
    gap: 6px;
  }
  .pname {
    font-size: 10px;
    color: #94a3b8;
  }
  .pval {
    font-size: 10px;
    text-align: right;
    color: #cbd5e1;
    font-variant-numeric: tabular-nums;
  }
  input[type="range"] {
    width: 100%;
    accent-color: var(--accent);
  }
</style>
