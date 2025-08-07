# 🎨 Design Experiments

This folder contains experimental design components and layouts for MovieGenius.

## 📂 Contents

### **Apple-Style Glass Cards System**
- `MovieCardGlass.js` - Translucent glassmorphism movie cards
- `MovieScrollContainer.js` - Horizontal scrolling container
- `MovieDiscoverySection.js` - Complete discovery section  
- `test-glass-cards.js` - Test page (was at `/pages/test-glass-cards.js`)

## 🚀 Quick Access

### **Test the Glass Cards:**
1. Move `test-glass-cards.js` back to `/pages/` temporarily
2. Visit: `http://localhost:3000/test-glass-cards`
3. Move file back here when done

### **Use Components:**
```jsx
// Import from design-experiments folder
import MovieCardGlass from '../design-experiments/MovieCardGlass';
import MovieScrollContainer from '../design-experiments/MovieScrollContainer';
```

## 📋 Status
- ✅ **Fully functional** - All components work and are tested
- ✅ **Production ready** - Proper error handling and performance optimization
- ✅ **Documented** - See `/DESIGN_EXPERIMENTS_ARCHIVE.md` for full details
- 🔄 **Archived** - Saved for future implementation

## 🔮 Future Use
When ready to implement:
1. Move desired components back to `/components/`
2. Update imports in any test files
3. Integrate with existing pages
4. Update `/DESIGN_EXPERIMENTS_ARCHIVE.md` with integration details