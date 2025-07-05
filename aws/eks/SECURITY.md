# Security and Quality Assurance

This document outlines the security measures, quality checks, and development practices used in the Pegasus EKS infrastructure project.

## 🔒 Security Tools

### 1. Trivy Security Scanner

[Trivy](https://trivy.dev/) is a comprehensive security scanner that detects vulnerabilities, misconfigurations, and secrets in our codebase.

#### Installation
```bash
# macOS
brew install trivy

# Linux
sudo apt-get install wget apt-transport-https gnupg lsb-release
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update
sudo apt-get install trivy

# Docker
docker run -v $(pwd):/workspace aquasec/trivy fs /workspace
```

#### Available Commands
```bash
# Scan for vulnerabilities, misconfigurations, and secrets
npm run security:trivy

# CI/CD friendly scan (exits with code 1 on HIGH/CRITICAL issues)
npm run security:trivy:ci

# Scan Docker images
npm run security:trivy:docker

# Full security scan (Trivy + npm audit)
npm run security:trivy:full
```

#### What Trivy Scans
- **Vulnerabilities**: Known CVEs in dependencies and code
- **Misconfigurations**: Security misconfigurations in files
- **Secrets**: Hardcoded secrets, API keys, passwords
- **License Compliance**: Open source license compliance

### 2. npm Security Audit

npm's built-in security audit tool checks for known vulnerabilities in dependencies.

#### Available Commands
```bash
# Run security audit
npm run security:audit

# Fix automatically fixable issues
npm run security:audit:fix

# Comprehensive security check
npm run security:check
```

## 🛠️ Quality Assurance Tools

### 1. ESLint

ESLint is used for static code analysis and enforcing coding standards.

#### Configuration
- **Parser**: `@typescript-eslint/parser` for TypeScript support
- **Rules**: Comprehensive TypeScript and general JavaScript rules
- **Integration**: Works with Prettier for consistent formatting

#### Available Commands
```bash
# Lint all TypeScript files
npm run lint

# Lint and auto-fix issues
npm run lint:fix

# Quality check (lint + format + validate)
npm run quality:check

# Quality fix (lint:fix + format)
npm run quality:fix
```

#### Key Rules
- No unused variables (with underscore prefix exception)
- Explicit return types for functions
- No explicit `any` types
- Prefer const over let/var
- No console statements in production code
- Prefer template literals over string concatenation

### 2. Prettier

Prettier ensures consistent code formatting across the project.

#### Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

#### Available Commands
```bash
# Format all files
npm run format

# Check formatting without changing files
npm run format:check
```

### 3. TypeScript Compiler

TypeScript provides static type checking and compilation.

#### Available Commands
```bash
# Type check without emitting files
npm run validate

# Build the project
npm run build
```

## 🔄 Git Hooks

### Pre-commit Hook
Automatically runs before each commit:
1. **lint-staged**: Formats and lints staged files
2. **Security Audit**: Checks for dependency vulnerabilities
3. **TypeScript Validation**: Ensures type safety

### Pre-push Hook
Automatically runs before pushing code:
1. **Security Check**: Comprehensive security scanning
2. **Quality Check**: Linting and formatting validation
3. **Build**: Ensures code compiles correctly
4. **Tests**: Runs test suite

## 📦 Dependency Management

### Available Commands
```bash
# Check for outdated packages
npm run deps:check

# Update packages within version constraints
npm run deps:update

# Update to latest major versions
npm run deps:update:major

# Clean unused dependencies
npm run deps:clean

# Audit dependencies for vulnerabilities
npm run deps:audit

# Fix dependency vulnerabilities
npm run deps:fix
```

### Best Practices
1. **Regular Updates**: Run `npm run deps:check` weekly
2. **Security First**: Always run `npm run deps:audit` after updates
3. **Major Updates**: Test thoroughly after major version updates
4. **Lock File**: Commit `package-lock.json` for reproducible builds

## 🚀 CI/CD Integration

### Available CI Commands
```bash
# Security checks for CI
npm run ci:security

# Quality checks for CI
npm run ci:quality

# Build for CI
npm run ci:build

# Test for CI
npm run ci:test

# Full CI pipeline
npm run ci:full
```

### GitHub Actions Example
```yaml
name: Security and Quality Checks

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run ci:security

  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run ci:quality
      - run: npm run ci:build
```

## 🔍 Security Best Practices

### 1. Code Security
- **No Hardcoded Secrets**: Use environment variables or secrets management
- **Input Validation**: Validate all external inputs
- **Principle of Least Privilege**: Use minimal required permissions
- **Regular Updates**: Keep dependencies updated

### 2. Infrastructure Security
- **Encryption**: Enable encryption at rest and in transit
- **Network Security**: Use private subnets and security groups
- **IAM Security**: Use least privilege access with IRSA
- **Secrets Management**: Use AWS Secrets Manager for sensitive data

### 3. Development Security
- **Code Review**: All changes require code review
- **Security Scanning**: Run security scans before deployment
- **Dependency Monitoring**: Monitor for new vulnerabilities
- **Incident Response**: Have a plan for security incidents

## 📋 Security Checklist

Before deploying to production:

- [ ] All security scans pass (`npm run security:check`)
- [ ] All quality checks pass (`npm run quality:check`)
- [ ] Dependencies are up to date and secure
- [ ] No hardcoded secrets in code
- [ ] All infrastructure follows security best practices
- [ ] Access controls are properly configured
- [ ] Monitoring and alerting are in place
- [ ] Backup and recovery procedures are tested

## 🆘 Incident Response

### Security Incident Process
1. **Detection**: Automated tools detect issues
2. **Assessment**: Evaluate severity and impact
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove the threat
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Document and improve

### Contact Information
- **Security Team**: security@company.com
- **Emergency**: +1-XXX-XXX-XXXX
- **Bug Reports**: GitHub Issues with security label

## 📚 Additional Resources

- [Trivy Documentation](https://trivy.dev/docs/)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [TypeScript Security](https://www.typescriptlang.org/docs/)
- [npm Security](https://docs.npmjs.com/about-audit-reports)
- [AWS Security Best Practices](https://aws.amazon.com/security/security-learning/) 