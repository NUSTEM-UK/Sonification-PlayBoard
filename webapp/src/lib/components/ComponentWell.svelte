<script lang="ts">
  import { PALETTE, KIND_ORDER, KIND_LABEL, type NodeSpec } from "../graph/specs";

  const groups = KIND_ORDER.map((kind) => ({
    kind,
    label: KIND_LABEL[kind],
    specs: PALETTE.filter((s) => s.kind === kind),
  })).filter((g) => g.specs.length > 0);

  function onDragStart(e: DragEvent, spec: NodeSpec) {
    e.dataTransfer?.setData(
      "application/playboard",
      JSON.stringify({ kind: "palette", type: spec.type }),
    );
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
  }
</script>

<aside class="well">
  <h2>Components</h2>
  <p class="hint">Drag onto the canvas to build a soundscape.</p>

  {#each groups as group (group.kind)}
    <h3 style="color:{group.specs[0].accent}">{group.label}</h3>
    <div class="items">
      {#each group.specs as spec (spec.type)}
        <div
          class="item"
          style="--accent:{spec.accent}"
          draggable="true"
          ondragstart={(e) => onDragStart(e, spec)}
          title={spec.blurb}
          role="button"
          tabindex="0"
        >
          <span class="label">{spec.label}</span>
          <span class="blurb">{spec.blurb}</span>
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
  h3 {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 14px 0 6px;
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
