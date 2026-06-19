<script lang="ts">
  import { Handle, Position, type NodeProps } from "@xyflow/svelte";
  import { graph } from "../../graph/graph.svelte";
  import { audioEngine } from "../../audio/engine";
  import { asNodeData, formatParamValue, nodeSpec } from "./nodeModel";

  let { id, data }: NodeProps = $props();
  const d = $derived(asNodeData(data));
  const spec = $derived(nodeSpec(d));

  function optionIconPath(icon?: string): string {
    if (icon === "sine") return "M1 8 C3 2,5 2,7 8 C9 14,11 14,13 8";
    if (icon === "square") return "M1 11 L1 4 L7 4 L7 11 L13 11 L13 4";
    if (icon === "saw") return "M1 11 L7 4 L7 11 L13 4";
    return "";
  }

  function selectedOptionLabel(paramKey: string, value: number): string | null {
    const param = spec.params.find((p) => p.key === paramKey);
    const opt = param?.options?.find((o) => o.value === Math.round(value));
    return opt?.label ?? null;
  }

  function onParam(key: string, value: number) {
    d.params[key] = value;
    audioEngine.setParam(id, key, value);
  }
</script>

<div class="node {spec.kind}" style="--accent:{spec.accent}">
  {#if spec.hasAudioIn}
    <Handle type="target" position={Position.Left} id="audio-in" class="h-audio" style="top:18px" />
  {/if}
  {#if spec.hasAudioOut}
    <Handle type="source" position={Position.Right} id="audio-out" class="h-audio" style="top:18px" />
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
        {#if p.options && p.options.length > 0}
          <div class="segmented nodrag" class:disabled={modulated} role="group" aria-label={p.label}>
            {#each p.options as opt (opt.value)}
              <button
                class="opt"
                class:active={Math.round(d.params[p.key] ?? p.default) === opt.value}
                type="button"
                disabled={modulated}
                onclick={() => onParam(p.key, opt.value)}
              >
                {#if opt.icon}
                  <svg class="opt-icon" viewBox="0 0 14 14" aria-hidden="true">
                    <path d={optionIconPath(opt.icon)} />
                  </svg>
                {:else}
                  {opt.label}
                {/if}
              </button>
            {/each}
          </div>
        {:else}
          <input
            class="nodrag"
            type="range"
            min={p.min}
            max={p.max}
            step={p.step ?? 0.01}
            value={d.params[p.key]}
            disabled={modulated}
            oninput={(e) => onParam(p.key, +e.currentTarget.value)}
          />
        {/if}
        <span class="pval">
          {#if modulated}
            mod
          {:else}
            {selectedOptionLabel(p.key, d.params[p.key] ?? p.default) ?? formatParamValue(d.params[p.key], p.step)}{p.unit ? ` ${p.unit}` : ""}
          {/if}
        </span>
      </div>
    {/each}
  </div>
</div>

<style>
  .node {
    width: 296px;
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
    padding-left: 4px;
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
    grid-template-columns: 74px 1fr 50px;
    align-items: center;
    gap: 6px;
    padding-left: 8px;
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
  .segmented {
    display: flex;
    border: 1px solid #334155;
    border-radius: 7px;
    overflow: hidden;
    background: #0b1220;
    min-height: 24px;
  }
  .segmented.disabled {
    opacity: 0.45;
  }
  .opt {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-right: 1px solid #334155;
    background: transparent;
    color: #94a3b8;
    font-size: 10px;
    padding: 4px 0;
    cursor: pointer;
  }
  .opt:last-child {
    border-right: 0;
  }
  .opt:hover {
    background: #172236;
  }
  .opt.active {
    background: color-mix(in srgb, var(--accent) 30%, #0b1220);
    color: #e2e8f0;
    font-weight: 700;
  }
  .opt:disabled {
    cursor: default;
  }
  .opt-icon {
    width: 13px;
    height: 13px;
    flex: none;
  }
  .opt-icon path {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
