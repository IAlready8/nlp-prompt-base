# 🧠 NLP Prompt Database

A sophisticated personal database for organizing and managing NLP prompts with AI-powered categorization, built specifically for MacBook Air M2 with a modern dark interface.

![NLP Prompt Database](https://img.shields.io/badge/Version-1.0.0-blue) ![Platform](https://img.shields.io/badge/Platform-macOS-brightgreen) ![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

### 🤖 AI-Powered Organization
- **Automatic Categorization**: Uses OpenAI GPT to categorize prompts intelligently
- **Smart Tagging**: AI generates relevant tags for easy discovery
- **Fallback Logic**: Works offline with built-in categorization rules

### 📊 Advanced Organization
- **10 Categories**: Code, Cognitive, Jailbreak, Dev, Writing, Business, General, Creative, Analysis, Research
- **Folder System**: Organize with favorites, archive, and custom folders
- **Star Ratings**: Rate prompts from 1-5 stars
- **Tags System**: Filter and search by custom tags

### 🔍 Powerful Search & Discovery
- **Real-time Search**: Instant search across prompt text, notes, and tags
- **Advanced Search Operators**: Use `tag:code`, `rating:5`, `folder:favorites`, `category:dev`
- **Smart Highlighting**: Search terms highlighted in results
- **Usage Tracking**: Track how often you use each prompt
- **Sorting Options**: Sort by date, rating, usage, or alphabetically

### 💾 Data Management
- **Local JSON Database**: All data stored locally for privacy
- **Import/Export**: Backup and share your prompt collections (JSON, CSV, TXT)
- **Auto-Save**: Changes saved automatically to localStorage
- **Bulk Operations**: Multi-select for delete, move, categorize, export
- **No External Dependencies**: Works completely offline
- **PWA Support**: Install as a native-like app

### 🎨 MacBook Air M2 Optimized
- **Dark Mode Interface**: Beautiful OLED-optimized dark theme
- **Responsive Design**: Perfect for 13.6\" Liquid Retina display
- **Smooth Animations**: 60fps animations and transitions
- **Keyboard Shortcuts**: Full keyboard navigation support
- **Drag & Drop**: Intuitive reordering and organization
- **Context Menus**: Right-click for quick actions
- **View Modes**: Grid and list view options
- **Performance Monitoring**: Optional FPS and memory tracking

## 🚀 Quick Start

### Prerequisites
- Modern web browser (Safari, Chrome, Firefox, Edge)
- Optional: OpenAI API key for AI features
- Optional: Node.js for development server

### Installation

1. **Clone or Download** the project:
   ```bash
   git clone https://github.com/yourusername/nlp-prompt-database.git
   cd nlp-prompt-database
   ```

2. **Launch the Application**:
   ```bash
   # Quick start with comprehensive setup
   ./start.sh
   
   # OR manual setup:
   npm install
   npm start
   
   # OR simple static file serving:
   python -m http.server 8000 --directory public
   ```

   The `start.sh` script provides:
   - Automatic dependency installation
   - Health checks and system validation
   - Both backend and frontend servers
   - Comprehensive startup logging
   - Graceful shutdown handling

3. **Configure OpenAI (Optional)**:
   - Go to Settings tab
   - Enter your OpenAI API key
   - Enable auto-categorization and tagging

### First Steps

1. **Add Your First Prompt**:
   - Click "➕ Add Prompt" or press `Cmd+N`
   - Paste your prompt and click "🤖 Auto-Categorize & Save"

2. **Organize Your Collection**:
   - Create custom folders for different projects
   - Add tags and ratings to your prompts
   - Use favorites for frequently accessed prompts

3. **Explore Features**:
   - Try the search functionality
   - View analytics to see your usage patterns
   - Export your data for backup

## ⌨️ Keyboard Shortcuts

### Navigation
| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + 1/2/3` | Switch between views |
| `Cmd/Ctrl + F` | Focus search |
| `↑↓←→` | Navigate prompts |
| `Escape` | Clear selection/close modals |

### Actions
| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + N` | Add new prompt |
| `Cmd/Ctrl + D` | Duplicate selected |
| `Cmd/Ctrl + S` | Export data |
| `Delete` | Delete selected |

### Selection & Bulk Operations
| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + A` | Select all prompts |
| `Cmd/Ctrl + B` | Toggle bulk mode |
| `Shift + Click` | Range select |
| `Cmd/Ctrl + G` | Toggle view mode |

### Help
| Shortcut | Action |
|----------|--------|
| `?` | Show keyboard shortcuts |

## 🗂️ Project Structure

```
nlp-prompt-database/
├── public/                 # Frontend files
│   ├── index.html         # Main application
│   ├── app.js            # Core application logic
│   └── styles.css        # Modern UI styles
├── src/                   # Core modules
│   ├── database.js       # Local JSON database
│   └── openai-integration.js # AI categorization
├── data/                  # Data storage
│   └── prompts.json      # Local database file
├── docs/                  # Documentation
├── .env.sample           # Environment configuration
├── package.json          # Project configuration
└── README.md             # This file
```

## 🔧 Configuration

### Environment Variables (Optional)

Copy `.env.sample` to `.env` and customize:

```env
# OpenAI API Key for AI features
OPENAI_API_KEY=sk-your-key-here

# App Configuration
AUTO_CATEGORIZATION_ENABLED=true
AUTO_TAGS_ENABLED=true
DEFAULT_THEME=dark
```

### Categories

The system comes with 10 pre-configured categories:

- **Code**: Programming, debugging, algorithms
- **Cognitive**: Problem-solving, decision making
- **Jailbreak**: AI limitation bypassing techniques
- **Dev**: Development tools, workflows
- **Writing**: Content creation, editing
- **Business**: Marketing, strategy, operations
- **General**: Everyday questions, basic info
- **Creative**: Art, design, brainstorming
- **Analysis**: Data analysis, evaluation
- **Research**: Academic research, investigations

## 📊 Data Format

Prompts are stored in JSON format:

```json
{
  "id": "prompt_1699123456789_abc123",
  "text": "Your prompt text here",
  "category": "Code",
  "tags": ["javascript", "react", "debugging"],
  "folder": "Default",
  "rating": 4,
  "createdAt": "2023-11-04T12:30:45.789Z",
  "updatedAt": "2023-11-04T12:30:45.789Z",
  "usage_count": 3,
  "notes": "Additional context or notes",
  "metadata": {
    "source": "manual",
    "confidence": 0.95
  }
}
```

## 🛠️ Development

### Setup Development Environment

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Format code
npm run format

# Validate data
npm run validate
```

### Adding New Features

1. **Database Operations**: Extend `src/database.js`
2. **AI Features**: Modify `src/openai-integration.js`
3. **UI Components**: Update `public/app.js`
4. **Styling**: Edit `public/styles.css`

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🔒 Privacy & Security

- **Local Storage**: All data stored locally on your machine
- **No Tracking**: No analytics or data collection
- **API Keys**: OpenAI keys stored locally, never transmitted
- **Offline First**: Core functionality works without internet

## 🐛 Troubleshooting

### Common Issues

**Q: AI categorization not working**
- Verify OpenAI API key in Settings
- Check internet connection
- Ensure sufficient API credits

**Q: Data not saving**
- Check localStorage permissions in browser
- Try clearing browser cache
- Verify file permissions for local storage

**Q: Import/Export issues**
- Ensure JSON files are valid format
- Check file size limits
- Verify browser supports File API

### Getting Help

1. Check the browser console for errors
2. Verify all files are properly loaded
3. Test with a fresh browser profile
4. Create an issue on GitHub with details

## 📈 Analytics

The built-in analytics show:
- Prompts by category distribution
- Usage trends over time
- Rating distributions
- Most used tags
- Total prompts and usage stats

## 🎯 New Features (v1.0.0)

### ✅ Recently Added
- [x] **Bulk Operations**: Multi-select, bulk delete, move, and categorize
- [x] **Advanced Search**: Support for operators like `tag:code`, `rating:5`, `folder:favorites`
- [x] **Drag & Drop**: Reorder prompts with intuitive drag and drop
- [x] **Context Menus**: Right-click for quick actions
- [x] **AI Enhancement**: Auto-enhance prompts with AI suggestions
- [x] **PWA Support**: Install as Progressive Web App
- [x] **Keyboard Navigation**: Full arrow key navigation
- [x] **View Modes**: Switch between grid and list view
- [x] **Performance Monitoring**: Optional FPS and memory tracking
- [x] **Comprehensive Testing**: Automated test suite
- [x] **Advanced Keyboard Shortcuts**: Extended shortcut system

### 🚀 Future Enhancements
- [ ] Prompt templates and snippets
- [ ] Collaboration features
- [ ] Cloud sync options
- [ ] Mobile companion app
- [ ] Integration with other AI services
- [ ] Advanced prompt analytics
- [ ] Plugin system for extensions

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Built with modern web technologies
- Optimized for Apple Silicon performance
- Inspired by personal productivity needs
- Uses OpenAI GPT for intelligent categorization

---

**Made with ❤️ for MacBook Air M2 users who love organized, efficient prompt management.**