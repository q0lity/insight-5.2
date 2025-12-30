# MindCanvas Plus 4

**Complete MindManager-style mind mapping for Obsidian Canvas**

MindCanvas Plus 4 brings the power of professional mind mapping to Obsidian Canvas with comprehensive task tracking, financial rollups, Gantt charts, and advanced project management features.

## 🚀 Features

### Core MindManager-Style Features

#### ✨ Hotkey-Driven Node Creation
- **Cmd+Enter**: Create connected node (sibling)
- **Cmd+Shift+Enter**: Create child node (subtopic)  
- **Alt+Enter**: Create sibling node with same properties
- **Shift+Enter**: Create parent node above current selection
- **Cmd+.**: Toggle Properties Panel

#### 🎯 Advanced Property Management
- **Task Properties**: Status, priority, progress, dates, hours, assignees, dependencies
- **Financial Properties**: Cost tracking, budget allocation, currency support, cost per hour
- **General Properties**: Tags, notes, linked notes, custom metadata
- **Visual Indicators**: Priority color coding, status icons, progress bars

#### 📊 Comprehensive Views System
- **Properties Panel**: Tabbed interface for detailed property editing
- **Gantt Chart**: Timeline visualization with dependencies (coming soon)
- **Rollups & Reports**: Financial summaries and analytics (coming soon)
- **Filters & Search**: Advanced filtering and search capabilities (coming soon)

#### 💰 Financial Management
- Multi-currency support (USD, EUR, GBP, JPY, CAD, AUD)
- Automatic rollup calculations (cost, budget, hours, progress)
- Resource hourly rates and material costs
- Budget vs actual comparisons

#### 🔗 Obsidian Integration
- Sync node properties to note frontmatter
- Create linked notes for detailed documentation
- Tag propagation to Obsidian's tag system
- Auto-generate markdown files for task nodes

## 📦 Installation

1. Copy the entire `mindcanvas-plus-4` folder to your vault's `.obsidian/plugins/` directory
2. Restart Obsidian or reload the app
3. Go to Settings → Community Plugins
4. Enable "MindCanvas Plus 4"
5. Open a Canvas file to start using the plugin

## 🎮 Quick Start Guide

### Creating Your First Mind Map

1. **Open or create a Canvas file**
2. **Create nodes with hotkeys**:
   - Press `Cmd+Enter` to create your first topic
   - Select the node and press `Cmd+Shift+Enter` to create a subtopic
   - Use `Alt+Enter` to create sibling topics with the same style

3. **Add properties**:
   - Select a node and press `Cmd+.` to open the Properties Panel
   - Convert nodes to tasks using the "Convert to Task" toggle
   - Set priority, status, progress, and other properties

4. **Organize with visual indicators**:
   - High priority nodes show red borders
   - Medium priority nodes show yellow borders  
   - Low priority nodes show green borders
   - Progress bars appear at the bottom of nodes
   - Status icons indicate completion states

### Working with Task Properties

#### Task Management
- **Status Options**: Pending, In Progress, Completed, Cancelled, Deferred
- **Priority Levels**: High (red), Medium (yellow), Low (green)
- **Progress Tracking**: 0-100% with visual progress bars
- **Time Tracking**: Estimated vs actual hours
- **Assignment**: Assign tasks to team members
- **Dependencies**: Link tasks that depend on others

#### Financial Tracking
- **Cost Tracking**: Track individual node costs
- **Budget Management**: Set and monitor budgets
- **Currency Support**: Multiple currency options
- **Rollup Calculations**: Automatic aggregation to parent nodes
- **Hourly Rates**: Set cost per hour for resources

### Keyboard Shortcuts Reference

| Shortcut | Action |
|----------|--------|
| `Cmd+Enter` | Create connected node (sibling) |
| `Cmd+Shift+Enter` | Create child node (subtopic) |
| `Alt+Enter` | Create sibling with same style |
| `Shift+Enter` | Create parent node |
| `Cmd+.` | Toggle Properties Panel |
| `Cmd+Shift+P` | Cycle priority (Low → Medium → High) |
| `Cmd+]` | Increase progress (+10%) |
| `Cmd+[` | Decrease progress (-10%) |
| `Cmd+T` | Quick tag input (coming soon) |

### Context Menu Options

Right-click on Canvas nodes to access:
- **Convert to Task**: Transform regular nodes into task nodes
- **Open Properties**: Quick access to Properties Panel
- **Copy Properties**: Copy all properties from selected node
- **Paste Properties**: Apply copied properties to selected nodes
- **Calculate Rollups**: Trigger rollup calculations

## 🎨 Visual Indicators Guide

### Priority Color Coding
- **Red Border**: High priority tasks
- **Yellow Border**: Medium priority tasks
- **Green Border**: Low priority tasks

### Status Indicators
- **✓ Icon**: Completed tasks (green background)
- **⏳ Icon**: In-progress tasks (blue dashed border)
- **⏸ Icon**: Deferred tasks (yellow dotted border)
- **Strikethrough**: Cancelled tasks (gray, faded)

### Progress Bars
- **Green-blue gradient bar**: Shows completion percentage
- **Bottom of node**: Visual progress indicator
- **Animated glow**: Indicates active progress

### Financial Indicators
- **$ Symbol**: Nodes with cost or budget data
- **Thick bottom border**: Financial tracking enabled

## 🔧 Configuration

### Settings Overview
Access plugin settings via Settings → MindCanvas Plus 4:

- **Performance**: Auto-save interval, debounce delays
- **Defaults**: Default priority, currency, task status
- **Features**: Enable/disable rollups, visual indicators
- **Visual**: Customize priority colors, status colors
- **Financial**: Supported currencies, default cost per hour

### Customization Options
- **Priority Colors**: Customize colors for high/medium/low priority
- **Status Colors**: Set colors for different task states
- **Currency Support**: Add or remove supported currencies
- **Visual Indicators**: Toggle on/off various visual features

## 📋 Advanced Features

### Rollup Calculations
- **Automatic Aggregation**: Child values automatically roll up to parents
- **Financial Rollups**: Sum costs and budgets across hierarchies
- **Progress Rollups**: Weighted average progress calculations
- **Time Rollups**: Total estimated and actual hours
- **Real-time Updates**: Calculations update as values change

### Obsidian Integration
- **Frontmatter Sync**: Node properties sync to note frontmatter
- **Linked Notes**: Connect nodes to detailed documentation
- **Tag Integration**: Canvas tags appear in Obsidian's tag system
- **File Generation**: Auto-generate markdown files for tasks

### Hierarchy Management
- **Parent-Child Relationships**: Automatic hierarchy detection
- **Dependency Tracking**: Link related tasks and prerequisites
- **Level-based Styling**: Visual distinction for hierarchy levels
- **Relationship Visualization**: Clear parent-child connections

## 🛠️ Development Status

### ✅ Completed Features
- [x] Plugin foundation and architecture
- [x] Canvas API integration with robust selection handling
- [x] Hotkey-driven node creation (all 4 types)
- [x] Comprehensive metadata system
- [x] Properties Panel with tabbed interface
- [x] Visual indicators and MindManager-style styling
- [x] Context menu integration
- [x] Settings management
- [x] Multi-node property editing
- [x] Property copy/paste functionality
- [x] Obsidian frontmatter synchronization

### 🚧 In Development
- [ ] Gantt Chart view implementation
- [ ] Rollups & Reports view with charts
- [ ] Filters & Search with advanced queries
- [ ] Dependency visualization
- [ ] Bulk edit modal
- [ ] Quick tag input modal
- [ ] Advanced rollup calculations
- [ ] Formula evaluation system

### 🎯 Planned Features
- [ ] Template system for quick setup
- [ ] Export capabilities (PDF, JSON, CSV)
- [ ] Team collaboration features
- [x] Mobile-optimized interface (Full compatibility achieved)
- [ ] AI-powered task suggestions
- [ ] Integration with external tools

## 📚 API Reference

### Canvas API Integration
The plugin uses a robust Canvas API integration that handles:
- **View Detection**: Automatic Canvas view detection
- **Selection Handling**: Multi-method selection detection
- **Node Creation**: Multiple API method fallbacks
- **Connection Management**: Edge creation and management

### Metadata System
Properties are stored in the `mindcanvas.v4` namespace:
```javascript
node.data['mindcanvas.v4'] = {
  isTask: boolean,
  taskStatus: string,
  priority: string,
  progress: number,
  // ... other properties
}
```

### Plugin Methods
Key plugin methods for integration:
- `getSelectedNodes()`: Get currently selected Canvas nodes
- `updateNodeMetadata(node, updates)`: Update node properties
- `applyVisualIndicators(node)`: Apply visual styling
- `calculateAllRollups()`: Trigger rollup calculations

## 🐛 Troubleshooting

### Mobile Compatibility ✅
**Fixed: "Cannot find module" Error**
This plugin now works seamlessly on both **Obsidian Desktop** and **Obsidian Mobile**! The previous `require()` module issue has been resolved by bundling all functionality into a single JavaScript file.

### Complete Feature Implementation ✅
**All Major Features Now Working**

#### Hotkey Mapping Fixed ✅
- **`Cmd+Enter`**: Creates **CHILD node** with automatic arrow from parent
- **`Enter`**: Creates **SIBLING node** at same level  
- **`Alt+Enter`**: Creates connected node with same properties
- All hotkeys work correctly in Canvas view with proper edge creation

#### Visual Indicators Enhanced ✅
- Visual indicators update **immediately** when properties change
- MindManager-style priority colors (red/yellow/green borders)
- Status icons (✓ completed, ⏳ in-progress, ⏸ deferred)
- Progress bars with percentage display
- Financial indicators (💰 icon for cost/budget nodes)
- Enhanced CSS targeting for reliable display

#### Properties Panel Complete ✅
- **Calendar Integration**: Start Date, Due Date, Scheduled Date with date pickers
- **Enhanced Tags**: Visual tag chips with click-to-remove functionality
- **Task Management**: Convert to task, status, priority, progress tracking
- **Assignee Field**: `@username` support for resource assignment
- **Financial Properties**: Cost, budget, currency with rollup calculations
- **Hours Tracking**: Estimated vs actual hours with visual feedback

#### Edge Creation Enhanced ✅
- Multiple Canvas API methods for maximum compatibility
- Automatic arrows for parent→child relationships  
- Proper connection sides (right→left, bottom→top)
- Enhanced fallback systems for different Obsidian versions

### Common Issues

#### Hotkeys Not Working
1. Ensure you're in a Canvas view
2. Check Settings → Hotkeys for conflicts
3. Try reloading Obsidian
4. Enable debug mode in plugin settings

#### Properties Not Saving
1. Verify Canvas file has write permissions
2. Check auto-save settings
3. Manually save the Canvas file
4. Look for error messages in the console

#### Visual Indicators Missing
1. Enable visual indicators in settings
2. Check if CSS is properly loaded
3. Try refreshing the Canvas view
4. Verify node has metadata assigned

### Debug Mode
Enable debug mode in settings to see detailed console logging:
1. Go to Settings → MindCanvas Plus 4
2. Enable "Debug Mode"
3. Open Developer Console (Cmd+Option+I)
4. Monitor console messages during operation

## 🤝 Contributing

We welcome contributions! Areas where help is needed:
- **View Development**: Gantt, Rollups, and Filters views
- **Formula System**: Mathematical expressions for properties
- **Mobile Optimization**: Touch-friendly interface improvements
- **Testing**: Cross-platform compatibility testing
- **Documentation**: Examples, tutorials, and guides

## 📄 License

This plugin is provided under the MIT License. See LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by MindManager's powerful mind mapping capabilities
- Built on Obsidian's robust Canvas system
- Thanks to the Obsidian community for API documentation and support

---

**Ready to transform your Obsidian Canvas into a powerful mind mapping tool? Install MindCanvas Plus 4 today!** 🚀 