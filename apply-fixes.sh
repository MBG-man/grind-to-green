#!/usr/bin/env bash
# Run from the root of the grind-to-green repo (copy this script and technical-fixes.patch there first).
set -e
git apply technical-fixes.patch      # build.js redirect fix, .gitignore entry, removes stray "witch main"
git rm -r -q --cached dist           # stop tracking generated output (incl. the stale dist/c/ page)
rm -rf dist                          # remove old local copy so the rebuild is clean
node build.js                        # confirm the clean build works
git add .gitignore build.js "witch main"
git commit -m "Fix legacy ?slug= redirects, stop tracking generated dist/, remove stray file"
echo "Done. Push to deploy."
