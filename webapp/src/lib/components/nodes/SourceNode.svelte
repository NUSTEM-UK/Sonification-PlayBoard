<script lang="ts">
  import { Handle, Position, type NodeProps } from "@xyflow/svelte";
  import { gateway } from "../../serial/gateway.svelte";
  import { SOURCE_SPEC } from "../../graph/specs";
  import { asNodeData } from "./nodeModel";
  import { datasetStore } from "../../sources/datasets.svelte";
  import { playback } from "../../sources/playback.svelte";
  import Sparkline from "../Sparkline.svelte";
  import ValueReadout from "../ValueReadout.svelte";

  let { id, data }: NodeProps = $props();
  const d = $derived(asNodeData(data));

  const live = $derived(d.channelId ? gateway.isLive(d.channelId) : false);
  const dataset = $derived(d.datasetId ? datasetStore.get(d.datasetId) : undefined);
  const playbackState = $derived(d.datasetId ? playback.get(d.datasetId) : null);
  const recordedColumn = $derived(
    d.datasetId && d.columnKey && dataset ? dataset.columns.find((column) => column.key === d.columnKey) : undefined,
  );
  const recordedSample = $derived(
    d.datasetId && d.columnKey && playbackState && dataset ? datasetStore.getSample(d.datasetId, d.columnKey, playbackState.position) : 0,
  );
</script>

<div class="node source" style="--accent:{SOURCE_SPEC.accent}">
  <header>
    <span class="dot" class:live></span>
    <span class="title">{d.title}</span>
  </header>

  <Sparkline {id} accent={SOURCE_SPEC.accent} />

  <div class="row">
    <span class="muted">norm</span>
    <ValueReadout {id} />
    {#if d.datasetId && recordedColumn}
      <span class="muted">raw</span>
      <span class="raw">{recordedSample.toFixed(2)}</span>
    {:else}
      <span class="muted">raw</span>
      <span class="raw">{d.channelId ? gateway.channels[d.channelId]?.raw ?? "—" : "—"}</span>
    {/if}
  </div>

  {#if d.datasetId && recordedColumn}
    <p class="meta">{dataset?.label} • {recordedColumn.label} • {recordedColumn.samples.length} samples</p>
  {/if}

  {#if d.channelId}
    <button class="cal nodrag" onclick={() => d.channelId && gateway.recalibrate(d.channelId)}>
      Recalibrate range
    </button>
  {:else}
    <div class="spacer"></div>
  {/if}

  <Handle type="source" position={Position.Right} id="signal-out" />
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
</style>
