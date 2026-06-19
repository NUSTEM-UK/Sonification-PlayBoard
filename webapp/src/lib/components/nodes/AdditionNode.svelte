<script lang="ts">
  import { Handle, Position, type NodeProps } from "@xyflow/svelte";
  import { asNodeData, formatParamValue, nodeSpec } from "./nodeModel";
  import Sparkline from "../Sparkline.svelte";
  import ValueReadout from "../ValueReadout.svelte";

  let { id, data }: NodeProps = $props();
  const d = $derived(asNodeData(data));
  const spec = $derived(nodeSpec(d));
</script>

<div class="node" style="--accent:{spec.accent}">
  <header>
    <span class="title">{spec.label}</span>
    <ValueReadout {id} />
  </header>

  <Sparkline {id} accent={spec.accent} />

  {#each [{ label: "In 1", handleId: "signal-in-a", gainKey: "gain1", offsetKey: "offset1" }, { label: "In 2", handleId: "signal-in-b", gainKey: "gain2", offsetKey: "offset2" }] as grp (grp.handleId)}
    <div class="group">
      <div class="group-label">
        {grp.label}
        <Handle type="target" position={Position.Left} id={grp.handleId} class="h-signal" />
      </div>
      {#each [{ key: grp.gainKey, label: "Gain" }, { key: grp.offsetKey, label: "Offset" }] as p (p.key)}
        {@const pspec = spec.params.find(pp => pp.key === p.key)}
        {#if pspec}
          <label class="param">
            <span class="pname">{p.label}</span>
            <input
              class="nodrag"
              type="range"
              min={pspec.min}
              max={pspec.max}
              step={pspec.step ?? 0.01}
              bind:value={d.params[p.key]}
            />
            <span class="pval">{formatParamValue(d.params[p.key], pspec.step)}</span>
          </label>
        {/if}
      {/each}
    </div>
  {/each}

  <Handle type="source" position={Position.Right} id="signal-out" class="h-signal" />
</div>

<style>
  .node {
    width: 282px;
    background: #0f172a;
    border: 1px solid var(--accent);
    border-radius: 10px;
    padding: 8px 12px 11px;
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
    padding-left: 6px;
  }
  .title {
    font-weight: 600;
    color: var(--accent);
  }
  .group {
    margin-top: 10px;
    border-left: 2px solid #1e293b;
  }
  .group-label {
    position: relative;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--accent);
    margin-bottom: 5px;
    padding: 2px 0 2px 6px;
  }
  .param {
    display: grid;
    grid-template-columns: 54px 1fr 40px;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
    padding-left: 6px;
  }
  .pname {
    font-size: 10.5px;
    color: #94a3b8;
  }
  .pval {
    font-size: 9.5px;
    text-align: right;
    color: #cbd5e1;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  input[type="range"] {
    width: 100%;
    accent-color: var(--accent);
  }
</style>
