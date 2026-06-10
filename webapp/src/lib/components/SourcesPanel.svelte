<script lang="ts">
  import { gateway } from "../serial/gateway.svelte";

  function onDragStart(e: DragEvent, channelId: string) {
    e.dataTransfer?.setData(
      "application/playboard",
      JSON.stringify({ kind: "source", channelId }),
    );
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
  }
</script>

<aside class="panel">
  <h2>Live sources</h2>
  <p class="hint">Sensor channels seen on the gateway. Drag one onto the canvas.</p>

  {#if gateway.channelList.length === 0}
    <p class="empty">
      No channels yet. Connect the gateway or start mock data from the toolbar.
    </p>
  {:else}
    <ul>
      {#each gateway.channelList as ch (ch.id)}
        <li
          draggable="true"
          ondragstart={(e) => onDragStart(e, ch.id)}
          title="Drag onto the canvas"
        >
          <span class="dot" class:live={gateway.isLive(ch.id)}></span>
          <span class="name">{ch.id}</span>
          <span class="raw">{ch.raw}</span>
        </li>
      {/each}
    </ul>
  {/if}
</aside>

<style>
  .panel {
    width: 220px;
    flex: none;
    background: #0b1220;
    border-right: 1px solid #1e293b;
    padding: 14px 12px;
    overflow-y: auto;
    color: #e2e8f0;
  }
  h2 {
    font-size: 13px;
    margin: 0 0 4px;
    color: #38bdf8;
  }
  .hint,
  .empty {
    font-size: 11px;
    color: #64748b;
    margin: 0 0 10px;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 9px;
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 8px;
    cursor: grab;
  }
  li:hover {
    border-color: #38bdf8;
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
  .name {
    font-size: 12px;
    flex: 1;
    font-weight: 600;
  }
  .raw {
    font-size: 11px;
    color: #64748b;
    font-variant-numeric: tabular-nums;
  }
</style>
