# Homebrew Tap Setup Guide

This guide explains how to create and publish the Homebrew tap for `md` and `wl`.

## Prerequisites

- GitHub account with access to create repos under `dohzya`
- Homebrew installed (for testing)

## Step 1: Create the Tap Repository

1. Go to https://github.com/new
2. Repository name: `homebrew-dz-tools`
3. Description: "Homebrew formulas for dz-skills CLI tools (md, wl)"
4. Public repository
5. Click "Create repository"

## Step 2: Initialize and Push Formulas

```bash
# Clone the new empty repo
git clone https://github.com/dohzya/homebrew-dz-tools.git
cd homebrew-dz-tools

# Create Formula directory
mkdir -p Formula

# Copy formulas from dz-skills
cp /path/to/dz-skills/homebrew/Formula/*.rb Formula/

# Add and commit
git add Formula/
git commit -m "Initial commit: add md and wl formulas for v0.4.0"

# Push to GitHub
git push origin main
```

## Step 3: Test Installation

Once the tap is published, test it:

```bash
# Add the tap
brew tap dohzya/dz-tools

# Install md
brew install dohzya/dz-tools/md

# Test it works
md --help

# Install wl
brew install dohzya/dz-tools/wl

# Test it works
wl --help
```

## Step 4: Update README

Add installation instructions to the tap's README.md:

```markdown
# Homebrew Tap for dz-skills

Homebrew formulas for `md` (markdown-surgeon) and `wl` (worklog) CLI tools.

## Installation

```bash
brew tap dohzya/dz-tools
brew install md
brew install wl
```

## Tools

- **md** - Markdown surgeon for surgical file manipulation
- **wl** - Worklog for tracking development progress

See the [main repository](https://github.com/dohzya/dz-skills) for documentation.
```

## Future Updates

When releasing new versions:

1. Update version and URLs in formulas
2. Download new binaries from GitHub releases
3. Calculate new SHA256 checksums: `shasum -a 256 <binary>`
4. Update SHA256 values in formulas
5. Commit and push to tap repository

## Troubleshooting

### Formula fails to install

Check SHA256 checksums match the actual binaries:
```bash
curl -LO https://github.com/dohzya/dz-skills/releases/download/md-v0.4.0/md-darwin-arm64
shasum -a 256 md-darwin-arm64
```

### Testing formula locally

```bash
# Audit formula
brew audit --strict Formula/md.rb

# Test installation
brew install --build-from-source Formula/md.rb

# Run tests
brew test md
```
