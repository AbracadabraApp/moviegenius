# MovieGenius Development Setup

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

Use conventional commits:

```bash
# Good examples
git commit -m "feat(genius): Add 1200+ word episode generation"
git commit -m "fix(api): Resolve parsing issue in series-episode"
git commit -m "refactor(prompts): Extract modular prompt system"

# Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build
```

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
