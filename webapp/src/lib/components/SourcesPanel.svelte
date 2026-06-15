<script lang="ts">
  import { gateway } from "../serial/gateway.svelte";
  import { datasetStore } from "../sources/datasets.svelte";

  type ActiveTab = "live" | "recorded";

  let activeTab = $state<ActiveTab>("live");
  let status = $state<string | null>(null);

  function onDragStartLive(e: DragEvent, channelId: string) {
    e.dataTransfer?.setData("application/playboard", JSON.stringify({ kind: "source", channelId }));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
  }

  function onDragStartRecorded(
    e: DragEvent,
    datasetId: string,
    columnKey: string,
    title: string,
    samples: number[],
    min: number,
    max: number,
  ) {
    e.dataTransfer?.setData(
      "application/playboard",
      JSON.stringify({
        kind: "recorded-source",
        datasetId,
        columnKey,
        title,
        samples,
        min,
        max,
      }),
    );
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
  }

  async function onCsvChosen(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const dataset = datasetStore.addCsvDataset(file.name, text);
      status = `Imported ${dataset.label} with ${dataset.columns.length} channel${dataset.columns.length === 1 ? "" : "s"}.`;
      activeTab = "recorded";
    } catch (error) {
      status = error instanceof Error ? error.message : "Failed to import CSV.";
    } finally {
      input.value = "";
    }
  }
</script>

<aside class="panel">
  <h2>Sources</h2>
  <p class="hint">Drag a source onto the canvas to create a node.</p>

  <div class="tabs">
    <button class:active={activeTab === "live"} onclick={() => (activeTab = "live")}>Live</button>
    <button class:active={activeTab === "recorded"} onclick={() => (activeTab = "recorded")}>Recorded</button>
  </div>

  {#if status}
    <p class="status">{status}</p>
  {/if}

  {#if activeTab === "live"}
    <p class="sub">Micro:Bit gateway channels currently connected or mocked.</p>
    {#if gateway.channelList.length === 0}
      <p class="empty">No channels yet. Connect the gateway or start mock data from the toolbar.</p>
    {:else}
      <ul>
        {#each gateway.channelList as ch (ch.id)}
          <li draggable="true" ondragstart={(e) => onDragStartLive(e, ch.id)} title="Drag onto the canvas">
            <span class="dot" class:live={gateway.isLive(ch.id)}></span>
            <span class="name">{ch.id}</span>
            <span class="raw">{ch.raw}</span>
          </li>
        {/each}
      </ul>
    {/if}
  {:else}
    <div class="importer">
      <label class="import">
        <input type="file" accept=".csv,text/csv" onchange={onCsvChosen} />
        <span>Import CSV</span>
      </label>
      <p class="sub">Each numeric column becomes a recorded channel you can drag onto the canvas.</p>
    </div>

    {#if datasetStore.datasets.length === 0}
      <p class="empty">No recorded datasets yet. Import a CSV to use the app without Micro:Bits.</p>
    {:else}
      {#each datasetStore.datasets as dataset (dataset.id)}
        <section class="dataset">
          <header>
            <strong>{dataset.label}</strong>
            <span>{dataset.rowCount} rows</span>
          </header>
          <ul>
            {#each dataset.columns as column (column.key)}
              <li
                draggable="true"
                ondragstart={(e) =>
                  onDragStartRecorded(
                    e,
                    dataset.id,
                    column.key,
                    `${dataset.label}: ${column.label}`,
                    column.samples,
                    column.min,
                    column.max,
                  )}
                title="Drag onto the canvas"
              >
                <span class="dot recorded"></span>
                <span class="name">{column.label}</span>
                <span class="raw">{column.samples.length} pts</span>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    {/if}
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
  .sub,
  .empty,
  .status {
    font-size: 11px;
    color: #64748b;
    margin: 0 0 10px;
  }
  .status {
    color: #a5f3fc;
  }
  .tabs {
    display: flex;
    gap: 6px;
    margin-bottom: 10px;
  }
  .tabs button {
    flex: 1;
    border: 1px solid #334155;
    background: #0f172a;
    color: #94a3b8;
    border-radius: 8px;
    padding: 6px 8px;
    cursor: pointer;
    font-size: 11px;
  }
  .tabs button.active {
    background: #1e293b;
    color: #e2e8f0;
    border-color: #38bdf8;
  }
  .importer {
    display: grid;
    gap: 8px;
    margin-bottom: 10px;
  }
  .import {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #334155;
    background: #1e293b;
    color: #cbd5e1;
    border-radius: 8px;
    padding: 7px 10px;
    cursor: pointer;
    font-size: 12px;
  }
  .import input {
    display: none;
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
  .dataset {
    margin-bottom: 12px;
  }
  .dataset header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin: 0 0 6px;
  }
  .dataset strong {
    font-size: 11px;
    color: #e2e8f0;
  }
  .dataset header span {
    font-size: 10px;
    color: #64748b;
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
  .dot.recorded {
    background: #f59e0b;
    box-shadow: 0 0 6px rgba(245, 158, 11, 0.5);
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
    white-space: nowrap;
  }
</style>
