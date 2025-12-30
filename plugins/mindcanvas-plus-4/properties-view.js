// properties-view.js
const { ItemView, moment } = require('obsidian');
const { writeProps } = require('./canvas-api');

class MindCanvasPropertiesView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.nodeId = null;
  }

  getViewType()   { return "mindcanvas-props"; }
  getDisplayText(){ return "MindCanvas Properties"; }
  getIcon()       { return "tools"; }

  async onOpen() {
    this.containerEl.classList.add("mindcanvas-properties-view");
    this.render();
    // keep panel synced to selection
    this.registerEvent(
      this.app.workspace.on("canvas-selection-changed", (id) => {
        this.nodeId = id?.length === 1 ? id[0] : null;
        this.render();
      })
    );
  }

  render() {
    const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
    if (!canvasView || canvasView.getViewType() !== 'canvas' || !this.nodeId) {
      this.containerEl.empty();
      this.containerEl.createDiv({ text: "Select one node…" });
      return;
    }

    const canvas = canvasView.canvas;
    const data   = canvas.nodes.get(this.nodeId).data?.mindcanvas ?? {};
    this.containerEl.empty();

    // TITLE
    this.containerEl.createEl("h3", { text: "Task" });

    // START DATE
    const startField = this.mkDateField("Start", data.start, (iso) =>
      writeProps(canvas, this.nodeId, { start: iso })
    );
    this.containerEl.appendChild(startField);

    // DUE DATE
    const dueField = this.mkDateField("Due", data.due, (iso) =>
      writeProps(canvas, this.nodeId, { due: iso })
    );
    this.containerEl.appendChild(dueField);

    // TAGS
    const tagWrap = this.containerEl.createDiv("mindcanvas-field");
    tagWrap.createEl("label", { text: "Tags" });
    const tagInput = tagWrap.createEl("input", {
      type: "text",
      placeholder: "comma, separated, tags",
      value: (data.tags ?? []).join(", "),
    });
    tagInput.onchange = () => {
      const tags = tagInput.value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      writeProps(canvas, this.nodeId, { tags });
    };

    // PROGRESS
    const progField = this.containerEl.createDiv("mindcanvas-field");
    progField.createEl("label", { text: "Progress (%)" });
    const progInput = progField.createEl("input", {
      type: "number",
      min: 0,
      max: 100,
      value: data.progress ?? 0,
    });
    progInput.onchange = () =>
      writeProps(canvas, this.nodeId, { progress: Number(progInput.value) });
  }

  // helper
  mkDateField(label, iso, onSave) {
    const wrap = createDiv("mindcanvas-field mindcanvas-date-field");
    wrap.createEl("label", { text: label });
    const row = wrap.createDiv("mindcanvas-date-input-wrapper");
    const inp = row.createEl("input", {
      cls: "mindcanvas-date-input",
      type: "date",
      value: iso ? moment(iso).format("YYYY-MM-DD") : "",
    });
    inp.onchange = () => onSave(inp.value);
    const clr = row.createEl("button", {
      cls: "mindcanvas-date-clear-btn",
      text: "×",
    });
    clr.onclick = () => {
      inp.value = "";
      onSave("");
    };
    return wrap;
  }
}

module.exports = MindCanvasPropertiesView; 