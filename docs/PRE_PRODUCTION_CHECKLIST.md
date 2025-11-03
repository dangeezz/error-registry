# Pre-Production Checklist

**Purpose:** Complete checklist to verify readiness before publishing a new version to npm.

**Last Updated:** 2025-11-03

---

## 📋 Quick Checklist Summary

- [ ] Version number updated in `package.json`
- [ ] CHANGELOG.md updated with release date and all changes
- [ ] README.md includes API documentation and simple usage example
- [ ] Code linting passes with no errors
- [ ] TypeScript compilation successful with no errors
- [ ] All tests pass
- [ ] Test coverage is acceptable
- [ ] Build artifacts generated successfully
- [ ] Package contents verified
- [ ] Performance review completed
- [ ] No console.log or debug code
- [ ] Type definitions exported correctly
- [ ] Breaking changes documented (if any)
- [ ] Git tags prepared (if needed)

---

## 1. Version & Changelog Verification

### 1.1 Version Number
- [ ] **Verify version in `package.json`**
  ```bash
  grep '"version"' package.json
  ```
  - Version should follow Semantic Versioning (MAJOR.MINOR.PATCH)
  - Check if version bump is appropriate for changes made

### 1.2 CHANGELOG.md Review
- [ ] **Release date is set correctly**
  ```bash
  grep "^## \[.*\]" CHANGELOG.md
  ```
  - Date should be in format: `YYYY-MM-DD`
  - Date should not be a placeholder (e.g., `2024-XX-XX`)

- [ ] **All changes are documented**
  - [ ] All new features listed under `### Added`
  - [ ] All breaking changes listed under `### Changed` or `### Breaking Changes`
  - [ ] All bug fixes listed under `### Fixed`
  - [ ] All deprecations listed under `### Deprecated`
  - [ ] All removals listed under `### Removed`

- [ ] **Migration guide included** (if breaking changes)
  - [ ] Clear instructions for upgrading
  - [ ] Code examples showing old vs new usage
  - [ ] Common pitfalls documented

- [ ] **Changelog format is correct**
  - Follows [Keep a Changelog](https://keepachangelog.com/) format
  - Sections are in correct order (Added, Changed, Deprecated, Removed, Fixed, Security)

---

## 2. Documentation Review

### 2.1 README.md Verification

- [ ] **Simple usage example present**
  - Located near the top (after installation)
  - Shows basic functionality
  - Can be copy-pasted and run
  - Uses realistic scenarios

- [ ] **API documentation complete**
  - [ ] All public functions documented
  - [ ] All configuration options documented
  - [ ] Type signatures included
  - [ ] Parameter descriptions provided
  - [ ] Return value descriptions provided
  - [ ] Examples for each API method

- [ ] **Examples are accurate**
  ```bash
  # Verify README examples use correct API
  grep -n "createErrorRegistry\|registerError\|handleError" README.md
  ```
  - [ ] All code examples use correct function names
  - [ ] All code examples use correct parameter names
  - [ ] All code examples are syntactically correct
  - [ ] Examples match current API (not outdated)

- [ ] **Installation instructions clear**
  - [ ] npm install command is correct
  - [ ] Package name matches `package.json`

- [ ] **Features list is current**
  - [ ] All listed features are implemented
  - [ ] No outdated features mentioned

### 2.2 EXAMPLES.md Verification (if included)
- [ ] Examples are working and tested
- [ ] Framework integrations are accurate
- [ ] All examples compile without errors

---

## 3. Code Quality Checks

### 3.1 Linting
- [ ] **Run linter and fix all errors**
  ```bash
  # If using ESLint
  npm run lint
  
  # Or check for TypeScript errors
  npm run build
  ```
  - [ ] Zero linting errors
  - [ ] Zero linting warnings (or documented acceptable warnings)
  - [ ] Code style is consistent

### 3.2 TypeScript Compilation
- [ ] **Build succeeds without errors**
  ```bash
  npm run build
  ```
  - [ ] No TypeScript compilation errors
  - [ ] No TypeScript compilation warnings (or documented)
  - [ ] All type definitions generated correctly
  - [ ] Source maps generated (if applicable)

### 3.3 Code Review Checklist
- [ ] **No debug code**
  ```bash
  # Search for debug statements
  grep -r "console.log\|debugger\|TODO\|FIXME\|XXX\|HACK" src/
  ```
  - [ ] No `console.log()` statements (except in tests)
  - [ ] No `debugger` statements
  - [ ] No `TODO` comments in production code
  - [ ] No `FIXME` comments in production code
  - [ ] No `XXX` or `HACK` comments

- [ ] **No hardcoded secrets**
  - [ ] No API keys
  - [ ] No passwords
  - [ ] No tokens

- [ ] **Error handling is appropriate**
  - [ ] Errors are properly caught and handled
  - [ ] Error messages are clear and helpful
  - [ ] Stack traces are preserved when appropriate

---

## 4. Testing

### 4.1 Test Execution
- [ ] **All tests pass**
  ```bash
  npm run test:run
  ```
  - [ ] All unit tests pass
  - [ ] All integration tests pass
  - [ ] No flaky tests
  - [ ] Test output is clean (no warnings)

### 4.2 Test Coverage
- [ ] **Coverage is acceptable**
  ```bash
  npm run test:coverage
  ```
  - [ ] Critical paths have 100% coverage
  - [ ] Overall coverage meets project standards (typically >80%)
  - [ ] Edge cases are tested
  - [ ] Error cases are tested

### 4.3 Test Quality
- [ ] **Tests are comprehensive**
  - [ ] Happy paths tested
  - [ ] Error paths tested
  - [ ] Edge cases tested
  - [ ] Type safety tested (if applicable)
  - [ ] Async behavior tested correctly

### 4.4 Manual Testing (if applicable)
- [ ] **Manual smoke tests pass**
  - [ ] Quick start example works
  - [ ] README examples work
  - [ ] Common use cases work as expected

---

## 5. Build Verification

### 5.1 Build Artifacts
- [ ] **Build generates all required files**
  ```bash
  npm run build
  ls -la dist/
  ```
  - [ ] JavaScript files generated
  - [ ] TypeScript definition files (.d.ts) generated
  - [ ] Source maps generated (if configured)
  - [ ] All exported modules present

### 5.2 Build Output Verification
- [ ] **Verify build output is correct**
  ```bash
  # Check that exports work
  node -e "const pkg = require('./dist/index.js'); console.log(Object.keys(pkg))"
  ```
  - [ ] Exports match `package.json` exports
  - [ ] Main entry point works
  - [ ] Module entry point works
  - [ ] Type definitions are accessible

### 5.3 Clean Build
- [ ] **Clean and rebuild**
  ```bash
  npm run clean
  npm run build
  ```
  - [ ] Build succeeds from clean state
  - [ ] No stale files in dist/

---

## 6. Package Verification

### 6.1 Package Contents
- [ ] **Verify what will be published**
  ```bash
  npm pack --dry-run
  ```
  - [ ] Only intended files included
  - [ ] No sensitive files included
  - [ ] No unnecessary files included
  - [ ] `files` array in `package.json` is correct

### 6.2 Package.json Verification
- [ ] **Verify package.json fields**
  ```bash
  cat package.json
  ```
  - [ ] `name` is correct
  - [ ] `version` is correct
  - [ ] `description` is accurate
  - [ ] `main`, `module`, `types` point to correct files
  - [ ] `exports` map correctly
  - [ ] `files` array includes all necessary files
  - [ ] `keywords` are relevant and accurate
  - [ ] `author` format is correct
  - [ ] `license` is specified
  - [ ] `repository` URL is correct
  - [ ] `bugs` URL is correct
  - [ ] `homepage` URL is correct
  - [ ] `engines` requirements are accurate

### 6.3 Dependency Verification
- [ ] **Check dependencies**
  ```bash
  npm ls
  ```
  - [ ] No unnecessary dependencies
  - [ ] All required dependencies listed
  - [ ] Version ranges are appropriate
  - [ ] No security vulnerabilities
  ```bash
  npm audit
  ```

---

## 7. Performance Review

### 7.1 Performance Testing
- [ ] **No obvious performance regressions**
  - [ ] Large datasets handled efficiently
  - [ ] No memory leaks
  - [ ] No unnecessary iterations
  - [ ] No blocking operations

### 7.2 Bundle Size (if applicable)
- [ ] **Check bundle size impact**
  ```bash
  # If using bundler analysis
  npm run build:analyze  # if available
  ```
  - [ ] Bundle size is reasonable
  - [ ] No unexpected large dependencies
  - [ ] Tree-shaking works correctly

### 7.3 Runtime Performance
- [ ] **Key operations are performant**
  - [ ] Error creation is fast
  - [ ] Handler lookup is efficient
  - [ ] Registry operations are O(1) or O(log n) where possible

---

## 8. Type Safety & TypeScript

### 8.1 Type Definitions
- [ ] **Type definitions are correct**
  ```bash
  # Check generated types
  cat dist/index.d.ts
  ```
  - [ ] All public APIs have type definitions
  - [ ] Types are exported correctly
  - [ ] Generic types work as expected
  - [ ] No `any` types in public API (unless intentional)

### 8.2 Type Checking
- [ ] **Strict TypeScript checking passes**
  - [ ] No `@ts-ignore` or `@ts-expect-error` in production code
  - [ ] All types are properly inferred
  - [ ] User-facing types are well-documented

---

## 9. Breaking Changes & Compatibility

### 9.1 Breaking Changes
- [ ] **Breaking changes are identified**
  - [ ] All breaking changes listed in CHANGELOG
  - [ ] Migration guide provided (if breaking changes exist)
  - [ ] Version bump is appropriate (MAJOR for breaking)

### 9.2 Backward Compatibility
- [ ] **Backward compatibility verified**
  - [ ] Existing code continues to work
  - [ ] Deprecated APIs still function (if not removed)
  - [ ] Migration path is clear

### 9.3 Node.js Compatibility
- [ ] **Engine requirements are accurate**
  ```bash
  # Test on minimum supported Node version
  nvm use 14  # or whatever minimum is
  npm test
  ```
  - [ ] Works on minimum Node.js version specified
  - [ ] Works on latest LTS Node.js version
  - [ ] `engines` field in package.json is accurate

---

## 10. Security Review

### 10.1 Dependency Security
- [ ] **No known vulnerabilities**
  ```bash
  npm audit
  npm audit fix  # if issues found
  ```
  - [ ] All dependencies are up-to-date or acceptable
  - [ ] No critical security vulnerabilities
  - [ ] No high security vulnerabilities

### 10.2 Code Security
- [ ] **No security anti-patterns**
  - [ ] No `eval()` usage
  - [ ] No dangerous file operations
  - [ ] No unsafe regex patterns
  - [ ] Input validation where appropriate

---

## 11. Git & Version Control

### 11.1 Git Status
- [ ] **All changes are committed or staged**
  ```bash
  git status
  ```
  - [ ] No uncommitted changes (or intentionally staged)
  - [ ] All production files are tracked
  - [ ] .gitignore is correct (dist/, node_modules/, etc.)

### 11.2 Git Tagging (if needed)
- [ ] **Version tag is ready**
  ```bash
  git tag -l
  ```
  - [ ] Tag matches version number (e.g., `v1.1.0`)
  - [ ] Tag message is descriptive
  - [ ] Tag points to correct commit

### 11.3 Commit Messages
- [ ] **Commit messages are clear**
  - [ ] Commits are logical and grouped
  - [ ] Messages describe changes accurately

---

## 12. Final Verification

### 12.1 Pre-publish Script
- [ ] **prepublishOnly script works**
  ```bash
  # Test prepublishOnly script manually
  npm run build && npm run test:run
  ```
  - [ ] Build runs successfully
  - [ ] Tests run successfully
  - [ ] Script fails on errors (doesn't proceed with broken code)

### 12.2 Local Package Test
- [ ] **Test package locally (optional but recommended)**
  ```bash
  npm pack
  # Extract and test in a separate directory
  mkdir ../test-package
  cd ../test-package
  npm init -y
  npm install ../error-registry/dang33zz-error-registry-1.1.0.tgz
  node -e "const pkg = require('@dang33zz/error-registry'); console.log(pkg)"
  ```

### 12.3 Final Checklist
- [ ] All above items checked
- [ ] No blockers identified
- [ ] Team review completed (if applicable)
- [ ] Ready for production release

---

## 13. Publishing Steps (After Checklist Complete)

Once all items above are verified:

1. **Create version tag** (if not already done):
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```

2. **Publish to npm**:
   ```bash
   npm publish --access public
   ```

3. **Verify publication**:
   ```bash
   npm view @dang33zz/error-registry
   ```

4. **Create GitHub release** (if applicable):
   - Link to CHANGELOG entry
   - Include release notes

---

## 🚨 Critical Blockers

**DO NOT PROCEED** if any of these are not resolved:

- ❌ TypeScript compilation errors
- ❌ Test failures
- ❌ Linting errors (in production code)
- ❌ Missing CHANGELOG entry
- ❌ Incorrect version number
- ❌ Security vulnerabilities in dependencies
- ❌ Missing API documentation in README
- ❌ Breaking changes without migration guide

---

## 📝 Notes

- **This checklist should be completed before every release**
- **Check each item systematically - don't skip steps**
- **When in doubt, err on the side of caution**
- **Keep this document updated as process evolves**

---

## Quick Command Reference

```bash
# Run full verification
npm run clean && npm run build && npm run test:run && npm run test:coverage

# Check what will be published
npm pack --dry-run

# Security audit
npm audit

# Verify package structure
cat package.json
ls -la dist/

# Check for debug code
grep -r "console.log\|debugger\|TODO" src/

# View changelog
cat CHANGELOG.md | head -20
```

---

**Status:** ⬜ Not Started | 🟡 In Progress | ✅ Complete | ❌ Blocked

**Last Verified:** _______________

**Verified By:** _______________

