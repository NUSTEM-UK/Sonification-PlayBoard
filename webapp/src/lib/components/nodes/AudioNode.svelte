<script lang="ts">
  import { Handle, Position, type NodeProps } from "@xyflow/svelte";
  import { specFor } from "../../graph/specs";
  import { graph, type NodeData } from "../../graph/graph.svelte";
  import { audioEngine } from "../../audio/engine";

  let { id, data }: NodeProps = $props();
  const d = $derived(data as NodeData);
  const spec = $derived(specFor(d.specType));

  function onParam(key: string, value: number) {
    d.params[key] = value;
    audioEngine.setParam(id, key, value);
  }
</script>

<div class="node {spec.kind}" style="--accent:{spec.accent}">
  {#if spec.hasAudioIn}
    <Handle type="target" position={Position.Top} id="audio-in" class="h-audio" />
  {/if}

  <header>
    <span class="kind">{spec.kind}</span>
    <span class="title">{spec.label}</span>
  </header>
  <p class="blurb">{spec.blurb}</p>

  <div class="params">
    {#each spec.params as p (p.key)}
      {@const modulated = !!p.modulatable && graph.isModulated(id, p.key)}
      <div class="param" class:mod={modulated}>
        {#if p.modulatable}
          <Handle
            type="target"
            position={Position.Left}
            id={`param:${p.key}`}
            class="h-param"
            style="top:50%"
          />
        {/if}
        <span class="pname">{p.label}</span>
        <input
          type="range"
          min={p.min}
          max={p.max}
          step={p.step ?? 0.01}
          value={d.params[p.key]}
          disabled={modulated}
          oninput={(e) => onParam(p.key, +e.currentTarget.value)}
        />
        <span class="pval">
          {#if modulated}mod{:else}{d.params[p.key]?.toFixed(p.step && p.step >= 1 ? 0 : 2)}{p.unit ? ` ${p.unit}` : ""}{/if}
        </span>
      </div>
    {/each}
  </div>

  {#if spec.hasAudioOut}
    <Handle type="source" position={Position.Bottom} id="audio-out" class="h-audio" />
  {/if}
</div>

<style>
  .node {
    width: 220px;
    background: #0f172a;
    border: 1px solid var(--accent);
    border-radius: 10px;
    padding: 8px 12px 12px;
    color: #e2e8f0;
    font: 12px/1.4 system-ui, sans-serif;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  }
  header {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 2px;
  }
  .kind {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #0f172a;
    background: var(--accent);
    border-radius: 4px;
    padding: 1px 5px;
    font-weight: 700;
  }
  .title {
    font-weight: 600;
    color: var(--accent);
  }
  .blurb {
    margin: 4px 0 8px;
    font-size: 10.5px;
    color: #64748b;
  }
  .params {
    display: grid;
    gap: 7px;
  }
  .param {
    position: relative;
    display: grid;
    grid-template-columns: 62px 1fr 50px;
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
  .param.mod .pval {
    color: var(--accent);
    font-weight: 700;
  }
  input[type="range"] {
    width: 100%;
    accent-color: var(--accent);
  }
  input[type="range"]:disabled {
    opacity: 0.4;
  }
</style>
