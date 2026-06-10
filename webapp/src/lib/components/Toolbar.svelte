<script lang="ts">
  import { gateway } from "../serial/gateway.svelte";
  import { audioEngine } from "../audio/engine";

  let audioStarted = $state(false);

  const statusLabel: Record<string, string> = {
    disconnected: "Disconnected",
    connecting: "Connecting…",
    live: "Gateway live",
    mock: "Mock data",
    error: "Error",
  };

  async function startAudio() {
    await audioEngine.start();
    audioStarted = true;
  }
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
    {#if !audioStarted}
      <button class="primary" onclick={startAudio}>🔊 Start audio</button>
    {:else}
      <span class="ok">🔊 audio on</span>
    {/if}

    <button onclick={() => gateway.connectSerial()}>Connect gateway</button>
    <button onclick={() => gateway.startMock()}>Mock data</button>
    {#if gateway.status === "live" || gateway.status === "mock"}
      <button onclick={() => gateway.disconnect()}>Stop</button>
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
  .ok {
    color: #22c55e;
    font-size: 12px;
    align-self: center;
  }
</style>
