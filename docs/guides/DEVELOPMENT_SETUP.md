# Development Setup
*Quick setup guide for MovieGenius development*

## 🚀 Getting Started

### 1. Install Pre-commit Hooks

```bash
# Install pre-commit (one time setup)
pip install pre-commit

# Install hooks for this repo
pre-commit install

# Test the hooks work
pre-commit run --all-files
```

### 2. Verify Your Environment

```bash
# Check Node.js version
node --version  # Should be 18+

# Install dependencies
npm install

# Verify build works
npm run build

# Verify linting works
npm run lint
```

## 📋 Daily Workflow

### Before Each Commit

Your pre-commit hooks will automatically:

- ✅ Run ESLint for code quality
- ✅ Format code with Prettier
- ✅ Check for API keys in code
- ✅ Prevent console.log statements
- ✅ Validate JSON/YAML files

### Commit Message Format

MovieGenius uses **Conventional Commits** with automated enforcement via commitlint:

```
type(scope): description

[optional body]

[optional footer]
```

#### Commit Types

| Type | Description | Example |
|------|-------------|---------|
| **feat** | New feature | `feat(movies): Add new releases API with TMDB integration` |
| **fix** | Bug fix | `fix(api): Resolve parsing issue in series-episode endpoint` |
| **docs** | Documentation | `docs: Update README with new prompt architecture` |
| **style** | Code formatting | `style: Apply Prettier formatting to all files` |
| **refactor** | Code refactoring | `refactor(prompts): Extract modular prompt system` |
| **test** | Testing | `test(api): Add unit tests for movie search endpoint` |
| **chore** | Maintenance | `chore: Update dependencies and build scripts` |
| **perf** | Performance | `perf(database): Optimize movie query performance` |
| **ci** | CI/CD changes | `ci: Update GitHub Actions workflow` |
| **build** | Build system | `build: Configure webpack for production optimization` |
| **revert** | Reverting | `revert: Revert "feat: broken feature implementation"` |

#### Commit Rules

- **Subject**: 10-72 characters, sentence case, no period
- **Header**: Maximum 100 characters total
- **Body**: Optional, blank line after subject, 100 char lines
- **Footer**: Optional, for breaking changes and issue references

#### Good Examples

```bash
# Simple feature
feat(movies): Add TMDB API integration for new releases

# Bug fix with context  
fix(api): Resolve timeout issue in movie search endpoint

The search was timing out after 5 seconds due to inefficient
database queries. Optimized the query to use proper indexing.

Fixes #234

# Breaking change
feat(api): Migrate to new authentication system

BREAKING CHANGE: API now requires JWT tokens instead of API keys.
Update all client applications to use the new auth flow.

# Scoped refactor
refactor(genius): Extract episode generation to separate service

- Move prompt logic to dedicated service class
- Add proper error handling and logging
- Improve testability and maintainability

# Documentation and maintenance
docs: Update deployment guide with Railway configuration
chore: Update Node.js to v18 and refresh dependencies
style: Apply Prettier formatting to 6650+ files
```

#### Bad Examples (Will Be Rejected)

```bash
# Too vague
fix: stuff

# No description  
feat:

# Wrong tense
feat: Added new feature

# Too long
feat: this is a really long commit message that goes way over the character limit

# Wrong case
feat: ADD NEW FEATURE FOR USERS

# Ends with period
feat: Add new feature.

# Missing type
Add new feature to movies page
```

#### Common Scopes

- **api**: API endpoints and server logic
- **movies**: Movie-related features  
- **genius**: Genius page and episode system
- **search**: Search functionality
- **ui**: User interface components
- **database**: Database operations
- **build**: Build system and configuration

### Branch Strategy

```bash
# Create feature branch
git checkout -b feat/genius-episode-validation

# Work in small commits
git add .
git commit -m "feat(genius): Add word count validation"

# Push when ready
git push origin feat/genius-episode-validation

# Create PR to main
```

## 🛡️ Automated Safeguards

### Pre-commit (Local)

- Runs before each `git commit`
- Prevents bad code from entering repo
- Fast feedback loop

### GitHub Actions (Remote)

- Runs on every push/PR
- Builds project to verify it works
- Blocks PRs that break build
- Deploys to Railway automatically

### Branch Protection

Configure in GitHub Settings > Branches:

- ✅ Require PR reviews
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ Restrict pushes to main branch

## 🚨 Emergency Procedures

### Broken Build

```bash
# If you break the build:
1. git revert <bad-commit-hash>
2. Push the revert immediately
3. Fix the issue in a new branch
4. Create PR with the fix
```

### Bypassing Hooks (Emergency Only)

```bash
# Skip pre-commit hooks (use sparingly!)
git commit --no-verify -m "hotfix: Emergency production fix"
```

## 📊 Quality Metrics

The CI/CD system tracks:

- **Build Success Rate**: Should be >95%
- **Commit Message Quality**: Conventional format required
- **Code Coverage**: Tests when available
- **Security Vulnerabilities**: npm audit checks

## 🔧 Troubleshooting

### Pre-commit Hook Issues

```bash
# Update hooks
pre-commit autoupdate

# Clear cache if issues persist
pre-commit clean
pre-commit install --install-hooks
```

### ESLint Errors

```bash
# Auto-fix many issues
npm run lint -- --fix

# Check specific files
npx eslint pages/api/series-episode.js
```

### Build Failures

```bash
# Clear Next.js cache
rm -rf .next

# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check environment variables
npm run dev  # Should show any missing env vars
```
