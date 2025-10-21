# Contributing to NLP Prompt Database

Thank you for your interest in contributing! This guide will help you get started.

## 🚀 Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm 8.x or higher
- Git
- A code editor (VS Code recommended)

### Setup Development Environment

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/nlp-prompt-base.git
   cd nlp-prompt-base
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Run tests**
   ```bash
   npm test
   ```

## 📝 Development Workflow

### Making Changes

1. **Make your changes** in the appropriate files:
   - **Backend**: `src/` directory, `server.js`
   - **Frontend**: `public/` directory
   - **Tests**: `tests/` directory
   - **Documentation**: `*.md` files

2. **Test your changes**
   ```bash
   npm test
   npm run build
   ```

3. **Format your code**
   ```bash
   npm run format
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: Add your feature description"
   ```

### Commit Message Format

Follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:
```
feat: Add bulk export functionality
fix: Resolve search highlighting issue
docs: Update deployment instructions
test: Add tests for OpenAI integration
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Writing Tests

Add tests to the `tests/` directory:

```javascript
runner.addTest('Your Test Name', () => {
    // Your test code
    assert(condition, 'Error message');
}, 'Category');
```

### Test Categories

- **File Structure**: File and directory existence
- **Configuration**: Package.json and config validation
- **HTML Validation**: HTML structure and elements
- **CSS Validation**: CSS styles and responsive design
- **JavaScript Validation**: JS functionality and structure
- **PWA**: Progressive Web App features
- **Database**: Database operations and structure

## 🏗️ Project Structure

```
nlp-prompt-base/
├── .github/
│   └── workflows/        # CI/CD workflows
├── backups/              # Backup files
├── data/                 # Data storage
│   └── prompts.json      # Main database
├── public/               # Frontend files
│   ├── app.js            # Main application
│   ├── database.js       # Frontend database layer
│   ├── index.html        # Main HTML
│   ├── styles.css        # Styles
│   ├── sw.js             # Service worker
│   ├── openai-integration.js  # Frontend OpenAI
│   ├── manifest.json     # PWA manifest
│   └── vendor/           # Third-party libraries
├── src/                  # Backend source
│   ├── config/           # Configuration
│   ├── middleware/       # Express middleware
│   ├── utils/            # Utility functions
│   ├── database.js       # Backend database
│   └── openai-integration.js  # Backend OpenAI
├── tests/                # Test files
├── server.js             # Express server
├── package.json          # Dependencies
├── vercel.json           # Vercel config
└── README.md             # Documentation
```

## 🎯 Areas for Contribution

### High Priority

- [ ] Additional database backends (MongoDB, PostgreSQL)
- [ ] Enhanced search algorithms
- [ ] Prompt templates system
- [ ] Collaboration features
- [ ] Mobile responsive improvements

### Medium Priority

- [ ] Additional AI provider integrations (Anthropic, Cohere)
- [ ] Export to more formats (Markdown, PDF)
- [ ] Keyboard shortcut customization
- [ ] Theme customization
- [ ] Performance optimizations

### Documentation

- [ ] More code examples
- [ ] Video tutorials
- [ ] API documentation
- [ ] Translation to other languages
- [ ] Use case examples

## 🐛 Reporting Bugs

### Before Submitting

1. Check existing issues
2. Try to reproduce on the latest version
3. Check the troubleshooting guide in README.md

### Submitting a Bug Report

Include:
- **Description**: Clear description of the issue
- **Steps to Reproduce**: How to reproduce the bug
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: Browser, OS, Node.js version
- **Screenshots**: If applicable
- **Console Errors**: Any error messages

## 💡 Suggesting Features

### Before Submitting

1. Check existing feature requests
2. Consider if it fits the project scope
3. Think about implementation

### Feature Request Template

```markdown
## Feature Description
Brief description of the feature

## Problem It Solves
What problem does this solve?

## Proposed Solution
How should it work?

## Alternatives Considered
What other approaches did you consider?

## Additional Context
Screenshots, mockups, examples, etc.
```

## 📋 Pull Request Process

1. **Update Documentation**
   - Update README.md if needed
   - Add JSDoc comments to new functions
   - Update DEPLOYMENT.md for deployment changes

2. **Test Thoroughly**
   - All tests pass
   - No new console errors
   - Works in multiple browsers

3. **Submit Pull Request**
   - Clear title and description
   - Reference any related issues
   - Include screenshots for UI changes

4. **Code Review**
   - Address review feedback
   - Keep discussions focused and respectful

5. **Merge**
   - Squash commits if requested
   - Celebrate! 🎉

## 🎨 Code Style

### JavaScript

- Use ES6+ features
- Use `const` and `let` (no `var`)
- Use arrow functions where appropriate
- Add JSDoc comments for functions
- Keep functions small and focused

### CSS

- Use CSS custom properties for colors
- Mobile-first responsive design
- Use semantic class names
- Follow BEM naming convention when applicable

### HTML

- Use semantic HTML5 elements
- Include ARIA attributes for accessibility
- Keep markup clean and readable

## 🔐 Security

### Reporting Security Issues

**Do not** open public issues for security vulnerabilities.

Instead:
1. Email security concerns to [security contact]
2. Include detailed description
3. Wait for confirmation before disclosing

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## ❓ Questions?

- Open a discussion on GitHub
- Check existing documentation
- Review closed issues for similar questions

## 🙏 Thank You!

Your contributions make this project better for everyone. Thank you for taking the time to contribute!

---

**Happy Coding!** 🚀
