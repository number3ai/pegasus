# Quick Start Guide

This guide helps you get started with the Pegasus EKS infrastructure project, including security and quality tools.

## 🚀 Getting Started

### 1. Prerequisites

Install the required tools:

```bash
# Node.js (v18 or higher)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Pulumi CLI
curl -fsSL https://get.pulumi.com | sh

# AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Trivy (Security Scanner)
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin v0.48.0
```

### 2. Setup Project

```bash
# Clone the repository
git clone https://github.com/number3ai/pegasus.git
cd pegasus/aws/eks

# Install dependencies
npm install

# Setup Git hooks
npm run prepare
```

### 3. Configure Environment

```bash
# Set environment variables
export AWS_ACCESS_KEY_ID="your-aws-access-key"
export AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
export AWS_REGION="us-east-1"
export GITHUB_TOKEN="your-github-token"

# Initialize Pulumi stack
pulumi stack init dev
pulumi config set aws:region us-east-1
pulumi config set github:token $GITHUB_TOKEN --secret
```

## 🔒 Security Tools

### Quick Security Check

```bash
# Run all security checks
npm run security:check

# Run individual checks
npm run security:audit        # npm audit
npm run security:trivy        # Trivy filesystem scan
npm run security:trivy:ci     # CI-friendly Trivy scan
```

### What Each Tool Does

- **npm audit**: Checks for known vulnerabilities in npm dependencies
- **Trivy**: Scans for vulnerabilities, misconfigurations, and secrets in code
- **Security check**: Combines both tools for comprehensive security scanning

## 🛠️ Quality Tools

### Quick Quality Check

```bash
# Run all quality checks
npm run quality:check

# Run individual checks
npm run lint                  # ESLint
npm run format:check          # Prettier formatting check
npm run validate              # TypeScript validation
```

### Auto-fix Issues

```bash
# Fix linting issues
npm run lint:fix

# Fix formatting issues
npm run format

# Fix both
npm run quality:fix
```

## 📦 Dependency Management

### Check and Update Dependencies

```bash
# Check for outdated packages
npm run deps:check

# Update packages within version constraints
npm run deps:update

# Update to latest major versions (use with caution)
npm run deps:update:major

# Clean unused dependencies
npm run deps:clean
```

## 🔄 Git Hooks

The project uses Git hooks to automatically run checks:

- **Pre-commit**: Runs linting, formatting, and security audit
- **Pre-push**: Runs comprehensive security and quality checks

### Manual Hook Execution

```bash
# Run pre-commit checks manually
npm run precommit

# Run all CI checks
npm run ci:full
```

## 🚀 Development Workflow

### 1. Start Development

```bash
# Make changes to your code
# ...

# Stage your changes
git add .

# Commit (hooks will run automatically)
git commit -m "Your commit message"
```

### 2. Push Changes

```bash
# Push to remote (hooks will run automatically)
git push origin main
```

### 3. Continuous Integration

The GitHub Actions workflow will automatically run:
- Security scanning with Trivy
- Code quality checks with ESLint
- Dependency management checks
- Build and test validation

## 🐛 Troubleshooting

### Common Issues

#### 1. ESLint Errors
```bash
# Auto-fix ESLint issues
npm run lint:fix

# Check specific files
npx eslint src/your-file.ts
```

#### 2. TypeScript Errors
```bash
# Check TypeScript compilation
npm run validate

# Build the project
npm run build
```

#### 3. Security Issues
```bash
# Check for specific vulnerabilities
npm audit

# Fix automatically fixable issues
npm run security:audit:fix
```

#### 4. Trivy Issues
```bash
# Run Trivy with verbose output
trivy fs --security-checks vuln,config,secret --debug .

# Ignore specific issues (add to .trivyignore)
echo "CVE-2021-12345" >> .trivyignore
```

### Getting Help

1. **Check the logs**: Look at the detailed output from failed commands
2. **Review documentation**: See `SECURITY.md` for detailed information
3. **GitHub Issues**: Create an issue for bugs or feature requests
4. **Security Issues**: Use the security label for security-related issues

## 📋 Daily Workflow

### Morning Routine
```bash
# Pull latest changes
git pull origin main

# Check for dependency updates
npm run deps:check

# Run security checks
npm run security:check
```

### Before Committing
```bash
# Run quality checks
npm run quality:check

# Fix any issues
npm run quality:fix

# Run security audit
npm run security:audit
```

### Before Pushing
```bash
# Run full CI pipeline locally
npm run ci:full
```

## 🎯 Best Practices

1. **Always run security checks** before committing
2. **Keep dependencies updated** regularly
3. **Use meaningful commit messages**
4. **Review security reports** from CI/CD
5. **Report security issues** immediately
6. **Follow the coding standards** enforced by ESLint

## 📚 Additional Resources

- [Security Documentation](SECURITY.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Pulumi Documentation](https://www.pulumi.com/docs/)
- [Trivy Documentation](https://trivy.dev/docs/)
- [ESLint Rules](https://eslint.org/docs/rules/) 