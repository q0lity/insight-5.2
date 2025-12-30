const { Plugin, Menu, Setting, Modal, ItemView, TFile, Notice, addIcon, WorkspaceLeaf, DropdownComponent, TextComponent, ToggleComponent, SliderComponent, debounce } = require('obsidian');

// ============================================================================
// VIEW TYPE CONSTANTS
// ============================================================================
const VIEW_TYPE_PROPERTIES = 'mindcanvas-properties';
const VIEW_TYPE_GANTT = 'mindcanvas-gantt';
const VIEW_TYPE_ROLLUPS = 'mindcanvas-rollups';
const VIEW_TYPE_FILTERS = 'mindcanvas-filters';

// ============================================================================
// MAIN PLUGIN CLASS
// ============================================================================
class MindCanvasPlus3 extends Plugin {
  
  async onload() {
    console.log('🚀 MindCanvas Plus 3: Starting comprehensive plugin load...');
    
    try {
      // Initialize settings
      await this.loadSettings();
      console.log('✅ Settings loaded');
      
      // Add custom icons
      this.addCustomIcons();
      console.log('✅ Custom icons added');
      
      // Register all views
      this.registerViews();
      console.log('✅ Views registered');
      
      // Add ribbon icons
      this.addRibbonIcons();
      console.log('✅ Ribbon icons added');
      
      // Register commands and hotkeys
      this.registerCommands();
      console.log('✅ Commands registered');
      
      // Register events
      this.registerEvents();
      console.log('✅ Events registered');
      
      // Initialize metadata system
      this.initializeMetadataSystem();
      console.log('✅ Metadata system initialized');
      
      // Setup auto-save
      this.setupAutoSave();
      console.log('✅ Auto-save configured');
      
      console.log('✅ MindCanvas Plus 3: Loaded successfully with all features');
      new Notice('🚀 MindCanvas Plus 3: Ready! Use Cmd+Enter to create nodes in Canvas.');
      
    } catch (error) {
      console.error('❌ MindCanvas Plus 3: Loading failed:', error);
      new Notice('❌ MindCanvas Plus 3 failed to load: ' + error.message);
    }
  }

  onunload() {
    console.log('🛑 MindCanvas Plus 3: Unloading...');
  }

  // ============================================================================
  // SETTINGS MANAGEMENT
  // ============================================================================
  
  async loadSettings() {
    this.settings = Object.assign({}, {
      autoSaveInterval: 5000,
      defaultPriority: 'medium',
      defaultCurrency: 'USD',
      enableRollups: true,
      enableVisualIndicators: true,
      showPropertiesPanel: true,
      debugMode: false
    }, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // ============================================================================
  // CUSTOM ICONS
  // ============================================================================
  
  addCustomIcons() {
    // Add custom SVG icons for MindManager-style features
    addIcon('mindcanvas-task', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>');
    addIcon('mindcanvas-gantt', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="2"/><rect x="3" y="8" width="12" height="2"/><rect x="3" y="12" width="15" height="2"/><rect x="3" y="16" width="9" height="2"/></svg>');
    addIcon('mindcanvas-rollup', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>');
    addIcon('mindcanvas-filter', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/></svg>');
    addIcon('mindcanvas-properties', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M9 9h6M9 15h6"/></svg>');
    addIcon('microscope', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h.01"/><path d="M9 12a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2"/><path d="M10 17a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/></svg>');
    addIcon('target', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>');
  }

  // ============================================================================
  // VIEW REGISTRATION
  // ============================================================================
  
  registerViews() {
    this.registerView(VIEW_TYPE_PROPERTIES, (leaf) => new PropertiesView(leaf, this));
    this.registerView(VIEW_TYPE_GANTT, (leaf) => new GanttView(leaf, this));
    this.registerView(VIEW_TYPE_ROLLUPS, (leaf) => new RollupsView(leaf, this));
    this.registerView(VIEW_TYPE_FILTERS, (leaf) => new FiltersView(leaf, this));
  }

  // ============================================================================
  // RIBBON ICONS
  // ============================================================================
  
  addRibbonIcons() {
    // Properties panel
    this.addRibbonIcon('mindcanvas-properties', 'Toggle Properties Panel', () => {
      this.toggleView(VIEW_TYPE_PROPERTIES);
    });

    // Gantt view
    this.addRibbonIcon('mindcanvas-gantt', 'Toggle Gantt View', () => {
      this.toggleView(VIEW_TYPE_GANTT);
    });

    // Rollups view
    this.addRibbonIcon('mindcanvas-rollup', 'Toggle Rollups View', () => {
      this.toggleView(VIEW_TYPE_ROLLUPS);
    });

    // Filters view
    this.addRibbonIcon('mindcanvas-filter', 'Toggle Filters View', () => {
      this.toggleView(VIEW_TYPE_FILTERS);
    });

    // Debug view - always add for troubleshooting
    this.addRibbonIcon('bug', 'Debug Canvas Selection', () => {
      this.debugCanvasSelection();
    });
    
    // Deep Canvas API debug
    this.addRibbonIcon('microscope', 'Deep Canvas Debug', () => {
      this.deepCanvasDebug();
    });
    
    // Test Canvas selection directly
    this.addRibbonIcon('target', 'Test Canvas Selection DIRECT', () => {
      this.testCanvasSelectionDirect();
    });
    
    // Test Canvas plugin access as suggested by user
    this.addRibbonIcon('settings', 'Test Canvas Plugin Access', () => {
      this.testCanvasPluginAccess();
    });
  }

  // ============================================================================
  // COMMAND REGISTRATION
  // ============================================================================
  
  registerCommands() {
    // DEFINITIVE FIX: Use the EXACT advanced-canvas pattern
    this.addCommand({
      id: 'mcp-create-connected-node',
      name: 'Create Connected Node',
      hotkeys: [{ modifiers: ['Mod'], key: 'Enter' }],
      checkCallback: (checking) => {
        // Use the EXACT same pattern from advanced-canvas
        const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
        if (canvasView?.getViewType() === 'canvas') {
          if (!checking) {
            this.createConnectedNode(canvasView);
          }
          return true;
        }
        return false;
      }
    });

    this.addCommand({
      id: 'mcp-create-child-node',
      name: 'Create Child Node',
      hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'Enter' }],
      checkCallback: (checking) => {
        const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
        if (canvasView?.getViewType() === 'canvas') {
          if (!checking) {
            this.createChildNode(canvasView);
          }
          return true;
        }
        return false;
      }
    });

    this.addCommand({
      id: 'mcp-create-sibling-node',
      name: 'Create Sibling Node',
      hotkeys: [{ modifiers: ['Alt'], key: 'Enter' }],
      checkCallback: (checking) => {
        const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
        if (canvasView?.getViewType() === 'canvas') {
          if (!checking) {
            this.createSiblingNode(canvasView);
          }
          return true;
        }
        return false;
      }
    });

    this.addCommand({
      id: 'create-parent-node',
      name: 'Create Parent Node',
      hotkeys: [{ modifiers: ['Shift'], key: 'Enter' }],
      checkCallback: (checking) => {
        const canvas = this.getActiveCanvas();
        if (checking) return !!canvas;
        this.createParentNode();
        return true;
      }
    });

    // Task management commands
    this.addCommand({
      id: 'convert-to-task',
      name: 'Convert Node to Task',
      checkCallback: (checking) => {
        const canvas = this.getActiveCanvas();
        const selectedNodes = this.getSelectedNodes();
        if (checking) return !!canvas && selectedNodes.length > 0;
        this.convertNodesToTasks(selectedNodes);
        return true;
      }
    });

    this.addCommand({
      id: 'calculate-rollups',
      name: 'Calculate Rollups',
      checkCallback: (checking) => {
        const canvas = this.getActiveCanvas();
        if (checking) return !!canvas;
        this.calculateAllRollups();
        return true;
      }
    });

    // View toggle commands
    this.addCommand({
      id: 'toggle-properties-view',
      name: 'Toggle Properties View',
      callback: () => this.toggleView(VIEW_TYPE_PROPERTIES)
    });

    this.addCommand({
      id: 'toggle-gantt-view',
      name: 'Toggle Gantt View',
      callback: () => this.toggleView(VIEW_TYPE_GANTT)
    });

    this.addCommand({
      id: 'toggle-rollups-view',
      name: 'Toggle Rollups View',
      callback: () => this.toggleView(VIEW_TYPE_ROLLUPS)
    });

    this.addCommand({
      id: 'toggle-filters-view',
      name: 'Toggle Filters View',
      callback: () => this.toggleView(VIEW_TYPE_FILTERS)
    });
  }

  // ============================================================================
  // EVENT REGISTRATION
  // ============================================================================
  
  registerEvents() {
    // Listen for Canvas changes
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => {
        this.onActiveLeafChange();
      })
    );

    // Listen for file changes to sync metadata
    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (file.extension === 'canvas') {
          this.onCanvasFileModified(file);
        }
      })
    );

    // Listen for editor menu (context menu) for Canvas
    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu, editor, view) => {
        if (view.getViewType() === 'canvas') {
          this.addContextMenuItems(menu, view);
        }
      })
    );
  }

  // ============================================================================
  // CANVAS API INTEGRATION (CORE FUNCTIONALITY)
  // ============================================================================
  
  getActiveCanvasView() {
    try {
      console.log('🔍 Using EXACT advanced-canvas pattern...');
      
      // DEFINITIVE FIX: Use the EXACT same pattern from advanced-canvas
      const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
      if (canvasView?.getViewType() !== "canvas") {
        console.log('❌ Active view is not canvas:', canvasView?.getViewType());
        return null;
      }
      
      console.log('✅ Found canvas view using advanced-canvas pattern');
      return canvasView;
    } catch (error) {
      console.error('❌ Error getting canvas view:', error);
      return null;
    }
  }

  // Legacy method for compatibility - now uses getActiveCanvasView
  getActiveCanvas() {
    return this.getActiveCanvasView();
  }

  getSelectedNodes() {
    const canvas = this.getActiveCanvas();
    if (!canvas) {
      console.log('❌ No canvas for getSelectedNodes');
      return [];
    }

    try {
      console.log('🔍 Getting selected nodes...');
      console.log('🔍 Canvas object properties:', {
        hasSelection: !!canvas.selection,
        selectionType: canvas.selection ? canvas.selection.constructor.name : 'none',
        selectionSize: canvas.selection?.size,
        hasSelectedNodes: !!canvas.selectedNodes,
        hasNodes: !!canvas.nodes,
        nodesType: canvas.nodes ? canvas.nodes.constructor.name : 'none'
      });
      
      const selectedNodes = [];
      
      // Method 1: Try canvas.selection (Set of selected items)
      if (canvas.selection && canvas.selection.size > 0) {
        console.log('🔍 Method 1: Using canvas.selection');
        
        for (const item of canvas.selection) {
          console.log('🔍 Selection item:', {
            type: typeof item,
            constructor: item?.constructor?.name,
            id: item?.id,
            hasText: 'text' in (item || {}),
            hasNodeEl: 'nodeEl' in (item || {}),
            keys: item ? Object.keys(item).slice(0, 10) : []
          });
          
          // Direct node object
          if (item && typeof item === 'object' && item.id) {
            console.log('✅ Found selected node (direct):', item.id);
            selectedNodes.push(item);
          }
          // String ID - need to lookup in nodes map
          else if (typeof item === 'string' && canvas.nodes && canvas.nodes.get) {
            const node = canvas.nodes.get(item);
            if (node) {
              console.log('✅ Found selected node (by ID lookup):', item);
              selectedNodes.push(node);
            } else {
              console.log('⚠️ Node ID not found in nodes map:', item);
            }
          }
        }
      }
      
      // Method 2: Try canvas.selectedNodes (if available)
      if (selectedNodes.length === 0 && canvas.selectedNodes) {
        console.log('🔍 Method 2: Using canvas.selectedNodes');
        
        if (Array.isArray(canvas.selectedNodes)) {
          selectedNodes.push(...canvas.selectedNodes);
        } else if (canvas.selectedNodes.size > 0) {
          selectedNodes.push(...Array.from(canvas.selectedNodes));
        }
        
        console.log('📊 Found via selectedNodes:', selectedNodes.length);
      }
      
      // Method 3: Check for focused/active node
      if (selectedNodes.length === 0 && canvas.focusedNode) {
        console.log('🔍 Method 3: Using canvas.focusedNode');
        selectedNodes.push(canvas.focusedNode);
      }
      
      // Method 4: Try alternative Canvas API properties
      if (selectedNodes.length === 0) {
        console.log('🔍 Method 4: Checking alternative properties');
        
        // Check various possible selection properties
        const possibleSelectionProps = [
          'activeSelection', 'currentSelection', 'selected', 
          'activeNode', 'currentNode', 'activeElements'
        ];
        
        for (const prop of possibleSelectionProps) {
          if (canvas[prop]) {
            console.log(`🔍 Found property: ${prop}`, canvas[prop]);
            
            if (Array.isArray(canvas[prop])) {
              selectedNodes.push(...canvas[prop]);
              break;
            } else if (canvas[prop].size > 0) {
              selectedNodes.push(...Array.from(canvas[prop]));
              break;
            } else if (typeof canvas[prop] === 'object' && canvas[prop].id) {
              selectedNodes.push(canvas[prop]);
              break;
            }
          }
        }
      }
      
      console.log('📊 Final selected nodes count:', selectedNodes.length);
      
      if (selectedNodes.length > 0) {
        console.log('✅ Selected nodes:', selectedNodes.map(n => ({ id: n.id, text: n.text })));
      } else {
        console.log('❌ No selected nodes found with any method');
      }
      
      return selectedNodes;
    } catch (error) {
      console.error('❌ Error getting selected nodes:', error);
      return [];
    }
  }

  createNode(canvas, nodeData) {
    try {
      console.log('🔧 Creating node with data:', nodeData);
      
      let newNode = null;
      
      // Try createTextNode method
      if (typeof canvas.createTextNode === 'function') {
        console.log('🚀 Using createTextNode');
        newNode = canvas.createTextNode(nodeData);
      } else if (typeof canvas.addNode === 'function') {
        console.log('🚀 Using addNode');
        newNode = canvas.addNode({
          type: 'text',
          ...nodeData
        });
      } else {
        console.log('❌ No suitable Canvas API method found');
        new Notice('❌ Canvas API not available for node creation');
        return null;
      }

      if (newNode) {
        console.log('✅ Node created successfully:', newNode.id);
        
        // Initialize node metadata
        this.initializeNodeMetadata(newNode);
        
        // Apply visual indicators if enabled
        if (this.settings.enableVisualIndicators) {
          this.applyVisualIndicators(newNode);
        }
        
        // Auto-save
        this.debouncedSave();
        
        return newNode;
      } else {
        console.log('❌ Node creation returned null');
        new Notice('❌ Failed to create node');
        return null;
      }
    } catch (error) {
      console.error('❌ Error creating node:', error);
      new Notice('❌ Error creating node: ' + error.message);
      return null;
    }
  }

  createEdge(canvas, fromNode, toNode) {
    try {
      console.log('🔗 Creating edge from', fromNode.id, 'to', toNode.id);
      
      if (typeof canvas.createEdge === 'function') {
        const edge = canvas.createEdge({
          fromNode: fromNode.id,
          toNode: toNode.id
        });
        console.log('✅ Edge created successfully');
        return edge;
      } else if (typeof canvas.addEdge === 'function') {
        const edge = canvas.addEdge({
          from: fromNode.id,
          to: toNode.id
        });
        console.log('✅ Edge created successfully (addEdge)');
        return edge;
      } else {
        console.log('❌ No edge creation method available');
        return null;
      }
    } catch (error) {
      console.error('❌ Error creating edge:', error);
      return null;
    }
  }

  // ============================================================================
  // NODE CREATION METHODS (MINDMANAGER-STYLE)
  // ============================================================================
  
  createConnectedNode(canvasView) {
    console.log('🚀 Creating connected node using REAL Canvas API from advanced-canvas pattern...');
    
    // DEFINITIVE FIX: Use the REAL Canvas API pattern from advanced-canvas
    // Canvas API methods are in canvasView.canvas, selection is in canvasView
    const canvas = canvasView.canvas;
    if (!canvas) {
      console.log('❌ No canvas object found in canvasView');
      new Notice('❌ Canvas API not available');
      return;
    }

    // Get selected nodes from canvasView (not canvas)
    const selected = canvasView.getSelectedNodes();
    console.log('🔍 Selected nodes from CanvasView:', selected.length);
    
    if (!selected.length) {
      new Notice('❌ Please select a node in the Canvas first');
      return;
    }

    const nodeToConnect = selected[0];
    console.log('📍 Node to connect:', nodeToConnect.id);

    // Create new node using REAL Canvas API (canvas.createTextNode)
    const newNode = canvas.createTextNode({
      pos: {
        x: nodeToConnect.x + 200,
        y: nodeToConnect.y
      },
      size: {
        width: 150,
        height: 60
      },
      text: 'New Connected Node'
    });

    if (newNode) {
      // Create edge using Canvas API
      canvas.createEdge({
        from: {
          node: nodeToConnect,
          side: 'right'
        },
        to: {
          node: newNode,
          side: 'left'
        }
      });
      
      new Notice('✅ Connected node created with REAL Canvas API');
      console.log('✅ Node and edge created successfully');
    }
  }

  createChildNode(canvasView) {
    console.log('🚀 Creating child node using REAL Canvas API...');
    
    // Use the REAL Canvas API pattern
    const canvas = canvasView.canvas;
    if (!canvas) {
      new Notice('❌ Canvas API not available');
      return;
    }

    const selected = canvasView.getSelectedNodes();
    console.log('🔍 Selected nodes from CanvasView:', selected.length);
    
    if (!selected.length) {
      new Notice('❌ Please select a parent node in the Canvas first');
      return;
    }

    const parentNode = selected[0];
    console.log('📍 Parent node:', parentNode.id);

    // Create child node using REAL Canvas API
    const newNode = canvas.createTextNode({
      pos: {
        x: parentNode.x + 100,
        y: parentNode.y + 100
      },
      size: {
        width: 140,
        height: 50
      },
      text: 'Child Node'
    });

    if (newNode) {
      // Create edge using Canvas API
      canvas.createEdge({
        from: {
          node: parentNode,
          side: 'bottom'
        },
        to: {
          node: newNode,
          side: 'top'
        }
      });
      
      new Notice('✅ Child node created with REAL Canvas API');
      console.log('✅ Child node and edge created successfully');
    }
  }

  createSiblingNode(canvasView) {
    console.log('🚀 Creating sibling node using REAL Canvas API...');
    
    // Use the REAL Canvas API pattern
    const canvas = canvasView.canvas;
    if (!canvas) {
      new Notice('❌ Canvas API not available');
      return;
    }

    const selected = canvasView.getSelectedNodes();
    console.log('🔍 Selected nodes from CanvasView:', selected.length);
    
    if (!selected.length) {
      new Notice('❌ Please select a node in the Canvas first');
      return;
    }

    const siblingNode = selected[0];
    console.log('📍 Sibling node:', siblingNode.id);

    // Create sibling node using REAL Canvas API
    const newNode = canvas.createTextNode({
      pos: {
        x: siblingNode.x,
        y: siblingNode.y + 80
      },
      size: {
        width: siblingNode.width || 150,
        height: siblingNode.height || 60
      },
      text: 'Sibling Node'
    });

    if (newNode) {
      new Notice('✅ Sibling node created with REAL Canvas API');
      console.log('✅ Sibling node created successfully');
    }
  }

  createParentNode() {
    console.log('🚀 Creating parent node...');
    
    const canvas = this.getActiveCanvas();
    if (!canvas) {
      new Notice('❌ Please open a Canvas file first');
      return;
    }

    const selectedNodes = this.getSelectedNodes();
    if (selectedNodes.length === 0) {
      new Notice('❌ Please select a child node first');
      return;
    }

    const childNode = selectedNodes[0];
    console.log('📍 Child node:', childNode.id);

    // Position the parent node above and to the left
    const newNodeData = {
      text: 'Parent Node',
      x: childNode.x - 100,
      y: childNode.y - 100,
      width: 160,
      height: 70
    };

    const newNode = this.createNode(canvas, newNodeData);
    if (newNode) {
      // Create hierarchical relationship
      this.createHierarchicalRelationship(newNode, childNode);
      
      // Create edge
      this.createEdge(canvas, newNode, childNode);
      
      // Select and focus the new node
      this.selectAndFocusNode(canvas, newNode);
      
      new Notice('✅ Parent node created');
    }
  }

  selectAndFocusNode(canvas, node) {
    try {
      console.log('🎯 Selecting and focusing node:', node.id);
      
      // Clear current selection
      if (canvas.deselectAll) {
        canvas.deselectAll();
      }
      
      // Select the new node
      if (canvas.selection && canvas.selection.add) {
        canvas.selection.add(node);
      }
      
      // Focus on the node (zoom to it)
      if (canvas.zoomToSelection) {
        canvas.zoomToSelection();
      }
      
      // Start editing if possible
      if (canvas.startEditing && node) {
        setTimeout(() => {
          canvas.startEditing(node);
        }, 100);
      }
      
      console.log('✅ Node selected and focused');
    } catch (error) {
      console.error('❌ Error selecting and focusing node:', error);
    }
  }

  // ============================================================================
  // METADATA SYSTEM
  // ============================================================================
  
  initializeMetadataSystem() {
    // Initialize the metadata namespace
    this.metadataNamespace = 'ext.mcp';
    console.log('🗃️ Metadata system initialized with namespace:', this.metadataNamespace);
  }

  initializeNodeMetadata(node) {
    if (!node.id) {
      console.log('❌ Cannot initialize metadata for node without ID');
      return;
    }

    const metadata = {
      // Task properties
      isTask: false,
      taskStatus: 'pending',
      priority: this.settings.defaultPriority,
      progress: 0,
      estimatedHours: 0,
      actualHours: 0,
      startDate: null,
      endDate: null,
      assignee: '',
      dependencies: [],
      
      // Financial properties
      cost: 0,
      budget: 0,
      actualCost: 0,
      currency: this.settings.defaultCurrency,
      costPerHour: 0,
      
      // Hierarchy properties
      parentId: null,
      childIds: [],
      level: 0,
      
      // Rollup properties (calculated)
      rollupCost: 0,
      rollupBudget: 0,
      rollupProgress: 0,
      rollupHours: 0,
      
      // General properties
      tags: [],
      notes: '',
      linkedNote: null,
      backlinks: [],
      
      // System properties
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      version: '3.0.0'
    };

    // Store metadata using the custom namespace
    if (!node[this.metadataNamespace]) {
      node[this.metadataNamespace] = {};
    }
    node[this.metadataNamespace] = { ...node[this.metadataNamespace], ...metadata };
    
    console.log('✅ Node metadata initialized for:', node.id);
  }

  getNodeMetadata(node) {
    if (!node || !node[this.metadataNamespace]) {
      return null;
    }
    return node[this.metadataNamespace];
  }

  updateNodeMetadata(node, updates) {
    if (!node || !node.id) {
      console.log('❌ Cannot update metadata for invalid node');
      return;
    }

    if (!node[this.metadataNamespace]) {
      this.initializeNodeMetadata(node);
    }

    // Update timestamp
    updates.updated = new Date().toISOString();
    
    // Apply updates
    Object.assign(node[this.metadataNamespace], updates);
    
    console.log('✅ Node metadata updated for:', node.id);
    
    // Trigger rollup calculations if enabled
    if (this.settings.enableRollups) {
      this.calculateRollupsForNode(node);
    }
    
    // Sync to Obsidian metadata if linked note exists
    this.syncNodeToObsidianProperties(node);
    
    // Auto-save
    this.debouncedSave();
  }

  // ============================================================================
  // HIERARCHY AND RELATIONSHIPS
  // ============================================================================
  
  createHierarchicalRelationship(parentNode, childNode) {
    try {
      console.log('🔗 Creating hierarchical relationship:', parentNode.id, '->', childNode.id);
      
      const parentMetadata = this.getNodeMetadata(parentNode);
      const childMetadata = this.getNodeMetadata(childNode);
      
      if (parentMetadata && childMetadata) {
        // Update parent's child list
        if (!parentMetadata.childIds.includes(childNode.id)) {
          parentMetadata.childIds.push(childNode.id);
        }
        
        // Update child's parent
        childMetadata.parentId = parentNode.id;
        childMetadata.level = parentMetadata.level + 1;
        
        // Update timestamps
        parentMetadata.updated = new Date().toISOString();
        childMetadata.updated = new Date().toISOString();
        
        console.log('✅ Hierarchical relationship created');
      }
    } catch (error) {
      console.error('❌ Error creating hierarchical relationship:', error);
    }
  }

  copyNodeProperties(sourceNode, targetNode) {
    try {
      const sourceMetadata = this.getNodeMetadata(sourceNode);
      if (sourceMetadata) {
        const propertiesToCopy = {
          priority: sourceMetadata.priority,
          currency: sourceMetadata.currency,
          costPerHour: sourceMetadata.costPerHour,
          tags: [...sourceMetadata.tags]
        };
        
        this.updateNodeMetadata(targetNode, propertiesToCopy);
        console.log('✅ Node properties copied');
      }
    } catch (error) {
      console.error('❌ Error copying node properties:', error);
    }
  }

  // ============================================================================
  // TASK MANAGEMENT
  // ============================================================================
  
  convertNodesToTasks(nodes) {
    nodes.forEach(node => {
      this.updateNodeMetadata(node, {
        isTask: true,
        taskStatus: 'pending'
      });
      
      this.applyVisualIndicators(node);
    });
    
    new Notice(`✅ Converted ${nodes.length} node(s) to tasks`);
  }

  // ============================================================================
  // ROLLUP CALCULATIONS
  // ============================================================================
  
  calculateAllRollups() {
    const canvas = this.getActiveCanvas();
    if (!canvas || !canvas.nodes) {
      console.log('❌ No canvas or nodes for rollup calculation');
      return;
    }

    try {
      console.log('🧮 Calculating all rollups...');
      
      // Get all nodes
      const allNodes = Array.from(canvas.nodes.values());
      
      // Start with leaf nodes (no children) and work up
      const processedNodes = new Set();
      
      // Process nodes in dependency order
      allNodes.forEach(node => {
        const metadata = this.getNodeMetadata(node);
        if (metadata && metadata.childIds.length === 0) {
          this.calculateRollupsForNode(node, processedNodes);
        }
      });
      
      console.log('✅ All rollups calculated');
      new Notice('✅ Rollup calculations completed');
    } catch (error) {
      console.error('❌ Error calculating rollups:', error);
      new Notice('❌ Error calculating rollups: ' + error.message);
    }
  }

  calculateRollupsForNode(node, processedNodes = new Set()) {
    if (processedNodes.has(node.id)) {
      return; // Already processed
    }

    const metadata = this.getNodeMetadata(node);
    if (!metadata) {
      return;
    }

    try {
      // Initialize rollup values
      let rollupCost = metadata.cost || 0;
      let rollupBudget = metadata.budget || 0;
      let rollupHours = (metadata.estimatedHours || 0) + (metadata.actualHours || 0);
      let rollupProgress = metadata.progress || 0;
      let totalWeight = 1;

      // Get canvas to access child nodes
      const canvas = this.getActiveCanvas();
      if (canvas && canvas.nodes) {
        // Process child nodes first
        metadata.childIds.forEach(childId => {
          const childNode = canvas.nodes.get(childId);
          if (childNode) {
            // Recursively calculate child rollups first
            this.calculateRollupsForNode(childNode, processedNodes);
            
            const childMetadata = this.getNodeMetadata(childNode);
            if (childMetadata) {
              rollupCost += childMetadata.rollupCost || 0;
              rollupBudget += childMetadata.rollupBudget || 0;
              rollupHours += childMetadata.rollupHours || 0;
              
              // Weight progress by hours
              const childWeight = Math.max(childMetadata.rollupHours || 1, 1);
              rollupProgress += (childMetadata.rollupProgress || 0) * childWeight;
              totalWeight += childWeight;
            }
          }
        });
      }

      // Calculate weighted average progress
      rollupProgress = totalWeight > 0 ? rollupProgress / totalWeight : 0;

      // Update rollup values
      this.updateNodeMetadata(node, {
        rollupCost,
        rollupBudget,
        rollupHours,
        rollupProgress
      });

      processedNodes.add(node.id);
      
      console.log('✅ Rollups calculated for node:', node.id);
    } catch (error) {
      console.error('❌ Error calculating rollups for node:', node.id, error);
    }
  }

  // ============================================================================
  // VISUAL INDICATORS
  // ============================================================================
  
  applyVisualIndicators(node) {
    if (!this.settings.enableVisualIndicators) {
      return;
    }

    try {
      const metadata = this.getNodeMetadata(node);
      if (!metadata) {
        return;
      }

      // Apply CSS data attributes for styling
      if (node.nodeEl) {
        const element = node.nodeEl;
        
        // Task status
        if (metadata.isTask) {
          element.setAttribute('data-is-task', 'true');
          element.setAttribute('data-task-status', metadata.taskStatus);
        }
        
        // Priority
        element.setAttribute('data-task-priority', metadata.priority);
        
        // Progress
        if (metadata.progress > 0) {
          element.setAttribute('data-progress', Math.round(metadata.progress));
        }
        
        // Financial status
        if (metadata.cost > 0 || metadata.budget > 0) {
          element.setAttribute('data-has-financial', 'true');
        }
      }
      
      console.log('✅ Visual indicators applied to node:', node.id);
    } catch (error) {
      console.error('❌ Error applying visual indicators:', error);
    }
  }

  // ============================================================================
  // OBSIDIAN INTEGRATION
  // ============================================================================
  
  async syncNodeToObsidianProperties(node) {
    try {
      const metadata = this.getNodeMetadata(node);
      if (!metadata || !metadata.linkedNote) {
        return;
      }

      const file = this.app.vault.getAbstractFileByPath(metadata.linkedNote);
      if (!(file instanceof TFile)) {
        return;
      }

      // Use the new FileManager API to update frontmatter
      await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        frontmatter.taskStatus = metadata.taskStatus;
        frontmatter.priority = metadata.priority;
        frontmatter.progress = metadata.progress;
        frontmatter.cost = metadata.cost;
        frontmatter.budget = metadata.budget;
        frontmatter.tags = metadata.tags;
        frontmatter.updated = metadata.updated;
      });
      
      console.log('✅ Node synced to Obsidian properties:', node.id);
    } catch (error) {
      console.error('❌ Error syncing to Obsidian properties:', error);
    }
  }

  // ============================================================================
  // VIEW MANAGEMENT
  // ============================================================================
  
  async toggleView(viewType) {
    const existing = this.app.workspace.getLeavesOfType(viewType);
    
    if (existing.length > 0) {
      // Close existing view
      existing[0].detach();
      console.log('✅ View closed:', viewType);
    } else {
      // Open new view
      const leaf = this.app.workspace.getRightLeaf(false);
      await leaf.setViewState({ type: viewType });
      this.app.workspace.revealLeaf(leaf);
      console.log('✅ View opened:', viewType);
    }
  }

  // ============================================================================
  // CONTEXT MENU
  // ============================================================================
  
  addContextMenuItems(menu, view) {
    const selectedNodes = this.getSelectedNodes();
    
    if (selectedNodes.length > 0) {
      menu.addItem((item) => {
        item
          .setTitle('Convert to Task')
          .setIcon('mindcanvas-task')
          .onClick(() => {
            this.convertNodesToTasks(selectedNodes);
          });
      });

      menu.addItem((item) => {
        item
          .setTitle('Open Properties')
          .setIcon('mindcanvas-properties')
          .onClick(() => {
            this.toggleView(VIEW_TYPE_PROPERTIES);
          });
      });

      menu.addSeparator();
    }

    menu.addItem((item) => {
      item
        .setTitle('Calculate Rollups')
        .setIcon('mindcanvas-rollup')
        .onClick(() => {
          this.calculateAllRollups();
        });
    });
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  onActiveLeafChange() {
    // Update views when Canvas changes
    this.updateAllViews();
  }

  onCanvasFileModified(file) {
    // Handle Canvas file modifications
    console.log('📝 Canvas file modified:', file.path);
  }

  updateAllViews() {
    // Refresh all open views
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
  // AUTO-SAVE
  // ============================================================================
  
  setupAutoSave() {
    this.debouncedSave = debounce(() => {
      this.saveCanvasState();
    }, this.settings.autoSaveInterval);
  }

  saveCanvasState() {
    const canvas = this.getActiveCanvas();
    if (canvas && canvas.requestSave) {
      canvas.requestSave();
      console.log('💾 Canvas state saved');
    }
  }

  // ============================================================================
  // DEBUG UTILITIES
  // ============================================================================
  
  debugCanvasSelection() {
    console.log('🐛 === CANVAS SELECTION DEBUG ===');
    
    const canvas = this.getActiveCanvas();
    if (!canvas) {
      console.log('❌ No canvas found');
      new Notice('❌ No Canvas found for debugging');
      return;
    }

    // Test selection detection
    const selectedNodes = this.getSelectedNodes();
    
    console.log('🔍 Selection Debug Summary:', {
      canvasFound: !!canvas,
      selectionExists: !!canvas.selection,
      selectionSize: canvas.selection?.size || 0,
      selectedNodesFound: selectedNodes.length,
      nodesList: selectedNodes.map(n => ({ id: n?.id, text: n?.text?.substring(0, 20) }))
    });

    new Notice(`Selection Debug: Found ${selectedNodes.length} selected nodes. Check console for details.`);
    console.log('🐛 === END SELECTION DEBUG ===');
  }

  deepCanvasDebug() {
    console.log('🐛 === DEEP CANVAS DEBUG ===');
    
    // Test all possible ways to get Canvas
    console.log('🔍 Testing different Canvas access methods...');
    
    // Method 1: Our current getActiveCanvas
    const canvas1 = this.getActiveCanvas();
    console.log('Method 1 (getActiveCanvas):', !!canvas1, canvas1?.getViewType?.());
    
    // Method 2: Direct activeLeaf
    const activeLeaf = this.app.workspace.activeLeaf;
    console.log('Method 2 (activeLeaf):', !!activeLeaf, activeLeaf?.view?.getViewType?.());
    
    // Method 3: All Canvas leaves
    const canvasLeaves = this.app.workspace.getLeavesOfType('canvas');
    console.log('Method 3 (all canvas leaves):', canvasLeaves.length);
    
    canvasLeaves.forEach((leaf, index) => {
      const view = leaf.view;
      console.log(`Canvas leaf ${index}:`, {
        viewType: view.getViewType(),
        hasSelection: !!view.selection,
        hasNodes: !!view.nodes,
        hasCanvas: !!view.canvas,
        selectionSize: view.selection?.size || 0,
        nodesSize: view.nodes?.size || 0
      });
      
      // Test selection on this specific leaf
      if (view.selection && view.selection.size > 0) {
        console.log(`Canvas ${index} SELECTION FOUND:`, {
          selectionSize: view.selection.size,
          selectionContents: Array.from(view.selection),
          firstSelection: Array.from(view.selection)[0]
        });
        
        // Try to get the actual node objects
        const selectedNodes = [];
        for (const item of view.selection) {
          console.log(`Selection item type:`, typeof item, item?.constructor?.name);
          
          // If it's a string ID, lookup in nodes
          if (typeof item === 'string' && view.nodes) {
            const node = view.nodes.get(item);
            if (node) {
              selectedNodes.push(node);
              console.log('✅ Found node by ID lookup:', {
                id: item,
                text: node.text?.substring(0, 30),
                type: node.type
              });
            }
          }
          // If it's already a node object
          else if (item && typeof item === 'object' && item.id) {
            selectedNodes.push(item);
            console.log('✅ Found direct node object:', {
              id: item.id,
              text: item.text?.substring(0, 30),
              type: item.type
            });
          }
        }
        
        console.log(`Total resolved nodes for canvas ${index}:`, selectedNodes.length);
      }
      
      // Also check if this view has different properties
      if (view.canvas) {
        console.log(`Canvas ${index} has .canvas property:`, {
          hasSelection: !!view.canvas.selection,
          hasNodes: !!view.canvas.nodes,
          selectionSize: view.canvas.selection?.size || 0,
          nodesSize: view.canvas.nodes?.size || 0
        });
      }
    });
    
    // Method 4: Check for other Canvas-related properties
    console.log('🔍 Checking workspace for Canvas-related objects...');
    const workspace = this.app.workspace;
    const workspaceProps = Object.keys(workspace).filter(key => 
      key.toLowerCase().includes('canvas') || 
      key.toLowerCase().includes('selection') ||
      key.toLowerCase().includes('active')
    );
    console.log('Workspace Canvas-related props:', workspaceProps);
    
    new Notice('Deep canvas debug completed. Check console for DETAILED analysis.');
    console.log('🐛 === END DEEP CANVAS DEBUG ===');
  }

  testCanvasSelectionDirect() {
    console.log('🎯 === DIRECT CANVAS SELECTION TEST ===');
    
    // Find Canvas leaves and test them directly
    const canvasLeaves = this.app.workspace.getLeavesOfType('canvas');
    console.log('🔍 Found canvas leaves:', canvasLeaves.length);
    
    if (canvasLeaves.length === 0) {
      console.log('❌ No canvas views found');
      new Notice('❌ No Canvas views found');
      return;
    }
    
    // Test each Canvas leaf
    canvasLeaves.forEach((leaf, index) => {
      const view = leaf.view;
      console.log(`\n--- Testing Canvas ${index} ---`);
      console.log('View type:', view.getViewType());
      
      // Test multiple selection detection methods
      const selectionTests = [
        () => view.selection,
        () => view.canvas?.selection,
        () => view.selectedNodes,
        () => view.getSelectedNodes?.(),
        () => view.canvas?.selectedNodes,
        () => view.canvas?.getSelectedNodes?.()
      ];
      
      selectionTests.forEach((test, testIndex) => {
        try {
          const result = test();
          if (result && (result.size > 0 || result.length > 0)) {
            console.log(`✅ Selection method ${testIndex} FOUND:`, {
              type: result.constructor.name,
              size: result.size || result.length,
              contents: result.size ? Array.from(result) : result
            });
            
            // If it's a Set or similar, try to resolve to actual nodes
            if (result.size > 0) {
              for (const item of result) {
                console.log('Selection item:', {
                  type: typeof item,
                  constructor: item?.constructor?.name,
                  isString: typeof item === 'string',
                  hasId: !!item?.id,
                  id: item?.id || item,
                  text: item?.text?.substring(0, 30)
                });
                
                // If it's a string, try to resolve
                if (typeof item === 'string') {
                  const resolved = view.nodes?.get(item) || view.canvas?.nodes?.get(item);
                  if (resolved) {
                    console.log('  ✅ Resolved to node:', {
                      id: resolved.id,
                      text: resolved.text?.substring(0, 30),
                      type: resolved.type
                    });
                  }
                }
              }
            }
          } else {
            console.log(`❌ Selection method ${testIndex}: empty or null`);
          }
        } catch (e) {
          console.log(`❌ Selection method ${testIndex}: error -`, e.message);
        }
      });
      
      // Test node creation methods
      console.log('\n🔧 Testing node creation methods:');
      const creationTests = [
        () => typeof view.createTextNode,
        () => typeof view.canvas?.createTextNode,
        () => typeof view.createNode,
        () => typeof view.canvas?.createNode,
        () => typeof view.addNode,
        () => typeof view.canvas?.addNode
      ];
      
      creationTests.forEach((test, testIndex) => {
        try {
          const result = test();
          console.log(`Creation method ${testIndex}: ${result}`);
        } catch (e) {
          console.log(`Creation method ${testIndex}: error -`, e.message);
        }
      });
    });
    
    console.log('\n🎯 === END DIRECT SELECTION TEST ===');
    new Notice('Direct Canvas selection test completed. Check console for results!');
  }
}

// ============================================================================
// PROPERTIES VIEW
// ============================================================================
class PropertiesView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_PROPERTIES;
  }

  getDisplayText() {
    return 'Node Properties';
  }

  getIcon() {
    return 'mindcanvas-properties';
  }

  async onOpen() {
    console.log('📋 Properties view opened');
    this.render();
  }

  async onClose() {
    console.log('📋 Properties view closed');
  }

  render() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('mindcanvas-properties-view');

    const selectedNodes = this.plugin.getSelectedNodes();
    
    if (selectedNodes.length === 0) {
      container.createEl('div', { 
        text: 'Select a node in Canvas to edit properties',
        cls: 'mindcanvas-empty-state'
      });
      return;
    }

    const node = selectedNodes[0];
    const metadata = this.plugin.getNodeMetadata(node);
    
    if (!metadata) {
      this.plugin.initializeNodeMetadata(node);
    }

    this.renderTaskProperties(container, node);
    this.renderFinancialProperties(container, node);
    this.renderGeneralProperties(container, node);
    this.renderActions(container, node);
  }

  renderTaskProperties(container, node) {
    const metadata = this.plugin.getNodeMetadata(node);
    const section = container.createEl('div', { cls: 'mindcanvas-property-section' });
    section.createEl('h3', { text: 'Task Properties' });

    // Task toggle
    const taskToggle = new ToggleComponent(section)
      .setValue(metadata.isTask)
      .onChange((value) => {
        this.plugin.updateNodeMetadata(node, { isTask: value });
        this.plugin.applyVisualIndicators(node);
        this.render(); // Re-render to show/hide task fields
      });
    section.createEl('label', { text: 'Is Task' }).prepend(taskToggle.toggleEl);

    if (metadata.isTask) {
      // Status dropdown
      const statusContainer = section.createEl('div', { cls: 'mindcanvas-field' });
      statusContainer.createEl('label', { text: 'Status' });
      const statusDropdown = new DropdownComponent(statusContainer)
        .addOption('pending', 'Pending')
        .addOption('in-progress', 'In Progress')
        .addOption('completed', 'Completed')
        .addOption('cancelled', 'Cancelled')
        .addOption('deferred', 'Deferred')
        .setValue(metadata.taskStatus)
        .onChange((value) => {
          this.plugin.updateNodeMetadata(node, { taskStatus: value });
          this.plugin.applyVisualIndicators(node);
        });

      // Priority dropdown
      const priorityContainer = section.createEl('div', { cls: 'mindcanvas-field' });
      priorityContainer.createEl('label', { text: 'Priority' });
      const priorityDropdown = new DropdownComponent(priorityContainer)
        .addOption('low', 'Low')
        .addOption('medium', 'Medium')
        .addOption('high', 'High')
        .setValue(metadata.priority)
        .onChange((value) => {
          this.plugin.updateNodeMetadata(node, { priority: value });
          this.plugin.applyVisualIndicators(node);
        });

      // Progress slider
      const progressContainer = section.createEl('div', { cls: 'mindcanvas-field' });
      progressContainer.createEl('label', { text: `Progress: ${metadata.progress}%` });
      const progressSlider = new SliderComponent(progressContainer)
        .setLimits(0, 100, 5)
        .setValue(metadata.progress)
        .onChange((value) => {
          this.plugin.updateNodeMetadata(node, { progress: value });
          progressContainer.querySelector('label').textContent = `Progress: ${value}%`;
          this.plugin.applyVisualIndicators(node);
        });

      // Estimated hours
      const estimatedContainer = section.createEl('div', { cls: 'mindcanvas-field' });
      estimatedContainer.createEl('label', { text: 'Estimated Hours' });
      const estimatedInput = new TextComponent(estimatedContainer)
        .setPlaceholder('0')
        .setValue(metadata.estimatedHours.toString())
        .onChange((value) => {
          const hours = parseFloat(value) || 0;
          this.plugin.updateNodeMetadata(node, { estimatedHours: hours });
        });

      // Actual hours
      const actualContainer = section.createEl('div', { cls: 'mindcanvas-field' });
      actualContainer.createEl('label', { text: 'Actual Hours' });
      const actualInput = new TextComponent(actualContainer)
        .setPlaceholder('0')
        .setValue(metadata.actualHours.toString())
        .onChange((value) => {
          const hours = parseFloat(value) || 0;
          this.plugin.updateNodeMetadata(node, { actualHours: hours });
        });
    }
  }

  renderFinancialProperties(container, node) {
    const metadata = this.plugin.getNodeMetadata(node);
    const section = container.createEl('div', { cls: 'mindcanvas-property-section' });
    section.createEl('h3', { text: 'Financial Properties' });

    // Cost
    const costContainer = section.createEl('div', { cls: 'mindcanvas-field' });
    costContainer.createEl('label', { text: 'Cost' });
    const costInput = new TextComponent(costContainer)
      .setPlaceholder('0.00')
      .setValue(metadata.cost.toString())
      .onChange((value) => {
        const cost = parseFloat(value) || 0;
        this.plugin.updateNodeMetadata(node, { cost });
      });

    // Budget
    const budgetContainer = section.createEl('div', { cls: 'mindcanvas-field' });
    budgetContainer.createEl('label', { text: 'Budget' });
    const budgetInput = new TextComponent(budgetContainer)
      .setPlaceholder('0.00')
      .setValue(metadata.budget.toString())
      .onChange((value) => {
        const budget = parseFloat(value) || 0;
        this.plugin.updateNodeMetadata(node, { budget });
      });

    // Currency
    const currencyContainer = section.createEl('div', { cls: 'mindcanvas-field' });
    currencyContainer.createEl('label', { text: 'Currency' });
    const currencyDropdown = new DropdownComponent(currencyContainer)
      .addOption('USD', 'USD ($)')
      .addOption('EUR', 'EUR (€)')
      .addOption('GBP', 'GBP (£)')
      .addOption('JPY', 'JPY (¥)')
      .setValue(metadata.currency)
      .onChange((value) => {
        this.plugin.updateNodeMetadata(node, { currency: value });
      });

    // Rollup display (read-only)
    if (this.plugin.settings.enableRollups) {
      const rollupContainer = section.createEl('div', { cls: 'mindcanvas-rollup-display' });
      rollupContainer.createEl('h4', { text: 'Rollup Values' });
      rollupContainer.createEl('div', { text: `Total Cost: ${metadata.currency} ${metadata.rollupCost}` });
      rollupContainer.createEl('div', { text: `Total Budget: ${metadata.currency} ${metadata.rollupBudget}` });
      rollupContainer.createEl('div', { text: `Total Hours: ${metadata.rollupHours}` });
      rollupContainer.createEl('div', { text: `Avg Progress: ${Math.round(metadata.rollupProgress)}%` });
    }
  }

  renderGeneralProperties(container, node) {
    const metadata = this.plugin.getNodeMetadata(node);
    const section = container.createEl('div', { cls: 'mindcanvas-property-section' });
    section.createEl('h3', { text: 'General Properties' });

    // Tags
    const tagsContainer = section.createEl('div', { cls: 'mindcanvas-field' });
    tagsContainer.createEl('label', { text: 'Tags (comma-separated)' });
    const tagsInput = new TextComponent(tagsContainer)
      .setPlaceholder('tag1, tag2, tag3')
      .setValue(metadata.tags.join(', '))
      .onChange((value) => {
        const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag);
        this.plugin.updateNodeMetadata(node, { tags });
      });

    // Notes
    const notesContainer = section.createEl('div', { cls: 'mindcanvas-field' });
    notesContainer.createEl('label', { text: 'Notes' });
    const notesArea = notesContainer.createEl('textarea', { 
      placeholder: 'Add notes about this node...',
      value: metadata.notes || '',
      cls: 'mindcanvas-notes-area'
    });
    notesArea.addEventListener('change', () => {
      this.plugin.updateNodeMetadata(node, { notes: notesArea.value });
    });

    // System info (read-only)
    const systemContainer = section.createEl('div', { cls: 'mindcanvas-system-info' });
    systemContainer.createEl('small', { text: `Created: ${new Date(metadata.created).toLocaleString()}` });
    systemContainer.createEl('small', { text: `Updated: ${new Date(metadata.updated).toLocaleString()}` });
    systemContainer.createEl('small', { text: `ID: ${node.id}` });
  }

  renderActions(container, node) {
    const section = container.createEl('div', { cls: 'mindcanvas-actions' });
    
    const calculateBtn = section.createEl('button', { 
      text: 'Calculate Rollups',
      cls: 'mod-cta'
    });
    calculateBtn.addEventListener('click', () => {
      this.plugin.calculateAllRollups();
      this.render();
    });

    const syncBtn = section.createEl('button', { 
      text: 'Sync to Obsidian',
      cls: 'mod-button'
    });
    syncBtn.addEventListener('click', () => {
      this.plugin.syncNodeToObsidianProperties(node);
      new Notice('✅ Node synced to Obsidian properties');
    });
  }

  refresh() {
    this.render();
  }
}

// ============================================================================
// GANTT VIEW (PLACEHOLDER - Full implementation would be extensive)
// ============================================================================
class GanttView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_GANTT;
  }

  getDisplayText() {
    return 'Gantt Chart';
  }

  getIcon() {
    return 'mindcanvas-gantt';
  }

  async onOpen() {
    console.log('📊 Gantt view opened');
    this.render();
  }

  render() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('mindcanvas-gantt-view');

    container.createEl('h2', { text: 'Gantt Chart View' });
    container.createEl('p', { text: 'Timeline visualization of tasks and dependencies.' });
    
    // Placeholder for Gantt chart implementation
    const placeholder = container.createEl('div', { cls: 'mindcanvas-gantt-placeholder' });
    placeholder.createEl('div', { text: '📊 Gantt chart implementation coming soon...' });
  }

  refresh() {
    this.render();
  }
}

// ============================================================================
// ROLLUPS VIEW (PLACEHOLDER)
// ============================================================================
class RollupsView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_ROLLUPS;
  }

  getDisplayText() {
    return 'Rollups & Reports';
  }

  getIcon() {
    return 'mindcanvas-rollup';
  }

  async onOpen() {
    console.log('📈 Rollups view opened');
    this.render();
  }

  render() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('mindcanvas-rollups-view');

    container.createEl('h2', { text: 'Rollups & Reports' });
    container.createEl('p', { text: 'Financial summaries and task analytics.' });
    
    // Placeholder for rollups implementation
    const placeholder = container.createEl('div', { cls: 'mindcanvas-rollups-placeholder' });
    placeholder.createEl('div', { text: '📈 Rollups and reports implementation coming soon...' });
  }

  refresh() {
    this.render();
  }
}

// ============================================================================
// FILTERS VIEW (PLACEHOLDER)
// ============================================================================
class FiltersView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_FILTERS;
  }

  getDisplayText() {
    return 'Filters & Search';
  }

  getIcon() {
    return 'mindcanvas-filter';
  }

  async onOpen() {
    console.log('🔍 Filters view opened');
    this.render();
  }

  render() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('mindcanvas-filters-view');

    container.createEl('h2', { text: 'Filters & Search' });
    container.createEl('p', { text: 'Filter and search Canvas nodes by properties.' });
    
    // Placeholder for filters implementation
    const placeholder = container.createEl('div', { cls: 'mindcanvas-filters-placeholder' });
    placeholder.createEl('div', { text: '🔍 Filters and search implementation coming soon...' });
  }

  refresh() {
    this.render();
  }

  // NEW: Test Canvas plugin access as suggested by user
  testCanvasPluginAccess() {
    console.log('🧪 === TESTING CANVAS PLUGIN ACCESS ===');
    
    // Test app.plugins.plugins["canvas"] as suggested by user
    const canvasPlugin = this.app.plugins.plugins["canvas"];
    console.log('Canvas plugin from app.plugins.plugins["canvas"]:', !!canvasPlugin);
    
    if (canvasPlugin) {
      console.log('Canvas plugin keys:', Object.keys(canvasPlugin).slice(0, 10));
      console.log('Canvas plugin methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(canvasPlugin)).slice(0, 10));
    }
    
    // Test internal plugins
    const internalCanvasPlugin = this.app.internalPlugins.plugins["canvas"];
    console.log('Canvas plugin from app.internalPlugins.plugins["canvas"]:', !!internalCanvasPlugin);
    
    if (internalCanvasPlugin) {
      console.log('Internal canvas plugin keys:', Object.keys(internalCanvasPlugin).slice(0, 10));
      console.log('Internal canvas plugin instance:', !!internalCanvasPlugin.instance);
      
      if (internalCanvasPlugin.instance) {
        console.log('Canvas instance keys:', Object.keys(internalCanvasPlugin.instance).slice(0, 10));
      }
    }
    
    // Test current Canvas view and access
    const canvasView = this.getActiveCanvasView();
    if (canvasView) {
      console.log('✅ Found canvas view, testing Canvas object access...');
      const canvas = canvasView.canvas;
      
      if (canvas) {
        console.log('✅ Canvas object found, testing API methods...');
        console.log('Canvas methods:', {
          createTextNode: typeof canvas.createTextNode,
          createFileNode: typeof canvas.createFileNode,
          createEdge: typeof canvas.createEdge,
          addNode: typeof canvas.addNode,
          removeNode: typeof canvas.removeNode,
          getSelectedNodes: typeof canvas.getSelectedNodes
        });
        
        // Test selection
        if (canvasView.getSelectedNodes) {
          const selected = canvasView.getSelectedNodes();
          console.log('Selected nodes:', selected.length, selected.map(n => n.id));
        }
      }
    }
    
    new Notice('Canvas plugin access test complete - check console for details');
    console.log('🧪 === END CANVAS PLUGIN ACCESS TEST ===');
  }
}

// ============================================================================
// MODULE EXPORT
// ============================================================================
module.exports = MindCanvasPlus3; 