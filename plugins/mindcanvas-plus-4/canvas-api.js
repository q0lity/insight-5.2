// canvas-api.js
const { moment } = require('obsidian');   // for easy date ops

const defaultProps = () => ({
  status: "not-started",
  priority: "medium",
  progress: 0,
  start: "",        // ISO; "" === unset
  due:   "",
  tags: [],
  icon: "",
  cost: 0,
  resources: []
});

//--- HOT‑KEY ACTIONS ---------------------------------------------------------
async function createChildNode(view) {
  if (!view) return;
  const canvas = view.canvas;
  const sel   = canvas.selection;
  if (sel.size !== 1) return;                // need one parent selected

  const parent = [...sel][0];
  const parentBox = canvas.nodes.get(parent).pos;
  const id = await canvas.createItem({
    type: "text",
    text: "New child",
    pos: { x: parentBox.x + 240, y: parentBox.y + 40 },
    size: { width: 220, height: 90 },
    data: { mindcanvas: defaultProps() }
  });
  await canvas.createEdge({ fromNode: parent, toNode: id, label: "" });
  canvas.requestSave();
}

async function createSiblingNode(view) {
  if (!view) return;
  const canvas = view.canvas;
  const sel   = canvas.selection;
  if (sel.size !== 1) return;

  const sib   = [...sel][0];
  const sibBox= canvas.nodes.get(sib).pos;
  const id = await canvas.createItem({
    type: "text",
    text: "New sibling",
    pos: { x: sibBox.x, y: sibBox.y + 140 },
    size: { width: 220, height: 90 },
    data: { mindcanvas: defaultProps() }
  });
  canvas.requestSave();
}

//--- PROPERTY HELPERS --------------------------------------------------------
function writeProps(canvas, id, patch) {
  canvas.mutate(id, (draft) => {
    draft.data = draft.data || {};
    draft.data.mindcanvas = { ...draft.data.mindcanvas, ...patch };
  });
  reflectDataset(canvas, id);
  canvas.requestSave();
}

function reflectDataset(canvas, id) {
  const node = canvas.nodes.get(id);
  if (!node) return;
  const el = canvas.viewEl.querySelector(`[data-node-id="${id}"]`);
  if (!el) return;

  const data = node.data?.mindcanvas ?? {};
  el.dataset.taskStatus   = data.status ?? "";
  el.dataset.taskPriority = data.priority ?? "";
  el.dataset.progress     = data.progress ?? "";
  el.dataset.start        = data.start ?? "";
  el.dataset.due          = data.due   ?? "";
  if (data.tags?.length)  el.dataset.tags = data.tags.join(",");
  else                    delete el.dataset.tags;
}

// Module exports
module.exports = {
  defaultProps,
  createChildNode,
  createSiblingNode,
  writeProps
}; 