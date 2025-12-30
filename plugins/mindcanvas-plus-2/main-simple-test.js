const { Plugin, Notice } = require('obsidian');

class MindCanvasPlus2Test extends Plugin {
  async onload() {
    console.log('🧪 SIMPLE TEST: MindCanvas Plus 2 Test plugin loading...');
    new Notice('🧪 SIMPLE TEST: MindCanvas Plus 2 Test plugin loading!');
    
    // Add a simple ribbon icon
    this.addRibbonIcon('bug', 'Test Debug', () => {
      console.log('🐛 Test debug clicked!');
      new Notice('🐛 Test debug clicked!');
    });
    
    console.log('✅ SIMPLE TEST: Plugin loaded with 1 ribbon icon');
    new Notice('✅ SIMPLE TEST: Plugin loaded with 1 ribbon icon!');
  }

  onunload() {
    console.log('🧪 SIMPLE TEST: Plugin unloading...');
  }
}

module.exports = MindCanvasPlus2Test; 