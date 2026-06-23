<script lang="ts">
  import { gateway } from "../serial/gateway.svelte";
  import { audioEngine } from "../audio/engine";
  import { audioState } from "../audio/audioState.svelte";
  import { graph } from "../graph/graph.svelte";

  let loadError = "";

  async function handleLoad() {
    try {
      loadError = "";
      await graph.load();
    } catch (err) {
      loadError = err instanceof Error ? err.message : String(err);
    }
  }

  const statusLabel: Record<string, string> = {
    disconnected: "Disconnected",
    connecting: "Connecting…",
    live: "Gateway live",
    mock: "Mock data",
    error: "Error",
  };
</script>

<header class="toolbar">
  <div class="brand">
    <strong>PlayBoard</strong>
    <span>sensor sonification</span>
  </div>

  <div class="status" data-status={gateway.status}>
    <span class="dot"></span>
    {statusLabel[gateway.status] ?? gateway.status}
    {#if gateway.error}<span class="err">— {gateway.error}</span>{/if}
  </div>

  <div class="actions">
    {#if !audioState.started}
      <button class="primary" onclick={() => audioEngine.start()}>🔊 Start audio</button>
    {:else}
      <button class="stop" onclick={() => audioEngine.stop()}>⏸ Stop audio</button>
    {/if}

    <button onclick={() => gateway.connectSerial()}>Connect gateway</button>
    <button onclick={() => gateway.startMock()}>Mock data</button>
    {#if gateway.status === "live" || gateway.status === "mock"}
      <button onclick={() => gateway.disconnect()}>Stop</button>
    {/if}

    <div class="divider"></div>
    <button onclick={() => graph.save()}>💾 Save</button>
    <button onclick={handleLoad}>📂 Load</button>
    {#if loadError}
      <span class="err" title={loadError}>⚠</span>
    {/if}
  </div>
</header>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 8px 14px;
    background: #0b1220;
    border-bottom: 1px solid #1e293b;
    color: #e2e8f0;
    font: 13px/1.4 system-ui, sans-serif;
  }
  .brand strong {
    color: #38bdf8;
    font-size: 15px;
  }
  .brand span {
    color: #64748b;
    margin-left: 8px;
    font-size: 11px;
  }
  .status {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #94a3b8;
    font-size: 12px;
  }
  .status .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #475569;
  }
  .status[data-status="live"] .dot,
  .status[data-status="mock"] .dot {
    background: #22c55e;
    box-shadow: 0 0 6px #22c55e;
  }
  .status[data-status="error"] .dot {
    background: #ef4444;
  }
  .err {
    color: #f87171;
  }
  .actions {
    margin-left: auto;
    display: flex;
    gap: 8px;
  }
  button {
    border: 1px solid #334155;
    background: #1e293b;
    color: #cbd5e1;
    border-radius: 7px;
    padding: 5px 11px;
    cursor: pointer;
    font-size: 12px;
  }
  button:hover {
    background: #334155;
  }
  button.primary {
    background: #0ea5e9;
    border-color: #0ea5e9;
    color: #04141f;
    font-weight: 700;
  }
  button.stop {
    border-color: #22c55e;
    color: #bbf7d0;
    background: #14321f;
  }
  button.stop:hover {
    background: #1c4a2c;
  }
  .divider {
    width: 1px;
    height: 24px;
    background: #334155;
    margin: 0 4px;
  }
  span.err {
    color: #f87171;
    cursor: help;
    font-size: 13px;
  }
</style>
