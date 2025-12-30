import {
  Plugin,
  WorkspaceLeaf,
  ItemView,
  TFile,
  Menu,
  Notice,
  addIcon,
  Command,
} from "obsidian";

// Extension key for storing our metadata in canvas nodes
const EXT_KEY = "mcp";
const VIEW_TYPE_GANTT = "mindcanvas-gantt";
const VIEW_TYPE_PROPERTIES = "mindcanvas-properties";

// TypeScript interface for our node metadata
interface MCNodeMeta {
  start?: string; // ISO date string
  end?: string; // ISO date string
  progress?: number; // 0-100
  priority?: "low" | "medium" | "high";
  tags?: string[];
  assignee?: string;
  notes?: string;
  dependencies?: string[]; // array of node IDs
}

interface CanvasNode {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  type: string;
  ext?: { [key: string]: any };
}

interface CanvasData {
  nodes: CanvasNode[];
  edges: Array<{ id: string; from: string; to: string; [key: string]: any }>;
}

export default class MindCanvasPlus extends Plugin {
  private statusBarItem: HTMLElement | null = null;

  async onload() {
    console.log("Loading MindCanvas Plus");

    // Add icons
    addIcon("mindmap-plus", `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>`);

    // Register commands
    this.addCommand({
      id: "add-connected-node",
      name: "Add connected node",
      hotkeys: [{ modifiers: ["Mod"], key: "Enter" }],
      callback: () => this.addConnectedNode(),
    });

    this.addCommand({
      id: "toggle-gantt-view",
      name: "Toggle Gantt view",
      callback: () => this.toggleGanttView(),
    });

    this.addCommand({
      id: "toggle-properties-view",
      name: "Toggle properties panel",
      callback: () => this.togglePropertiesView(),
    });

    this.addCommand({
      id: "add-child-node",
      name: "Add child node",
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "Enter" }],
      callback: () => this.addChildNode(),
    });

    this.addCommand({
      id: "add-sibling-node",
      name: "Add sibling node",
      hotkeys: [{ modifiers: ["Alt"], key: "Enter" }],
      callback: () => this.addSiblingNode(),
    });

    // Register views
    this.registerView(VIEW_TYPE_GANTT, (leaf) => new GanttView(leaf, this));
    this.registerView(VIEW_TYPE_PROPERTIES, (leaf) => new PropertiesView(leaf, this));

    // Add ribbon icon
    this.addRibbonIcon("mindmap-plus", "MindCanvas Plus", () => {
      this.togglePropertiesView();
    });

    // Status bar
    this.statusBarItem = this.addStatusBarItem();
    this.updateStatusBar();

    // Register canvas events
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.updateStatusBar();
      })
    );

    // Add context menu items for canvas nodes
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu: Menu, editor, view) => {
        if (view.getViewType() === "canvas") {
          this.addCanvasContextMenu(menu);
        }
      })
    );
  }

  onunload() {
    console.log("Unloading MindCanvas Plus");
  }

  // Get the currently active canvas
  getActiveCanvas(): any {
    const activeLeaf = this.app.workspace.getActiveViewOfType(ItemView);
    if (activeLeaf?.getViewType() === "canvas") {
      return (activeLeaf as any).canvas;
    }
    return null;
  }

  // Get selected nodes from active canvas
  getSelectedNodes(): CanvasNode[] {
    const canvas = this.getActiveCanvas();
    if (!canvas) return [];
    
    const selectedNodes: CanvasNode[] = [];
    for (const nodeId of canvas.selection) {
      const node = canvas.nodes.get(nodeId);
      if (node) selectedNodes.push(node);
    }
    return selectedNodes;
  }

  // Add a connected node (main hotkey function)
  private addConnectedNode() {
    const canvas = this.getActiveCanvas();
    if (!canvas) {
      new Notice("Please open a canvas first");
      return;
    }

    const selectedNodes = this.getSelectedNodes();
    if (selectedNodes.length === 0) {
      // No selection, create a new node at center
      this.createNewNode(canvas, { x: 300, y: 200 });
      return;
    }

    // Create connected node from the first selected node
    const sourceNode = selectedNodes[0];
    this.createConnectedNode(canvas, sourceNode);
  }

  // Add a child node
  private addChildNode() {
    const canvas = this.getActiveCanvas();
    if (!canvas) {
      new Notice("Please open a canvas first");
      return;
    }

    const selectedNodes = this.getSelectedNodes();
    if (selectedNodes.length === 0) {
      new Notice("Please select a node first");
      return;
    }

    const parentNode = selectedNodes[0];
    this.createChildNode(canvas, parentNode);
  }

  // Add a sibling node
  private addSiblingNode() {
    const canvas = this.getActiveCanvas();
    if (!canvas) {
      new Notice("Please open a canvas first");
      return;
    }

    const selectedNodes = this.getSelectedNodes();
    if (selectedNodes.length === 0) {
      new Notice("Please select a node first");
      return;
    }

    const siblingNode = selectedNodes[0];
    this.createSiblingNode(canvas, siblingNode);
  }

  // Create a new node
  private createNewNode(canvas: any, position: { x: number; y: number }) {
    const newNode = canvas.createTextNode({
      text: "New Node",
      x: position.x,
      y: position.y,
      width: 200,
      height: 60,
    });

    // Initialize metadata
    this.initializeNodeMetadata(newNode);

    // Select and start editing
    canvas.deselectAll();
    canvas.addToSelection(newNode);
    canvas.zoomToSelection();
    
    // Trigger edit mode
    setTimeout(() => {
      canvas.startEditing(newNode);
    }, 100);

    canvas.requestSave();
    return newNode;
  }

  // Create a connected node
  private createConnectedNode(canvas: any, sourceNode: CanvasNode) {
    const x = sourceNode.x + (sourceNode.width || 200) + 100;
    const y = sourceNode.y;

    const newNode = this.createNewNode(canvas, { x, y });

    // Create edge
    canvas.createEdge({
      from: sourceNode.id,
      to: newNode.id,
    });

    return newNode;
  }

  // Create a child node (positioned below)
  private createChildNode(canvas: any, parentNode: CanvasNode) {
    const x = parentNode.x + 50;
    const y = parentNode.y + (parentNode.height || 60) + 50;

    const newNode = this.createNewNode(canvas, { x, y });

    // Create edge from parent to child
    canvas.createEdge({
      from: parentNode.id,
      to: newNode.id,
    });

    return newNode;
  }

  // Create a sibling node (positioned to the right)
  private createSiblingNode(canvas: any, siblingNode: CanvasNode) {
    const x = siblingNode.x;
    const y = siblingNode.y + (siblingNode.height || 60) + 30;

    const newNode = this.createNewNode(canvas, { x, y });
    return newNode;
  }

  // Initialize node metadata
  private initializeNodeMetadata(node: CanvasNode) {
    if (!node.ext) node.ext = {};
    if (!node.ext[EXT_KEY]) {
      node.ext[EXT_KEY] = {
        progress: 0,
        priority: "medium",
        tags: [],
        dependencies: [],
      } as MCNodeMeta;
    }
  }

  // Update node metadata
  updateNodeMetadata(nodeId: string, metadata: Partial<MCNodeMeta>) {
    const canvas = this.getActiveCanvas();
    if (!canvas) return;

    const node = canvas.nodes.get(nodeId);
    if (!node) return;

    this.initializeNodeMetadata(node);
    Object.assign(node.ext[EXT_KEY], metadata);
    canvas.requestSave();
  }

  // Get node metadata
  getNodeMetadata(nodeId: string): MCNodeMeta | null {
    const canvas = this.getActiveCanvas();
    if (!canvas) return null;

    const node = canvas.nodes.get(nodeId);
    if (!node?.ext?.[EXT_KEY]) return null;

    return node.ext[EXT_KEY] as MCNodeMeta;
  }

  // Add context menu items
  private addCanvasContextMenu(menu: Menu) {
    menu.addItem((item) => {
      item
        .setTitle("Set as Task")
        .setIcon("check-square")
        .onClick(() => {
          const selectedNodes = this.getSelectedNodes();
          if (selectedNodes.length > 0) {
            this.convertToTask(selectedNodes[0].id);
          }
        });
    });

    menu.addItem((item) => {
      item
        .setTitle("Set Priority")
        .setIcon("flag")
        .onClick(() => {
          const selectedNodes = this.getSelectedNodes();
          if (selectedNodes.length > 0) {
            this.showPriorityMenu(selectedNodes[0].id);
          }
        });
    });
  }

  // Convert node to task
  private convertToTask(nodeId: string) {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    this.updateNodeMetadata(nodeId, {
      start: today,
      end: nextWeek,
      progress: 0,
    });

    new Notice("Node converted to task");
    this.refreshViews();
  }

  // Show priority menu
  private showPriorityMenu(nodeId: string) {
    const priorities: Array<{ name: string; value: MCNodeMeta["priority"] }> = [
      { name: "Low", value: "low" },
      { name: "Medium", value: "medium" },
      { name: "High", value: "high" },
    ];

    const menu = new Menu();
    priorities.forEach((priority) => {
      menu.addItem((item) => {
        item
          .setTitle(priority.name)
          .onClick(() => {
            this.updateNodeMetadata(nodeId, { priority: priority.value });
            new Notice(`Priority set to ${priority.name}`);
            this.refreshViews();
          });
      });
    });

    menu.showAtMouseEvent(window.event as MouseEvent);
  }

  // Refresh all custom views
  private refreshViews() {
    // Refresh Gantt view
    const ganttLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_GANTT);
    ganttLeaves.forEach(leaf => (leaf.view as GanttView).refresh());

    // Refresh Properties view
    const propLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_PROPERTIES);
    propLeaves.forEach(leaf => (leaf.view as PropertiesView).refresh());
  }

  // Toggle Gantt view
  private async toggleGanttView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_GANTT);
    if (leaves.length > 0) {
      leaves.forEach(leaf => leaf.detach());
      return;
    }

    await this.app.workspace.getRightLeaf(false)?.setViewState({
      type: VIEW_TYPE_GANTT,
      active: true,
    });
  }

  // Toggle Properties view
  private async togglePropertiesView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_PROPERTIES);
    if (leaves.length > 0) {
      leaves.forEach(leaf => leaf.detach());
      return;
    }

    await this.app.workspace.getRightLeaf(false)?.setViewState({
      type: VIEW_TYPE_PROPERTIES,
      active: true,
    });
  }

  // Update status bar
  private updateStatusBar() {
    if (!this.statusBarItem) return;

    const canvas = this.getActiveCanvas();
    if (!canvas) {
      this.statusBarItem.textContent = "";
      return;
    }

    const totalNodes = canvas.nodes.size;
    const selectedNodes = this.getSelectedNodes().length;
    
    this.statusBarItem.textContent = `Canvas: ${totalNodes} nodes, ${selectedNodes} selected`;
  }
}

// Gantt View
class GanttView extends ItemView {
  plugin: MindCanvasPlus;

  constructor(leaf: WorkspaceLeaf, plugin: MindCanvasPlus) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_GANTT;
  }

  getDisplayText() {
    return "Canvas Gantt";
  }

  async onOpen() {
    this.refresh();
  }

  refresh() {
    this.contentEl.empty();
    
    const canvas = this.plugin.getActiveCanvas();
    if (!canvas) {
      this.contentEl.createEl("p", { text: "Open a canvas to see timeline" });
      return;
    }

    // Get tasks (nodes with start/end dates)
    const tasks: Array<{
      id: string;
      label: string;
      start: Date;
      end: Date;
      progress: number;
      priority: string;
    }> = [];

    for (const [nodeId, node] of canvas.nodes) {
      const metadata = this.plugin.getNodeMetadata(nodeId);
      if (metadata?.start && metadata?.end) {
        tasks.push({
          id: nodeId,
          label: node.text?.substring(0, 30) || nodeId,
          start: new Date(metadata.start),
          end: new Date(metadata.end),
          progress: metadata.progress || 0,
          priority: metadata.priority || "medium",
        });
      }
    }

    if (tasks.length === 0) {
      this.contentEl.createEl("p", { text: "No tasks found. Convert nodes to tasks to see them here." });
      return;
    }

    // Create simple timeline
    this.createTimeline(tasks);
  }

  private createTimeline(tasks: Array<any>) {
    const container = this.contentEl.createEl("div", { cls: "gantt-container" });
    
    // Header
    const header = container.createEl("h3", { text: "Canvas Timeline" });
    
    // Calculate date range
    const minDate = new Date(Math.min(...tasks.map(t => t.start.getTime())));
    const maxDate = new Date(Math.max(...tasks.map(t => t.end.getTime())));
    const range = maxDate.getTime() - minDate.getTime();

    // Create timeline
    const timeline = container.createEl("div", { cls: "timeline" });
    
    tasks.forEach((task, index) => {
      const taskEl = timeline.createEl("div", { cls: "timeline-task" });
      
      // Task label
      const labelEl = taskEl.createEl("div", { 
        cls: "task-label",
        text: task.label 
      });
      
      // Task bar container
      const barContainer = taskEl.createEl("div", { cls: "task-bar-container" });
      
      // Calculate position and width
      const startPercent = ((task.start.getTime() - minDate.getTime()) / range) * 100;
      const duration = task.end.getTime() - task.start.getTime();
      const widthPercent = (duration / range) * 100;
      
      // Task bar
      const taskBar = barContainer.createEl("div", { 
        cls: `task-bar priority-${task.priority}` 
      });
      taskBar.style.left = `${startPercent}%`;
      taskBar.style.width = `${widthPercent}%`;
      
      // Progress bar
      const progressBar = taskBar.createEl("div", { cls: "progress-bar" });
      progressBar.style.width = `${task.progress}%`;
      
      // Dates
      const datesEl = taskEl.createEl("div", { 
        cls: "task-dates",
        text: `${task.start.toLocaleDateString()} - ${task.end.toLocaleDateString()}`
      });
    });
  }
}

// Properties View
class PropertiesView extends ItemView {
  plugin: MindCanvasPlus;
  private selectedNodeId: string | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: MindCanvasPlus) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_PROPERTIES;
  }

  getDisplayText() {
    return "Node Properties";
  }

  async onOpen() {
    this.refresh();
    
    // Listen for canvas selection changes
    this.registerInterval(
      window.setInterval(() => {
        this.checkSelection();
      }, 500)
    );
  }

  private checkSelection() {
    const selectedNodes = this.plugin.getSelectedNodes();
    const currentSelection = selectedNodes.length > 0 ? selectedNodes[0].id : null;
    
    if (currentSelection !== this.selectedNodeId) {
      this.selectedNodeId = currentSelection;
      this.refresh();
    }
  }

  refresh() {
    this.contentEl.empty();
    
    if (!this.selectedNodeId) {
      this.contentEl.createEl("p", { text: "Select a node to edit properties" });
      return;
    }

    const metadata = this.plugin.getNodeMetadata(this.selectedNodeId);
    this.createPropertiesForm(this.selectedNodeId, metadata);
  }

  private createPropertiesForm(nodeId: string, metadata: MCNodeMeta | null) {
    const container = this.contentEl.createEl("div", { cls: "properties-container" });
    
    // Header
    container.createEl("h3", { text: "Node Properties" });
    
    // Form
    const form = container.createEl("form");
    
    // Start Date
    const startGroup = form.createEl("div", { cls: "form-group" });
    startGroup.createEl("label", { text: "Start Date" });
    const startInput = startGroup.createEl("input", {
      type: "date",
      value: metadata?.start || ""
    });
    
    // End Date
    const endGroup = form.createEl("div", { cls: "form-group" });
    endGroup.createEl("label", { text: "End Date" });
    const endInput = endGroup.createEl("input", {
      type: "date",
      value: metadata?.end || ""
    });
    
    // Progress
    const progressGroup = form.createEl("div", { cls: "form-group" });
    progressGroup.createEl("label", { text: "Progress %" });
    const progressInput = progressGroup.createEl("input", {
      type: "number",
      min: "0",
      max: "100",
      value: (metadata?.progress || 0).toString()
    });
    
    // Priority
    const priorityGroup = form.createEl("div", { cls: "form-group" });
    priorityGroup.createEl("label", { text: "Priority" });
    const prioritySelect = priorityGroup.createEl("select");
    ["low", "medium", "high"].forEach(priority => {
      const option = prioritySelect.createEl("option", {
        value: priority,
        text: priority.charAt(0).toUpperCase() + priority.slice(1)
      });
      if (metadata?.priority === priority) {
        option.selected = true;
      }
    });
    
    // Tags
    const tagsGroup = form.createEl("div", { cls: "form-group" });
    tagsGroup.createEl("label", { text: "Tags (comma-separated)" });
    const tagsInput = tagsGroup.createEl("input", {
      type: "text",
      value: metadata?.tags?.join(", ") || ""
    });
    
    // Assignee
    const assigneeGroup = form.createEl("div", { cls: "form-group" });
    assigneeGroup.createEl("label", { text: "Assignee" });
    const assigneeInput = assigneeGroup.createEl("input", {
      type: "text",
      value: metadata?.assignee || ""
    });
    
    // Notes
    const notesGroup = form.createEl("div", { cls: "form-group" });
    notesGroup.createEl("label", { text: "Notes" });
    const notesTextarea = notesGroup.createEl("textarea", {
      value: metadata?.notes || ""
    });
    
    // Save button
    const saveButton = form.createEl("button", {
      type: "submit",
      text: "Save Properties"
    });
    
    // Handle form submission
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const updatedMetadata: Partial<MCNodeMeta> = {
        start: startInput.value || undefined,
        end: endInput.value || undefined,
        progress: parseInt(progressInput.value) || 0,
        priority: prioritySelect.value as MCNodeMeta["priority"],
        tags: tagsInput.value.split(",").map(tag => tag.trim()).filter(tag => tag),
        assignee: assigneeInput.value || undefined,
        notes: notesTextarea.value || undefined,
      };
      
      this.plugin.updateNodeMetadata(nodeId, updatedMetadata);
      new Notice("Properties saved");
      this.plugin.refreshViews();
    });
  }
} 