<script lang="ts">
  import { Handle, Position, type NodeProps } from "@xyflow/svelte";
  import { gateway } from "../../serial/gateway.svelte";
  import { SOURCE_SPEC } from "../../graph/specs";
  import { outputId } from "../../graph/runtime";
  import { asNodeData } from "./nodeModel";
  import { datasetStore } from "../../sources/datasets.svelte";
  import { playback } from "../../sources/playback.svelte";
  import Sparkline from "../Sparkline.svelte";
  import ValueReadout from "../ValueReadout.svelte";

  let { id, data }: NodeProps = $props();
  const d = $derived(asNodeData(data));

  const live = $derived(d.channelId ? gateway.isLive(d.channelId) : false);
  const dataset = $derived(d.datasetId ? datasetStore.get(d.datasetId) : undefined);
  const isRecorded = $derived(!!(d.datasetId && dataset));

  // Recorded sources own a per-node transport; make sure it exists for controls.
  $effect(() => {
    if (isRecorded) playback.ensure(id);
  });
  const pb = $derived(playback.get(id));
</script>

<div class="node source" class:recorded={isRecorded} style="--accent:{SOURCE_SPEC.accent}">
  <header>
    <span class="dot" class:live class:rec={isRecorded}></span>
    <span class="title">{d.title}</span>
  </header>

  {#if isRecorded && dataset && pb}
    <div class="transport nodrag">
      <button class="t-btn" title={pb.playing ? "Pause" : "Play"} onclick={() => playback.togglePlay(id)}>
        {pb.playing ? "⏸" : "▶"}
      </button>
      <button class="t-btn" title="Stop (rewind)" onclick={() => playback.stop(id)}>⏹</button>
      <button class="t-btn" class:on={pb.loop} title="Loop" onclick={() => playback.toggleLoop(id)}>⟳</button>
      <label class="speed">
        <span class="muted">speed</span>
        <input
          type="range"
          min="0.1"
          max="4"
          step="0.1"
          value={pb.speed}
          oninput={(e) => playback.setSpeed(id, Number((e.currentTarget as HTMLInputElement).value))}
        />
        <span class="sval">{pb.speed.toFixed(1)}×</span>
      </label>
    </div>

    <p class="meta">
      {dataset.label} • {dataset.columns.length} series • {Math.floor(pb.position)} / {dataset.rowCount}
    </p>

    <div class="series">
      {#each dataset.columns as column (column.key)}
        <div class="serie">
          <div class="serie-head">
            <span class="sname" title={column.label}>{column.label}</span>
            <ValueReadout id={outputId(id, column.key)} />
          </div>
          <Sparkline id={outputId(id, column.key)} accent={SOURCE_SPEC.accent} height={24} />
          <Handle type="source" position={Position.Right} id={`signal-out:${column.key}`} />
        </div>
      {/each}
    </div>
  {:else}
    <Sparkline {id} accent={SOURCE_SPEC.accent} />

    <div class="row">
      <span class="muted">norm</span>
      <ValueReadout {id} />
      <span class="muted">raw</span>
      <span class="raw">{d.channelId ? (gateway.channels[d.channelId]?.raw ?? "—") : "—"}</span>
    </div>

    {#if d.channelId}
      <button class="cal nodrag" onclick={() => d.channelId && gateway.recalibrate(d.channelId)}>
        Recalibrate range
      </button>
    {:else}
      <div class="spacer"></div>
    {/if}

    <Handle type="source" position={Position.Right} id="signal-out" />
  {/if}
</div>

<style>
  .node {
    width: 228px;
    background: #0f172a;
    border: 1px solid var(--accent);
    border-radius: 10px;
    padding: 8px 12px 11px;
    color: #e2e8f0;
    font: 12px/1.4 system-ui, sans-serif;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  }
  .node.recorded {
    width: 248px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    padding-left: 2px;
  }
  .title {
    font-weight: 600;
    color: var(--accent);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #475569;
    flex: none;
  }
  .dot.live {
    background: #22c55e;
    box-shadow: 0 0 6px #22c55e;
  }
  .dot.rec {
    background: #f59e0b;
    box-shadow: 0 0 6px rgba(245, 158, 11, 0.5);
  }
  .row {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-top: 6px;
    padding-left: 2px;
  }
  .muted {
    color: #64748b;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .raw {
    font-variant-numeric: tabular-nums;
    color: #94a3b8;
    white-space: nowrap;
  }
  .meta {
    margin: 6px 0 0;
    padding-left: 2px;
    font-size: 10px;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cal,
  .spacer {
    margin-top: 8px;
    width: 100%;
    height: 26px;
  }
  .cal {
    border: 1px solid #334155;
    background: #1e293b;
    color: #cbd5e1;
    border-radius: 6px;
    padding: 4px 6px;
    cursor: pointer;
    font-size: 11px;
  }
  .cal:hover {
    background: #334155;
  }

  /* Recorded transport + multi-series outputs */
  .transport {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 2px;
  }
  .t-btn {
    border: 1px solid #334155;
    background: #1e293b;
    color: #cbd5e1;
    border-radius: 6px;
    width: 24px;
    height: 24px;
    cursor: pointer;
    font-size: 12px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }
  .t-btn:hover {
    background: #334155;
  }
  .t-btn.on {
    border-color: var(--accent);
    color: var(--accent);
  }
  .speed {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }
  .speed input[type="range"] {
    flex: 1;
    min-width: 0;
    accent-color: var(--accent);
  }
  .sval {
    font-size: 10px;
    color: #cbd5e1;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .series {
    margin-top: 8px;
    display: grid;
    gap: 8px;
  }
  .serie {
    position: relative;
  }
  .serie-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 6px;
    margin-bottom: 3px;
  }
  .sname {
    font-size: 11px;
    color: #cbd5e1;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
