const { Plugin, Notice, addIcon, Menu, ItemView, WorkspaceLeaf, TFile, Component } = require('obsidian');

// View types
const VIEW_TYPE_GANTT = "mindcanvas-gantt";
const VIEW_TYPE_PROPERTIES = "mindcanvas-properties";
const VIEW_TYPE_ROLLUPS = "mindcanvas-rollups";

class MindCanvasPlus extends Plugin {
  async onload() {
    console.log("MindCanvas Plus: Starting plugin load");
    
    try {
      // Show a notice that the plugin loaded
      new Notice("MindCanvas Plus plugin loaded!");

      // Add custom icons
      addIcon("mindmap-plus", `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
      </svg>`);

      addIcon("rollup-calc", `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 9h6v6h-6z"/>
        <path d="M9 1v6M15 1v6M15 17v6M9 17v6"/>
      </svg>`);

      console.log("MindCanvas Plus: Icons added");

      // Register commands with hotkeys (MindManager style)
      this.addCommand({
        id: "add-connected-node",
        name: "Add connected node",
        hotkeys: [{ modifiers: ["Mod"], key: "Enter" }],
        checkCallback: (checking) => {
          const canvas = this.getActiveCanvas();
          if (checking) return !!canvas;
          this.addConnectedNode();
        },
      });

      this.addCommand({
        id: "add-child-node", 
        name: "Add child node",
        hotkeys: [{ modifiers: ["Mod", "Shift"], key: "Enter" }],
        checkCallback: (checking) => {
          const canvas = this.getActiveCanvas();
          if (checking) return !!canvas;
          this.addChildNode();
        },
      });

      this.addCommand({
        id: "add-sibling-node",
        name: "Add sibling node", 
        hotkeys: [{ modifiers: ["Alt"], key: "Enter" }],
        checkCallback: (checking) => {
          const canvas = this.getActiveCanvas();
          if (checking) return !!canvas;
          this.addSiblingNode();
        },
      });

      this.addCommand({
        id: "convert-to-task",
        name: "Convert node to task",
        checkCallback: (checking) => {
          const canvas = this.getActiveCanvas();
          if (checking) return !!canvas;
          this.convertSelectedToTask();
        },
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
        id: "toggle-rollups-view",
        name: "Toggle roll-ups panel",
        callback: () => this.toggleRollupsView(),
      });

      this.addCommand({
        id: "calculate-rollups",
        name: "Calculate roll-ups",
        checkCallback: (checking) => {
          const canvas = this.getActiveCanvas();
          if (checking) return !!canvas;
          this.calculateAllRollups();
        },
      });

      this.addCommand({
        id: "sync-to-obsidian-properties",
        name: "Sync to Obsidian properties",
        checkCallback: (checking) => {
          const canvas = this.getActiveCanvas();
          if (checking) return !!canvas;
          this.syncToObsidianProperties();
        },
      });

      this.addCommand({
        id: "debug-canvas",
        name: "Debug Canvas Info",
        callback: () => this.debugCanvasInfo(),
      });

      console.log("MindCanvas Plus: Commands registered");

      // Register views
      this.registerView(VIEW_TYPE_GANTT, (leaf) => new GanttView(leaf, this));
      this.registerView(VIEW_TYPE_PROPERTIES, (leaf) => new PropertiesView(leaf, this));
      this.registerView(VIEW_TYPE_ROLLUPS, (leaf) => new RollupsView(leaf, this));

      console.log("MindCanvas Plus: Views registered");

      // Add ribbon icon
      this.addRibbonIcon("mindmap-plus", "MindCanvas Plus", () => {
        this.togglePropertiesView();
      });

      this.addRibbonIcon("rollup-calc", "Calculate Roll-ups", () => {
        this.calculateAllRollups();
      });

      console.log("MindCanvas Plus: Ribbon icons added");

      // Add status bar
      this.statusBarItem = this.addStatusBarItem();
      this.statusBarItem.setText("MCP Ready");

      // Register workspace events
      this.registerEvent(
        this.app.workspace.on("active-leaf-change", () => {
          this.updateStatusBar();
        })
      );

      // Register context menu
      this.registerEvent(
        this.app.workspace.on("editor-menu", (menu, editor, view) => {
          if (view.getViewType() === "canvas") {
            this.addCanvasContextMenu(menu);
          }
        })
      );

      // Auto-calculate roll-ups when canvas changes
      this.registerEvent(
        this.app.workspace.on("layout-change", () => {
          setTimeout(() => this.autoCalculateRollups(), 1000);
        })
      );

      console.log("MindCanvas Plus: Plugin loaded successfully");
      
    } catch (error) {
      console.error("MindCanvas Plus: Error during plugin load:", error);
      new Notice("MindCanvas Plus: Error loading plugin - " + error.message);
    }
  }

  onunload() {
    console.log("MindCanvas Plus: Unloading plugin");
    new Notice("MindCanvas Plus unloaded");
  }

  // Debug function to understand canvas structure
  debugCanvasInfo() {
    console.log("=== MindCanvas Plus Debug Info ===");
    console.log("Active leaf:", this.app.workspace.activeLeaf);
    console.log("Active leaf view type:", this.app.workspace.activeLeaf?.view?.getViewType());
    
    const canvasLeaves = this.app.workspace.getLeavesOfType("canvas");
    console.log("Canvas leaves found:", canvasLeaves.length);
    
    if (canvasLeaves.length > 0) {
      const canvasLeaf = canvasLeaves[0];
      console.log("First canvas leaf:", canvasLeaf);
      console.log("Canvas view:", canvasLeaf.view);
      console.log("Canvas view type:", canvasLeaf.view?.getViewType());
      
      // Try different ways to access canvas
      console.log("Canvas via .canvas:", canvasLeaf.view?.canvas);
      console.log("Canvas view data:", canvasLeaf.view?.data);
      console.log("Canvas view file:", canvasLeaf.view?.file);
    }
    
    const canvas = this.getActiveCanvas();
    console.log("getActiveCanvas result:", canvas);
    
    if (canvas) {
      console.log("Canvas nodes:", canvas.nodes);
      console.log("Canvas selection:", canvas.selection);
      console.log("Canvas methods:", Object.getOwnPropertyNames(canvas));
    }
    
    new Notice("Debug info logged to console");
  }

  // Fixed method to get active canvas - multiple fallback approaches
  getActiveCanvas() {
    try {
      // Method 1: Check if current active leaf is canvas
      const activeLeaf = this.app.workspace.activeLeaf;
      if (activeLeaf && activeLeaf.view && activeLeaf.view.getViewType() === "canvas") {
        console.log("Found canvas via active leaf");
        // Try different property paths
        if (activeLeaf.view.canvas) {
          return activeLeaf.view.canvas;
        }
        if (activeLeaf.view.canvasView) {
          return activeLeaf.view.canvasView;
        }
        if (activeLeaf.view.renderer) {
          return activeLeaf.view.renderer;
        }
        // Return the view itself if it has canvas methods
        if (activeLeaf.view.createTextNode) {
          return activeLeaf.view;
        }
      }

      // Method 2: Find any canvas leaf
      const canvasLeaves = this.app.workspace.getLeavesOfType("canvas");
      if (canvasLeaves.length > 0) {
        console.log("Found canvas via getLeavesOfType");
        const canvasLeaf = canvasLeaves[0];
        
        // Try different property paths
        if (canvasLeaf.view.canvas) {
          return canvasLeaf.view.canvas;
        }
        if (canvasLeaf.view.canvasView) {
          return canvasLeaf.view.canvasView;
        }
        if (canvasLeaf.view.renderer) {
          return canvasLeaf.view.renderer;
        }
        // Return the view itself if it has canvas methods
        if (canvasLeaf.view.createTextNode) {
          return canvasLeaf.view;
        }
        
        // Last resort - return the view and hope it works
        return canvasLeaf.view;
      }

      console.log("No canvas found");
      return null;
    } catch (error) {
      console.error("Error getting active canvas:", error);
      return null;
    }
  }

  // Fixed method to get selected nodes with multiple fallback approaches
  getSelectedNodes() {
    const canvas = this.getActiveCanvas();
    if (!canvas) {
      console.log("No canvas available for selection");
      return [];
    }
    
    console.log("Canvas found for selection:", canvas);
    console.log("Canvas selection property:", canvas.selection);
    
    const selectedNodes = [];
    
    try {
      // Method 1: Try canvas.selection (Set or Array)
      if (canvas.selection) {
        if (canvas.selection.size !== undefined) {
          // It's a Set
          for (const nodeId of canvas.selection) {
            const node = canvas.nodes?.get ? canvas.nodes.get(nodeId) : canvas.nodes?.[nodeId];
            if (node) {
              selectedNodes.push(node);
              console.log("Found selected node via Set:", node);
            }
          }
        } else if (canvas.selection.length !== undefined) {
          // It's an Array
          for (const nodeId of canvas.selection) {
            const node = canvas.nodes?.get ? canvas.nodes.get(nodeId) : canvas.nodes?.[nodeId];
            if (node) {
              selectedNodes.push(node);
              console.log("Found selected node via Array:", node);
            }
          }
        }
      }

      // Method 2: Try canvas.selectedNodes directly
      if (selectedNodes.length === 0 && canvas.selectedNodes) {
        if (canvas.selectedNodes.size !== undefined) {
          // It's a Set
          for (const node of canvas.selectedNodes) {
            selectedNodes.push(node);
            console.log("Found selected node via selectedNodes Set:", node);
          }
        } else if (canvas.selectedNodes.length !== undefined) {
          // It's an Array
          selectedNodes.push(...canvas.selectedNodes);
          console.log("Found selected nodes via selectedNodes Array:", canvas.selectedNodes);
        }
      }

      // Method 3: Check all nodes for selected property
      if (selectedNodes.length === 0 && canvas.nodes) {
        if (canvas.nodes.forEach) {
          canvas.nodes.forEach((node, nodeId) => {
            if (node.selected === true) {
              selectedNodes.push(node);
              console.log("Found selected node via node.selected:", node);
            }
          });
        } else if (canvas.nodes.values) {
          for (const node of canvas.nodes.values()) {
            if (node.selected === true) {
              selectedNodes.push(node);
              console.log("Found selected node via values iteration:", node);
            }
          }
        }
      }

      // Method 4: Check for active/focused node
      if (selectedNodes.length === 0 && canvas.activeNode) {
        selectedNodes.push(canvas.activeNode);
        console.log("Found active node:", canvas.activeNode);
      }

      console.log("Total selected nodes found:", selectedNodes.length);
      return selectedNodes;
      
    } catch (error) {
      console.error("Error getting selected nodes:", error);
      return [];
    }
  }

  // Add connected node with extensive error handling
  addConnectedNode() {
    try {
      console.log("=== Add Connected Node ===");
      const canvas = this.getActiveCanvas();
      if (!canvas) {
        new Notice("Please open a canvas first");
        console.log("No canvas found");
        return;
      }

      console.log("Canvas found:", canvas);
      const selectedNodes = this.getSelectedNodes();
      console.log("Selected nodes for connected:", selectedNodes);
      
      if (selectedNodes.length === 0) {
        // No selection, create a new node at center
        console.log("No selection, creating new node at center");
        const newNode = this.createNewNode(canvas, { x: 300, y: 200 });
        if (newNode) {
          new Notice("Created new node (no selection)");
        } else {
          new Notice("Failed to create new node");
        }
        return;
      }

      // Create connected node from selected
      const sourceNode = selectedNodes[0];
      console.log("Creating connected node from:", sourceNode);
      const newNode = this.createConnectedNode(canvas, sourceNode);
      if (newNode) {
        new Notice("Created connected node");
      } else {
        new Notice("Failed to create connected node");
      }
    } catch (error) {
      console.error("Error in addConnectedNode:", error);
      new Notice("Error creating node: " + error.message);
    }
  }

  // Add child node with extensive error handling
  addChildNode() {
    try {
      console.log("=== Add Child Node ===");
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
      console.log("Creating child node from:", parentNode);
      const newNode = this.createChildNode(canvas, parentNode);
      if (newNode) {
        new Notice("Created child node");
        // Auto-calculate parent roll-ups
        setTimeout(() => this.calculateNodeRollups(parentNode.id), 500);
      } else {
        new Notice("Failed to create child node");
      }
    } catch (error) {
      console.error("Error in addChildNode:", error);
      new Notice("Error creating child node: " + error.message);
    }
  }

  // Add sibling node with extensive error handling
  addSiblingNode() {
    try {
      console.log("=== Add Sibling Node ===");
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
      console.log("Creating sibling node from:", siblingNode);
      const newNode = this.createSiblingNode(canvas, siblingNode);
      if (newNode) {
        new Notice("Created sibling node");
      } else {
        new Notice("Failed to create sibling node");
      }
    } catch (error) {
      console.error("Error in addSiblingNode:", error);
      new Notice("Error creating sibling node: " + error.message);
    }
  }

  // Create new node with multiple API attempts
  createNewNode(canvas, position) {
    try {
      console.log("Creating new node at position:", position);
      console.log("Canvas methods available:", Object.getOwnPropertyNames(canvas));
      
      let newNode = null;
      
      // Try different Canvas API methods
      if (canvas.createTextNode) {
        console.log("Trying createTextNode method");
        newNode = canvas.createTextNode({
          text: "New Node",
          x: position.x,
          y: position.y,
          width: 200,
          height: 60,
        });
      } else if (canvas.addNode) {
        console.log("Trying addNode method");
        newNode = canvas.addNode({
          type: "text",
          text: "New Node",
          x: position.x,
          y: position.y,
          width: 200,
          height: 60,
        });
      } else if (canvas.createNode) {
        console.log("Trying createNode method");
        newNode = canvas.createNode({
          type: "text",
          text: "New Node",
          x: position.x,
          y: position.y,
          width: 200,
          height: 60,
        });
      } else {
        console.error("No suitable node creation method found on canvas");
        console.log("Available methods:", Object.getOwnPropertyNames(canvas));
        return null;
      }

      if (!newNode) {
        console.error("Node creation returned null/undefined");
        return null;
      }

      console.log("Created new node:", newNode);

      // Initialize MindManager-style metadata
      this.initializeNodeMetadata(newNode);

      // Try to select and focus the new node
      setTimeout(() => {
        try {
          if (canvas.deselectAll) canvas.deselectAll();
          if (canvas.selectNode) {
            canvas.selectNode(newNode);
          } else if (canvas.addToSelection) {
            canvas.addToSelection(newNode);
          } else if (canvas.selection && canvas.selection.add) {
            canvas.selection.add(newNode.id);
          }
          
          // Try to start editing the node
          if (canvas.startEditing) {
            canvas.startEditing(newNode);
          } else if (canvas.editNode) {
            canvas.editNode(newNode);
          }
          
          // Save canvas
          if (canvas.requestSave) {
            canvas.requestSave();
          } else if (canvas.save) {
            canvas.save();
          }
        } catch (selectError) {
          console.error("Error selecting/editing new node:", selectError);
        }
      }, 50);
      
      return newNode;
    } catch (error) {
      console.error("Error creating node:", error);
      return null;
    }
  }

  // Create connected node with error handling
  createConnectedNode(canvas, sourceNode) {
    const x = sourceNode.x + (sourceNode.width || 200) + 100;
    const y = sourceNode.y;

    const newNode = this.createNewNode(canvas, { x, y });
    if (!newNode) return null;

    try {
      // Create edge with different API attempts
      if (canvas.createEdge) {
        canvas.createEdge({
          from: sourceNode.id,
          to: newNode.id,
        });
      } else if (canvas.addEdge) {
        canvas.addEdge({
          from: sourceNode.id,
          to: newNode.id,
        });
      } else if (canvas.connectNodes) {
        canvas.connectNodes(sourceNode.id, newNode.id);
      }
      console.log("Created edge from", sourceNode.id, "to", newNode.id);
    } catch (error) {
      console.error("Error creating edge:", error);
    }

    return newNode;
  }

  // Create child node with error handling
  createChildNode(canvas, parentNode) {
    const x = parentNode.x + 50;
    const y = parentNode.y + (parentNode.height || 60) + 50;

    const newNode = this.createNewNode(canvas, { x, y });
    if (!newNode) return null;

    try {
      // Create edge from parent to child
      if (canvas.createEdge) {
        canvas.createEdge({
          from: parentNode.id,
          to: newNode.id,
        });
      } else if (canvas.addEdge) {
        canvas.addEdge({
          from: parentNode.id,
          to: newNode.id,
        });
      }
      
      // Establish parent-child relationship in metadata
      this.initializeNodeMetadata(newNode);
      newNode.ext.mcp.parentId = parentNode.id;
      
      this.initializeNodeMetadata(parentNode);
      if (!parentNode.ext.mcp.childIds) parentNode.ext.mcp.childIds = [];
      parentNode.ext.mcp.childIds.push(newNode.id);
      
    } catch (error) {
      console.error("Error creating parent-child edge:", error);
    }

    return newNode;
  }

  // Create sibling node with error handling
  createSiblingNode(canvas, siblingNode) {
    const x = siblingNode.x;
    const y = siblingNode.y + (siblingNode.height || 60) + 30;

    const newNode = this.createNewNode(canvas, { x, y });
    
    // If sibling has a parent, make this a child of the same parent
    if (siblingNode.ext?.mcp?.parentId) {
      const parentId = siblingNode.ext.mcp.parentId;
      const parentNode = canvas.nodes?.get ? canvas.nodes.get(parentId) : null;
      if (parentNode) {
        try {
          if (canvas.createEdge) {
            canvas.createEdge({
              from: parentId,
              to: newNode.id,
            });
          }
          
          this.initializeNodeMetadata(newNode);
          newNode.ext.mcp.parentId = parentId;
          
          this.initializeNodeMetadata(parentNode);
          if (!parentNode.ext.mcp.childIds) parentNode.ext.mcp.childIds = [];
          parentNode.ext.mcp.childIds.push(newNode.id);
        } catch (error) {
          console.error("Error linking sibling to parent:", error);
        }
      }
    }
    
    return newNode;
  }

  // Initialize MindManager-style node metadata with roll-up support
  initializeNodeMetadata(node) {
    try {
      if (!node.ext) node.ext = {};
      if (!node.ext.mcp) {
        node.ext.mcp = {
          // Basic task properties
          progress: 0,
          priority: "medium",
          tags: [],
          dependencies: [],
          assignee: "",
          notes: "",
          created: new Date().toISOString(),
          taskType: "task", // task, milestone, summary
          duration: 1, // days
          startDate: null,
          endDate: null,
          resources: [],
          isTask: false,
          
          // Financial/Cost properties
          cost: 0,
          budget: 0,
          actualCost: 0,
          currency: "USD",
          costPerHour: 0,
          
          // Roll-up properties (calculated)
          rollupProgress: 0,
          rollupCost: 0,
          rollupBudget: 0,
          rollupDuration: 0,
          rollupEffort: 0,
          
          // Hierarchy properties
          parentId: null,
          childIds: [],
          level: 0,
          
          // MindManager specific
          iconType: "none",
          callouts: [],
          hyperlinks: [],
          
          // Obsidian integration
          linkedNote: null,
          syncToProperties: true,
        };
      }
      console.log("Initialized metadata for node:", node.id);
    } catch (error) {
      console.error("Error initializing node metadata:", error);
    }
  }

  // Calculate roll-ups for a specific node
  calculateNodeRollups(nodeId) {
    const canvas = this.getActiveCanvas();
    if (!canvas) return;

    const node = canvas.nodes.get(nodeId);
    if (!node) return;

    this.initializeNodeMetadata(node);
    const metadata = node.ext.mcp;
    
    // Get all child nodes
    const childNodes = this.getChildNodes(nodeId);
    
    if (childNodes.length === 0) {
      // Leaf node - roll-ups equal own values
      metadata.rollupProgress = metadata.progress;
      metadata.rollupCost = metadata.actualCost || metadata.cost;
      metadata.rollupBudget = metadata.budget;
      metadata.rollupDuration = metadata.duration;
      metadata.rollupEffort = this.calculateEffort(metadata);
    } else {
      // Parent node - calculate from children
      let totalProgress = 0;
      let totalCost = 0;
      let totalBudget = 0;
      let totalDuration = 0;
      let totalEffort = 0;
      let childCount = 0;
      
      childNodes.forEach(childNode => {
        // Recursively calculate child roll-ups first
        this.calculateNodeRollups(childNode.id);
        
        const childMeta = childNode.ext?.mcp;
        if (childMeta) {
          totalProgress += childMeta.rollupProgress || 0;
          totalCost += childMeta.rollupCost || 0;
          totalBudget += childMeta.rollupBudget || 0;
          totalDuration = Math.max(totalDuration, childMeta.rollupDuration || 0);
          totalEffort += childMeta.rollupEffort || 0;
          childCount++;
        }
      });
      
      // Calculate averages and sums
      metadata.rollupProgress = childCount > 0 ? Math.round(totalProgress / childCount) : 0;
      metadata.rollupCost = totalCost + (metadata.actualCost || metadata.cost || 0);
      metadata.rollupBudget = totalBudget + (metadata.budget || 0);
      metadata.rollupDuration = totalDuration;
      metadata.rollupEffort = totalEffort + this.calculateEffort(metadata);
    }

    // Update visual indicators
    this.updateNodeVisuals(node);
    
    // Sync to Obsidian properties if enabled
    if (metadata.syncToProperties && metadata.linkedNote) {
      this.syncNodeToObsidianProperties(node);
    }
    
    if (canvas.requestSave) {
      canvas.requestSave();
    }
  }

  // Calculate all roll-ups in the canvas
  calculateAllRollups() {
    const canvas = this.getActiveCanvas();
    if (!canvas) {
      new Notice("Please open a canvas first");
      return;
    }

    // Find root nodes (nodes without parents) and calculate from top down
    const rootNodes = [];
    for (const [nodeId, node] of canvas.nodes) {
      const metadata = node.ext?.mcp;
      if (!metadata?.parentId) {
        rootNodes.push(node);
      }
    }

    rootNodes.forEach(rootNode => {
      this.calculateNodeRollups(rootNode.id);
    });

    new Notice(`Calculated roll-ups for ${canvas.nodes.size} nodes`);
    this.refreshViews();
  }

  // Auto-calculate roll-ups (less intrusive)
  autoCalculateRollups() {
    const canvas = this.getActiveCanvas();
    if (!canvas) return;

    // Only auto-calculate if there are task nodes
    let hasTaskNodes = false;
    for (const [nodeId, node] of canvas.nodes) {
      if (node.ext?.mcp?.isTask) {
        hasTaskNodes = true;
        break;
      }
    }

    if (hasTaskNodes) {
      this.calculateAllRollups();
    }
  }

  // Get child nodes of a parent
  getChildNodes(parentId) {
    const canvas = this.getActiveCanvas();
    if (!canvas) return [];

    const childNodes = [];
    for (const [nodeId, node] of canvas.nodes) {
      if (node.ext?.mcp?.parentId === parentId) {
        childNodes.push(node);
      }
    }
    return childNodes;
  }

  // Calculate effort based on duration and resources
  calculateEffort(metadata) {
    const duration = metadata.duration || 0;
    const costPerHour = metadata.costPerHour || 0;
    const resources = metadata.resources?.length || 1;
    
    return duration * 8 * resources; // 8 hours per day
  }

  // Update node visual indicators
  updateNodeVisuals(node) {
    const metadata = node.ext?.mcp;
    if (!metadata) return;

    // Update priority visual indicator
    if (node.element) {
      node.element.setAttribute('data-task-priority', metadata.priority);
      
      // Add progress indicator
      let progressIndicator = node.element.querySelector('.task-progress-indicator');
      if (!progressIndicator) {
        progressIndicator = node.element.createEl('div', { cls: 'task-progress-indicator' });
        const progressFill = progressIndicator.createEl('div', { cls: 'task-progress-fill' });
      }
      
      const progressFill = progressIndicator.querySelector('.task-progress-fill');
      if (progressFill) {
        progressFill.style.width = `${metadata.rollupProgress || metadata.progress}%`;
      }
    }
  }

  // Sync node to Obsidian properties
  async syncNodeToObsidianProperties(node) {
    const metadata = node.ext?.mcp;
    if (!metadata?.linkedNote) return;

    try {
      const file = this.app.vault.getAbstractFileByPath(metadata.linkedNote);
      if (file instanceof TFile) {
        await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
          // Sync task properties to frontmatter
          frontmatter.taskType = metadata.taskType;
          frontmatter.progress = metadata.rollupProgress || metadata.progress;
          frontmatter.priority = metadata.priority;
          frontmatter.startDate = metadata.startDate;
          frontmatter.endDate = metadata.endDate;
          frontmatter.assignee = metadata.assignee;
          frontmatter.tags = metadata.tags;
          frontmatter.cost = metadata.rollupCost || metadata.cost;
          frontmatter.budget = metadata.rollupBudget || metadata.budget;
          frontmatter.duration = metadata.rollupDuration || metadata.duration;
          frontmatter.effort = metadata.rollupEffort;
        });
      }
    } catch (error) {
      console.error("Error syncing to Obsidian properties:", error);
    }
  }

  // Sync all canvas nodes to Obsidian properties
  async syncToObsidianProperties() {
    const canvas = this.getActiveCanvas();
    if (!canvas) {
      new Notice("Please open a canvas first");
      return;
    }

    let syncCount = 0;
    for (const [nodeId, node] of canvas.nodes) {
      const metadata = node.ext?.mcp;
      if (metadata?.syncToProperties && metadata?.linkedNote) {
        await this.syncNodeToObsidianProperties(node);
        syncCount++;
      }
    }

    new Notice(`Synced ${syncCount} nodes to Obsidian properties`);
  }

  // Update node metadata
  updateNodeMetadata(nodeId, metadata) {
    const canvas = this.getActiveCanvas();
    if (!canvas) return;

    const node = canvas.nodes.get(nodeId);
    if (!node) return;

    this.initializeNodeMetadata(node);
    Object.assign(node.ext.mcp, metadata);
    
    // Recalculate roll-ups if this affects parent/child relationships
    if (metadata.progress !== undefined || metadata.cost !== undefined || 
        metadata.actualCost !== undefined || metadata.budget !== undefined) {
      setTimeout(() => {
        // Calculate this node and propagate up
        this.calculateNodeRollups(nodeId);
        
        // If this node has a parent, recalculate parent too
        if (node.ext.mcp.parentId) {
          this.calculateNodeRollups(node.ext.mcp.parentId);
        }
      }, 100);
    }
    
    if (canvas.requestSave) {
      canvas.requestSave();
    }
    
    this.refreshViews();
  }

  // Get node metadata
  getNodeMetadata(nodeId) {
    const canvas = this.getActiveCanvas();
    if (!canvas) return null;

    const node = canvas.nodes.get(nodeId);
    if (!node?.ext?.mcp) return null;

    return node.ext.mcp;
  }

  // Convert selected node to task
  convertSelectedToTask() {
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

    const node = selectedNodes[0];
    this.convertToTask(node);
    new Notice("Node converted to task");
  }

  // Convert node to task (MindManager style)
  convertToTask(node) {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    this.initializeNodeMetadata(node);
    Object.assign(node.ext.mcp, {
      startDate: today,
      endDate: nextWeek,
      progress: 0,
      isTask: true,
      taskType: "task",
      duration: 7,
      cost: 0,
      budget: 1000, // Default budget
      costPerHour: 50, // Default rate
    });

    // Save canvas
    const canvas = this.getActiveCanvas();
    if (canvas && canvas.requestSave) {
      canvas.requestSave();
    }
    
    this.refreshViews();
  }

  // Add context menu
  addCanvasContextMenu(menu) {
    menu.addItem((item) => {
      item
        .setTitle("Convert to Task")
        .setIcon("check-square")
        .onClick(() => {
          this.convertSelectedToTask();
        });
    });

    menu.addItem((item) => {
      item
        .setTitle("Add Connected Node")
        .setIcon("plus")
        .onClick(() => {
          this.addConnectedNode();
        });
    });

    menu.addItem((item) => {
      item
        .setTitle("Calculate Roll-ups")
        .setIcon("calculator")
        .onClick(() => {
          this.calculateAllRollups();
        });
    });

    menu.addItem((item) => {
      item
        .setTitle("Link to Note")
        .setIcon("link")
        .onClick(() => {
          this.linkSelectedNodeToNote();
        });
    });
  }

  // Link selected node to an Obsidian note
  async linkSelectedNodeToNote() {
    const selectedNodes = this.getSelectedNodes();
    if (selectedNodes.length === 0) {
      new Notice("Please select a node first");
      return;
    }

    const node = selectedNodes[0];
    const noteTitle = node.text || "Untitled";
    
    try {
      // Create or find note
      const notePath = `${noteTitle}.md`;
      let file = this.app.vault.getAbstractFileByPath(notePath);
      
      if (!file) {
        // Create new note
        const noteContent = `# ${noteTitle}\n\nLinked from canvas node: ${node.id}\n`;
        file = await this.app.vault.create(notePath, noteContent);
      }
      
      // Link node to note
      this.initializeNodeMetadata(node);
      node.ext.mcp.linkedNote = notePath;
      
      // Sync current properties to note
      await this.syncNodeToObsidianProperties(node);
      
      new Notice(`Linked node to ${notePath}`);
    } catch (error) {
      console.error("Error linking to note:", error);
      new Notice("Error linking to note: " + error.message);
    }
  }

  // Refresh views
  refreshViews() {
    const ganttLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_GANTT);
    ganttLeaves.forEach(leaf => {
      if (leaf.view.refresh) leaf.view.refresh();
    });

    const propLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_PROPERTIES);
    propLeaves.forEach(leaf => {
      if (leaf.view.refresh) leaf.view.refresh();
    });

    const rollupLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_ROLLUPS);
    rollupLeaves.forEach(leaf => {
      if (leaf.view.refresh) leaf.view.refresh();
    });
  }

  // Toggle Gantt view
  async toggleGanttView() {
    try {
      console.log("Toggling Gantt view");
      const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_GANTT);
      if (leaves.length > 0) {
        console.log("Closing existing Gantt views");
        leaves.forEach(leaf => leaf.detach());
        return;
      }

      console.log("Opening new Gantt view");
      const leaf = this.app.workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_GANTT,
          active: true,
        });
        new Notice("Gantt view opened");
      } else {
        new Notice("Could not open Gantt view - no leaf available");
      }
    } catch (error) {
      console.error("Error toggling Gantt view:", error);
      new Notice("Error opening Gantt view: " + error.message);
    }
  }

  // Toggle Properties view
  async togglePropertiesView() {
    try {
      console.log("Toggling Properties view");
      const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_PROPERTIES);
      if (leaves.length > 0) {
        console.log("Closing existing Properties views");
        leaves.forEach(leaf => leaf.detach());
        return;
      }

      console.log("Opening new Properties view");
      const leaf = this.app.workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_PROPERTIES,
          active: true,
        });
        new Notice("Properties panel opened");
      } else {
        new Notice("Could not open Properties panel - no leaf available");
      }
    } catch (error) {
      console.error("Error toggling Properties view:", error);
      new Notice("Error opening Properties panel: " + error.message);
    }
  }

  // Toggle Roll-ups view
  async toggleRollupsView() {
    try {
      console.log("Toggling Roll-ups view");
      const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_ROLLUPS);
      if (leaves.length > 0) {
        console.log("Closing existing Roll-ups views");
        leaves.forEach(leaf => leaf.detach());
        return;
      }

      console.log("Opening new Roll-ups view");
      const leaf = this.app.workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_ROLLUPS,
          active: true,
        });
        new Notice("Roll-ups panel opened");
      } else {
        new Notice("Could not open Roll-ups panel - no leaf available");
      }
    } catch (error) {
      console.error("Error toggling Roll-ups view:", error);
      new Notice("Error opening Roll-ups panel: " + error.message);
    }
  }

  // Update status bar
  updateStatusBar() {
    if (!this.statusBarItem) return;

    const canvas = this.getActiveCanvas();
    if (!canvas) {
      this.statusBarItem.setText("MCP: No Canvas");
      return;
    }

    const nodeCount = canvas.nodes ? canvas.nodes.size : 0;
    const selectedCount = this.getSelectedNodes().length;
    
    // Count task nodes
    let taskCount = 0;
    let totalCost = 0;
    for (const [nodeId, node] of canvas.nodes) {
      const metadata = node.ext?.mcp;
      if (metadata?.isTask) {
        taskCount++;
        totalCost += metadata.rollupCost || metadata.cost || 0;
      }
    }
    
    this.statusBarItem.setText(`MCP: ${nodeCount} nodes, ${taskCount} tasks, $${totalCost.toFixed(0)}`);
  }
}

// Gantt View (MindManager style with roll-ups)
class GanttView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_GANTT;
  }

  getDisplayText() {
    return "Canvas Timeline";
  }

  getIcon() {
    return "calendar";
  }

  async onOpen() {
    console.log("Gantt view opening");
    this.refresh();
  }

  refresh() {
    try {
      console.log("Refreshing Gantt view");
      this.contentEl.empty();
      
      const canvas = this.plugin.getActiveCanvas();
      if (!canvas) {
        this.contentEl.createEl("p", { text: "Open a canvas to see timeline" });
        return;
      }

      console.log("Canvas found in Gantt view:", canvas);

      // Get tasks (nodes with start/end dates)
      const tasks = [];

      if (canvas.nodes) {
        if (canvas.nodes.forEach) {
          canvas.nodes.forEach((node, nodeId) => {
            const metadata = this.plugin.getNodeMetadata(nodeId);
            if (metadata?.startDate && metadata?.endDate && metadata?.isTask) {
              tasks.push({
                id: nodeId,
                label: node.text?.substring(0, 30) || nodeId,
                start: new Date(metadata.startDate),
                end: new Date(metadata.endDate),
                progress: metadata.rollupProgress || metadata.progress || 0,
                priority: metadata.priority || "medium",
                taskType: metadata.taskType || "task",
                cost: metadata.rollupCost || metadata.cost || 0,
                budget: metadata.rollupBudget || metadata.budget || 0,
                assignee: metadata.assignee || "",
                isParent: (metadata.childIds && metadata.childIds.length > 0),
              });
            }
          });
        } else {
          // Try iterating as Map or other iterable
          for (const [nodeId, node] of canvas.nodes) {
            const metadata = this.plugin.getNodeMetadata(nodeId);
            if (metadata?.startDate && metadata?.endDate && metadata?.isTask) {
              tasks.push({
                id: nodeId,
                label: node.text?.substring(0, 30) || nodeId,
                start: new Date(metadata.startDate),
                end: new Date(metadata.endDate),
                progress: metadata.rollupProgress || metadata.progress || 0,
                priority: metadata.priority || "medium",
                taskType: metadata.taskType || "task",
                cost: metadata.rollupCost || metadata.cost || 0,
                budget: metadata.rollupBudget || metadata.budget || 0,
                assignee: metadata.assignee || "",
                isParent: (metadata.childIds && metadata.childIds.length > 0),
              });
            }
          }
        }
      }

      console.log("Found tasks for Gantt:", tasks.length);

      if (tasks.length === 0) {
        this.contentEl.createEl("p", { text: "No tasks found. Convert nodes to tasks to see them here." });
        return;
      }

      this.createGanttChart(tasks);
    } catch (error) {
      console.error("Error refreshing Gantt view:", error);
      this.contentEl.empty();
      this.contentEl.createEl("p", { text: "Error loading timeline: " + error.message });
    }
  }

  createGanttChart(tasks) {
    const container = this.contentEl.createEl("div", { cls: "gantt-container" });
    
    container.createEl("h3", { text: "Project Timeline" });
    
    // Summary stats
    const totalCost = tasks.reduce((sum, task) => sum + task.cost, 0);
    const totalBudget = tasks.reduce((sum, task) => sum + task.budget, 0);
    const avgProgress = tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length;
    
    const statsEl = container.createEl("div", { cls: "timeline-stats" });
    statsEl.createEl("span", { text: `Total Cost: $${totalCost.toFixed(0)}` });
    statsEl.createEl("span", { text: `Budget: $${totalBudget.toFixed(0)}` });
    statsEl.createEl("span", { text: `Avg Progress: ${avgProgress.toFixed(0)}%` });
    
    // Calculate date range
    const minDate = new Date(Math.min(...tasks.map(t => t.start.getTime())));
    const maxDate = new Date(Math.max(...tasks.map(t => t.end.getTime())));
    const range = maxDate.getTime() - minDate.getTime();

    // Create timeline
    const timeline = container.createEl("div", { cls: "timeline" });
    
    tasks.forEach((task, index) => {
      const taskEl = timeline.createEl("div", { cls: "timeline-task" });
      
      // Task info
      const taskInfo = taskEl.createEl("div", { cls: "task-info" });
      const labelEl = taskInfo.createEl("div", { 
        cls: "task-label",
        text: task.label 
      });
      
      if (task.isParent) {
        labelEl.addClass("parent-task");
      }
      
      taskInfo.createEl("div", { 
        cls: "task-assignee",
        text: task.assignee ? `👤 ${task.assignee}` : ""
      });
      
      taskInfo.createEl("div", { 
        cls: "task-dates",
        text: `${task.start.toLocaleDateString()} - ${task.end.toLocaleDateString()}`
      });
      
      taskInfo.createEl("div", { 
        cls: "task-cost",
        text: `💰 $${task.cost.toFixed(0)} / $${task.budget.toFixed(0)}`
      });
      
      // Task bar container
      const barContainer = taskEl.createEl("div", { cls: "task-bar-container" });
      
      // Calculate position and width
      const startPercent = ((task.start.getTime() - minDate.getTime()) / range) * 100;
      const duration = task.end.getTime() - task.start.getTime();
      const widthPercent = (duration / range) * 100;
      
      // Task bar
      const taskBar = barContainer.createEl("div", { 
        cls: `task-bar priority-${task.priority} type-${task.taskType}` 
      });
      taskBar.style.left = `${startPercent}%`;
      taskBar.style.width = `${widthPercent}%`;
      
      // Progress bar
      const progressBar = taskBar.createEl("div", { cls: "progress-bar" });
      progressBar.style.width = `${task.progress}%`;
      
      // Progress text
      taskBar.createEl("span", { 
        cls: "progress-text",
        text: `${task.progress}%`
      });
    });
  }
}

// Properties View (Enhanced with roll-ups and costs)
class PropertiesView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.selectedNodeId = null;
  }

  getViewType() {
    return VIEW_TYPE_PROPERTIES;
  }

  getDisplayText() {
    return "Node Properties";
  }

  getIcon() {
    return "settings";
  }

  async onOpen() {
    console.log("Properties view opening");
    this.refresh();
    
    // Listen for canvas selection changes
    this.registerInterval(
      window.setInterval(() => {
        this.checkSelection();
      }, 500)
    );
  }

  checkSelection() {
    try {
      const selectedNodes = this.plugin.getSelectedNodes();
      const currentSelection = selectedNodes.length > 0 ? selectedNodes[0].id : null;
      
      if (currentSelection !== this.selectedNodeId) {
        this.selectedNodeId = currentSelection;
        this.refresh();
      }
    } catch (error) {
      console.error("Error checking selection in Properties view:", error);
    }
  }

  refresh() {
    try {
      console.log("Refreshing Properties view");
      this.contentEl.empty();
      
      if (!this.selectedNodeId) {
        this.contentEl.createEl("p", { text: "Select a node to edit properties" });
        return;
      }

      console.log("Selected node for properties:", this.selectedNodeId);
      const metadata = this.plugin.getNodeMetadata(this.selectedNodeId);
      console.log("Node metadata:", metadata);
      this.createPropertiesForm(this.selectedNodeId, metadata);
    } catch (error) {
      console.error("Error refreshing Properties view:", error);
      this.contentEl.empty();
      this.contentEl.createEl("p", { text: "Error loading properties: " + error.message });
    }
  }

  createPropertiesForm(nodeId, metadata) {
    const container = this.contentEl.createEl("div", { cls: "properties-container" });
    
    container.createEl("h3", { text: "Task Properties" });
    
    const form = container.createEl("form");
    
    // Task Type
    const typeGroup = form.createEl("div", { cls: "form-group" });
    typeGroup.createEl("label", { text: "Task Type" });
    const typeSelect = typeGroup.createEl("select");
    ["task", "milestone", "summary"].forEach(type => {
      const option = typeSelect.createEl("option", {
        value: type,
        text: type.charAt(0).toUpperCase() + type.slice(1)
      });
      if (metadata?.taskType === type) {
        option.selected = true;
      }
    });
    
    // Start Date
    const startGroup = form.createEl("div", { cls: "form-group" });
    startGroup.createEl("label", { text: "Start Date" });
    const startInput = startGroup.createEl("input", {
      type: "date",
      value: metadata?.startDate || ""
    });
    
    // End Date
    const endGroup = form.createEl("div", { cls: "form-group" });
    endGroup.createEl("label", { text: "End Date" });
    const endInput = endGroup.createEl("input", {
      type: "date",
      value: metadata?.endDate || ""
    });
    
    // Duration
    const durationGroup = form.createEl("div", { cls: "form-group" });
    durationGroup.createEl("label", { text: "Duration (days)" });
    const durationInput = durationGroup.createEl("input", {
      type: "number",
      attr: { min: "1" },
      value: (metadata?.duration || 1).toString()
    });
    
    // Progress
    const progressGroup = form.createEl("div", { cls: "form-group" });
    progressGroup.createEl("label", { text: "Progress %" });
    const progressInput = progressGroup.createEl("input", {
      type: "range",
      attr: { min: "0", max: "100" },
      value: (metadata?.progress || 0).toString()
    });
    const progressValue = progressGroup.createEl("span", {
      text: `${metadata?.progress || 0}%`
    });
    
    progressInput.addEventListener("input", () => {
      progressValue.textContent = `${progressInput.value}%`;
    });
    
    // Roll-up Progress (read-only)
    if (metadata?.rollupProgress !== undefined && metadata.rollupProgress !== metadata?.progress) {
      const rollupProgressGroup = form.createEl("div", { cls: "form-group" });
      rollupProgressGroup.createEl("label", { text: "Roll-up Progress (calculated)" });
      const rollupProgressEl = rollupProgressGroup.createEl("div", { 
        cls: "readonly-value",
        text: `${metadata.rollupProgress}%`
      });
    }
    
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
    
    // Cost Section
    const costHeader = form.createEl("h4", { text: "💰 Cost Management" });
    
    // Budget
    const budgetGroup = form.createEl("div", { cls: "form-group" });
    budgetGroup.createEl("label", { text: "Budget ($)" });
    const budgetInput = budgetGroup.createEl("input", {
      type: "number",
      attr: { min: "0", step: "0.01" },
      value: (metadata?.budget || 0).toString()
    });
    
    // Actual Cost
    const costGroup = form.createEl("div", { cls: "form-group" });
    costGroup.createEl("label", { text: "Actual Cost ($)" });
    const costInput = costGroup.createEl("input", {
      type: "number",
      attr: { min: "0", step: "0.01" },
      value: (metadata?.actualCost || metadata?.cost || 0).toString()
    });
    
    // Cost per Hour
    const costPerHourGroup = form.createEl("div", { cls: "form-group" });
    costPerHourGroup.createEl("label", { text: "Cost per Hour ($)" });
    const costPerHourInput = costPerHourGroup.createEl("input", {
      type: "number",
      attr: { min: "0", step: "0.01" },
      value: (metadata?.costPerHour || 0).toString()
    });
    
    // Roll-up Cost (read-only)
    if (metadata?.rollupCost !== undefined) {
      const rollupCostGroup = form.createEl("div", { cls: "form-group" });
      rollupCostGroup.createEl("label", { text: "Total Cost (with children)" });
      const rollupCostEl = rollupCostGroup.createEl("div", { 
        cls: "readonly-value cost-value",
        text: `$${(metadata.rollupCost || 0).toFixed(2)}`
      });
    }
    
    // Resources Section
    const resourceHeader = form.createEl("h4", { text: "👥 Resources" });
    
    // Assignee
    const assigneeGroup = form.createEl("div", { cls: "form-group" });
    assigneeGroup.createEl("label", { text: "Assignee" });
    const assigneeInput = assigneeGroup.createEl("input", {
      type: "text",
      value: metadata?.assignee || ""
    });
    
    // Resources
    const resourcesGroup = form.createEl("div", { cls: "form-group" });
    resourcesGroup.createEl("label", { text: "Resources" });
    const resourcesInput = resourcesGroup.createEl("input", {
      type: "text",
      placeholder: "Enter resources separated by commas",
      value: metadata?.resources?.join(", ") || ""
    });
    
    // Tags
    const tagsGroup = form.createEl("div", { cls: "form-group" });
    tagsGroup.createEl("label", { text: "Tags" });
    const tagsInput = tagsGroup.createEl("input", {
      type: "text",
      placeholder: "Enter tags separated by commas",
      value: metadata?.tags?.join(", ") || ""
    });
    
    // Obsidian Integration Section
    const obsidianHeader = form.createEl("h4", { text: "🔗 Obsidian Integration" });
    
    // Linked Note
    const linkedNoteGroup = form.createEl("div", { cls: "form-group" });
    linkedNoteGroup.createEl("label", { text: "Linked Note" });
    const linkedNoteInput = linkedNoteGroup.createEl("input", {
      type: "text",
      placeholder: "Path to linked note",
      value: metadata?.linkedNote || ""
    });
    
    // Sync to Properties
    const syncGroup = form.createEl("div", { cls: "form-group" });
    const syncLabel = syncGroup.createEl("label");
    const syncCheckbox = syncLabel.createEl("input", {
      type: "checkbox"
    });
    syncCheckbox.checked = metadata?.syncToProperties !== false;
    syncLabel.createSpan({ text: " Sync to Obsidian properties" });
    
    // Notes
    const notesGroup = form.createEl("div", { cls: "form-group" });
    notesGroup.createEl("label", { text: "Notes" });
    const notesTextarea = notesGroup.createEl("textarea", {
      value: metadata?.notes || ""
    });
    
    // Action buttons
    const buttonGroup = form.createEl("div", { cls: "button-group" });
    
    buttonGroup.createEl("button", {
      type: "submit",
      text: "Save Properties"
    });
    
    const rollupButton = buttonGroup.createEl("button", {
      type: "button",
      text: "Calculate Roll-ups"
    });
    
    rollupButton.addEventListener("click", () => {
      this.plugin.calculateNodeRollups(nodeId);
      this.refresh();
    });
    
    // Handle form submission
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const updatedMetadata = {
        taskType: typeSelect.value,
        startDate: startInput.value || null,
        endDate: endInput.value || null,
        duration: parseInt(durationInput.value) || 1,
        progress: parseInt(progressInput.value) || 0,
        priority: prioritySelect.value,
        budget: parseFloat(budgetInput.value) || 0,
        actualCost: parseFloat(costInput.value) || 0,
        cost: parseFloat(costInput.value) || 0,
        costPerHour: parseFloat(costPerHourInput.value) || 0,
        assignee: assigneeInput.value || "",
        resources: resourcesInput.value.split(",").map(res => res.trim()).filter(res => res),
        tags: tagsInput.value.split(",").map(tag => tag.trim()).filter(tag => tag),
        linkedNote: linkedNoteInput.value || null,
        syncToProperties: syncCheckbox.checked,
        notes: notesTextarea.value || "",
        isTask: true,
      };
      
      this.plugin.updateNodeMetadata(nodeId, updatedMetadata);
      new Notice("Properties saved");
    });
  }
}

// Roll-ups View (New - shows aggregated data)
class RollupsView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_ROLLUPS;
  }

  getDisplayText() {
    return "Roll-ups & Analytics";
  }

  getIcon() {
    return "bar-chart";
  }

  async onOpen() {
    console.log("Roll-ups view opening");
    this.refresh();
  }

  refresh() {
    try {
      console.log("Refreshing Roll-ups view");
      this.contentEl.empty();
      
      const canvas = this.plugin.getActiveCanvas();
      if (!canvas) {
        this.contentEl.createEl("p", { text: "Open a canvas to see roll-ups" });
        return;
      }

      console.log("Canvas found in Roll-ups view:", canvas);

      const container = this.contentEl.createEl("div", { cls: "rollups-container" });
      
      container.createEl("h3", { text: "📊 Project Analytics" });
      
      // Calculate project totals
      let totalTasks = 0;
      let totalCost = 0;
      let totalBudget = 0;
      let totalProgress = 0;
      let taskCount = 0;
      const priorities = { low: 0, medium: 0, high: 0 };
      const statuses = { notStarted: 0, inProgress: 0, completed: 0 };
    
    for (const [nodeId, node] of canvas.nodes) {
      const metadata = node.ext?.mcp;
      if (metadata?.isTask) {
        totalTasks++;
        totalCost += metadata.rollupCost || metadata.cost || 0;
        totalBudget += metadata.rollupBudget || metadata.budget || 0;
        totalProgress += metadata.rollupProgress || metadata.progress || 0;
        taskCount++;
        
        priorities[metadata.priority || 'medium']++;
        
        const progress = metadata.rollupProgress || metadata.progress || 0;
        if (progress === 0) statuses.notStarted++;
        else if (progress === 100) statuses.completed++;
        else statuses.inProgress++;
      }
    }
    
    // Summary cards
    const summaryGrid = container.createEl("div", { cls: "summary-grid" });
    
    this.createSummaryCard(summaryGrid, "💰 Total Cost", `$${totalCost.toFixed(0)}`, "cost");
    this.createSummaryCard(summaryGrid, "💳 Total Budget", `$${totalBudget.toFixed(0)}`, "budget");
    this.createSummaryCard(summaryGrid, "📈 Avg Progress", `${taskCount > 0 ? (totalProgress / taskCount).toFixed(0) : 0}%`, "progress");
    this.createSummaryCard(summaryGrid, "📋 Total Tasks", totalTasks.toString(), "tasks");
    
    // Cost variance
    const variance = totalBudget - totalCost;
    const varianceClass = variance >= 0 ? "positive" : "negative";
    this.createSummaryCard(summaryGrid, "📊 Budget Variance", `$${variance.toFixed(0)}`, varianceClass);
    
    // Charts section
    const chartsSection = container.createEl("div", { cls: "charts-section" });
    
    // Priority breakdown
    const priorityChart = chartsSection.createEl("div", { cls: "chart-container" });
    priorityChart.createEl("h4", { text: "Priority Breakdown" });
    const priorityList = priorityChart.createEl("div", { cls: "priority-list" });
    
    Object.entries(priorities).forEach(([priority, count]) => {
      const item = priorityList.createEl("div", { cls: `priority-item priority-${priority}` });
      item.createEl("span", { text: priority.toUpperCase() });
      item.createEl("span", { text: count.toString() });
    });
    
    // Status breakdown
    const statusChart = chartsSection.createEl("div", { cls: "chart-container" });
    statusChart.createEl("h4", { text: "Status Breakdown" });
    const statusList = statusChart.createEl("div", { cls: "status-list" });
    
    Object.entries(statuses).forEach(([status, count]) => {
      const item = statusList.createEl("div", { cls: `status-item status-${status}` });
      item.createEl("span", { text: status.replace(/([A-Z])/g, ' $1').trim() });
      item.createEl("span", { text: count.toString() });
    });
    
    // Task hierarchy tree
    const hierarchySection = container.createEl("div", { cls: "hierarchy-section" });
    hierarchySection.createEl("h4", { text: "Task Hierarchy" });
    
    this.createHierarchyTree(hierarchySection, canvas);
    
    // Actions
    const actionsSection = container.createEl("div", { cls: "actions-section" });
    actionsSection.createEl("h4", { text: "Actions" });
    
    const calculateBtn = actionsSection.createEl("button", { 
      text: "🔄 Recalculate All Roll-ups",
      cls: "action-button"
    });
    calculateBtn.addEventListener("click", () => {
      this.plugin.calculateAllRollups();
      this.refresh();
    });
    
    const syncBtn = actionsSection.createEl("button", { 
      text: "🔗 Sync to Obsidian Properties",
      cls: "action-button"
    });
    syncBtn.addEventListener("click", () => {
      this.plugin.syncToObsidianProperties();
    });
  } catch (error) {
    console.error("Error refreshing Roll-ups view:", error);
    this.contentEl.empty();
    this.contentEl.createEl("p", { text: "Error loading roll-ups: " + error.message });
  }
}
  
  createSummaryCard(parent, title, value, type) {
    const card = parent.createEl("div", { cls: `summary-card ${type}` });
    card.createEl("div", { cls: "card-title", text: title });
    card.createEl("div", { cls: "card-value", text: value });
  }
  
  createHierarchyTree(parent, canvas) {
    const tree = parent.createEl("div", { cls: "hierarchy-tree" });
    
    try {
      // Find root tasks (no parent)
      const rootTasks = [];
      if (canvas.nodes) {
        if (canvas.nodes.forEach) {
          canvas.nodes.forEach((node, nodeId) => {
            const metadata = node.ext?.mcp;
            if (metadata?.isTask && !metadata.parentId) {
              rootTasks.push({ node, metadata, id: nodeId });
            }
          });
        } else {
          for (const [nodeId, node] of canvas.nodes) {
            const metadata = node.ext?.mcp;
            if (metadata?.isTask && !metadata.parentId) {
              rootTasks.push({ node, metadata, id: nodeId });
            }
          }
        }
      }
      
      // Build tree recursively
      rootTasks.forEach(task => {
        this.createTaskNode(tree, task, canvas, 0);
      });
    } catch (error) {
      console.error("Error creating hierarchy tree:", error);
      tree.createEl("p", { text: "Error loading hierarchy" });
    }
  }
  
  createTaskNode(parent, task, canvas, level) {
    try {
      const taskEl = parent.createEl("div", { cls: `task-node level-${level}` });
      
      const taskInfo = taskEl.createEl("div", { cls: "task-info" });
      taskInfo.createEl("span", { cls: "task-name", text: task.node.text || "Untitled" });
      taskInfo.createEl("span", { cls: "task-progress", text: `${task.metadata.rollupProgress || task.metadata.progress || 0}%` });
      taskInfo.createEl("span", { cls: "task-cost", text: `$${(task.metadata.rollupCost || task.metadata.cost || 0).toFixed(0)}` });
      
      // Add children
      if (task.metadata.childIds && task.metadata.childIds.length > 0) {
        const children = taskEl.createEl("div", { cls: "task-children" });
        task.metadata.childIds.forEach(childId => {
          const childNode = canvas.nodes?.get ? canvas.nodes.get(childId) : null;
          if (childNode && childNode.ext?.mcp?.isTask) {
            this.createTaskNode(children, {
              node: childNode,
              metadata: childNode.ext.mcp,
              id: childId
            }, canvas, level + 1);
          }
        });
      }
    } catch (error) {
      console.error("Error creating task node:", error);
    }
  }
}

module.exports = MindCanvasPlus; 