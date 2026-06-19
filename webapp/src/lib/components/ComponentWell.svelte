<script lang="ts">
  import { getWellGroups, type NodeDefinition } from "../nodes/registry";

  type Tab = "core" | "transforms" | "filters";

  const allGroups = getWellGroups();
  let activeTab = $state<Tab>("core");

  const groups = $derived.by(() => {
    const byKind = new Map<string, NodeDefinition[]>();
    for (const group of allGroups) {
      byKind.set(group.kind, group.defs);
    }

    if (activeTab === "core") {
      const defs = [...(byKind.get("generator") ?? []), ...(byKind.get("output") ?? [])];
      return defs.length > 0 ? [{ label: "Core", defs }] : [];
    }
    if (activeTab === "transforms") {
      const defs = byKind.get("transform") ?? [];
      return defs.length > 0 ? [{ label: "Transforms", defs }] : [];
    }
    if (activeTab === "filters") {
      const defs = byKind.get("filter") ?? [];
      return defs.length > 0 ? [{ label: "Filters", defs }] : [];
    }
    return [];
  });

  function onDragStart(e: DragEvent, def: NodeDefinition) {
    e.dataTransfer?.setData(
      "application/playboard",
      JSON.stringify({ kind: "palette", type: def.type }),
    );
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
  }
</script>

<aside class="well">
  <h2>Components</h2>
  <p class="hint">Drag onto the canvas to build a soundscape.</p>

  <div class="tabs">
    <button class:active={activeTab === "core"} onclick={() => (activeTab = "core")} style="--tab-accent:#34d399">Core</button>
    <button class:active={activeTab === "transforms"} onclick={() => (activeTab = "transforms")} style="--tab-accent:#a78bfa">
      Transforms
    </button>
    <button class:active={activeTab === "filters"} onclick={() => (activeTab = "filters")} style="--tab-accent:#fbbf24">Filters</button>
  </div>

  {#each groups as group (group.label)}
    <div class="items">
      {#each group.defs as def (def.type)}
        <div
          class="item"
          style="--accent:{def.spec.accent}"
          draggable="true"
          ondragstart={(e) => onDragStart(e, def)}
          title={def.spec.blurb}
          role="button"
          tabindex="0"
        >
          <span class="label">{def.spec.label}</span>
          <span class="blurb">{def.spec.blurb}</span>
        </div>
      {/each}
    </div>
  {/each}
</aside>

<style>
  .well {
    width: 240px;
    flex: none;
    background: #0b1220;
    border-left: 1px solid #1e293b;
    padding: 14px 12px;
    overflow-y: auto;
    color: #e2e8f0;
  }
  h2 {
    font-size: 13px;
    margin: 0 0 4px;
  }
  .hint {
    font-size: 11px;
    color: #64748b;
    margin: 0 0 10px;
  }
  .tabs {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 10px;
  }
  .tabs button {
    border: 1px solid #334155;
    background: #0f172a;
    color: #94a3b8;
    border-radius: 6px;
    padding: 6px 8px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .tabs button.active {
    background: #1e293b;
    color: var(--tab-accent);
    border-color: var(--tab-accent);
  }
  .items {
    display: grid;
    gap: 6px;
  }
  .item {
    padding: 8px 10px;
    background: #0f172a;
    border: 1px solid #1e293b;
    border-left: 3px solid var(--accent);
    border-radius: 8px;
    cursor: grab;
  }
  .item:hover {
    border-color: var(--accent);
    border-left-color: var(--accent);
  }
  .label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
  }
  .blurb {
    display: block;
    font-size: 10px;
    color: #64748b;
    margin-top: 2px;
  }
</style>
