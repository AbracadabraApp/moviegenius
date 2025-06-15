// Commit message standards for MovieGenius
// Enforces conventional commit format: type(scope): description

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce these commit types
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Code style (formatting, etc)
        'refactor', // Code refactoring
        'test',     // Adding or updating tests
        'chore',    // Maintenance tasks
        'perf',     // Performance improvements
        'ci',       // CI/CD changes
        'build',    // Build system changes
        'revert'    // Reverting changes
      ]
    ],
    
    // Subject line rules
    'subject-max-length': [2, 'always', 72],
    'subject-min-length': [2, 'always', 10],
    'subject-case': [2, 'always', 'sentence-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    
    // Header rules
    'header-max-length': [2, 'always', 100],
    
    // Body rules
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 100],
    
    // Footer rules
    'footer-leading-blank': [2, 'always'],
    
    // Scope rules (optional but helpful)
    'scope-case': [2, 'always', 'lower-case']
  }
};

/*
Examples of good commit messages:

✅ feat(genius): Add 1200+ word length validation for episodes
✅ fix(api): Resolve Sonnet parsing issue in series-episode endpoint  
✅ refactor(prompts): Extract GENIUS_CONTEXT to modular system
✅ docs: Update README with new prompt engineering architecture
✅ chore: Add pre-commit hooks for code quality

❌ Bad examples:
❌ fixed stuff
❌ WIP
❌ asdf
❌ Updated files
❌ feat: this is a really long commit message that goes way over the character limit and should be shortened
*/