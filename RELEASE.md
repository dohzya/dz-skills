# Release Process

This document describes how to create new releases for `md` and `wl` CLI tools.

## Prerequisites

1. Code is tested and ready for release
2. All tests pass: `task test`
3. You have JSR publish access

## Quick Release (Using Scripts)

The fastest way to create a release is using the provided automation scripts:

```bash
# 1. Bump version in all files
task bump TOOL=wl VERSION=0.4.3

# 2. Review changes
git diff

# 3. Commit
git add -A
git commit -m "chore(wl): bump to v0.4.3"

# 4. Publish to JSR (CRITICAL: do this BEFORE building binaries!)
cd packages/tools
deno publish
cd ../..

# 5. Build binaries (will download from JSR)
task build VERSION=0.4.3

# 6. Test binary version
./dist/wl-darwin-arm64 --version  # Should output: 0.4.3

# 7. Push commit and tag
git push origin main
git tag wl-v0.4.3
git push origin wl-v0.4.3

# 8. Wait for GitHub Actions to create release (~2-3 minutes)
#    Watch: https://github.com/dohzya/tools/actions

# 9. Update homebrew tap (downloads binaries and calculates checksums)
task update-tap TOOL=wl VERSION=0.4.3
```

Done! Users can now `brew update && brew upgrade wl`.

## Manual Release Process

If you need to do it manually, follow these steps carefully.

### Step 1: Version Bump

Update version in ALL of these files (or use `./scripts/bump-version.sh`):

For `wl`:
- [ ] `packages/tools/deno.json` - version field
- [ ] `packages/tools/worklog/cli.ts` - VERSION constant (line ~34)
- [ ] `plugins/tools/skills/worklog/wl` - import path with version
- [ ] `homebrew/Formula/wl.rb` - version + all release URLs
- [ ] `CLI_SETUP.md` - mise examples
- [ ] `MISE_SETUP.md` - mise examples
- [ ] `plugins/tools/.claude-plugin/plugin.json` - version field

For `md`:
- [ ] `packages/tools/deno.json` - version field
- [ ] `packages/tools/markdown-surgeon/cli.ts` - VERSION constant (line ~34)
- [ ] `plugins/tools/skills/markdown-surgeon/md` - import path with version
- [ ] `homebrew/Formula/md.rb` - version + all release URLs
- [ ] `CLI_SETUP.md` - mise examples
- [ ] `MISE_SETUP.md` - mise examples
- [ ] `plugins/tools/.claude-plugin/plugin.json` - version field

**Critical Notes:**
- The VERSION constant in cli.ts MUST match deno.json version
- JSR does NOT allow republishing the same version - if you mess up, bump version again

### Step 2: Commit Changes

```bash
git add -A
git commit -m "chore(wl): bump to v0.4.3"
```

**DO NOT push yet!** Publish to JSR first.

### Step 3: Publish to JSR

**CRITICAL: You MUST publish to JSR BEFORE building binaries!**

The build process downloads code from JSR, so the version must exist there first.

```bash
cd packages/tools
deno publish
cd ../..
```

If this fails:
- Check you have JSR access
- Verify deno.json version is correct
- Remember: you cannot republish the same version

### Step 4: Build Binaries

Now that JSR has the new version, build binaries:

```bash
task build VERSION=0.4.3
```

This will:
1. Download the code from `jsr:@dohzya/tools@0.4.3`
2. Compile for all platforms (macOS, Linux, Windows)
3. Place binaries in `dist/`

### Step 5: Verify Binary Version

**Critical check before releasing:**

```bash
./dist/wl-darwin-arm64 --version
```

Should output: `0.4.3`

If it shows the wrong version, you published to JSR without updating the VERSION constant. You'll need to bump version and republish.

### Step 6: Calculate Checksums

```bash
shasum -a 256 dist/wl-darwin-arm64 dist/wl-darwin-x86_64 dist/wl-linux-arm64 dist/wl-linux-x86_64
```

Update `homebrew/Formula/wl.rb` with the new SHA256 checksums.

### Step 7: Amend Commit

```bash
git add homebrew/Formula/wl.rb
git commit --amend --no-edit
```

### Step 8: Push and Tag

```bash
git push origin main
git tag wl-v0.4.3
git push origin wl-v0.4.3
```

### Step 9: GitHub Actions

The release workflow (`.github/workflows/release.yml`) will automatically:

1. Detect the tag `wl-v0.4.3`
2. Extract tool name (`wl`) and version (`0.4.3`)
3. Compile binaries for all platforms from JSR
4. Create a GitHub Release with binaries as assets

Monitor: https://github.com/dohzya/tools/actions

### Step 10: Update Homebrew Tap

After GitHub Actions completes:

```bash
task update-tap TOOL=wl VERSION=0.4.3
```

Or manually:

```bash
# 1. Clone tap if not done
cd ~/bin/share
git clone https://github.com/dohzya/homebrew-tools.git  # if not done

# 2. Copy updated formula
cp tools/homebrew/Formula/wl.rb homebrew-tools/Formula/wl.rb

# 3. Commit and push
cd homebrew-tools
git add Formula/wl.rb
git commit -m "chore(wl): bump to v0.4.3"
git push origin main
```

### Step 11: Verify Installation

```bash
brew update
brew upgrade wl
wl --version  # Should output: 0.4.3
```

## Order of Operations (CRITICAL!)

This is the EXACT order you must follow:

1. ✅ Update all version files
2. ✅ Commit (but don't push yet)
3. ✅ **Publish to JSR** ← MUST be before build!
4. ✅ Build binaries (downloads from JSR)
5. ✅ Verify binary version output
6. ✅ Calculate checksums
7. ✅ Update homebrew formula checksums
8. ✅ Amend commit with updated checksums
9. ✅ Push commit
10. ✅ Create and push tag
11. ✅ Wait for GitHub Actions
12. ✅ Update homebrew tap

**If you skip step 3 or do it after step 4, the binaries will have the wrong version!**

## Common Pitfalls

### ❌ Publishing to JSR after building binaries

The binaries will download the old version from JSR and have the wrong version number.

**Fix:** Bump version again (e.g., 0.4.3 → 0.4.4), publish to JSR first, then rebuild.

### ❌ Forgetting to update VERSION constant in cli.ts

The binary will run but `--version` will show the wrong version.

**Fix:** Same as above - bump version, update ALL files, republish.

### ❌ Trying to republish the same version to JSR

JSR will reject it with an error.

**Fix:** Bump version number and try again. You cannot reuse version numbers.

### ❌ Not updating homebrew formula checksums

Users will get a checksum mismatch error when installing.

**Fix:** Download the binaries from GitHub release and recalculate checksums, then update the tap.

### ❌ Forgetting to update the homebrew tap

Users won't see the new version when running `brew upgrade`.

**Fix:** Run `./scripts/update-homebrew-tap.sh` or manually copy the formula and push.

## Troubleshooting

### Build fails with "package not found"

The version doesn't exist on JSR yet. Publish to JSR first.

### Binary shows wrong version

You built before publishing to JSR, or you forgot to update the VERSION constant. Bump version and start over.

### Homebrew install fails with checksum error

Checksums in `homebrew/Formula/*.rb` don't match the actual binaries. Recalculate and update.

### GitHub Actions fails

Check the workflow logs. Usually it's because:
- Tag format is wrong (must be `<tool>-v<version>`)
- JSR version doesn't exist
- Permissions issue

## Testing Before Release

Always test locally before creating a release:

```bash
# 1. Build locally
task build VERSION=0.4.3

# 2. Test the binary
./dist/wl-darwin-arm64 --version
./dist/wl-darwin-arm64 list

# 3. Test homebrew formula
brew install --build-from-source homebrew/Formula/wl.rb
brew audit --strict homebrew/Formula/wl.rb
```

## Version Strategy

- **Patch version (0.4.X)**: Bug fixes, documentation updates
- **Minor version (0.X.0)**: New features, non-breaking changes
- **Major version (X.0.0)**: Breaking changes (not yet used)

## Rollback

If you need to rollback a release:

```bash
# Delete the tag
git tag -d wl-v0.4.3
git push origin :refs/tags/wl-v0.4.3

# Delete the GitHub release
gh release delete wl-v0.4.3

# Revert the version bump
git revert HEAD
git push origin main
```

Note: You cannot unpublish from JSR. The version will remain there.
