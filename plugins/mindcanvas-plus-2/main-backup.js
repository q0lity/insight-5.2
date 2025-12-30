const { Plugin, Notice, ItemView, WorkspaceLeaf, Menu, Setting, Modal, DropdownComponent, TextComponent, ToggleComponent, SliderComponent, debounce } = require('obsidian');

// View type constants
const VIEW_TYPE_PROPERTIES = 'mindcanvas-properties';
const VIEW_TYPE_GANTT = 'mindcanvas-gantt';
const VIEW_TYPE_ROLLUPS = 'mindcanvas-rollups';
const VIEW_TYPE_FILTERS = 'mindcanvas-filters';

class MindCanvasPlus2 extends Plugin {
  constructor(app, manifest) {
    super(app, manifest);
    this.settings = {
      defaultPriority: 'medium',
      autoSave: true,
      autoCalculateRollups: true,
      showProgressBars: true,
      showPriorityColors: true,
      defaultCurrency: 'USD',
      defaultCostPerHour: 100
    };
    this.debouncedSave = debounce(this.saveCanvasState.bind(this), 1000);
  }

  async onload() {
    console.log('🚀 MindCanvas Plus 2: Loading comprehensive plugin...');
    
    try {
      await this.loadSettings();
      
      // Register all custom views
      this.registerView(VIEW_TYPE_PROPERTIES, (leaf) => new PropertiesView(leaf, this));
      this.registerView(VIEW_TYPE_GANTT, (leaf) => new GanttView(leaf, this));
      this.registerView(VIEW_TYPE_ROLLUPS, (leaf) => new RollupsView(leaf, this));
      this.registerView(VIEW_TYPE_FILTERS, (leaf) => new FiltersView(leaf, this));

      // Add ribbon icons
      this.addRibbonIcon('settings', 'Open Properties Panel', () => {
        this.togglePropertiesView();
      });
      
      this.addRibbonIcon('calendar', 'Open Gantt View', () => {
        this.toggleGanttView();
      });
      
      this.addRibbonIcon('calculator', 'Open Roll-ups View', () => {
        this.toggleRollupsView();
      });

      this.addRibbonIcon('filter', 'Open Filters View', () => {
        this.toggleFiltersView();
      });

      // Register hotkey commands
      this.addCommand({
        id: 'add-connected-node',
        name: 'Add connected node',
        hotkeys: [{ modifiers: ['Mod'], key: 'Enter' }],
        checkCallback: (checking) => {
          const canvas = this.getActiveCanvas();
          if (checking) return !!canvas;
          this.addConnectedNode();
        }
      });

      this.addCommand({
        id: 'add-child-node',
        name: 'Add child node',
        hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'Enter' }],
        checkCallback: (checking) => {
          const canvas = this.getActiveCanvas();
          if (checking) return !!canvas;
          this.addChildNode();
        }
      });

      this.addCommand({
        id: 'add-sibling-node',
        name: 'Add sibling node',
        hotkeys: [{ modifiers: ['Alt'], key: 'Enter' }],
        checkCallback: (checking) => {
          const canvas = this.getActiveCanvas();
          if (checking) return !!canvas;
          this.addSiblingNode();
        }
      });

      // Task management commands
      this.addCommand({
        id: 'convert-to-task',
        name: 'Convert to task',
        checkCallback: (checking) => {
          const canvas = this.getActiveCanvas();
          const selected = this.getSelectedNodes();
          if (checking) return !!canvas && selected.length > 0;
          this.convertToTask();
        }
      });

      this.addCommand({
        id: 'calculate-rollups',
        name: 'Calculate roll-ups',
        checkCallback: (checking) => {
          const canvas = this.getActiveCanvas();
          if (checking) return !!canvas;
          this.calculateAllRollups();
        }
      });

      this.addCommand({
        id: 'sync-to-obsidian',
        name: 'Sync to Obsidian properties',
        checkCallback: (checking) => {
          const canvas = this.getActiveCanvas();
          if (checking) return !!canvas;
          this.syncAllToObsidian();
        }
      });

      // View toggle commands
      this.addCommand({
        id: 'toggle-properties',
        name: 'Toggle properties panel',
        callback: () => this.togglePropertiesView()
      });

      this.addCommand({
        id: 'toggle-gantt',
        name: 'Toggle Gantt view',
        callback: () => this.toggleGanttView()
      });

      this.addCommand({
        id: 'toggle-rollups',
        name: 'Toggle roll-ups view',
        callback: () => this.toggleRollupsView()
      });

      this.addCommand({
        id: 'toggle-filters',
        name: 'Toggle filters view',
        callback: () => this.toggleFiltersView()
      });

      // Debug command
      this.addCommand({
        id: 'debug-canvas',
        name: 'Debug Canvas Info',
        callback: () => this.debugCanvas()
      });

      // Status bar
      this.statusBarItem = this.addStatusBarItem();
      this.updateStatusBar();

      // Register events
      this.registerEvent(
        this.app.workspace.on('active-leaf-change', () => {
          this.updateStatusBar();
          this.refreshViews();
        })
      );

      this.registerEvent(
        this.app.workspace.on('layout-change', () => {
          setTimeout(() => {
            this.updateStatusBar();
            if (this.settings.autoCalculateRollups) {
              this.calculateAllRollups();
            }
          }, 100);
        })
      );

      // Canvas-specific events
      this.registerEvent(
        this.app.workspace.on('editor-menu', (menu, editor, view) => {
          if (view.getViewType() === 'canvas') {
            this.addCanvasContextMenu(menu);
          }
        })
      );

      // Auto-save interval
      this.registerInterval(
        setInterval(() => {
          if (this.settings.autoSave) {
            this.debouncedSave();
          }
        }, 5000)
      );

      console.log('✅ MindCanvas Plus 2: Loaded successfully with all features');
      new Notice('MindCanvas Plus 2 ready! 🚀');
      
    } catch (error) {
      console.error('❌ MindCanvas Plus 2: Loading failed:', error);
      new Notice('MindCanvas Plus 2 failed to load: ' + error.message);
    }
  }

  async onunload() {
    console.log('MindCanvas Plus 2: Unloading');
    await this.saveSettings();
  }

  // ============================================================================
  // CANVAS API INTEGRATION
  // ============================================================================

  getActiveCanvas() {
    try {
      // Method 1: Check active leaf
      const activeLeaf = this.app.workspace.activeLeaf;
      if (activeLeaf?.view?.getViewType() === 'canvas') {
        const canvasView = activeLeaf.view;
        
        // Try different canvas access patterns
        if (canvasView.canvas) return canvasView.canvas;
        if (typeof canvasView.createTextNode === 'function') return canvasView;
        return canvasView;
      }

      // Method 2: Find any canvas leaves
      const canvasLeaves = this.app.workspace.getLeavesOfType('canvas');
      if (canvasLeaves.length > 0) {
        const canvasView = canvasLeaves[0].view;
        return canvasView.canvas || canvasView;
      }

      return null;
    } catch (error) {
      console.error('Error getting active canvas:', error);
      return null;
    }
  }

  getSelectedNodes() {
    const canvas = this.getActiveCanvas();
    if (!canvas) return [];

    const selectedNodes = [];
    
    try {
      // Try multiple selection detection methods
      if (canvas.selection) {
        if (canvas.selection.size !== undefined) {
          // Set-based selection
          for (const nodeId of canvas.selection) {
            const node = canvas.nodes?.get ? canvas.nodes.get(nodeId) : canvas.nodes?.[nodeId];
            if (node) selectedNodes.push(node);
          }
        } else if (canvas.selection.length !== undefined) {
          // Array-based selection
          for (const nodeId of canvas.selection) {
            const node = canvas.nodes?.get ? canvas.nodes.get(nodeId) : canvas.nodes?.[nodeId];
            if (node) selectedNodes.push(node);
          }
        }
      }

      // Fallback: Check selectedNodes property
      if (selectedNodes.length === 0 && canvas.selectedNodes) {
        if (canvas.selectedNodes.size !== undefined) {
          for (const node of canvas.selectedNodes) {
            selectedNodes.push(node);
          }
        } else if (canvas.selectedNodes.length !== undefined) {
          selectedNodes.push(...canvas.selectedNodes);
        }
      }

      // Fallback: Check all nodes for selected property
      if (selectedNodes.length === 0 && canvas.nodes) {
        const checkNode = (node) => {
          if (node.selected === true) {
            selectedNodes.push(node);
          }
        };

        if (canvas.nodes.forEach) {
          canvas.nodes.forEach(checkNode);
        } else if (canvas.nodes.values) {
          for (const node of canvas.nodes.values()) {
            checkNode(node);
          }
        }
      }

      return selectedNodes;
    } catch (error) {
      console.error('Error getting selected nodes:', error);
      return [];
    }
  }

  createNode(canvas, nodeData) {
    try {
      let newNode = null;
      
      // Try different Canvas API methods
      if (typeof canvas.createTextNode === 'function') {
        newNode = canvas.createTextNode(nodeData);
      } else if (typeof canvas.addNode === 'function') {
        newNode = canvas.addNode({ type: 'text', ...nodeData });
      } else if (typeof canvas.createNode === 'function') {
        newNode = canvas.createNode({ type: 'text', ...nodeData });
      }

      if (newNode) {
        // Initialize metadata
        this.initializeNodeMetadata(newNode);
        
        // Apply visual indicators
        this.applyVisualIndicators(newNode);
        
        // Auto-save
        this.debouncedSave();
        
        return newNode;
      }
      
      return null;
    } catch (error) {
      console.error('Error creating node:', error);
      return null;
    }
  }

  createEdge(canvas, fromId, toId) {
    try {
      if (typeof canvas.createEdge === 'function') {
        return canvas.createEdge({
          from: fromId,
          to: toId
        });
      } else if (typeof canvas.addEdge === 'function') {
        return canvas.addEdge({
          from: fromId,
          to: toId
        });
      } else if (typeof canvas.connectNodes === 'function') {
        return canvas.connectNodes(fromId, toId);
      }
      return null;
    } catch (error) {
      console.error('Error creating edge:', error);
      return null;
    }
  }

  // ============================================================================
  // NODE CREATION METHODS
  // ============================================================================

  addConnectedNode() {
    const canvas = this.getActiveCanvas();
    if (!canvas) {
      new Notice('Please open a canvas first');
      return;
    }

    const selectedNodes = this.getSelectedNodes();
    
    if (selectedNodes.length === 0) {
      // Create standalone node
      const newNode = this.createNode(canvas, {
        text: 'New Node',
        x: 300,
        y: 200,
        width: 200,
        height: 60
      });
      
      if (newNode) {
        new Notice('Created standalone node');
        this.selectAndFocusNode(canvas, newNode);
      }
      return;
    }

    // Create connected node
    const sourceNode = selectedNodes[0];
    const newNode = this.createNode(canvas, {
      text: 'Connected Node',
      x: sourceNode.x + (sourceNode.width || 200) + 50,
      y: sourceNode.y,
      width: 200,
      height: 60
    });

    if (newNode) {
      this.createEdge(canvas, sourceNode.id, newNode.id);
      new Notice('Created connected node');
      this.selectAndFocusNode(canvas, newNode);
    }
  }

  addChildNode() {
    const canvas = this.getActiveCanvas();
    if (!canvas) {
      new Notice('Please open a canvas first');
      return;
    }

    const selectedNodes = this.getSelectedNodes();
    if (selectedNodes.length === 0) {
      new Notice('Please select a parent node first');
      return;
    }

    const parentNode = selectedNodes[0];
    const newNode = this.createNode(canvas, {
      text: 'Child Node',
      x: parentNode.x + 50,
      y: parentNode.y + (parentNode.height || 60) + 50,
      width: 200,
      height: 60
    });

    if (newNode) {
      // Create hierarchical relationship
      this.initializeNodeMetadata(parentNode);
      this.initializeNodeMetadata(newNode);
      
      newNode.ext.mcp.parentId = parentNode.id;
      newNode.ext.mcp.level = (parentNode.ext.mcp.level || 0) + 1;
      
      if (!parentNode.ext.mcp.childIds) parentNode.ext.mcp.childIds = [];
      parentNode.ext.mcp.childIds.push(newNode.id);

      this.createEdge(canvas, parentNode.id, newNode.id);
      new Notice('Created child node');
      this.selectAndFocusNode(canvas, newNode);
      
      // Auto-calculate rollups
      setTimeout(() => this.calculateNodeRollups(parentNode.id), 200);
    }
  }

  addSiblingNode() {
    const canvas = this.getActiveCanvas();
    if (!canvas) {
      new Notice('Please open a canvas first');
      return;
    }

    const selectedNodes = this.getSelectedNodes();
    if (selectedNodes.length === 0) {
      new Notice('Please select a node first');
      return;
    }

    const siblingNode = selectedNodes[0];
    const newNode = this.createNode(canvas, {
      text: 'Sibling Node',
      x: siblingNode.x,
      y: siblingNode.y + (siblingNode.height || 60) + 30,
      width: 200,
      height: 60
    });

    if (newNode) {
      // If sibling has a parent, make this a child of the same parent
      if (siblingNode.ext?.mcp?.parentId) {
        const parentId = siblingNode.ext.mcp.parentId;
        const parentNode = this.getNodeById(canvas, parentId);
        
        if (parentNode) {
          this.initializeNodeMetadata(newNode);
          newNode.ext.mcp.parentId = parentId;
          newNode.ext.mcp.level = siblingNode.ext.mcp.level;
          
          this.initializeNodeMetadata(parentNode);
          if (!parentNode.ext.mcp.childIds) parentNode.ext.mcp.childIds = [];
          parentNode.ext.mcp.childIds.push(newNode.id);
          
          this.createEdge(canvas, parentId, newNode.id);
        }
      }
      
      new Notice('Created sibling node');
      this.selectAndFocusNode(canvas, newNode);
    }
  }

  selectAndFocusNode(canvas, node) {
    setTimeout(() => {
      try {
        if (canvas.deselectAll) canvas.deselectAll();
        
        if (canvas.selectNode) {
          canvas.selectNode(node);
        } else if (canvas.addToSelection) {
          canvas.addToSelection(node);
        } else if (canvas.selection && canvas.selection.add) {
          canvas.selection.add(node.id);
        }
        
        if (canvas.startEditing) {
          canvas.startEditing(node);
        }
        
        if (canvas.requestSave) {
          canvas.requestSave();
        }
      } catch (error) {
        console.error('Error selecting/focusing node:', error);
      }
    }, 50);
  }

  getNodeById(canvas, nodeId) {
    try {
      if (canvas.nodes?.get) {
        return canvas.nodes.get(nodeId);
      } else if (canvas.nodes?.[nodeId]) {
        return canvas.nodes[nodeId];
      }
      return null;
    } catch (error) {
      console.error('Error getting node by ID:', error);
      return null;
    }
  }

  // ============================================================================
  // METADATA MANAGEMENT
  // ============================================================================

  initializeNodeMetadata(node) {
    if (!node.ext) node.ext = {};
    if (!node.ext.mcp) {
      node.ext.mcp = {
        // Basic properties
        isTask: false,
        progress: 0,
        priority: this.settings.defaultPriority,
        status: 'not-started',
        tags: [],
        assignee: '',
        notes: '',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        
        // Task-specific
        taskType: 'task', // task, milestone, summary
        startDate: null,
        endDate: null,
        duration: 1, // days
        estimatedHours: 0,
        actualHours: 0,
        
        // Financial
        cost: 0,
        budget: 0,
        actualCost: 0,
        currency: this.settings.defaultCurrency,
        costPerHour: this.settings.defaultCostPerHour,
        
        // Hierarchy
        parentId: null,
        childIds: [],
        level: 0,
        dependencies: [],
        
        // Roll-up calculations
        rollupProgress: 0,
        rollupCost: 0,
        rollupBudget: 0,
        rollupDuration: 0,
        rollupEffort: 0,
        
        // Obsidian integration
        linkedNote: null,
        backlinks: [],
        syncToProperties: true,
        
        // Visual
        shape: 'rectangle',
        color: null,
        icon: null,
        
        // Formulas
        formulas: {},
        calculatedFields: {}
      };
    }
    
    // Update timestamp
    node.ext.mcp.updated = new Date().toISOString();
  }

  updateNodeMetadata(nodeId, updates) {
    const canvas = this.getActiveCanvas();
    if (!canvas) return false;
    
    const node = this.getNodeById(canvas, nodeId);
    if (!node) return false;
    
    this.initializeNodeMetadata(node);
    
    // Apply updates
    Object.assign(node.ext.mcp, updates);
    node.ext.mcp.updated = new Date().toISOString();
    
    // Apply visual indicators
    this.applyVisualIndicators(node);
    
    // Trigger auto-save
    this.debouncedSave();
    
    // Refresh views
    this.refreshViews();
    
    // Sync to Obsidian if enabled
    if (node.ext.mcp.syncToProperties) {
      this.syncNodeToObsidian(node);
    }
    
    return true;
  }

  // ============================================================================
  // VISUAL INDICATORS
  // ============================================================================

  applyVisualIndicators(node) {
    if (!node.ext?.mcp || !this.settings.showPriorityColors) return;
    
    try {
      const canvas = this.getActiveCanvas();
      if (!canvas) return;
      
      // Find the DOM element for this node
      const nodeElement = this.findNodeElement(node.id);
      if (!nodeElement) return;
      
      // Apply priority colors
      if (this.settings.showPriorityColors) {
        nodeElement.setAttribute('data-task-priority', node.ext.mcp.priority);
        nodeElement.setAttribute('data-task-status', node.ext.mcp.status);
        nodeElement.setAttribute('data-is-task', node.ext.mcp.isTask.toString());
      }
      
      // Apply progress indicators
      if (this.settings.showProgressBars && node.ext.mcp.isTask) {
        this.addProgressIndicator(nodeElement, node.ext.mcp.progress);
      }
      
      // Apply task type indicators
      if (node.ext.mcp.isTask) {
        nodeElement.setAttribute('data-task-type', node.ext.mcp.taskType);
      }
      
    } catch (error) {
      console.error('Error applying visual indicators:', error);
    }
  }

  findNodeElement(nodeId) {
    try {
      // Try different selectors to find the node element
      const selectors = [
        `[data-node-id="${nodeId}"]`,
        `.canvas-node[data-id="${nodeId}"]`,
        `#node-${nodeId}`,
        `.node-${nodeId}`
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) return element;
      }
      
      // Fallback: search all canvas nodes
      const canvasNodes = document.querySelectorAll('.canvas-node');
      for (const nodeEl of canvasNodes) {
        if (nodeEl.textContent?.includes(nodeId) || nodeEl.id?.includes(nodeId)) {
          return nodeEl;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding node element:', error);
      return null;
    }
  }

  addProgressIndicator(nodeElement, progress) {
    try {
      // Remove existing progress indicator
      const existing = nodeElement.querySelector('.mcp-progress-indicator');
      if (existing) existing.remove();
      
      // Create new progress indicator
      const progressContainer = document.createElement('div');
      progressContainer.className = 'mcp-progress-indicator';
      progressContainer.style.cssText = `
        position: absolute;
        bottom: 2px;
        left: 2px;
        right: 2px;
        height: 4px;
        background: var(--background-modifier-border);
        border-radius: 2px;
        overflow: hidden;
      `;
      
      const progressFill = document.createElement('div');
      progressFill.className = 'mcp-progress-fill';
      progressFill.style.cssText = `
        height: 100%;
        background: var(--interactive-accent);
        border-radius: 2px;
        width: ${progress}%;
        transition: width 0.3s ease;
      `;
      
      progressContainer.appendChild(progressFill);
      nodeElement.appendChild(progressContainer);
      
    } catch (error) {
      console.error('Error adding progress indicator:', error);
    }
  }

  // ============================================================================
  // TASK CONVERSION
  // ============================================================================

  convertToTask() {
    const selectedNodes = this.getSelectedNodes();
    if (selectedNodes.length === 0) {
      new Notice('Please select a node to convert');
      return;
    }

    const node = selectedNodes[0];
    this.initializeNodeMetadata(node);
    
    // Convert to task
    node.ext.mcp.isTask = true;
    node.ext.mcp.status = 'not-started';
    node.ext.mcp.startDate = new Date().toISOString().split('T')[0];
    
    // Calculate end date (start + duration)
    const startDate = new Date(node.ext.mcp.startDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + node.ext.mcp.duration);
    node.ext.mcp.endDate = endDate.toISOString().split('T')[0];
    
    // Apply visual indicators
    this.applyVisualIndicators(node);
    
    // Auto-save and refresh
    this.debouncedSave();
    this.refreshViews();
    
    new Notice('Converted to task successfully');
  }

  // ============================================================================
  // ROLL-UP CALCULATIONS
  // ============================================================================

  calculateNodeRollups(nodeId) {
    const canvas = this.getActiveCanvas();
    if (!canvas) return;
    
    const node = this.getNodeById(canvas, nodeId);
    if (!node || !node.ext?.mcp) return;
    
    const metadata = node.ext.mcp;
    
    if (!metadata.childIds || metadata.childIds.length === 0) {
      // Leaf node - rollups equal own values
      metadata.rollupProgress = metadata.progress;
      metadata.rollupCost = metadata.actualCost || metadata.cost;
      metadata.rollupBudget = metadata.budget;
      metadata.rollupDuration = metadata.duration;
      metadata.rollupEffort = metadata.actualHours || metadata.estimatedHours;
      return;
    }
    
    // Calculate rollups from children
    let totalProgress = 0;
    let totalCost = 0;
    let totalBudget = 0;
    let totalDuration = 0;
    let totalEffort = 0;
    let validChildren = 0;
    
    for (const childId of metadata.childIds) {
      const childNode = this.getNodeById(canvas, childId);
      if (childNode?.ext?.mcp) {
        const childMeta = childNode.ext.mcp;
        
        // Recursively calculate child rollups first
        this.calculateNodeRollups(childId);
        
        totalProgress += childMeta.rollupProgress || childMeta.progress || 0;
        totalCost += childMeta.rollupCost || childMeta.actualCost || childMeta.cost || 0;
        totalBudget += childMeta.rollupBudget || childMeta.budget || 0;
        totalDuration += childMeta.rollupDuration || childMeta.duration || 0;
        totalEffort += childMeta.rollupEffort || childMeta.actualHours || childMeta.estimatedHours || 0;
        validChildren++;
      }
    }
    
    if (validChildren > 0) {
      metadata.rollupProgress = Math.round(totalProgress / validChildren);
      metadata.rollupCost = totalCost;
      metadata.rollupBudget = totalBudget;
      metadata.rollupDuration = totalDuration;
      metadata.rollupEffort = totalEffort;
    }
    
    // Update visual indicators
    this.applyVisualIndicators(node);
  }

  calculateAllRollups() {
    const canvas = this.getActiveCanvas();
    if (!canvas) {
      new Notice('Please open a canvas first');
      return;
    }
    
    // Find root nodes (no parents) and calculate from top down
    const processedNodes = new Set();
    
    try {
      const processNode = (node, nodeId) => {
        if (processedNodes.has(nodeId)) return;
        
        if (node.ext?.mcp) {
          this.calculateNodeRollups(nodeId);
          processedNodes.add(nodeId);
        }
      };
      
      if (canvas.nodes?.forEach) {
        canvas.nodes.forEach(processNode);
      } else if (canvas.nodes) {
        for (const [nodeId, node] of canvas.nodes) {
          processNode(node, nodeId);
        }
      }
      
      this.refreshViews();
      new Notice('Roll-ups calculated successfully');
      
    } catch (error) {
      console.error('Error calculating rollups:', error);
      new Notice('Error calculating roll-ups');
    }
  }

  // ============================================================================
  // OBSIDIAN INTEGRATION
  // ============================================================================

  async syncNodeToObsidian(node) {
    if (!node.ext?.mcp?.linkedNote) return;
    
    try {
      const notePath = node.ext.mcp.linkedNote;
      const file = this.app.vault.getAbstractFileByPath(notePath);
      
      if (file) {
        await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
          frontmatter['mcp-progress'] = node.ext.mcp.progress;
          frontmatter['mcp-priority'] = node.ext.mcp.priority;
          frontmatter['mcp-status'] = node.ext.mcp.status;
          frontmatter['mcp-cost'] = node.ext.mcp.cost;
          frontmatter['mcp-budget'] = node.ext.mcp.budget;
          frontmatter['mcp-start-date'] = node.ext.mcp.startDate;
          frontmatter['mcp-end-date'] = node.ext.mcp.endDate;
          frontmatter['mcp-assignee'] = node.ext.mcp.assignee;
          frontmatter['mcp-tags'] = node.ext.mcp.tags;
        });
      }
    } catch (error) {
      console.error('Error syncing to Obsidian:', error);
    }
  }

  async syncAllToObsidian() {
    const canvas = this.getActiveCanvas();
    if (!canvas) {
      new Notice('Please open a canvas first');
      return;
    }
    
    let synced = 0;
    
    try {
      const syncNode = async (node) => {
        if (node.ext?.mcp?.linkedNote) {
          await this.syncNodeToObsidian(node);
          synced++;
        }
      };
      
      if (canvas.nodes?.forEach) {
        for (const [, node] of canvas.nodes) {
          await syncNode(node);
        }
      } else if (canvas.nodes) {
        for (const [, node] of canvas.nodes) {
          await syncNode(node);
        }
      }
      
      new Notice(`Synced ${synced} nodes to Obsidian properties`);
      
    } catch (error) {
      console.error('Error syncing to Obsidian:', error);
      new Notice('Error syncing to Obsidian');
    }
  }

  // ============================================================================
  // VIEW MANAGEMENT
  // ============================================================================

  async togglePropertiesView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_PROPERTIES);
    if (leaves.length > 0) {
      leaves.forEach(leaf => leaf.detach());
    } else {
      const leaf = this.app.workspace.getRightLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE_PROPERTIES, active: true });
      this.app.workspace.revealLeaf(leaf);
    }
  }

  async toggleGanttView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_GANTT);
    if (leaves.length > 0) {
      leaves.forEach(leaf => leaf.detach());
    } else {
      const leaf = this.app.workspace.getRightLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE_GANTT, active: true });
      this.app.workspace.revealLeaf(leaf);
    }
  }

  async toggleRollupsView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_ROLLUPS);
    if (leaves.length > 0) {
      leaves.forEach(leaf => leaf.detach());
    } else {
      const leaf = this.app.workspace.getRightLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE_ROLLUPS, active: true });
      this.app.workspace.revealLeaf(leaf);
    }
  }

  async toggleFiltersView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FILTERS);
    if (leaves.length > 0) {
      leaves.forEach(leaf => leaf.detach());
    } else {
      const leaf = this.app.workspace.getRightLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE_FILTERS, active: true });
      this.app.workspace.revealLeaf(leaf);
    }
  }

  refreshViews() {
    const viewTypes = [VIEW_TYPE_PROPERTIES, VIEW_TYPE_GANTT, VIEW_TYPE_ROLLUPS, VIEW_TYPE_FILTERS];
    
    viewTypes.forEach(viewType => {
      const leaves = this.app.workspace.getLeavesOfType(viewType);
      leaves.forEach(leaf => {
        if (leaf.view && leaf.view.refresh) {
          leaf.view.refresh();
        }
      });
    });
  }

  // ============================================================================
  // CONTEXT MENU
  // ============================================================================

  addCanvasContextMenu(menu) {
    menu.addItem((item) => {
      item.setTitle('Convert to Task')
          .setIcon('check-square')
          .onClick(() => this.convertToTask());
    });

    menu.addItem((item) => {
      item.setTitle('Add Connected Node')
          .setIcon('plus')
          .onClick(() => this.addConnectedNode());
    });

    menu.addItem((item) => {
      item.setTitle('Calculate Roll-ups')
          .setIcon('calculator')
          .onClick(() => this.calculateAllRollups());
    });

    menu.addItem((item) => {
      item.setTitle('Sync to Obsidian')
          .setIcon('sync')
          .onClick(() => this.syncAllToObsidian());
    });
  }

  // ============================================================================
  // STATUS BAR
  // ============================================================================

  updateStatusBar() {
    const canvas = this.getActiveCanvas();
    if (!canvas) {
      this.statusBarItem.setText('MCP: No canvas');
      return;
    }
    
    let nodeCount = 0;
    let taskCount = 0;
    let totalCost = 0;
    let avgProgress = 0;
    let progressCount = 0;
    
    try {
      const processNode = (node) => {
        nodeCount++;
        if (node.ext?.mcp) {
          if (node.ext.mcp.isTask) {
            taskCount++;
            avgProgress += node.ext.mcp.rollupProgress || node.ext.mcp.progress || 0;
            progressCount++;
          }
          totalCost += node.ext.mcp.rollupCost || node.ext.mcp.actualCost || node.ext.mcp.cost || 0;
        }
      };
      
      if (canvas.nodes?.forEach) {
        canvas.nodes.forEach(processNode);
      } else if (canvas.nodes) {
        for (const [, node] of canvas.nodes) {
          processNode(node);
        }
      }
      
      const avgProgressPercent = progressCount > 0 ? Math.round(avgProgress / progressCount) : 0;
      this.statusBarItem.setText(
        `MCP: ${nodeCount} nodes, ${taskCount} tasks, ${avgProgressPercent}% avg, $${Math.round(totalCost)}`
      );
      
    } catch (error) {
      console.error('Error updating status bar:', error);
      this.statusBarItem.setText('MCP: Error');
    }
  }

  // ============================================================================
  // DEBUGGING
  // ============================================================================

  debugCanvas() {
    console.log('=== MindCanvas Plus 2 Debug ===');
    
    const canvas = this.getActiveCanvas();
    if (!canvas) {
      new Notice('No canvas found');
      return;
    }
    
    console.log('Canvas object:', canvas);
    console.log('Canvas methods:', Object.getOwnPropertyNames(canvas).filter(prop => 
      typeof canvas[prop] === 'function'
    ));
    
    if (canvas.nodes) {
      console.log('Nodes structure:', canvas.nodes);
      let nodeCount = 0;
      
      const logNode = (node, id) => {
        nodeCount++;
        console.log(`Node ${id}:`, {
          id,
          type: node.type,
          text: node.text?.substring(0, 50),
          x: node.x,
          y: node.y,
          metadata: node.ext?.mcp ? 'Has MCP metadata' : 'No metadata'
        });
      };
      
      if (canvas.nodes.forEach) {
        canvas.nodes.forEach(logNode);
      } else {
        for (const [id, node] of canvas.nodes) {
          logNode(node, id);
        }
      }
      
      console.log(`Total nodes: ${nodeCount}`);
    }
    
    const selected = this.getSelectedNodes();
    console.log('Selected nodes:', selected.length);
    
    new Notice('Debug info logged to console');
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  async saveCanvasState() {
    const canvas = this.getActiveCanvas();
    if (!canvas) return;
    
    try {
      if (canvas.requestSave) {
        await canvas.requestSave();
      } else if (canvas.save) {
        await canvas.save();
      }
    } catch (error) {
      console.error('Error saving canvas state:', error);
    }
  }

  // ============================================================================
  // SETTINGS
  // ============================================================================

  async loadSettings() {
    this.settings = Object.assign({}, this.settings, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

// ============================================================================
// PROPERTIES VIEW
// ============================================================================

class PropertiesView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.selectedNodeId = null;
  }

  getViewType() { return VIEW_TYPE_PROPERTIES; }
  getDisplayText() { return 'Properties'; }
  getIcon() { return 'settings'; }

  async onOpen() {
    this.refresh();
    this.registerInterval(setInterval(() => this.checkSelection(), 500));
  }

  checkSelection() {
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
      this.contentEl.createEl('p', { text: 'Select a node to edit properties' });
      return;
    }

    const canvas = this.plugin.getActiveCanvas();
    if (!canvas) {
      this.contentEl.createEl('p', { text: 'No canvas available' });
      return;
    }

    const node = this.plugin.getNodeById(canvas, this.selectedNodeId);
    if (!node) {
      this.contentEl.createEl('p', { text: 'Node not found' });
      return;
    }

    this.plugin.initializeNodeMetadata(node);
    this.createPropertiesForm(node);
  }

  createPropertiesForm(node) {
    const container = this.contentEl.createEl('div', { cls: 'properties-container' });
    
    container.createEl('h3', { text: 'Node Properties' });
    
    const metadata = node.ext.mcp;
    
    // Basic Properties
    this.createSection(container, 'Basic', [
      { key: 'isTask', label: 'Is Task', type: 'toggle' },
      { key: 'priority', label: 'Priority', type: 'dropdown', options: ['low', 'medium', 'high'] },
      { key: 'status', label: 'Status', type: 'dropdown', options: ['not-started', 'in-progress', 'completed', 'blocked', 'cancelled'] },
      { key: 'progress', label: 'Progress (%)', type: 'slider', min: 0, max: 100 }
    ], metadata);

    // Task Properties (only if isTask)
    if (metadata.isTask) {
      this.createSection(container, 'Task Details', [
        { key: 'taskType', label: 'Type', type: 'dropdown', options: ['task', 'milestone', 'summary'] },
        { key: 'startDate', label: 'Start Date', type: 'date' },
        { key: 'endDate', label: 'End Date', type: 'date' },
        { key: 'duration', label: 'Duration (days)', type: 'number' },
        { key: 'estimatedHours', label: 'Estimated Hours', type: 'number' },
        { key: 'actualHours', label: 'Actual Hours', type: 'number' }
      ], metadata);

      this.createSection(container, 'Financial', [
        { key: 'cost', label: 'Cost', type: 'number' },
        { key: 'budget', label: 'Budget', type: 'number' },
        { key: 'actualCost', label: 'Actual Cost', type: 'number' },
        { key: 'costPerHour', label: 'Cost/Hour', type: 'number' }
      ], metadata);

      this.createSection(container, 'Assignment', [
        { key: 'assignee', label: 'Assignee', type: 'text' },
        { key: 'tags', label: 'Tags', type: 'text' },
        { key: 'notes', label: 'Notes', type: 'textarea' }
      ], metadata);
    }

    // Roll-up Display (read-only)
    if (metadata.childIds && metadata.childIds.length > 0) {
      this.createRollupSection(container, metadata);
    }

    // Actions
    this.createActionsSection(container, node);
  }

  createSection(parent, title, fields, metadata) {
    const section = parent.createEl('div', { cls: 'property-section' });
    section.createEl('h4', { text: title });

    fields.forEach(field => {
      const fieldContainer = section.createEl('div', { cls: 'property-field' });
      fieldContainer.createEl('label', { text: field.label });

      let input;
      switch (field.type) {
        case 'toggle':
          input = new ToggleComponent(fieldContainer);
          input.setValue(metadata[field.key] || false);
          input.onChange(value => this.updateField(field.key, value));
          break;

        case 'dropdown':
          input = new DropdownComponent(fieldContainer);
          field.options.forEach(option => input.addOption(option, option));
          input.setValue(metadata[field.key] || field.options[0]);
          input.onChange(value => this.updateField(field.key, value));
          break;

        case 'slider':
          input = new SliderComponent(fieldContainer);
          input.setLimits(field.min || 0, field.max || 100, 1);
          input.setValue(metadata[field.key] || 0);
          input.onChange(value => this.updateField(field.key, value));
          break;

        case 'number':
          input = new TextComponent(fieldContainer);
          input.inputEl.type = 'number';
          input.setValue(String(metadata[field.key] || 0));
          input.onChange(value => this.updateField(field.key, parseFloat(value) || 0));
          break;

        case 'date':
          input = new TextComponent(fieldContainer);
          input.inputEl.type = 'date';
          input.setValue(metadata[field.key] || '');
          input.onChange(value => this.updateField(field.key, value));
          break;

        case 'text':
          input = new TextComponent(fieldContainer);
          input.setValue(metadata[field.key] || '');
          input.onChange(value => this.updateField(field.key, value));
          break;

        case 'textarea':
          input = fieldContainer.createEl('textarea');
          input.value = metadata[field.key] || '';
          input.addEventListener('input', () => this.updateField(field.key, input.value));
          break;
      }
    });
  }

  createRollupSection(parent, metadata) {
    const section = parent.createEl('div', { cls: 'rollup-section' });
    section.createEl('h4', { text: 'Roll-up Summary' });

    const rollups = [
      { label: 'Progress', value: `${Math.round(metadata.rollupProgress || 0)}%` },
      { label: 'Cost', value: `$${Math.round(metadata.rollupCost || 0)}` },
      { label: 'Budget', value: `$${Math.round(metadata.rollupBudget || 0)}` },
      { label: 'Duration', value: `${metadata.rollupDuration || 0} days` },
      { label: 'Effort', value: `${metadata.rollupEffort || 0} hours` }
    ];

    rollups.forEach(rollup => {
      const row = section.createEl('div', { cls: 'rollup-row' });
      row.createEl('span', { text: rollup.label });
      row.createEl('strong', { text: rollup.value });
    });
  }

  createActionsSection(parent, node) {
    const section = parent.createEl('div', { cls: 'actions-section' });
    section.createEl('h4', { text: 'Actions' });

    const actions = section.createEl('div', { cls: 'action-buttons' });

    const calculateBtn = actions.createEl('button', { text: 'Calculate Roll-ups' });
    calculateBtn.addEventListener('click', () => {
      this.plugin.calculateNodeRollups(node.id);
      this.refresh();
    });

    const syncBtn = actions.createEl('button', { text: 'Sync to Obsidian' });
    syncBtn.addEventListener('click', () => {
      this.plugin.syncNodeToObsidian(node);
      new Notice('Synced to Obsidian properties');
    });

    const linkBtn = actions.createEl('button', { text: 'Link to Note' });
    linkBtn.addEventListener('click', () => this.linkToNote(node));
  }

  updateField(key, value) {
    if (this.selectedNodeId) {
      this.plugin.updateNodeMetadata(this.selectedNodeId, { [key]: value });
    }
  }

  async linkToNote(node) {
    const noteTitle = node.text || 'Untitled';
    const notePath = `${noteTitle}.md`;
    
    try {
      let file = this.app.vault.getAbstractFileByPath(notePath);
      
      if (!file) {
        const noteContent = `# ${noteTitle}\n\nLinked from canvas node: ${node.id}\n`;
        file = await this.app.vault.create(notePath, noteContent);
      }
      
      this.plugin.updateNodeMetadata(node.id, { linkedNote: notePath });
      await this.plugin.syncNodeToObsidian(node);
      
      new Notice(`Linked to ${notePath}`);
      this.refresh();
      
    } catch (error) {
      console.error('Error linking to note:', error);
      new Notice('Error linking to note');
    }
  }
}

// ============================================================================
// GANTT VIEW
// ============================================================================

class GanttView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() { return VIEW_TYPE_GANTT; }
  getDisplayText() { return 'Gantt Chart'; }
  getIcon() { return 'calendar'; }

  async onOpen() {
    this.refresh();
  }

  refresh() {
    this.contentEl.empty();
    
    const canvas = this.plugin.getActiveCanvas();
    if (!canvas) {
      this.contentEl.createEl('p', { text: 'Open a canvas to see timeline' });
      return;
    }

    const tasks = this.getTasks(canvas);
    
    if (tasks.length === 0) {
      this.contentEl.createEl('p', { text: 'No tasks found. Convert nodes to tasks to see them here.' });
      return;
    }

    this.createGanttChart(tasks);
  }

  getTasks(canvas) {
    const tasks = [];
    
    try {
      const processNode = (node, nodeId) => {
        if (node.ext?.mcp?.isTask && node.ext.mcp.startDate && node.ext.mcp.endDate) {
          tasks.push({
            id: nodeId,
            title: node.text?.substring(0, 40) || nodeId,
            startDate: new Date(node.ext.mcp.startDate),
            endDate: new Date(node.ext.mcp.endDate),
            progress: node.ext.mcp.rollupProgress || node.ext.mcp.progress || 0,
            priority: node.ext.mcp.priority,
            status: node.ext.mcp.status,
            cost: node.ext.mcp.rollupCost || node.ext.mcp.cost || 0,
            assignee: node.ext.mcp.assignee,
            isParent: node.ext.mcp.childIds && node.ext.mcp.childIds.length > 0
          });
        }
      };
      
      if (canvas.nodes?.forEach) {
        canvas.nodes.forEach(processNode);
      } else if (canvas.nodes) {
        for (const [nodeId, node] of canvas.nodes) {
          processNode(node, nodeId);
        }
      }
    } catch (error) {
      console.error('Error getting tasks:', error);
    }
    
    return tasks.sort((a, b) => a.startDate - b.startDate);
  }

  createGanttChart(tasks) {
    const container = this.contentEl.createEl('div', { cls: 'gantt-container' });
    
    // Header
    container.createEl('h3', { text: 'Project Timeline' });
    
    // Summary stats
    const stats = this.calculateStats(tasks);
    const statsEl = container.createEl('div', { cls: 'gantt-stats' });
    statsEl.innerHTML = `
      <span>Total Tasks: ${tasks.length}</span>
      <span>Total Cost: $${stats.totalCost.toFixed(0)}</span>
      <span>Avg Progress: ${stats.avgProgress.toFixed(0)}%</span>
      <span>Date Range: ${stats.dateRange}</span>
    `;
    
    // Timeline
    this.createTimeline(container, tasks);
  }

  calculateStats(tasks) {
    const totalCost = tasks.reduce((sum, task) => sum + task.cost, 0);
    const avgProgress = tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length;
    const minDate = new Date(Math.min(...tasks.map(t => t.startDate.getTime())));
    const maxDate = new Date(Math.max(...tasks.map(t => t.endDate.getTime())));
    const dateRange = `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`;
    
    return { totalCost, avgProgress, dateRange };
  }

  createTimeline(container, tasks) {
    const timeline = container.createEl('div', { cls: 'gantt-timeline' });
    
    // Calculate date range for timeline scale
    const minDate = new Date(Math.min(...tasks.map(t => t.startDate.getTime())));
    const maxDate = new Date(Math.max(...tasks.map(t => t.endDate.getTime())));
    const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
    
    tasks.forEach(task => {
      const taskRow = timeline.createEl('div', { cls: 'gantt-task-row' });
      
      // Task info column
      const taskInfo = taskRow.createEl('div', { cls: 'gantt-task-info' });
      taskInfo.innerHTML = `
        <div class="task-title">${task.title}</div>
        <div class="task-details">
          <span class="priority priority-${task.priority}">${task.priority}</span>
          <span class="progress">${task.progress}%</span>
          <span class="cost">$${task.cost.toFixed(0)}</span>
          ${task.assignee ? `<span class="assignee">${task.assignee}</span>` : ''}
        </div>
      `;
      
      // Timeline bar
      const timelineBar = taskRow.createEl('div', { cls: 'gantt-timeline-bar' });
      
      const startOffset = Math.ceil((task.startDate - minDate) / (1000 * 60 * 60 * 24));
      const duration = Math.ceil((task.endDate - task.startDate) / (1000 * 60 * 60 * 24)) + 1;
      const widthPercent = (duration / totalDays) * 100;
      const leftPercent = (startOffset / totalDays) * 100;
      
      const bar = timelineBar.createEl('div', { cls: 'gantt-bar' });
      bar.style.cssText = `
        left: ${leftPercent}%;
        width: ${widthPercent}%;
        background: var(--color-${task.priority === 'high' ? 'red' : task.priority === 'low' ? 'yellow' : 'blue'});
        opacity: ${task.status === 'completed' ? 0.6 : 1};
      `;
      
      // Progress fill
      const progressFill = bar.createEl('div', { cls: 'gantt-progress' });
      progressFill.style.cssText = `
        width: ${task.progress}%;
        background: rgba(255, 255, 255, 0.3);
      `;
      
      // Hover tooltip
      bar.title = `${task.title}\n${task.startDate.toLocaleDateString()} - ${task.endDate.toLocaleDateString()}\nProgress: ${task.progress}%\nCost: $${task.cost}`;
    });
  }
}

// ============================================================================
// ROLLUPS VIEW
// ============================================================================

class RollupsView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() { return VIEW_TYPE_ROLLUPS; }
  getDisplayText() { return 'Roll-ups'; }
  getIcon() { return 'calculator'; }

  async onOpen() {
    this.refresh();
  }

  refresh() {
    this.contentEl.empty();
    
    const canvas = this.plugin.getActiveCanvas();
    if (!canvas) {
      this.contentEl.createEl('p', { text: 'Open a canvas to see roll-ups' });
      return;
    }

    const analytics = this.calculateAnalytics(canvas);
    this.createAnalyticsDashboard(analytics);
  }

  calculateAnalytics(canvas) {
    const analytics = {
      totalNodes: 0,
      totalTasks: 0,
      totalCost: 0,
      totalBudget: 0,
      avgProgress: 0,
      priorities: { low: 0, medium: 0, high: 0 },
      statuses: { 'not-started': 0, 'in-progress': 0, 'completed': 0, 'blocked': 0, 'cancelled': 0 },
      taskTypes: { task: 0, milestone: 0, summary: 0 },
      rootTasks: []
    };
    
    try {
      const processNode = (node, nodeId) => {
        analytics.totalNodes++;
        
        if (node.ext?.mcp) {
          const meta = node.ext.mcp;
          
          if (meta.isTask) {
            analytics.totalTasks++;
            analytics.totalCost += meta.rollupCost || meta.cost || 0;
            analytics.totalBudget += meta.rollupBudget || meta.budget || 0;
            analytics.avgProgress += meta.rollupProgress || meta.progress || 0;
            
            analytics.priorities[meta.priority] = (analytics.priorities[meta.priority] || 0) + 1;
            analytics.statuses[meta.status] = (analytics.statuses[meta.status] || 0) + 1;
            analytics.taskTypes[meta.taskType] = (analytics.taskTypes[meta.taskType] || 0) + 1;
            
            // Root tasks (no parent)
            if (!meta.parentId) {
              analytics.rootTasks.push({
                id: nodeId,
                title: node.text || 'Untitled',
                progress: meta.rollupProgress || meta.progress || 0,
                cost: meta.rollupCost || meta.cost || 0,
                children: meta.childIds ? meta.childIds.length : 0
              });
            }
          }
        }
      };
      
      if (canvas.nodes?.forEach) {
        canvas.nodes.forEach(processNode);
      } else if (canvas.nodes) {
        for (const [nodeId, node] of canvas.nodes) {
          processNode(node, nodeId);
        }
      }
      
      if (analytics.totalTasks > 0) {
        analytics.avgProgress = analytics.avgProgress / analytics.totalTasks;
      }
      
    } catch (error) {
      console.error('Error calculating analytics:', error);
    }
    
    return analytics;
  }

  createAnalyticsDashboard(analytics) {
    const container = this.contentEl.createEl('div', { cls: 'rollups-container' });
    
    container.createEl('h3', { text: '📊 Project Analytics' });
    
    // Summary cards
    this.createSummaryCards(container, analytics);
    
    // Charts
    this.createCharts(container, analytics);
    
    // Task hierarchy
    this.createTaskHierarchy(container, analytics);
    
    // Actions
    this.createActions(container);
  }

  createSummaryCards(parent, analytics) {
    const cardsContainer = parent.createEl('div', { cls: 'summary-cards' });
    
    const cards = [
      { title: 'Total Nodes', value: analytics.totalNodes, type: 'info' },
      { title: 'Total Tasks', value: analytics.totalTasks, type: 'tasks' },
      { title: 'Avg Progress', value: `${Math.round(analytics.avgProgress)}%`, type: 'progress' },
      { title: 'Total Cost', value: `$${Math.round(analytics.totalCost)}`, type: 'cost' },
      { title: 'Total Budget', value: `$${Math.round(analytics.totalBudget)}`, type: 'budget' }
    ];
    
    cards.forEach(card => {
      const cardEl = cardsContainer.createEl('div', { cls: `summary-card ${card.type}` });
      cardEl.innerHTML = `
        <div class="card-title">${card.title}</div>
        <div class="card-value">${card.value}</div>
      `;
    });
  }

  createCharts(parent, analytics) {
    const chartsContainer = parent.createEl('div', { cls: 'charts-container' });
    
    // Priority breakdown
    const priorityChart = chartsContainer.createEl('div', { cls: 'chart priority-chart' });
    priorityChart.createEl('h4', { text: 'Priority Breakdown' });
    
    Object.entries(analytics.priorities).forEach(([priority, count]) => {
      if (count > 0) {
        const bar = priorityChart.createEl('div', { cls: 'chart-bar' });
        bar.innerHTML = `
          <span class="label">${priority}</span>
          <div class="bar-fill priority-${priority}" style="width: ${(count / analytics.totalTasks) * 100}%"></div>
          <span class="value">${count}</span>
        `;
      }
    });
    
    // Status breakdown
    const statusChart = chartsContainer.createEl('div', { cls: 'chart status-chart' });
    statusChart.createEl('h4', { text: 'Status Breakdown' });
    
    Object.entries(analytics.statuses).forEach(([status, count]) => {
      if (count > 0) {
        const bar = statusChart.createEl('div', { cls: 'chart-bar' });
        bar.innerHTML = `
          <span class="label">${status}</span>
          <div class="bar-fill status-${status}" style="width: ${(count / analytics.totalTasks) * 100}%"></div>
          <span class="value">${count}</span>
        `;
      }
    });
  }

  createTaskHierarchy(parent, analytics) {
    const hierarchyContainer = parent.createEl('div', { cls: 'task-hierarchy' });
    hierarchyContainer.createEl('h4', { text: 'Task Hierarchy' });
    
    if (analytics.rootTasks.length === 0) {
      hierarchyContainer.createEl('p', { text: 'No root tasks found' });
      return;
    }
    
    analytics.rootTasks.forEach(task => {
      const taskEl = hierarchyContainer.createEl('div', { cls: 'hierarchy-task' });
      taskEl.innerHTML = `
        <div class="task-header">
          <span class="task-title">${task.title}</span>
          <span class="task-progress">${Math.round(task.progress)}%</span>
          <span class="task-cost">$${Math.round(task.cost)}</span>
        </div>
        <div class="task-meta">
          ${task.children} child tasks
        </div>
      `;
    });
  }

  createActions(parent) {
    const actionsContainer = parent.createEl('div', { cls: 'rollups-actions' });
    actionsContainer.createEl('h4', { text: 'Actions' });
    
    const buttonsContainer = actionsContainer.createEl('div', { cls: 'action-buttons' });
    
    const calculateBtn = buttonsContainer.createEl('button', { text: 'Recalculate All' });
    calculateBtn.addEventListener('click', () => {
      this.plugin.calculateAllRollups();
      this.refresh();
    });
    
    const syncBtn = buttonsContainer.createEl('button', { text: 'Sync All to Obsidian' });
    syncBtn.addEventListener('click', () => {
      this.plugin.syncAllToObsidian();
    });
  }
}

// ============================================================================
// FILTERS VIEW
// ============================================================================

class FiltersView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.filters = {
      priority: 'all',
      status: 'all',
      assignee: 'all',
      isTask: 'all'
    };
  }

  getViewType() { return VIEW_TYPE_FILTERS; }
  getDisplayText() { return 'Filters'; }
  getIcon() { return 'filter'; }

  async onOpen() {
    this.refresh();
  }

  refresh() {
    this.contentEl.empty();
    
    const canvas = this.plugin.getActiveCanvas();
    if (!canvas) {
      this.contentEl.createEl('p', { text: 'Open a canvas to filter nodes' });
      return;
    }

    this.createFilterInterface(canvas);
  }

  createFilterInterface(canvas) {
    const container = this.contentEl.createEl('div', { cls: 'filters-container' });
    
    container.createEl('h3', { text: '🔍 Filters' });
    
    // Filter controls
    this.createFilterControls(container, canvas);
    
    // Filtered results
    this.createFilteredResults(container, canvas);
  }

  createFilterControls(parent, canvas) {
    const controlsContainer = parent.createEl('div', { cls: 'filter-controls' });
    
    // Get unique values for dropdowns
    const uniqueValues = this.getUniqueValues(canvas);
    
    // Priority filter
    this.createFilterDropdown(controlsContainer, 'Priority', 'priority', 
      ['all', ...uniqueValues.priorities]);
    
    // Status filter
    this.createFilterDropdown(controlsContainer, 'Status', 'status', 
      ['all', ...uniqueValues.statuses]);
    
    // Assignee filter
    this.createFilterDropdown(controlsContainer, 'Assignee', 'assignee', 
      ['all', ...uniqueValues.assignees]);
    
    // Task filter
    this.createFilterDropdown(controlsContainer, 'Type', 'isTask', 
      ['all', 'tasks-only', 'non-tasks-only']);
    
    // Clear filters button
    const clearBtn = controlsContainer.createEl('button', { text: 'Clear All Filters' });
    clearBtn.addEventListener('click', () => {
      this.filters = { priority: 'all', status: 'all', assignee: 'all', isTask: 'all' };
      this.refresh();
    });
  }

  createFilterDropdown(parent, label, key, options) {
    const filterGroup = parent.createEl('div', { cls: 'filter-group' });
    filterGroup.createEl('label', { text: label });
    
    const dropdown = new DropdownComponent(filterGroup);
    options.forEach(option => {
      dropdown.addOption(option, option === 'all' ? 'All' : option);
    });
    
    dropdown.setValue(this.filters[key]);
    dropdown.onChange(value => {
      this.filters[key] = value;
      this.refresh();
    });
  }

  getUniqueValues(canvas) {
    const priorities = new Set();
    const statuses = new Set();
    const assignees = new Set();
    
    try {
      const processNode = (node) => {
        if (node.ext?.mcp) {
          const meta = node.ext.mcp;
          if (meta.priority) priorities.add(meta.priority);
          if (meta.status) statuses.add(meta.status);
          if (meta.assignee) assignees.add(meta.assignee);
        }
      };
      
      if (canvas.nodes?.forEach) {
        canvas.nodes.forEach(processNode);
      } else if (canvas.nodes) {
        for (const [, node] of canvas.nodes) {
          processNode(node);
        }
      }
    } catch (error) {
      console.error('Error getting unique values:', error);
    }
    
    return {
      priorities: Array.from(priorities),
      statuses: Array.from(statuses),
      assignees: Array.from(assignees)
    };
  }

  createFilteredResults(parent, canvas) {
    const resultsContainer = parent.createEl('div', { cls: 'filter-results' });
    
    const filteredNodes = this.applyFilters(canvas);
    
    resultsContainer.createEl('h4', { text: `Results (${filteredNodes.length})` });
    
    if (filteredNodes.length === 0) {
      resultsContainer.createEl('p', { text: 'No nodes match the current filters' });
      return;
    }
    
    filteredNodes.forEach(({ node, nodeId }) => {
      const nodeEl = resultsContainer.createEl('div', { cls: 'filtered-node' });
      
      const meta = node.ext?.mcp;
      const title = node.text?.substring(0, 50) || nodeId;
      
      nodeEl.innerHTML = `
        <div class="node-title">${title}</div>
        <div class="node-meta">
          ${meta?.isTask ? `<span class="task-badge">Task</span>` : '<span class="node-badge">Node</span>'}
          ${meta?.priority ? `<span class="priority priority-${meta.priority}">${meta.priority}</span>` : ''}
          ${meta?.status ? `<span class="status">${meta.status}</span>` : ''}
          ${meta?.assignee ? `<span class="assignee">${meta.assignee}</span>` : ''}
          ${meta?.progress !== undefined ? `<span class="progress">${meta.progress}%</span>` : ''}
        </div>
      `;
      
      // Click to select node
      nodeEl.addEventListener('click', () => {
        this.selectNodeInCanvas(nodeId);
      });
    });
  }

  applyFilters(canvas) {
    const filteredNodes = [];
    
    try {
      const processNode = (node, nodeId) => {
        const meta = node.ext?.mcp;
        
        // Apply filters
        if (this.filters.priority !== 'all' && meta?.priority !== this.filters.priority) return;
        if (this.filters.status !== 'all' && meta?.status !== this.filters.status) return;
        if (this.filters.assignee !== 'all' && meta?.assignee !== this.filters.assignee) return;
        
        if (this.filters.isTask === 'tasks-only' && !meta?.isTask) return;
        if (this.filters.isTask === 'non-tasks-only' && meta?.isTask) return;
        
        filteredNodes.push({ node, nodeId });
      };
      
      if (canvas.nodes?.forEach) {
        canvas.nodes.forEach(processNode);
      } else if (canvas.nodes) {
        for (const [nodeId, node] of canvas.nodes) {
          processNode(node, nodeId);
        }
      }
    } catch (error) {
      console.error('Error applying filters:', error);
    }
    
    return filteredNodes;
  }

  selectNodeInCanvas(nodeId) {
    const canvas = this.plugin.getActiveCanvas();
    if (!canvas) return;
    
    const node = this.plugin.getNodeById(canvas, nodeId);
    if (!node) return;
    
    // Select the node in canvas
    try {
      if (canvas.deselectAll) canvas.deselectAll();
      
      if (canvas.selectNode) {
        canvas.selectNode(node);
      } else if (canvas.addToSelection) {
        canvas.addToSelection(node);
      } else if (canvas.selection && canvas.selection.add) {
        canvas.selection.add(nodeId);
      }
      
      // Zoom to node if possible
      if (canvas.zoomToNode) {
        canvas.zoomToNode(node);
      } else if (canvas.zoomToSelection) {
        canvas.zoomToSelection();
      }
      
      new Notice(`Selected ${node.text || nodeId}`);
      
    } catch (error) {
      console.error('Error selecting node:', error);
    }
  }
}

module.exports = MindCanvasPlus2; 