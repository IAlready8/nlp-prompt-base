# 🚀 NLP Prompt Database - Quick Start Guide

## 🛠️ Installation & Setup

### 1. Install Dependencies
```bash
npm install
```
*This automatically downloads vendor libraries for offline use*

### 2. Start the Application

**Option A: Full Development Mode (with hot reload)**
```bash
npm run dev
```

**Option B: Production Mode**
```bash
npm start
```

**Option C: Simple Mode (no dependencies)**
```bash
./start-simple.sh
```

### 3. Access Your App
- **Frontend:** http://localhost:8000
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/api/health

## ⚡ Quick Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start with hot reload |
| `npm test` | Run test suite |
| `npm run backup` | Create data backup |
| `npm run lint` | Check code quality |

## 🔧 Configuration

### Environment Setup (Optional)
1. Copy `.env.sample` to `.env`
2. Add your OpenAI API key for AI features:
   ```
   OPENAI_API_KEY=sk-your-key-here
   ```

### Features Available
- ✅ **Complete offline functionality**
- ✅ **5 navigation views** (Prompts, Categories, AI Assistant, Analytics, Settings)
- ✅ **Auto-save** (every 5 seconds)
- ✅ **Bulk operations** with multi-select
- ✅ **Advanced search** with operators
- ✅ **AI-powered categorization** (with API key)
- ✅ **Drag & drop** organization
- ✅ **PWA support** (installable)
- ✅ **Keyboard shortcuts** (Cmd+1/2/3/4/5)
- ✅ **Dark mode optimized** for MacBook
- ✅ **Accessibility compliant** (WCAG AA)

## 🧪 Testing

Run the comprehensive test suite:
```bash
npm test
```

Tests cover:
- File structure validation
- API endpoint functionality
- Frontend asset serving
- Code quality checks
- Integration workflows

## 🔄 Data Management

### Backup & Restore
- **Manual backup:** Click "🔒 Backup" in the interface
- **CLI backup:** `npm run backup`
- **Restore:** Import JSON file through interface

### Data Location
- Main data: `data/prompts.json`
- Backups: `backups/` directory
- Auto-saved to localStorage every 5 seconds

## 🎯 Usage Tips

### Keyboard Shortcuts
- **Cmd+N** - Add new prompt
- **Cmd+F** - Focus search
- **Cmd+1/2/3/4/5** - Switch views
- **Cmd+B** - Toggle bulk mode
- **?** - Show all shortcuts

### Search Tips
- Basic: `machine learning`
- By tag: `tag:javascript`
- By rating: `rating:5`
- By folder: `folder:favorites`
- By category: `category:code`

### AI Features (requires API key)
- Auto-categorize prompts
- Generate relevant tags
- Enhance prompt quality
- Create new prompts with AI
- Analyze collection effectiveness

## 🛡️ Security & Privacy

- **100% local storage** - no data leaves your machine
- **Offline-first** - works without internet
- **API keys stored locally** - never transmitted except to OpenAI
- **No analytics or tracking**

## 📱 Progressive Web App

Install as native app:
1. Visit the app in Chrome/Safari
2. Click "Add to Home Screen" or "Install"
3. Use like a native desktop app

## 🐛 Troubleshooting

### Port Already in Use
```bash
lsof -ti:3001 | xargs kill -9
npm start
```

### Dependencies Issues
```bash
rm -rf node_modules package-lock.json
npm install
```

### Reset Data
```bash
rm data/prompts.json
npm start
# Will create fresh data file
```

### Test Failures
```bash
npm test
# Check specific failing tests
# Ensure all files are in correct locations
```

---

## 🎉 You're All Set!

Your NLP Prompt Database is now a **bullet-proof local powerhouse** with:

- ✅ All critical bugs fixed
- ✅ Missing features implemented
- ✅ Offline-first architecture
- ✅ Accessibility compliance
- ✅ Comprehensive test coverage
- ✅ Production-ready performance
- ✅ Enterprise-grade error handling

**Happy prompting! 🧠✨**