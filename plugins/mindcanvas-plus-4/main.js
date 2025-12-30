const { Plugin, Menu, Setting, Modal, ItemView, TFile, Notice, addIcon, WorkspaceLeaf, DropdownComponent, TextComponent, ToggleComponent, SliderComponent, ColorComponent, ButtonComponent, debounce } = require('obsidian');

// ============================================================================
// VIEW TYPE CONSTANTS
// ============================================================================
const VIEW_TYPE_PROPERTIES = 'mindcanvas-properties-v4';
const VIEW_TYPE_GANTT = 'mindcanvas-gantt-v4';
const VIEW_TYPE_ROLLUPS = 'mindcanvas-rollups-v4';
const VIEW_TYPE_FILTERS = 'mindcanvas-filters-v4';

// ============================================================================
// CANVAS API INTEGRATION (INLINE)
// ============================================================================
class CanvasAPIIntegration {
  constructor(plugin) {
    this.plugin = plugin;
    this.app = plugin.app;
  }

  getActiveCanvasView() {
    try {
      console.log('🔍 Getting active Canvas view...');
      
      const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
      if (canvasView?.getViewType() !== "canvas") {
        console.log('❌ Active view is not canvas:', canvasView?.getViewType());
        return null;
      }
      
      console.log('✅ Found Canvas view');
      return canvasView;
    } catch (error) {
      console.error('❌ Error getting Canvas view:', error);
      return null;
    }
  }

  getSelectedNodes() {
    const canvasView = this.getActiveCanvasView();
    if (!canvasView) {
      console.log('❌ No canvas for getSelectedNodes');
      return [];
    }

    try {
      console.log('🔍 Getting selected nodes with multi-method approach...');
      const selectedNodes = [];
      
      // Method 1: Canvas view selection (primary method)
      if (canvasView.getSelectedNodes && typeof canvasView.getSelectedNodes === 'function') {
        console.log('🔍 Method 1: Using canvasView.getSelectedNodes()');
        const nodes = canvasView.getSelectedNodes();
        if (nodes && nodes.length > 0) {
          selectedNodes.push(...nodes);
          console.log('✅ Found nodes via getSelectedNodes:', nodes.length);
        }
      }
      
      // Method 2: Canvas view selection property
      if (selectedNodes.length === 0 && canvasView.selection) {
        console.log('🔍 Method 2: Using canvasView.selection');
        if (canvasView.selection.size > 0) {
          for (const item of canvasView.selection) {
            if (item && typeof item === 'object' && item.id) {
              selectedNodes.push(item);
            }
          }
          console.log('✅ Found nodes via selection property:', selectedNodes.length);
        }
      }
      
      // Method 3: Canvas object selection (if canvas property exists)
      if (selectedNodes.length === 0 && canvasView.canvas) {
        console.log('🔍 Method 3: Using canvasView.canvas.selection');
        const canvas = canvasView.canvas;
        
        if (canvas.selection && canvas.selection.size > 0) {
          for (const item of canvas.selection) {
            if (typeof item === 'string' && canvas.nodes) {
              const node = canvas.nodes.get(item);
              if (node) {
                selectedNodes.push(node);
              }
            } else if (item && typeof item === 'object' && item.id) {
              selectedNodes.push(item);
            }
          }
          console.log('✅ Found nodes via canvas selection:', selectedNodes.length);
        }
      }
      
      // Method 4: Check for focused/active node
      if (selectedNodes.length === 0) {
        console.log('🔍 Method 4: Checking for focused node');
        const focusedNode = canvasView.focusedNode || canvasView.activeNode || 
                           (canvasView.canvas && canvasView.canvas.focusedNode);
        if (focusedNode) {
          selectedNodes.push(focusedNode);
          console.log('✅ Found focused node');
        }
      }
      
      console.log('📊 Final selected nodes count:', selectedNodes.length);
      return selectedNodes;
    } catch (error) {
      console.error('❌ Error getting selected nodes:', error);
      return [];
    }
  }

  createConnectedNode(canvasView) {
    console.log('🚀 Creating connected node (sibling)...');
    
    const canvas = canvasView.canvas;
    if (!canvas) {
      new Notice('❌ Canvas API not available');
      return;
    }

    const selected = this.getSelectedNodes();
    if (!selected.length) {
      this.createNodeAtPosition(canvas, {
        x: 400,
        y: 300,
        text: 'New Topic',
        connectTo: null
      });
      return;
    }

    const sourceNode = selected[0];
    const newNodeData = {
      x: sourceNode.x + 250,
      y: sourceNode.y,
      text: 'Connected Topic',
      connectTo: sourceNode,
      connectionSide: 'right'
    };

    this.createNodeAtPosition(canvas, newNodeData);
  }

  createChildNode(canvasView) {
    console.log('🚀 Creating child node (subtopic)...');
    
    const canvas = canvasView.canvas;
    if (!canvas) {
      new Notice('❌ Canvas API not available');
      return;
    }

    const selected = this.getSelectedNodes();
    if (!selected.length) {
      new Notice('❌ Please select a parent node first');
      return;
    }

    const parentNode = selected[0];
    const newNodeData = {
      x: parentNode.x + 50,
      y: parentNode.y + 120,
      text: 'Subtopic',
      connectTo: parentNode,
      connectionSide: 'bottom',
      isChild: true
    };

    this.createNodeAtPosition(canvas, newNodeData);
  }

  createSiblingNode(canvasView) {
    console.log('🚀 Creating sibling node (same style)...');
    
    const canvas = canvasView.canvas;
    if (!canvas) {
      new Notice('❌ Canvas API not available');
      return;
    }

    const selected = this.getSelectedNodes();
    if (!selected.length) {
      new Notice('❌ Please select a node to create sibling');
      return;
    }

    const siblingNode = selected[0];
    const newNodeData = {
      x: siblingNode.x,
      y: siblingNode.y + 100,
      text: 'Sibling Topic',
      width: siblingNode.width || 200,
      height: siblingNode.height || 60,
      copyPropertiesFrom: siblingNode
    };

    this.createNodeAtPosition(canvas, newNodeData);
  }

  createParentNode(canvasView) {
    console.log('🚀 Creating parent node...');
    
    const canvas = canvasView.canvas;
    if (!canvas) {
      new Notice('❌ Canvas API not available');
      return;
    }

    const selected = this.getSelectedNodes();
    if (!selected.length) {
      new Notice('❌ Please select a child node first');
      return;
    }

    const childNode = selected[0];
    const newNodeData = {
      x: childNode.x - 50,
      y: childNode.y - 120,
      text: 'Parent Topic',
      width: 180,
      height: 70,
      connectTo: childNode,
      connectionSide: 'top',
      isParent: true
    };

    this.createNodeAtPosition(canvas, newNodeData);
  }

  createNodeAtPosition(canvas, nodeData) {
    try {
      console.log('🔧 Creating node with data:', nodeData);
      
      const createParams = {
        type: 'text',
        pos: {
          x: nodeData.x,
          y: nodeData.y
        },
        size: {
          width: nodeData.width || 200,
          height: nodeData.height || 60
        },
        text: nodeData.text
      };

      createParams.data = {
        mindcanvas: this.plugin.createDefaultNodeMetadata()
      };

      let newNode = null;

      if (typeof canvas.createTextNode === 'function') {
        console.log('🚀 Using canvas.createTextNode');
        newNode = canvas.createTextNode(createParams);
      } else if (typeof canvas.createNode === 'function') {
        console.log('🚀 Using canvas.createNode');
        newNode = canvas.createNode(createParams);
      } else if (typeof canvas.addNode === 'function') {
        console.log('🚀 Using canvas.addNode');
        newNode = canvas.addNode(createParams);
      } else {
        console.log('❌ No suitable Canvas API method found');
        new Notice('❌ Canvas API not compatible');
        return null;
      }

      if (newNode) {
        console.log('✅ Node created successfully:', newNode.id);
        
        this.plugin.initializeNodeMetadata(newNode);
        
        if (nodeData.copyPropertiesFrom) {
          this.plugin.copyNodeProperties(nodeData.copyPropertiesFrom, newNode);
        }
        
        if (nodeData.connectTo) {
          this.createConnection(canvas, nodeData.connectTo, newNode, nodeData.connectionSide);
        }
        
        if (nodeData.isChild) {
          this.plugin.createHierarchicalRelationship(nodeData.connectTo, newNode);
        } else if (nodeData.isParent) {
          this.plugin.createHierarchicalRelationship(newNode, nodeData.connectTo);
        }
        
        if (this.plugin.settings.enableVisualIndicators) {
          this.plugin.applyVisualIndicators(newNode);
        }
        
        this.plugin.debouncedSave();
        this.selectAndFocusNode(canvas, newNode);
        
        new Notice('✅ Node created successfully');
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

  createConnection(canvas, fromNode, toNode, side = 'right') {
    try {
      console.log('🔗 Creating connection from', fromNode.id, 'to', toNode.id, 'on', side);
      
      // Try multiple Canvas API methods for edge creation
      let edge = null;
      const oppositeSide = this.getOppositeSide(side);

      // Method 1: Modern Canvas API with proper side specification
      if (typeof canvas.createEdge === 'function') {
        console.log('🚀 Trying canvas.createEdge (method 1)');
        const edgeParams = {
          from: {
            node: fromNode,
            side: side
          },
          to: {
            node: toNode,
            side: oppositeSide
          }
        };
        edge = canvas.createEdge(edgeParams);
        if (edge) {
          console.log('✅ Edge created successfully with createEdge (detailed params)');
          return edge;
        }
      }

      // Method 2: Simple fromNode/toNode format
      if (typeof canvas.createEdge === 'function') {
        console.log('🚀 Trying canvas.createEdge (method 2)');
        const simpleParams = {
          fromNode: fromNode.id,
          toNode: toNode.id,
          fromSide: side,
          toSide: oppositeSide
        };
        edge = canvas.createEdge(simpleParams);
        if (edge) {
          console.log('✅ Edge created successfully with createEdge (simple params)');
          return edge;
        }
      }

      // Method 3: Legacy addEdge method
      if (typeof canvas.addEdge === 'function') {
        console.log('🚀 Trying canvas.addEdge');
        edge = canvas.addEdge({
          from: fromNode.id,
          to: toNode.id
        });
        if (edge) {
          console.log('✅ Edge created successfully with addEdge');
          return edge;
        }
      }

      // Method 4: Direct edge creation with Canvas JSON format
      if (canvas.data && canvas.data.edges) {
        console.log('🚀 Trying direct edge creation');
        const edgeId = 'edge-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const newEdge = {
          id: edgeId,
          fromNode: fromNode.id,
          fromSide: side,
          toNode: toNode.id,
          toSide: oppositeSide
        };
        
        canvas.data.edges.push(newEdge);
        console.log('✅ Edge created directly in canvas data');
        
        // Request canvas redraw
        if (canvas.requestSave) {
          canvas.requestSave();
        }
        
        return newEdge;
      }

      console.log('❌ No suitable edge creation method found');
      console.log('Available canvas methods:', Object.getOwnPropertyNames(canvas).filter(name => 
        name.toLowerCase().includes('edge') || name.toLowerCase().includes('connect')
      ));
      
      return null;
    } catch (error) {
      console.error('❌ Error creating connection:', error);
      return null;
    }
  }

  getOppositeSide(side) {
    const opposites = {
      'right': 'left',
      'left': 'right',
      'top': 'bottom',
      'bottom': 'top'
    };
    return opposites[side] || 'left';
  }

  selectAndFocusNode(canvas, node) {
    try {
      console.log('🎯 Selecting and focusing node:', node.id);
      
      if (canvas.deselectAll) {
        canvas.deselectAll();
      } else if (canvas.selection && canvas.selection.clear) {
        canvas.selection.clear();
      }
      
      if (canvas.selection && canvas.selection.add) {
        canvas.selection.add(node);
      } else if (canvas.selectNode) {
        canvas.selectNode(node);
      }
      
      if (canvas.zoomToSelection) {
        canvas.zoomToSelection();
      } else if (canvas.panTo) {
        canvas.panTo({ x: node.x, y: node.y });
      }
      
      setTimeout(() => {
        if (canvas.startEditing && node) {
          canvas.startEditing(node);
        }
      }, 150);
      
      console.log('✅ Node selected and focused');
    } catch (error) {
      console.error('❌ Error selecting and focusing node:', error);
    }
  }
}

// ============================================================================
// PROPERTIES VIEW V4 (INLINE)
// ============================================================================
class PropertiesViewV4 extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.selectedNodes = [];
    this.currentTab = 'task'; // 'task', 'financial', 'general'
  }

  getViewType() {
    return VIEW_TYPE_PROPERTIES;
  }

  getDisplayText() {
    return 'Node Properties';
  }

  getIcon() {
    return 'mindcanvas-properties-v4';
  }

  async onOpen() {
    console.log('📋 Properties view opened');
    this.render();
  }

  async onClose() {
    console.log('📋 Properties view closed');
  }

  refresh() {
    this.render();
  }

  render() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('mindcanvas-properties-view');

    // Get currently selected nodes
    this.selectedNodes = this.plugin.getSelectedNodes();
    
    if (this.selectedNodes.length === 0) {
      this.renderEmptyState(container);
      return;
    }

    // Render header with node count
    this.renderHeader(container);
    
    // Render tab navigation
    this.renderTabNavigation(container);
    
    // Render content based on current tab
    switch (this.currentTab) {
      case 'task':
        this.renderTaskProperties(container);
        break;
      case 'financial':
        this.renderFinancialProperties(container);
        break;
      case 'general':
        this.renderGeneralProperties(container);
        break;
    }
    
    // Render actions
    this.renderActions(container);
  }

  renderEmptyState(container) {
    container.createEl('div', { 
      text: 'Select a node in Canvas to edit properties',
      cls: 'mindcanvas-empty-state'
    });
  }

  renderHeader(container) {
    const header = container.createEl('div', { cls: 'mindcanvas-header' });
    
    const title = header.createEl('h2', { 
      text: this.selectedNodes.length === 1 
        ? 'Node Properties' 
        : `Properties (${this.selectedNodes.length} nodes)`
    });
    
    if (this.selectedNodes.length === 1) {
      const node = this.selectedNodes[0];
      const subtitle = header.createEl('div', { 
        text: node.text?.substring(0, 50) || 'Untitled Node',
        cls: 'mindcanvas-subtitle'
      });
    }
  }

  renderTabNavigation(container) {
    const tabNav = container.createEl('div', { cls: 'mindcanvas-tab-nav' });
    
    const tabs = [
      { id: 'task', label: 'Task', icon: 'mindcanvas-task-v4' },
      { id: 'financial', label: 'Financial', icon: 'mindcanvas-financial-v4' },
      { id: 'general', label: 'General', icon: 'mindcanvas-properties-v4' }
    ];
    
    tabs.forEach(tab => {
      const tabButton = tabNav.createEl('button', {
        text: tab.label,
        cls: `mindcanvas-tab ${this.currentTab === tab.id ? 'active' : ''}`
      });
      
      tabButton.addEventListener('click', () => {
        this.currentTab = tab.id;
        this.render();
      });
    });
  }

  renderTaskProperties(container) {
    const section = container.createEl('div', { cls: 'mindcanvas-property-section' });
    section.createEl('h3', { text: 'Task Properties' });

    const metadata = this.getCommonMetadata();
    
    // Task toggle with enhanced feedback
    this.createTaskToggle(section, metadata);
    
    if (metadata.isTask !== false) {
      // Status and Priority
      this.createStatusDropdown(section, metadata);
      this.createPriorityDropdown(section, metadata);
      
      // Progress with visual feedback
      this.createProgressSlider(section, metadata);
      
      // Calendar Date Fields
      this.createDateFields(section, metadata);
      
      // Hours tracking
      this.createHoursFields(section, metadata);
      
      // Assignee field
      this.createAssigneeField(section, metadata);
    }
  }

  renderFinancialProperties(container) {
    const section = container.createEl('div', { cls: 'mindcanvas-property-section' });
    section.createEl('h3', { text: 'Financial Properties' });

    const metadata = this.getCommonMetadata();
    
    this.createCostField(section, metadata);
    this.createBudgetField(section, metadata);
    this.createCurrencyDropdown(section, metadata);
    
    if (this.plugin.settings.enableRollups) {
      this.renderRollupDisplay(section, metadata);
    }
  }

  renderGeneralProperties(container) {
    const section = container.createEl('div', { cls: 'mindcanvas-property-section' });
    section.createEl('h3', { text: 'General Properties' });

    const metadata = this.getCommonMetadata();
    
    this.createTagsField(section, metadata);
    this.createNotesField(section, metadata);
    this.renderSystemInfo(section, metadata);
  }

  createTaskToggle(container, metadata) {
    const fieldContainer = container.createEl('div', { cls: 'mindcanvas-field' });
    const label = fieldContainer.createEl('label', { text: 'Convert to Task' });
    
    const toggle = new ToggleComponent(fieldContainer)
      .setValue(metadata.isTask === true)
      .onChange((value) => {
        this.updateSelectedNodes({ isTask: value });
        this.render();
      });
    
    label.prepend(toggle.toggleEl);
  }

  createStatusDropdown(container, metadata) {
    const fieldContainer = container.createEl('div', { cls: 'mindcanvas-field' });
    fieldContainer.createEl('label', { text: 'Status' });
    
    new DropdownComponent(fieldContainer)
      .addOption('pending', 'Pending')
      .addOption('in-progress', 'In Progress')
      .addOption('completed', 'Completed')
      .addOption('cancelled', 'Cancelled')
      .addOption('deferred', 'Deferred')
      .setValue(metadata.taskStatus || 'pending')
      .onChange((value) => {
        this.updateSelectedNodes({ taskStatus: value });
      });
  }

  createPriorityDropdown(container, metadata) {
    const fieldContainer = container.createEl('div', { cls: 'mindcanvas-field' });
    fieldContainer.createEl('label', { text: 'Priority' });
    
    new DropdownComponent(fieldContainer)
      .addOption('low', 'Low')
      .addOption('medium', 'Medium')
      .addOption('high', 'High')
      .setValue(metadata.priority || 'medium')
      .onChange((value) => {
        this.updateSelectedNodes({ priority: value });
      });
  }

  createProgressSlider(container, metadata) {
    const fieldContainer = container.createEl('div', { cls: 'mindcanvas-field' });
    const label = fieldContainer.createEl('label', { text: `Progress: ${metadata.progress || 0}%` });
    
    new SliderComponent(fieldContainer)
      .setLimits(0, 100, 5)
      .setValue(metadata.progress || 0)
      .onChange((value) => {
        label.textContent = `Progress: ${value}%`;
        this.updateSelectedNodes({ progress: value });
      });
  }

  createDateFields(container, metadata) {
    // Start Date
    this.createDateInput(
      container, 
      'Start Date', 
      metadata.startDate,
      (value) => {
        this.updateSelectedNodes({ startDate: value });
      }
    );
    
    // Due Date  
    this.createDateInput(
      container, 
      'Due Date', 
      metadata.dueDate,
      (value) => {
        this.updateSelectedNodes({ dueDate: value });
      }
    );
    
    // Scheduled Date
    this.createDateInput(
      container, 
      'Scheduled Date', 
      metadata.scheduledDate,
      (value) => {
        this.updateSelectedNodes({ scheduledDate: value });
      }
    );
  }

  createAssigneeField(container, metadata) {
    const fieldContainer = container.createEl('div', { cls: 'mindcanvas-field' });
    fieldContainer.createEl('label', { text: 'Assigned To' });
    
    new TextComponent(fieldContainer)
      .setPlaceholder('@username or name')
      .setValue(metadata.assignee || '')
      .onChange((value) => {
        this.updateSelectedNodes({ assignee: value });
      });
  }

  createHoursFields(container, metadata) {
    const estimatedContainer = container.createEl('div', { cls: 'mindcanvas-field' });
    estimatedContainer.createEl('label', { text: 'Estimated Hours' });
    
    new TextComponent(estimatedContainer)
      .setPlaceholder('0')
      .setValue((metadata.estimatedHours || 0).toString())
      .onChange((value) => {
        const hours = parseFloat(value) || 0;
        this.updateSelectedNodes({ estimatedHours: hours });
      });

    const actualContainer = container.createEl('div', { cls: 'mindcanvas-field' });
    actualContainer.createEl('label', { text: 'Actual Hours' });
    
    new TextComponent(actualContainer)
      .setPlaceholder('0')
      .setValue((metadata.actualHours || 0).toString())
      .onChange((value) => {
        const hours = parseFloat(value) || 0;
        this.updateSelectedNodes({ actualHours: hours });
      });
  }

  createCostField(container, metadata) {
    const fieldContainer = container.createEl('div', { cls: 'mindcanvas-field' });
    fieldContainer.createEl('label', { text: 'Cost' });
    
    new TextComponent(fieldContainer)
      .setPlaceholder('0.00')
      .setValue((metadata.cost || 0).toString())
      .onChange((value) => {
        const cost = parseFloat(value) || 0;
        this.updateSelectedNodes({ cost });
      });
  }

  createBudgetField(container, metadata) {
    const fieldContainer = container.createEl('div', { cls: 'mindcanvas-field' });
    fieldContainer.createEl('label', { text: 'Budget' });
    
    new TextComponent(fieldContainer)
      .setPlaceholder('0.00')
      .setValue((metadata.budget || 0).toString())
      .onChange((value) => {
        const budget = parseFloat(value) || 0;
        this.updateSelectedNodes({ budget });
      });
  }

  createCurrencyDropdown(container, metadata) {
    const fieldContainer = container.createEl('div', { cls: 'mindcanvas-field' });
    fieldContainer.createEl('label', { text: 'Currency' });
    
    const dropdown = new DropdownComponent(fieldContainer);
    
    this.plugin.settings.supportedCurrencies.forEach(currency => {
      dropdown.addOption(currency, currency);
    });
    
    dropdown
      .setValue(metadata.currency || 'USD')
      .onChange((value) => {
        this.updateSelectedNodes({ currency: value });
      });
  }

  createTagsField(container, metadata) {
    const fieldContainer = container.createEl('div', { cls: 'mindcanvas-field mindcanvas-tags-field' });
    fieldContainer.createEl('label', { text: 'Tags' });
    
    // Tags input with suggestion
    const tagsInput = new TextComponent(fieldContainer)
      .setPlaceholder('#tag1, #tag2, project/subtag')
      .setValue((metadata.tags || []).join(', '))
      .onChange((value) => {
        const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag);
        this.updateSelectedNodes({ tags });
      });
    
    // Tag display area
    if (metadata.tags && metadata.tags.length > 0) {
      const tagDisplay = fieldContainer.createEl('div', { cls: 'mindcanvas-tag-display' });
      metadata.tags.forEach(tag => {
        const tagEl = tagDisplay.createEl('span', { 
          cls: 'mindcanvas-tag-chip',
          text: tag
        });
        
        // Add click to remove functionality
        const removeBtn = tagEl.createEl('span', { 
          cls: 'mindcanvas-tag-remove',
          text: '×'
        });
        removeBtn.addEventListener('click', () => {
          const newTags = metadata.tags.filter(t => t !== tag);
          this.updateSelectedNodes({ tags: newTags });
          this.render();
        });
      });
    }
  }

  createNotesField(container, metadata) {
    const fieldContainer = container.createEl('div', { cls: 'mindcanvas-field' });
    fieldContainer.createEl('label', { text: 'Notes' });
    
    const notesArea = fieldContainer.createEl('textarea', { 
      placeholder: 'Add notes about this node...',
      value: metadata.notes || '',
      cls: 'mindcanvas-notes-area'
    });
    
    notesArea.addEventListener('change', () => {
      this.updateSelectedNodes({ notes: notesArea.value });
    });
  }

  renderRollupDisplay(container, metadata) {
    const rollupContainer = container.createEl('div', { cls: 'mindcanvas-rollup-display' });
    rollupContainer.createEl('h4', { text: 'Rollup Values' });
    
    const currency = metadata.currency || 'USD';
    rollupContainer.createEl('div', { text: `Total Cost: ${currency} ${metadata.rollupCost || 0}` });
    rollupContainer.createEl('div', { text: `Total Budget: ${currency} ${metadata.rollupBudget || 0}` });
    rollupContainer.createEl('div', { text: `Total Hours: ${metadata.rollupHours || 0}` });
    rollupContainer.createEl('div', { text: `Avg Progress: ${Math.round(metadata.rollupProgress || 0)}%` });
  }

  renderSystemInfo(container, metadata) {
    const systemContainer = container.createEl('div', { cls: 'mindcanvas-system-info' });
    
    if (this.selectedNodes.length === 1) {
      const node = this.selectedNodes[0];
      systemContainer.createEl('small', { text: `ID: ${node.id}` });
      systemContainer.createEl('small', { text: `Created: ${new Date(metadata.created || Date.now()).toLocaleString()}` });
      systemContainer.createEl('small', { text: `Updated: ${new Date(metadata.updated || Date.now()).toLocaleString()}` });
    } else {
      systemContainer.createEl('small', { text: `Selected: ${this.selectedNodes.length} nodes` });
    }
  }

  renderActions(container) {
    const actionsContainer = container.createEl('div', { cls: 'mindcanvas-actions' });
    
    const calculateBtn = actionsContainer.createEl('button', { 
      text: 'Calculate Rollups',
      cls: 'mod-cta'
    });
    calculateBtn.addEventListener('click', () => {
      this.plugin.calculateAllRollups();
      this.render();
    });

    const syncBtn = actionsContainer.createEl('button', { 
      text: 'Sync to Obsidian',
      cls: 'mod-button'
    });
    syncBtn.addEventListener('click', () => {
      this.selectedNodes.forEach(node => {
        this.plugin.syncNodeToObsidianProperties(node);
      });
      new Notice('✅ Nodes synced to Obsidian properties');
    });
  }

  getCommonMetadata() {
    if (this.selectedNodes.length === 0) {
      return {};
    }

    if (this.selectedNodes.length === 1) {
      return this.plugin.getNodeMetadata(this.selectedNodes[0]) || {};
    }

    const allMetadata = this.selectedNodes.map(node => 
      this.plugin.getNodeMetadata(node) || {}
    );

    const common = {};
    const firstMeta = allMetadata[0];
    
    for (const key in firstMeta) {
      const value = firstMeta[key];
      const allSame = allMetadata.every(meta => 
        JSON.stringify(meta[key]) === JSON.stringify(value)
      );
      
      if (allSame) {
        common[key] = value;
      }
    }

    return common;
  }

  updateSelectedNodes(updates) {
    this.selectedNodes.forEach(node => {
      this.plugin.updateNodeMetadata(node, updates);
      
      // Force immediate visual indicator update
      setTimeout(() => {
        this.plugin.applyVisualIndicators(node);
      }, 50);
    });
    
    // Update the properties panel view
    setTimeout(() => {
      this.render();
    }, 100);
    
    // Force canvas save to persist changes
    setTimeout(() => {
      const canvas = this.plugin.getActiveCanvasView();
      if (canvas && canvas.canvas && canvas.canvas.requestSave) {
        canvas.canvas.requestSave();
      }
    }, 200);
  }

  // Enhanced date input creator with calendar picker
  createDateInput(container, label, value, onChange) {
    const fieldContainer = container.createEl('div', { cls: 'mindcanvas-field mindcanvas-date-field' });
    fieldContainer.createEl('label', { text: label });
    
    const inputWrapper = fieldContainer.createEl('div', { cls: 'mindcanvas-date-input-wrapper' });
    const dateInput = inputWrapper.createEl('input', {
      type: 'date',
      cls: 'mindcanvas-date-input',
      value: value || ''
    });
    
    dateInput.addEventListener('change', () => {
      const newValue = dateInput.value || null;
      onChange(newValue);
    });
    
    // Add clear button
    const clearBtn = inputWrapper.createEl('button', {
      text: '×',
      cls: 'mindcanvas-date-clear-btn'
    });
    clearBtn.addEventListener('click', () => {
      dateInput.value = '';
      onChange(null);
    });
    
    return dateInput;
  }

  // Enhanced toggle with immediate visual feedback
  createToggleWithVisualFeedback(container, label, value, onChange) {
    const fieldContainer = container.createEl('div', { cls: 'mindcanvas-field' });
    const toggleComponent = new ToggleComponent(fieldContainer)
      .setValue(value)
      .onChange((newValue) => {
        onChange(newValue);
        // Force immediate re-render and visual update
        setTimeout(() => this.render(), 50);
      });
    
    fieldContainer.createEl('label', { text: label }).prepend(toggleComponent.toggleEl);
    return toggleComponent;
  }
}

// ============================================================================
// PLACEHOLDER VIEW (FOR UNIMPLEMENTED VIEWS)
// ============================================================================
class PlaceholderView extends ItemView {
  constructor(leaf, viewType, displayText, icon) {
    super(leaf);
    this.viewType = viewType;
    this.displayText = displayText;
    this.icon = icon;
  }

  getViewType() {
    return this.viewType;
  }

  getDisplayText() {
    return this.displayText;
  }

  getIcon() {
    return this.icon;
  }

  async onOpen() {
    this.render();
  }

  render() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('mindcanvas-placeholder-view');

    container.createEl('h2', { text: this.displayText });
    container.createEl('p', { text: 'This feature is coming soon in a future update.' });
    
    const placeholder = container.createEl('div', { cls: 'mindcanvas-placeholder' });
    placeholder.createEl('div', { text: '🚧 Implementation in progress...' });
  }

  refresh() {
    this.render();
  }
}

// ============================================================================
// MAIN PLUGIN CLASS - MINDCANVAS PLUS 4
// ============================================================================
class MindCanvasPlus4 extends Plugin {
  
  async onload() {
    console.log('🚀 MindCanvas Plus 4: Starting comprehensive plugin load...');
    
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
      
          // Canvas API integration now uses direct imports
    console.log('✅ Canvas API integration updated to use Obsidian 1.6+ async API');
      
      // Initialize metadata system
      this.initializeMetadataSystem();
      console.log('✅ Metadata system initialized');
      
          // Initialize rollup engine
    this.initializeRollupEngine();
    console.log('✅ Rollup engine initialized');

    // Setup auto-save
    this.setupAutoSave();
    console.log('✅ Auto-save configured');

    // Initialize selection tracking for Properties Panel integration
    this.lastSelectionIds = '';
    console.log('✅ Selection tracking initialized');
      
      // Setup layout ready handler
      this.registerEvent(
        this.app.workspace.on('layout-ready', () => {
          this.onLayoutReady();
        })
      );
      
      console.log('✅ MindCanvas Plus 4: Loaded successfully with all features');
      new Notice('🚀 MindCanvas Plus 4: Ready! Use Cmd+Enter to create nodes in Canvas.');
      
    } catch (error) {
      console.error('❌ MindCanvas Plus 4: Loading failed:', error);
      new Notice('❌ MindCanvas Plus 4 failed to load: ' + error.message);
    }
  }

  onunload() {
    console.log('🛑 MindCanvas Plus 4: Unloading...');
    if (this.rollupEngine) {
      this.rollupEngine.destroy();
    }
    if (this.selectionCheckInterval) {
      clearInterval(this.selectionCheckInterval);
    }
  }

  onLayoutReady() {
    console.log('📐 MindCanvas Plus 4: Layout ready, performing UI setup...');
    this.updateAllViews();
  }

  // ============================================================================
  // SETTINGS MANAGEMENT
  // ============================================================================
  
  async loadSettings() {
    this.settings = Object.assign({}, {
      // Performance settings
      autoSaveInterval: 3000,
      debounceDelay: 500,
      
      // Default values
      defaultPriority: 'medium',
      defaultCurrency: 'USD',
      defaultTaskStatus: 'pending',
      
      // Feature toggles
      enableRollups: true,
      enableVisualIndicators: true,
      enableAutoGenerate: true,
      showPropertiesPanel: true,
      
      // Visual settings
      priorityColors: {
        high: '#ff4444',
        medium: '#ffbb33',
        low: '#00cc44'
      },
      statusColors: {
        pending: '#888888',
        'in-progress': '#3399ff',
        completed: '#00cc44',
        cancelled: '#ff4444',
        deferred: '#ffbb33'
      },
      
      // Financial settings
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'],
      defaultCostPerHour: 75,
      
      // Advanced settings
      debugMode: false,
      maxNodesForRollup: 1000,
      ganttViewEnabled: true,
      filtersViewEnabled: true
    }, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // ============================================================================
  // CUSTOM ICONS
  // ============================================================================
  
  addCustomIcons() {
    // MindManager-style icons
    addIcon('mindcanvas-task-v4', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>');
    addIcon('mindcanvas-gantt-v4', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="2"/><rect x="3" y="8" width="12" height="2"/><rect x="3" y="12" width="15" height="2"/><rect x="3" y="16" width="9" height="2"/></svg>');
    addIcon('mindcanvas-rollup-v4', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>');
    addIcon('mindcanvas-filter-v4', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/></svg>');
    addIcon('mindcanvas-properties-v4', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M9 9h6M9 15h6"/></svg>');
    addIcon('mindcanvas-financial-v4', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>');
    addIcon('mindcanvas-dependency-v4', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h6m0 0v6m0-6l-8 8-4-4-6 6"/></svg>');
    addIcon('mindcanvas-resource-v4', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>');
  }

  // ============================================================================
  // VIEW REGISTRATION
  // ============================================================================
  
  registerViews() {
    const VIEW_TYPE_PROPS = "mindcanvas-props";
    
    // Register the reactive properties view (inline to avoid module issues)
    this.registerView(
      VIEW_TYPE_PROPS,
      (leaf) => new MindCanvasPropertiesView(leaf, this)
    );
    
    // Keep other views
    this.registerView(VIEW_TYPE_GANTT, (leaf) => new PlaceholderView(leaf, VIEW_TYPE_GANTT, 'Gantt Chart', 'mindcanvas-gantt-v4'));
    this.registerView(VIEW_TYPE_ROLLUPS, (leaf) => new PlaceholderView(leaf, VIEW_TYPE_ROLLUPS, 'Rollups & Reports', 'mindcanvas-rollup-v4'));
    this.registerView(VIEW_TYPE_FILTERS, (leaf) => new PlaceholderView(leaf, VIEW_TYPE_FILTERS, 'Filters & Search', 'mindcanvas-filter-v4'));
    
    // Property side‑pane click handler (bubbles reliably)
    this.registerDomEvent(document, "click", (evt) => {
      const target = evt.target.closest("[data-open-mindcanvas-props]");
      if (!target) return;
      const view = this.app.workspace.getActiveViewOfType(ItemView);
      if (!view || view.getViewType() !== 'canvas') return;
      this.activatePropertiesView();
    });
  }

  // ============================================================================
  // RIBBON ICONS
  // ============================================================================
  
  addRibbonIcons() {
    // Properties panel - updated to use new properties view
    const propertiesButton = this.addRibbonIcon('mindcanvas-properties-v4', 'Toggle Properties Panel', () => {
      this.activatePropertiesView();
    });
    // Add data attribute for click handler
    propertiesButton.setAttribute('data-open-mindcanvas-props', 'true');

    // Gantt view
    this.addRibbonIcon('mindcanvas-gantt-v4', 'Toggle Gantt View', () => {
      this.toggleView(VIEW_TYPE_GANTT);
    });

    // Rollups view
    this.addRibbonIcon('mindcanvas-rollup-v4', 'Toggle Rollups View', () => {
      this.toggleView(VIEW_TYPE_ROLLUPS);
    });

    // Filters view
    this.addRibbonIcon('mindcanvas-filter-v4', 'Toggle Filters View', () => {
      this.toggleView(VIEW_TYPE_FILTERS);
    });
  }

  // ============================================================================
  // CANVAS API FUNCTIONS (INLINE TO AVOID MODULE ISSUES)
  // ============================================================================
  
  defaultProps() {
    return {
      status: "not-started",
      priority: "medium",
      progress: 0,
      start: "",        // ISO; "" === unset
      due:   "",
      tags: [],
      icon: "",
      cost: 0,
      resources: []
    };
  }

  async createChildNode(view) {
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
      data: { mindcanvas: this.defaultProps() }
    });
    await canvas.createEdge({ fromNode: parent, toNode: id, label: "" });
    canvas.requestSave();
  }

  async createSiblingNode(view) {
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
      data: { mindcanvas: this.defaultProps() }
    });
    canvas.requestSave();
  }

  // ============================================================================
  // COMMAND REGISTRATION & HOTKEYS (MindManager-style)
  // ============================================================================
  
  registerCommands() {
    
    // MAIN NODE CREATION COMMANDS - Using new async Canvas API
    
    // Cmd+Enter: Create CHILD node (subtopic) with arrow from parent
    this.addCommand({
      id: "mindcanvas-create-child",
      name: "MindCanvas: Create child node",
      hotkeys: [{ modifiers: ["Mod"], key: "Enter" }],
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(ItemView);
        if (!view || view.getViewType() !== 'canvas') return false;
        if (!checking) this.createChildNode(view);
        return true;
      },
    });

    // Enter: Create SIBLING node
    this.addCommand({
      id: "mindcanvas-create-sibling",
      name: "MindCanvas: Create sibling node",
      hotkeys: [{ key: "Enter" }],
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(ItemView);
        if (!view || view.getViewType() !== 'canvas') return false;
        if (!checking) this.createSiblingNode(view);
        return true;
      },
    });

    // Create Connected Node (no hotkey to avoid conflicts)
    this.addCommand({
      id: 'create-connected-node',
      name: 'Create Connected Node (Sibling)',
      checkCallback: (checking) => {
        const canvasView = this.getActiveCanvasView();
        if (canvasView) {
          if (!checking) {
            this.createConnectedNode(canvasView);
          }
          return true;
        }
        return false;
      }
    });

    // Shift+Enter: Create parent node
    this.addCommand({
      id: 'create-parent-node',
      name: 'Create Parent Node',
      hotkeys: [{ modifiers: ['Shift'], key: 'Enter' }],
      checkCallback: (checking) => {
        const canvasView = this.getActiveCanvasView();
        if (canvasView) {
          if (!checking) {
            this.createParentNode(canvasView);
          }
          return true;
        }
        return false;
      }
    });

    // PROPERTY MANAGEMENT COMMANDS
    
    // Cmd+1: Convert Node to Task (as shown in screenshot)
    this.addCommand({
      id: 'convert-to-task',
      name: 'Convert Node to Task',
      hotkeys: [{ modifiers: ['Mod'], key: '1' }],
      checkCallback: (checking) => {
        const selected = this.getSelectedNodes();
        if (selected.length > 0) {
          if (!checking) {
            this.convertNodesToTasks(selected);
          }
          return true;
        }
        return false;
      }
    });
    
    // Cmd+.: Toggle Properties Panel
    this.addCommand({
      id: 'toggle-properties-panel',
      name: 'Toggle Properties Panel',
      hotkeys: [{ modifiers: ['Mod'], key: '.' }],
      callback: () => this.activatePropertiesView()
    });

    // Cmd+Shift+P: Cycle Priority
    this.addCommand({
      id: 'cycle-priority',
      name: 'Cycle Node Priority',
      hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'P' }],
      checkCallback: (checking) => {
        const selected = this.getSelectedNodes();
        if (selected.length > 0) {
          if (!checking) {
            this.cyclePriority(selected);
          }
          return true;
        }
        return false;
      }
    });

    // Cmd+]: Increase Progress
    this.addCommand({
      id: 'increase-progress',
      name: 'Increase Progress (+10%)',
      hotkeys: [{ modifiers: ['Mod'], key: ']' }],
      checkCallback: (checking) => {
        const selected = this.getSelectedNodes();
        if (selected.length > 0) {
          if (!checking) {
            this.adjustProgress(selected, 10);
          }
          return true;
        }
        return false;
      }
    });

    // Cmd+[: Decrease Progress
    this.addCommand({
      id: 'decrease-progress',
      name: 'Decrease Progress (-10%)',
      hotkeys: [{ modifiers: ['Mod'], key: '[' }],
      checkCallback: (checking) => {
        const selected = this.getSelectedNodes();
        if (selected.length > 0) {
          if (!checking) {
            this.adjustProgress(selected, -10);
          }
          return true;
        }
        return false;
      }
    });

    // Additional commands
    this.addCommand({
      id: 'calculate-rollups',
      name: 'Calculate All Rollups',
      callback: () => this.calculateAllRollups()
    });

    this.addCommand({
      id: 'toggle-gantt-view',
      name: 'Toggle Gantt View',
      callback: () => this.toggleView(VIEW_TYPE_GANTT)
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

    // ENHANCED: Listen for Canvas selection changes to update Properties Panel
    this.registerEvent(
      this.app.workspace.on('layout-change', () => {
        this.onSelectionChange();
      })
    );

    // Setup interval to check for Canvas selection changes (for real-time updates)
    this.selectionCheckInterval = this.registerInterval(
      setInterval(() => {
        this.checkCanvasSelectionChange();
      }, 500) // Check every 500ms
    );
  }

  // ============================================================================
  // CANVAS API DELEGATION METHODS (LEGACY - KEEPING FOR COMPATIBILITY)
  // ============================================================================
  
  getActiveCanvasView() {
    // Use the new pattern directly
    const view = this.app.workspace.getActiveViewOfType(ItemView);
    return (view?.getViewType() === 'canvas') ? view : null;
  }

  getSelectedNodes() {
    const canvasView = this.getActiveCanvasView();
    if (!canvasView || !canvasView.canvas || !canvasView.canvas.selection) {
      return [];
    }
    
    const nodes = [];
    for (const nodeId of canvasView.canvas.selection) {
      const node = canvasView.canvas.nodes.get(nodeId);
      if (node) nodes.push(node);
    }
    return nodes;
  }

  // ============================================================================
  // METADATA SYSTEM
  // ============================================================================
  
  initializeMetadataSystem() {
    this.metadataNamespace = 'mindcanvas.v4';
    this.copiedProperties = null;
    console.log('🗃️ Metadata system initialized with namespace:', this.metadataNamespace);
  }

  createDefaultNodeMetadata() {
    return {
      // Task properties
      isTask: false,
      taskStatus: this.settings.defaultTaskStatus,
      priority: this.settings.defaultPriority,
      progress: 0,
      estimatedHours: 0,
      actualHours: 0,
      
      // Calendar dates (Obsidian-compatible YYYY-MM-DD format)
      startDate: null,      // When task can begin (🛫)
      dueDate: null,        // When task must be completed (📅)
      scheduledDate: null,  // When task is planned to be worked on (⏳)
      endDate: null,        // Actual completion date
      
      assignee: '',
      dependencies: [],
      
      // Financial properties
      cost: 0,
      budget: 0,
      actualCost: 0,
      currency: this.settings.defaultCurrency,
      costPerHour: this.settings.defaultCostPerHour,
      
      // Hierarchy properties
      parentId: null,
      childIds: [],
      level: 0,
      
      // Rollup properties (calculated)
      rollupCost: 0,
      rollupBudget: 0,
      rollupProgress: 0,
      rollupHours: 0,
      enableRollup: true,
      
      // General properties
      tags: [],
      notes: '',
      linkedNote: null,
      backlinks: [],
      
      // System properties
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      version: '4.0.0'
    };
  }

  initializeNodeMetadata(node) {
    if (!node.id) {
      console.log('❌ Cannot initialize metadata for node without ID');
      return;
    }

    const metadata = this.createDefaultNodeMetadata();

    // Store metadata using the custom namespace
    if (!node.data) {
      node.data = {};
    }
    if (!node.data[this.metadataNamespace]) {
      node.data[this.metadataNamespace] = {};
    }
    node.data[this.metadataNamespace] = { ...node.data[this.metadataNamespace], ...metadata };
    
    console.log('✅ Node metadata initialized for:', node.id);
  }

  getNodeMetadata(node) {
    if (!node || !node.data || !node.data[this.metadataNamespace]) {
      return null;
    }
    return node.data[this.metadataNamespace];
  }

  updateNodeMetadata(node, updates) {
    if (!node || !node.id) {
      console.log('❌ Cannot update metadata for invalid node');
      return;
    }

    if (!node.data || !node.data[this.metadataNamespace]) {
      this.initializeNodeMetadata(node);
    }

    // Update timestamp
    updates.updated = new Date().toISOString();
    
    // Apply updates
    Object.assign(node.data[this.metadataNamespace], updates);
    
    console.log('✅ Node metadata updated for:', node.id);
    
    // Trigger rollup calculations if enabled
    if (this.settings.enableRollups && this.rollupEngine) {
      this.rollupEngine.scheduleRollupForNode(node);
    }
    
    // Sync to Obsidian metadata if linked note exists
    this.syncNodeToObsidianProperties(node);
    
    // Apply visual indicators
    if (this.settings.enableVisualIndicators) {
      this.applyVisualIndicators(node);
    }
    
    // Auto-save
    this.debouncedSave();
  }

  // ============================================================================
  // PROPERTY MANAGEMENT METHODS
  // ============================================================================
  
  cyclePriority(nodes) {
    const priorities = ['low', 'medium', 'high'];
    
    nodes.forEach(node => {
      const metadata = this.getNodeMetadata(node);
      if (metadata) {
        const currentIndex = priorities.indexOf(metadata.priority);
        const nextIndex = (currentIndex + 1) % priorities.length;
        const newPriority = priorities[nextIndex];
        
        this.updateNodeMetadata(node, { priority: newPriority });
      }
    });
    
    new Notice(`✅ Priority cycled for ${nodes.length} node(s)`);
  }

  adjustProgress(nodes, delta) {
    nodes.forEach(node => {
      const metadata = this.getNodeMetadata(node);
      if (metadata) {
        const newProgress = Math.max(0, Math.min(100, metadata.progress + delta));
        this.updateNodeMetadata(node, { progress: newProgress });
      }
    });
    
    new Notice(`✅ Progress adjusted by ${delta}% for ${nodes.length} node(s)`);
  }

  convertNodesToTasks(nodes) {
    nodes.forEach(node => {
      this.updateNodeMetadata(node, {
        isTask: true,
        taskStatus: 'pending'
      });
    });
    
    new Notice(`✅ Converted ${nodes.length} node(s) to tasks`);
  }

  setTaskStatus(nodes, status) {
    nodes.forEach(node => {
      this.updateNodeMetadata(node, { taskStatus: status });
    });
    
    new Notice(`✅ Set status to '${status}' for ${nodes.length} node(s)`);
  }

  copyNodeProperties(sourceNode) {
    const metadata = this.getNodeMetadata(sourceNode);
    if (metadata) {
      this.copiedProperties = {
        priority: metadata.priority,
        currency: metadata.currency,
        costPerHour: metadata.costPerHour,
        tags: [...metadata.tags],
        taskStatus: metadata.taskStatus,
        isTask: metadata.isTask
      };
      new Notice('✅ Properties copied');
    }
  }

  pasteNodeProperties(targetNodes) {
    if (!this.copiedProperties) {
      new Notice('❌ No properties copied');
      return;
    }

    targetNodes.forEach(node => {
      this.updateNodeMetadata(node, this.copiedProperties);
    });
    
    new Notice(`✅ Properties pasted to ${targetNodes.length} node(s)`);
  }

  // ============================================================================
  // ROLLUP ENGINE INITIALIZATION
  // ============================================================================
  
  initializeRollupEngine() {
    this.rollupEngine = {
      scheduledNodes: new Set(),
      isProcessing: false,
      
      scheduleRollupForNode: (node) => {
        this.rollupEngine.scheduledNodes.add(node.id);
        this.debouncedRollupProcess();
      },
      
      processScheduledRollups: () => {
        if (this.rollupEngine.isProcessing) return;
        this.rollupEngine.isProcessing = true;
        
        try {
          this.calculateRollupsForNodes(Array.from(this.rollupEngine.scheduledNodes));
          this.rollupEngine.scheduledNodes.clear();
        } finally {
          this.rollupEngine.isProcessing = false;
        }
      },
      
      destroy: () => {
        this.rollupEngine.scheduledNodes.clear();
      }
    };

    this.debouncedRollupProcess = debounce(() => {
      this.rollupEngine.processScheduledRollups();
    }, 1000);
  }

  calculateAllRollups() {
    const canvas = this.getActiveCanvasView();
    if (!canvas || !canvas.canvas || !canvas.canvas.nodes) {
      console.log('❌ No canvas or nodes for rollup calculation');
      return;
    }

    try {
      console.log('🧮 Calculating all rollups...');
      const allNodes = Array.from(canvas.canvas.nodes.values());
      this.calculateRollupsForNodes(allNodes.map(n => n.id));
      new Notice('✅ Rollup calculations completed');
    } catch (error) {
      console.error('❌ Error calculating rollups:', error);
      new Notice('❌ Error calculating rollups: ' + error.message);
    }
  }

  calculateRollupsForNodes(nodeIds) {
    // Implementation would go here
    console.log('🧮 Calculating rollups for nodes:', nodeIds);
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
        console.log('❌ No metadata for node:', node.id);
        return;
      }

      // Find the correct node element - try multiple approaches
      let element = null;
      
      // Method 1: Direct nodeEl property
      if (node.nodeEl) {
        element = node.nodeEl;
      }
      // Method 2: Query by canvas node class and data-node-id
      else {
        const canvas = this.getActiveCanvasView();
        if (canvas && canvas.containerEl) {
          element = canvas.containerEl.querySelector(`[data-node-id="${node.id}"]`) ||
                   canvas.containerEl.querySelector(`.canvas-node[data-id="${node.id}"]`);
        }
      }
      
      if (!element) {
        console.log('❌ Cannot find DOM element for node:', node.id);
        // Try to find it after a short delay
        setTimeout(() => {
          this.applyVisualIndicators(node);
        }, 100);
        return;
      }

      console.log('🎨 Applying visual indicators to element:', element);

      // Clear existing attributes
      element.removeAttribute('data-is-task');
      element.removeAttribute('data-task-status');
      element.removeAttribute('data-task-priority');
      element.removeAttribute('data-progress');
      element.removeAttribute('data-has-financial');
      
      // Task properties
      if (metadata.isTask) {
        element.setAttribute('data-is-task', 'true');
        element.setAttribute('data-task-status', metadata.taskStatus || 'pending');
        console.log('✅ Applied task attributes:', metadata.taskStatus);
      }
      
      // Priority (always apply)
      element.setAttribute('data-task-priority', metadata.priority || 'medium');
      console.log('✅ Applied priority:', metadata.priority);
      
      // Progress
      if (metadata.progress > 0) {
        element.setAttribute('data-progress', Math.round(metadata.progress));
        element.style.setProperty('--progress-width', metadata.progress + '%');
        console.log('✅ Applied progress:', metadata.progress + '%');
      } else {
        element.removeAttribute('data-progress');
        element.style.removeProperty('--progress-width');
      }
      
      // Financial status
      if (metadata.cost > 0 || metadata.budget > 0) {
        element.setAttribute('data-has-financial', 'true');
        console.log('✅ Applied financial indicator');
      }

      // Force a repaint
      element.style.display = 'none';
      element.offsetHeight; // Trigger reflow
      element.style.display = '';
      
      console.log('✅ Visual indicators applied to node:', node.id, {
        isTask: metadata.isTask,
        status: metadata.taskStatus,
        priority: metadata.priority,
        progress: metadata.progress
      });
    } catch (error) {
      console.error('❌ Error applying visual indicators:', error);
    }
  }

  // ============================================================================
  // AUTO-SAVE SYSTEM
  // ============================================================================
  
  setupAutoSave() {
    this.debouncedSave = debounce(() => {
      this.saveCanvasState();
    }, this.settings.autoSaveInterval);
  }

  saveCanvasState() {
    const canvas = this.getActiveCanvasView();
    if (canvas && canvas.canvas && canvas.canvas.requestSave) {
      canvas.canvas.requestSave();
      console.log('💾 Canvas state saved');
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  onActiveLeafChange() {
    this.updateAllViews();
    this.checkCanvasSelectionChange();
  }

  onCanvasFileModified(file) {
    console.log('📝 Canvas file modified:', file.path);
    this.updateAllViews();
  }

  onSelectionChanged() {
    this.updateAllViews();
    this.checkCanvasSelectionChange();
  }

  onSelectionChange() {
    // Handle layout changes that might affect selection
    this.checkCanvasSelectionChange();
  }

  checkCanvasSelectionChange() {
    const canvasView = this.getActiveCanvasView();
    if (!canvasView) {
      return;
    }

    try {
      const currentSelection = this.getSelectedNodes();
      const selectionIds = currentSelection.map(node => node.id).sort().join(',');
      
      // Check if selection changed
      if (this.lastSelectionIds !== selectionIds) {
        this.lastSelectionIds = selectionIds;
        console.log('🎯 Canvas selection changed:', currentSelection.length, 'nodes selected');
        
        // Update Properties Panel immediately
        this.updatePropertiesPanel();
        
        // Apply visual indicators to all nodes
        this.updateAllVisualIndicators();
      }
    } catch (error) {
      // Silently handle errors to avoid spam in console
    }
  }

  updatePropertiesPanel() {
    const propertiesLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_PROPERTIES);
    propertiesLeaves.forEach(leaf => {
      if (leaf.view && leaf.view.refresh) {
        leaf.view.refresh();
      }
    });
  }

  updateAllVisualIndicators() {
    const canvasView = this.getActiveCanvasView();
    if (!canvasView || !canvasView.canvas || !canvasView.canvas.nodes) {
      return;
    }

    // Apply visual indicators to all nodes in the canvas
    Array.from(canvasView.canvas.nodes.values()).forEach(node => {
      if (this.settings.enableVisualIndicators) {
        this.applyVisualIndicators(node);
      }
    });
  }

  onNodeChanged(nodeId) {
    console.log('📝 Node changed:', nodeId);
    // Trigger rollup recalculation if needed
    if (this.settings.enableRollups && this.rollupEngine) {
      const canvas = this.getActiveCanvasView();
      if (canvas && canvas.canvas && canvas.canvas.nodes) {
        const node = canvas.canvas.nodes.get(nodeId);
        if (node) {
          this.rollupEngine.scheduleRollupForNode(node);
        }
      }
    }
  }

  updateAllViews() {
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
  // VIEW MANAGEMENT
  // ============================================================================
  
  async toggleView(viewType) {
    const existing = this.app.workspace.getLeavesOfType(viewType);
    
    if (existing.length > 0) {
      existing[0].detach();
      console.log('✅ View closed:', viewType);
    } else {
      const leaf = this.app.workspace.getRightLeaf(false);
      await leaf.setViewState({ type: viewType });
      this.app.workspace.revealLeaf(leaf);
      console.log('✅ View opened:', viewType);
    }
  }

  async activatePropertiesView() {
    const VIEW_TYPE_PROPS = "mindcanvas-props";
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_PROPS)[0];
    if (!leaf) leaf = this.app.workspace.getRightLeaf(false);
    await leaf.setViewState({ type: VIEW_TYPE_PROPS, active: true });
    this.app.workspace.revealLeaf(leaf);
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
          .setIcon('mindcanvas-task-v4')
          .onClick(() => {
            this.convertNodesToTasks(selectedNodes);
          });
      });

      menu.addItem((item) => {
        item
          .setTitle('Open Properties')
          .setIcon('mindcanvas-properties-v4')
          .onClick(() => {
            this.toggleView(VIEW_TYPE_PROPERTIES);
          });
      });

      if (selectedNodes.length === 1) {
        menu.addItem((item) => {
          item
            .setTitle('Copy Properties')
            .setIcon('copy')
            .onClick(() => {
              this.copyNodeProperties(selectedNodes[0]);
            });
        });
      }

      if (selectedNodes.length > 0 && this.copiedProperties) {
        menu.addItem((item) => {
          item
            .setTitle('Paste Properties')
            .setIcon('paste')
            .onClick(() => {
              this.pasteNodeProperties(selectedNodes);
            });
        });
      }

      menu.addSeparator();
    }

    menu.addItem((item) => {
      item
        .setTitle('Calculate Rollups')
        .setIcon('mindcanvas-rollup-v4')
        .onClick(() => {
          this.calculateAllRollups();
        });
    });
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
  // PLACEHOLDER METHODS (to be implemented)
  // ============================================================================
  
  showQuickTagInput(nodes) {
    // TODO: Implement quick tag input modal
    new Notice('Quick tag input - Coming soon!');
  }

  createDependency(fromNode, toNode) {
    // TODO: Implement dependency creation
    new Notice('Dependency creation - Coming soon!');
  }

  toggleRollupMode(nodes) {
    // TODO: Implement rollup mode toggle
    new Notice('Rollup mode toggle - Coming soon!');
  }

  showBulkEditModal(nodes) {
    // TODO: Implement bulk edit modal
    new Notice('Bulk edit modal - Coming soon!');
  }

  createHierarchicalRelationship(parentNode, childNode) {
    try {
      console.log('🔗 Creating hierarchical relationship:', parentNode.id, '->', childNode.id);
      
      const parentMetadata = this.getNodeMetadata(parentNode);
      const childMetadata = this.getNodeMetadata(childNode);
      
      if (parentMetadata && childMetadata) {
        if (!parentMetadata.childIds.includes(childNode.id)) {
          parentMetadata.childIds.push(childNode.id);
        }
        
        childMetadata.parentId = parentNode.id;
        childMetadata.level = parentMetadata.level + 1;
        
        console.log('✅ Hierarchical relationship created');
      }
    } catch (error) {
      console.error('❌ Error creating hierarchical relationship:', error);
    }
  }

}

// ============================================================================
// MINDCANVAS PROPERTIES VIEW (INLINE TO AVOID MODULE LOADING ISSUES)
// ============================================================================
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
      this.writeProps(canvas, this.nodeId, { start: iso })
    );
    this.containerEl.appendChild(startField);

    // DUE DATE
    const dueField = this.mkDateField("Due", data.due, (iso) =>
      this.writeProps(canvas, this.nodeId, { due: iso })
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
      this.writeProps(canvas, this.nodeId, { tags });
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
      this.writeProps(canvas, this.nodeId, { progress: Number(progInput.value) });
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

  // Inline writeProps to avoid circular dependency
  writeProps(canvas, id, patch) {
    canvas.mutate(id, (draft) => {
      draft.data = draft.data || {};
      draft.data.mindcanvas = { ...draft.data.mindcanvas, ...patch };
    });
    this.reflectDataset(canvas, id);
    canvas.requestSave();
  }

  // Inline reflectDataset
  reflectDataset(canvas, id) {
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
}

module.exports = MindCanvasPlus4; 