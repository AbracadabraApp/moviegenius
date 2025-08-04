# 🤝 Contributing to MovieGenius

Thank you for your interest in contributing to MovieGenius! This guide will help you get started with contributing to our AI-powered movie discovery platform.

## 🎯 Before You Start

### Read These First
1. **[Engineering Decision Rules](testing/ENGINEERING-DECISION-RULES.md)** - Essential decision-making framework
2. **[Code Standards](getting-started/CODE-STANDARDS.md)** - Coding conventions and best practices
3. **[Development Setup](getting-started/DEVELOPMENT_SETUP.md)** - Local development environment

### Key Principles
- **User-focused development** - Every change should improve user experience
- **Evidence-based decisions** - Test in production before declaring success
- **Zero-waste architecture** - Respect existing content investment
- **Nuclear static first** - Prioritize performance through static generation

## 🚀 Getting Started

### 1. Fork and Clone
```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/moviegenius.git
cd moviegenius
```

### 2. Set Up Development Environment
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
```

### 3. Verify Setup
```bash
# Run tests to ensure everything works
npm test

# Check nuclear system status
npm run nuclear:status

# Validate code standards
npm run lint
npm run typecheck
```

## 🛠️ Development Workflow

### 1. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 2. Make Your Changes
- Follow [Code Standards](getting-started/CODE-STANDARDS.md)
- Write tests for new functionality
- Update documentation as needed
- Test locally before committing

### 3. Test Your Changes
```bash
# Run all tests
npm test

# Test nuclear static system if relevant
npm run test:nuclear

# Check code quality
npm run lint
npm run typecheck

# Test in development environment
npm run dev
```

### 4. Commit Your Changes
```bash
# Stage your changes
git add .

# Commit with clear message
git commit -m "feat: Add movie trailer integration

- Add TMDB trailer API integration
- Add trailer modal component
- Add trailer button to movie pages
- Update API documentation

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 5. Push and Create PR
```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## 📋 Contribution Types

### 🐛 Bug Fixes
- Fix broken functionality
- Resolve performance issues
- Address security vulnerabilities

**Guidelines:**
- Reference the issue number
- Include reproduction steps
- Test the fix thoroughly
- Update tests if needed

### ✨ New Features
- Add new movie discovery features
- Enhance AI analysis capabilities
- Improve user interface

**Guidelines:**
- Discuss large features in issues first
- Follow zero-waste architecture principles
- Include comprehensive tests
- Update documentation

### 🎨 UI/UX Improvements
- Enhance mobile experience
- Improve accessibility
- Refine visual design

**Guidelines:**
- Test on multiple devices
- Follow phone-frame design system
- Maintain performance standards
- Consider user workflows

### 📚 Documentation
- Improve existing documentation
- Add missing guides
- Fix documentation errors

**Guidelines:**
- Follow documentation standards
- Use consistent formatting
- Include practical examples
- Update cross-references

### ⚡ Performance Optimizations
- Improve page load times
- Enhance caching strategies
- Optimize nuclear static system

**Guidelines:**
- Measure performance before/after
- Respect nuclear static architecture
- Test with real production data
- Document performance impact

## 🧪 Testing Requirements

### Required Tests
- **Unit Tests**: For all new functions/components
- **Integration Tests**: For API endpoints
- **Nuclear Tests**: For static generation changes
- **Performance Tests**: For optimization work

### Test Commands
```bash
# Run all tests
npm test

# Run specific test types
npm run test:nuclear
npm run test:nuclear-performance
npm run test:nuclear-content

# Run tests in watch mode
npm test -- --watch
```

### Test Standards
- Tests must pass before PR approval
- Include edge cases and error scenarios
- Mock external dependencies appropriately
- Use descriptive test names

## 📊 Code Quality Standards

### ESLint Rules
- No unused variables
- Consistent code formatting
- Proper JSX fragment usage
- Error boundary implementation

### TypeScript Standards
- Proper type definitions
- No `any` types without justification
- Interface over type when appropriate
- Strict null checks

### Performance Standards
- Page load times <200ms for nuclear pages
- Bundle size optimization
- Efficient database queries
- Proper caching implementation

## 🚨 What We Don't Accept

### Automatic Rejections
- Changes that break existing functionality
- Code that doesn't follow standards
- Missing or failing tests
- Undocumented breaking changes
- Security vulnerabilities

### Discouraged Contributions
- Over-engineering simple solutions
- "Modernization" without user benefit
- Breaking changes without major version bump
- Large refactors without discussion

## 🔍 Pull Request Guidelines

### PR Title Format
```
type: Brief description

Examples:
feat: Add movie trailer integration
fix: Resolve navigation issue on mobile
docs: Update API documentation
perf: Optimize nuclear static generation
```

### PR Description Template
```markdown
## Summary
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Performance improvement
- [ ] Documentation update
- [ ] Breaking change

## Testing
- [ ] All existing tests pass
- [ ] New tests added and passing
- [ ] Tested in development environment
- [ ] Tested on mobile devices (if UI changes)

## Impact
- User experience impact: [description]
- Performance impact: [measurements]
- Breaking changes: [none/description]

## Screenshots (if applicable)

## Additional Notes
```

### Review Process
1. **Automated Checks**: All tests and linting must pass
2. **Code Review**: At least one maintainer review required
3. **Nuclear Testing**: Nuclear static system tests if relevant
4. **Production Testing**: May require testing in production

## 🏆 Recognition

### Contributor Benefits
- GitHub contributor status
- Recognition in changelog
- Credit in documentation
- Learning opportunities with advanced AI/web tech

### Hall of Fame
Outstanding contributors may be recognized in:
- Project README
- Documentation
- Social media mentions

## 🚨 Important Notes from Project History

### Learn from Past Issues
Based on project documentation, please avoid these patterns:

1. **Overconfident Solutions**: Don't declare fixes "complete" without user validation
2. **Over-engineering**: Simple problems need simple solutions
3. **Breaking Production**: Test thoroughly before deployment
4. **Ignoring User Impact**: Every change should benefit real users

### Success Patterns
1. **Evidence-based development**: Test in production, measure results
2. **User-focused metrics**: Success = users can complete their tasks
3. **Incremental improvements**: Small, tested changes over large refactors
4. **Respect existing systems**: Don't rebuild what works well

## 🆘 Getting Help

### Resources
- **Documentation**: Check [docs](./README.md) first
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions
- **Code Review**: Ask for early feedback on complex changes

### Contact Methods
- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and ideas
- **Pull Request Comments**: For code-specific discussions

### Response Times
- **Issues**: Usually responded to within 2-3 days
- **Pull Requests**: Code review within 1 week
- **Questions**: Community discussions ongoing

## 📜 Code of Conduct

### Be Respectful
- Use inclusive language
- Respect different viewpoints
- Focus on constructive feedback
- Help newcomers learn

### Be Professional  
- Keep discussions technical and relevant
- Avoid personal attacks or harassment
- Report inappropriate behavior
- Maintain project quality standards

## 🎉 Thank You!

Your contributions help make MovieGenius better for movie lovers everywhere. Whether you're fixing bugs, adding features, improving documentation, or helping other contributors, every contribution matters.

**Remember**: We value user-focused development over technical elegance. The best contribution is one that genuinely improves the movie discovery experience for real users.

---

*For technical questions about specific systems, see our [API Reference](API_REFERENCE.md) and [Architecture Documentation](architecture/)*

*Last updated: July 24, 2025*