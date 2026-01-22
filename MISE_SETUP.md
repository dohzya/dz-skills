# mise Installation Guide

This guide explains how to install `md` and `wl` using mise with the ubi backend.

## What is ubi?

ubi (Universal Binary Installer) is a mise backend that automatically downloads
pre-compiled binaries from GitHub Releases, detecting the correct platform and
architecture automatically.

## Prerequisites

- [mise](https://mise.jdx.dev/) installed
- GitHub releases with properly named binaries (already set up for dz-skills)

## Installation

### Method 1: Global Configuration

Add to your global mise config (`~/.config/mise/config.toml`):

```toml
[tools]
# Install md (markdown-surgeon)
"ubi:dohzya/dz-skills" = { exe = "md", matching = "md-*" }

# Install wl (worklog)
"ubi:dohzya/dz-skills#wl" = { exe = "wl", matching = "wl-*" }
```

Then install:

```bash
mise install
```

### Method 2: Project-Local Configuration

Add to your project's `.mise.toml`:

```toml
[tools]
"ubi:dohzya/dz-skills" = { exe = "md", matching = "md-*" }
"ubi:dohzya/dz-skills#wl" = { exe = "wl", matching = "wl-*" }
```

Then run:

```bash
mise install
```

### Method 3: Direct Command

Install without configuration file:

```bash
# Install md
mise use -g "ubi:dohzya/dz-skills@md-v0.4.0"

# Install wl
mise use -g "ubi:dohzya/dz-skills#wl@wl-v0.4.0"
```

## How It Works

The ubi backend:

1. Looks at GitHub releases for `dohzya/dz-skills`
2. Finds releases matching the pattern (`md-*` or `wl-*`)
3. Downloads the binary for your platform (e.g., `md-darwin-arm64` on macOS ARM)
4. Installs it as `md` or `wl` in your mise bin directory
5. Makes it available in your PATH

## Version Pinning

Pin to specific versions:

```toml
[tools]
# Pin md to v0.4.0
"ubi:dohzya/dz-skills" = { version = "md-v0.4.0", exe = "md", matching = "md-*" }

# Pin wl to v0.4.0
"ubi:dohzya/dz-skills#wl" = { version = "wl-v0.4.0", exe = "wl", matching = "wl-*" }
```

Without version pinning, mise uses the latest release matching the pattern.

## Updating

Update to latest versions:

```bash
mise upgrade
```

Or update specific tools:

```bash
mise upgrade md
mise upgrade wl
```

## Troubleshooting

### Binary not found

Check that releases exist with the expected naming pattern:
- md releases: `md-v*` tags with assets like `md-darwin-arm64`, `md-linux-x86_64`
- wl releases: `wl-v*` tags with assets like `wl-darwin-arm64`, `wl-linux-x86_64`

### Wrong version installed

Check which version is active:

```bash
mise current md
mise current wl
```

List available versions:

```bash
mise ls-remote "ubi:dohzya/dz-skills"
```

### Permission denied

Make sure binaries are executable (mise should handle this automatically).
If needed, manually fix:

```bash
chmod +x ~/.local/share/mise/installs/ubi-dohzya-dz-skills/*/bin/md
chmod +x ~/.local/share/mise/installs/ubi-dohzya-dz-skills-wl/*/bin/wl
```

## Uninstalling

Remove from configuration and uninstall:

```bash
mise uninstall md
mise uninstall wl
```
