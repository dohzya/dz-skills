#!/usr/bin/env bash
set -euo pipefail

# Script to bump version for wl or md
# Usage: ./bump-version.sh <tool> <new-version>
#
# Example: ./bump-version.sh wl 0.4.3

TOOL="${1:-}"
NEW_VERSION="${2:-}"

if [[ -z "$TOOL" ]] || [[ -z "$NEW_VERSION" ]]; then
  echo "Usage: $0 <tool> <new-version>"
  echo "Example: $0 wl 0.4.3"
  exit 1
fi

if [[ "$TOOL" != "wl" ]] && [[ "$TOOL" != "md" ]]; then
  echo "Error: tool must be 'wl' or 'md'"
  exit 1
fi

# Validate version format (basic check)
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: version must be in format X.Y.Z (e.g., 0.4.3)"
  exit 1
fi

echo "Bumping $TOOL to version $NEW_VERSION..."
echo ""

# Get current version from deno.json
CURRENT_VERSION=$(grep '"version":' packages/tools/deno.json | sed 's/.*"version": "\(.*\)".*/\1/')
echo "Current version in deno.json: $CURRENT_VERSION"

# Files to update
echo ""
echo "Files to update:"
echo "  - packages/tools/deno.json"

if [[ "$TOOL" == "wl" ]]; then
  echo "  - packages/tools/worklog/cli.ts (VERSION constant)"
  echo "  - plugins/tools/skills/worklog/wl (import)"
  echo "  - homebrew/Formula/wl.rb (version + URLs)"
  echo "  - CLI_SETUP.md (mise examples)"
  echo "  - MISE_SETUP.md (mise examples)"
  echo "  - plugins/tools/.claude-plugin/plugin.json"
else
  echo "  - packages/tools/markdown-surgeon/cli.ts (VERSION constant)"
  echo "  - plugins/tools/skills/markdown-surgeon/md (import)"
  echo "  - homebrew/Formula/md.rb (version + URLs)"
  echo "  - CLI_SETUP.md (mise examples)"
  echo "  - MISE_SETUP.md (mise examples)"
fi

echo ""
read -p "Continue with version bump? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

# Update deno.json
echo ""
echo "Updating packages/tools/deno.json..."
sed -i.bak "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" packages/tools/deno.json
rm packages/tools/deno.json.bak

if [[ "$TOOL" == "wl" ]]; then
  # Update VERSION constant in cli.ts
  echo "Updating packages/tools/worklog/cli.ts VERSION constant..."
  sed -i.bak "s/const VERSION = \".*\";/const VERSION = \"$NEW_VERSION\";/" packages/tools/worklog/cli.ts
  rm packages/tools/worklog/cli.ts.bak

  # Update wl script import
  echo "Updating plugins/tools/skills/worklog/wl import..."
  sed -i.bak "s/@dohzya\/tools@[0-9.]*\/worklog/@dohzya\/tools@$NEW_VERSION\/worklog/" plugins/tools/skills/worklog/wl
  rm plugins/tools/skills/worklog/wl.bak

  # Update homebrew formula version
  echo "Updating homebrew/Formula/wl.rb version..."
  sed -i.bak "s/version \".*\"/version \"$NEW_VERSION\"/" homebrew/Formula/wl.rb

  # Update homebrew formula URLs
  echo "Updating homebrew/Formula/wl.rb URLs..."
  sed -i.bak "s/wl-v[0-9.]*/wl-v$NEW_VERSION/g" homebrew/Formula/wl.rb
  rm homebrew/Formula/wl.rb.bak

  # Update CLI_SETUP.md
  echo "Updating CLI_SETUP.md..."
  sed -i.bak "s/wl-v[0-9.]*/wl-v$NEW_VERSION/g" CLI_SETUP.md
  rm CLI_SETUP.md.bak

  # Update MISE_SETUP.md
  echo "Updating MISE_SETUP.md..."
  sed -i.bak "s/wl-v[0-9.]*/wl-v$NEW_VERSION/g" MISE_SETUP.md
  rm MISE_SETUP.md.bak
else
  # Update VERSION constant in cli.ts
  echo "Updating packages/tools/markdown-surgeon/cli.ts VERSION constant..."
  sed -i.bak "s/const VERSION = \".*\";/const VERSION = \"$NEW_VERSION\";/" packages/tools/markdown-surgeon/cli.ts
  rm packages/tools/markdown-surgeon/cli.ts.bak

  # Update md script import
  echo "Updating plugins/tools/skills/markdown-surgeon/md import..."
  sed -i.bak "s/@dohzya\/tools@[0-9.]*\/markdown-surgeon/@dohzya\/tools@$NEW_VERSION\/markdown-surgeon/" plugins/tools/skills/markdown-surgeon/md
  rm plugins/tools/skills/markdown-surgeon/md.bak

  # Update homebrew formula version
  echo "Updating homebrew/Formula/md.rb version..."
  sed -i.bak "s/version \".*\"/version \"$NEW_VERSION\"/" homebrew/Formula/md.rb

  # Update homebrew formula URLs
  echo "Updating homebrew/Formula/md.rb URLs..."
  sed -i.bak "s/md-v[0-9.]*/md-v$NEW_VERSION/g" homebrew/Formula/md.rb
  rm homebrew/Formula/md.rb.bak

  # Update CLI_SETUP.md
  echo "Updating CLI_SETUP.md..."
  sed -i.bak "s/md-v[0-9.]*/md-v$NEW_VERSION/g" CLI_SETUP.md
  rm CLI_SETUP.md.bak

  # Update MISE_SETUP.md
  echo "Updating MISE_SETUP.md..."
  sed -i.bak "s/md-v[0-9.]*/md-v$NEW_VERSION/g" MISE_SETUP.md
  rm MISE_SETUP.md.bak
fi

# Update plugin.json
echo "Updating plugins/tools/.claude-plugin/plugin.json..."
sed -i.bak "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" plugins/tools/.claude-plugin/plugin.json
rm plugins/tools/.claude-plugin/plugin.json.bak

echo ""
echo "✅ Version bumped to $NEW_VERSION"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Commit changes: git add -A && git commit -m 'chore($TOOL): bump to v$NEW_VERSION'"
echo "  3. Publish to JSR: cd packages/tools && deno publish"
echo "  4. Build binaries: ./build.sh $NEW_VERSION"
echo "  5. Update homebrew formula checksums (see RELEASE.md)"
echo "  6. Push commit: git push origin main"
echo "  7. Create and push tag: git tag $TOOL-v$NEW_VERSION && git push origin $TOOL-v$NEW_VERSION"
echo "  8. Wait for GitHub Actions to create release"
echo "  9. Update homebrew tap: ./update-homebrew-tap.sh $TOOL $NEW_VERSION"
echo ""
