# Mods Catalog Core (Plan A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the catalog repo core: entry and lock formats, the 10 check rules, the three GitHub workflows and the `marketplace.json` generator, so that a mod submitted by PR is checked, merged, pinned and installable with `/plugin install <name>@baselane-mods`. No website yet (that is Plan B).

**Architecture:** Pure functions in `lib/` hold every rule and transform, with their IO (git, the `claude` CLI, the file system) passed in, so unit tests use fakes. Thin scripts in `scripts/` wire real IO for CI and for maintainers. `check.yml` runs untrusted mod code with no secrets; `merge.yml` never runs PR code and re-verifies everything it trusts; `publish.yml` turns `entries/` plus `lock/` into `.claude-plugin/marketplace.json`.

**Tech Stack:** Node 22 (ES modules, `node:test`, no dependencies), git, the `claude` CLI pinned to 2.1.289, GitHub Actions, the `gh` CLI, a GitHub App for bot commits.

**Spec:** `docs/superpowers/specs/2026-10-05-mods-marketplace-design.md`

## Global Constraints

- Node 22 or later. Zero npm dependencies in this plan. Tests use `node:test` and `node:assert/strict`.
- No em-dashes in any text: code comments, messages, docs, workflow names.
- Marketplace `name`: `baselane-mods`. Owner: `{ "name": "Baselane", "url": "https://baselane.sh" }`. Gallery URL: `https://mods.baselane.sh`.
- Categories: `guard`, `pane`, `band`, `command`, `sound`, `style`, `stats`, `nudge`, `lifecycle`, `render`.
- Entry name pattern: `^[a-z0-9][a-z0-9-]{1,47}$`. Tags: 0 to 8, each `^[a-z0-9-]{2,24}$`. Screenshots: 0 to 6, `.png`, `.jpg`, `.webp` or `.gif`, 2 MB or smaller each.
- Mod folder: 10 MB or smaller, no top-level `bin/`, no symlink that points outside it.
- Only github.com sources: `git-subdir` (`url` in `owner/repo` form, plus `path`) or `github` (`repo`). `ref` is a tag and is required. Authors never set `sha`.
- `sha` values are full 40-character lowercase hex.
- Claude Code CLI in CI: `@anthropic-ai/claude-code@2.1.289` (mods need 2.1.287 or later).
- `check.yml` has `contents: read` only, no secrets, `persist-credentials: false`. No workflow ever uses `pull_request_target`.
- Every third-party action is pinned to a full commit SHA.
- Baselane's own mods use the tag `<name>--v<version>`, for example `cost-meter--v0.2.0`.
- Code style: small files, functions under 50 lines, no mutation of inputs, comments only where the reason is not obvious.

## Review Focus

1. An annotated tag (not only a lightweight one) must resolve to the commit SHA, not the tag object SHA. Test in Task 5.
2. A branch name in `source.ref` must be refused as "no tag", even when a branch with that name exists. Test in Task 5.
3. An entry file that is not a JSON object (an array, a string, a UTF-8 BOM, a trailing comma) must give a clear R2 message, not a crash. Test in Task 3.
4. A forged check report that names another PR must not cause a comment or a merge on that PR. Test in Task 9.
5. A version equal to or lower than the listed version must fail R10, including prerelease ordering (`1.0.0-beta.2` is lower than `1.0.0`). Tests in Tasks 2 and 7.

## Changes to the spec made while planning

These are recorded in the spec in Task 1 Step 6. They change no product behavior that the owner approved.

- Rule IDs are renumbered to match the order they run in: R1 Scope, R2 Entry (format and free name), R3 Owner, R4 Tag, R5 Manifest, R6 Is a mod, R7 Validate, R8 Size and shape, R9 Tests, R10 Version.
- R1 has no maintainer skip. Every maintainer change with more than one file uses the maintainer path.
- The lock file also stores the manifest fields (`description`, `author`, `license`, `homepage`, `repository`), so `publish` needs no network.
- The generated marketplace entry carries the version in `metadata.version`, not in `version`. The docs say not to set the version in both the entry and `plugin.json`.
- Entry and report formats are checked by code in `lib/`, not by JSON Schema files, to keep zero dependencies.
- `publish` skips (with a warning) an entry that has no lock yet, instead of failing. The bot merge and the lock commit are two pushes, and the first one starts `publish` before the lock exists.
- The launch catalog is 68 mods, not 61.

---

## File structure

```text
package.json                  ES module package, test script, Node 22 floor
lib/names.mjs                 name pattern, clash key, clash lookup
lib/semver.mjs                semver parse and compare
lib/entry.mjs                 entry parse and validation, source helpers, categories
lib/claude-cli.mjs            run the claude CLI, parse validate and test output
lib/shape.mjs                 size, bin/, symlink and screenshot checks
lib/git.mjs                   repo URL, tag resolution, fetch at a tag
lib/rules.mjs                 RULES list and runRules(input, io)
lib/report.mjs                PR comment rendering
lib/pr-input.mjs              build the rules input from two commits of the catalog repo
lib/lock.mjs                  makeLock
lib/merge.mjs                 validateReport, prMatchesRun, verifyForMerge
lib/marketplace.mjs           pairListings, marketplaceEntry, buildMarketplace
scripts/check-pr.mjs          CI entry for check.yml
scripts/merge-pr.mjs          CI entry for merge.yml
scripts/publish.mjs           writes .claude-plugin/marketplace.json
scripts/lock.mjs              maintainer path: run the rules and write locks
renames.json                  removed names, maintainers only
verified.json                 reviewed name and SHA pairs, maintainers only
.github/workflows/check.yml
.github/workflows/merge.yml
.github/workflows/publish.yml
.github/CODEOWNERS
.github/ISSUE_TEMPLATE/report.yml
README.md
test/helpers.mjs
test/*.test.mjs
test/fixtures/mods/no-em-dash/   copy of a real mod from the mods repo
docs/spike-github.md             findings from Task 1
```

---

### Task 1: GitHub spike (gate for the whole plan)

This task proves the three facts the design depends on. **If 1a fails, stop the plan and report to the owner** (spec Section 12, item 1).

**Operator actions needed (ask before each, they create things on GitHub):**
- Create the public repo `mohammad0omar/mods-catalog-spike`. It holds no secrets and is deleted after Task 13.
- Create a GitHub App named `baselane-mods-catalog` under the `baselane-sh` org (Settings > Developer settings > GitHub Apps > New). Permissions: Contents read and write, Pull requests read and write, Metadata read. No webhook. Install it on `mohammad0omar/mods-catalog-spike` only. Note the App ID and generate a private key.
- In the spike repo, add the variable `CATALOG_APP_ID` and the secret `CATALOG_APP_KEY` (paste the key from stdin: `gh secret set CATALOG_APP_KEY --repo mohammad0omar/mods-catalog-spike < key.pem`, then delete `key.pem`).

**Files:**
- Create (in the spike repo only): `.github/workflows/spike.yml`, `fixture/no-em-dash/` (copy of `/Users/mohammad/Desktop/baselane/mods/plugins/no-em-dash`)
- Create (in mods-catalog): `docs/spike-github.md`

**Interfaces:**
- Produces: `docs/spike-github.md` with three findings that later tasks rely on: the npm install line that works on `ubuntu-latest`, whether a ruleset bypass app can push to `main`, and the exact name of the fork PR approval setting.

- [ ] **Step 1: Resolve action SHAs**

Run:
```bash
for a in actions/checkout@v4 actions/setup-node@v4 actions/create-github-app-token@v1 actions/upload-artifact@v4 actions/download-artifact@v4; do
  repo=${a%@*}; ref=${a#*@}
  echo "$a $(gh api repos/$repo/commits/$ref --jq .sha)"
done
```
Expected: 5 lines, each with a 40-character SHA. Use these SHAs in every workflow in this plan, written as `uses: actions/checkout@<sha> # v4`.

- [ ] **Step 2: Write the spike workflow**

`.github/workflows/spike.yml` in the spike repo:

```yaml
name: spike
on: workflow_dispatch
permissions:
  contents: read
jobs:
  cli:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@<checkout-sha> # v4
        with:
          persist-credentials: false
      - uses: actions/setup-node@<setup-node-sha> # v4
        with:
          node-version: 22
      - run: npm install -g @anthropic-ai/claude-code@2.1.289
        env:
          DISABLE_AUTOUPDATER: '1'
      - run: claude --version
      - run: claude plugin validate fixture/no-em-dash
      - run: claude plugin test fixture/no-em-dash
  bypass:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - id: app
        uses: actions/create-github-app-token@<app-token-sha> # v1
        with:
          app-id: ${{ vars.CATALOG_APP_ID }}
          private-key: ${{ secrets.CATALOG_APP_KEY }}
      - uses: actions/checkout@<checkout-sha> # v4
        with:
          token: ${{ steps.app.outputs.token }}
      - run: |
          git config user.name "baselane-mods-catalog[bot]"
          git config user.email "bot@baselane.sh"
          date -u > spike-bypass.txt
          git add spike-bypass.txt
          git commit -m "Spike: bot push to main"
          git push origin HEAD:main
```

- [ ] **Step 3: Set the ruleset on the spike repo**

In the spike repo: Settings > Rules > Rulesets > New branch ruleset. Target: default branch. Rules: Require a pull request before merging (required approvals 0, require review from Code Owners on), Require status checks to pass (`check`), Block force pushes, Restrict deletions. Bypass list: the `baselane-mods-catalog` app, mode "Always". Also in Settings > Actions > General, find the fork pull request approval setting and set it to the level that holds every first-time contributor. Copy its exact label.

- [ ] **Step 4: Run and record**

Run: `gh workflow run spike.yml --repo mohammad0omar/mods-catalog-spike`, then `gh run watch --repo mohammad0omar/mods-catalog-spike --exit-status`.
Expected: job `cli` prints a version, `✔ Validation passed`, and `Ran N tests`. Job `bypass` pushes to `main`.

If `cli` fails because `claude plugin test` asks for a login or an API key: stop. Write the error in `docs/spike-github.md` and report to the owner. Do not continue the plan.

If `bypass` fails with a ruleset error: stop and report. The fallback in the advisor notes (generated files on a `release` branch) needs an owner decision.

- [ ] **Step 5: Write `docs/spike-github.md` in mods-catalog**

```markdown
# GitHub spike findings (YYYY-MM-DD)

- CLI on ubuntu-latest: <install line that worked>, claude --version <x>. validate: <pass/fail>. test: <N tests, no login needed / needed a login>.
- Ruleset bypass: the baselane-mods-catalog app <could / could not> push to main with "require PR" and "require check" on.
- Fork PR approval setting: exact label "<label>". Default on a new public repo: "<label>".
- Action SHAs: <the 5 lines from Step 1>.
```

- [ ] **Step 6: Record the planning changes in the spec**

Edit `docs/superpowers/specs/2026-10-05-mods-marketplace-design.md`:
1. Replace the R1 to R10 table in 4.1 with this one:

```markdown
| # | Rule | Fails when |
| :- | :- | :- |
| R1 | Scope | The PR changes anything other than exactly one added or changed file under `entries/`. |
| R2 | Entry | The entry is not a JSON object that follows 3.1, or, for a new entry, its name equals a listed name or a `renames` key after we lowercase it and remove `-`, `_` and `.`. |
| R3 | Owner | The entry exists in `lock/` and the PR author is not its `submitter`. To move a mod to a new owner, a maintainer changes `submitter` in the lock file in a maintainer commit. Then the author runs the check again. |
| R4 | Tag | `ref` is not a tag on the source repo, or the repo is not public. CI resolves the tag to a full SHA and fetches it. |
| R5 | Manifest | `plugin.json` is missing, its `name` differs from the entry name, or it lacks `version` (semver), `description` (200 characters or fewer), `author` or `license`. |
| R6 | Is a mod | `hooks/hooks.json` is missing. |
| R7 | Validate | `claude plugin validate` fails, or it prints no `hooks:` line. CI records the `hooks:` and `calls:` lines. |
| R8 | Size and shape | The plugin folder is over 10 MB, has a top-level `bin/`, has a symlink that points outside it, or a screenshot breaks the 3.1 rules. |
| R9 | Tests | `claude plugin test` fails, or it runs zero tests. |
| R10 | Version | For an existing entry, the `plugin.json` version is not higher (semver) than the locked version. Without a bump, users never receive the new code. |
```

2. In 3.2, add `"manifest": { "description", "author", "license", "homepage", "repository" }` to the lock example and the sentence "The manifest fields are copied from `plugin.json` at the locked SHA, so `publish` needs no network."
3. In 3.4, replace "`version`, `description`, `author`, `license`, `homepage` and `repository`, copied from `plugin.json` at the locked SHA." with "`description`, `author`, `license`, `homepage` and `repository` from the lock's `manifest`. The version goes in `metadata.version`, because the docs say not to set it in both the entry and `plugin.json`."
4. In 2, replace the two `schema/` lines with nothing, and in 4.1 replace "matches `schema/lock.schema.json`" with "matches the report format checked by `lib/merge.mjs`".
5. In 4.4, replace "`publish` lists only entries that have a lock file and fails the build if an entry has no lock." with "`publish` lists only entries that have a lock file. It skips an entry without a lock and prints a warning, because the bot merge and the lock commit are two pushes."
6. In Section 9, replace "61" with "68" (two places), and in step 2 add "Tag each mod as `<name>--v<version>`."

- [ ] **Step 7: Commit**

```bash
git -C /Users/mohammad/Desktop/baselane/mods-catalog add docs
git -C /Users/mohammad/Desktop/baselane/mods-catalog commit -m "Record the GitHub spike and the planning changes to the spec"
```

---

### Task 2: Package, names and semver

**Files:**
- Create: `package.json`, `.gitignore`, `lib/names.mjs`, `lib/semver.mjs`, `test/names.test.mjs`, `test/semver.test.mjs`

**Interfaces:**
- Produces: `NAME_PATTERN: RegExp`, `nameKey(name: string): string`, `findNameClash(name: string, taken: string[]): string | null`, `parseSemver(v: string): { core: number[], pre: string[] } | null`, `compareSemver(a: string, b: string): -1 | 0 | 1` (throws `Error('not a semver: <v>')` on bad input).

- [ ] **Step 1: Write the package files**

`package.json`:
```json
{
  "name": "mods-catalog",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": { "test": "node --test test/*.test.mjs" }
}
```

`.gitignore`:
```text
node_modules/
_site/
check-report.json
report/
```

- [ ] **Step 2: Write the failing tests**

`test/names.test.mjs`:
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NAME_PATTERN, nameKey, findNameClash } from '../lib/names.mjs'

test('the name pattern accepts kebab names of 2 to 48 characters', () => {
  for (const ok of ['cost-meter', 'a1', 'x'.repeat(48)]) assert.ok(NAME_PATTERN.test(ok), ok)
})

test('the name pattern refuses other names', () => {
  for (const bad of ['', 'a', 'Cost-Meter', '-cost', 'cost_meter', 'cost.meter', 'x'.repeat(49)]) {
    assert.ok(!NAME_PATTERN.test(bad), bad)
  }
})

test('nameKey ignores case, hyphens, underscores and dots', () => {
  assert.equal(nameKey('Cost-Meter'), 'costmeter')
  assert.equal(nameKey('cost_me.ter'), 'costmeter')
})

test('findNameClash returns the taken name that a new name collides with', () => {
  assert.equal(findNameClash('costmeter', ['pomodoro', 'cost-meter']), 'cost-meter')
  assert.equal(findNameClash('cost-meters', ['cost-meter']), null)
})
```

`test/semver.test.mjs`:
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseSemver, compareSemver } from '../lib/semver.mjs'

test('compareSemver orders release versions numerically', () => {
  assert.equal(compareSemver('0.2.0', '0.1.9'), 1)
  assert.equal(compareSemver('1.10.0', '1.9.0'), 1)
  assert.equal(compareSemver('1.0.0', '1.0.0'), 0)
  assert.equal(compareSemver('1.0.0', '1.0.1'), -1)
})

test('a prerelease is lower than its release', () => {
  assert.equal(compareSemver('1.0.0-beta.2', '1.0.0'), -1)
  assert.equal(compareSemver('1.0.0', '1.0.0-beta.2'), 1)
})

test('prerelease identifiers compare numerically, then by text', () => {
  assert.equal(compareSemver('1.0.0-beta.2', '1.0.0-beta.10'), -1)
  assert.equal(compareSemver('1.0.0-alpha', '1.0.0-beta'), -1)
  assert.equal(compareSemver('1.0.0-alpha', '1.0.0-alpha.1'), -1)
  assert.equal(compareSemver('1.0.0-1', '1.0.0-alpha'), -1)
})

test('build metadata is ignored', () => {
  assert.equal(compareSemver('1.0.0+abc', '1.0.0'), 0)
})

test('parseSemver refuses strings that are not semver', () => {
  for (const bad of ['1.0', 'v1.0.0', '01.0.0', '1.0.0.0', '', undefined]) assert.equal(parseSemver(bad), null)
})

test('compareSemver throws on a version that is not semver', () => {
  assert.throws(() => compareSemver('1.0', '1.0.0'), /not a semver: 1\.0/)
})
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `npm test --prefix /Users/mohammad/Desktop/baselane/mods-catalog`
Expected: FAIL with `Cannot find module '.../lib/names.mjs'`.

- [ ] **Step 4: Write the code**

`lib/names.mjs`:
```js
export const NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,47}$/

// Two names that differ only in case or in -, _ and . read as the same mod.
export function nameKey(name) {
  return name.toLowerCase().replace(/[-_.]/g, '')
}

export function findNameClash(name, taken) {
  const key = nameKey(name)
  return taken.find(other => nameKey(other) === key) ?? null
}
```

`lib/semver.mjs`:
```js
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/

export function parseSemver(version) {
  const match = typeof version === 'string' ? SEMVER.exec(version) : null
  if (!match) return null
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    pre: match[4] ? match[4].split('.') : [],
  }
}

function compareIdentifier(a, b) {
  const aNum = /^\d+$/.test(a)
  const bNum = /^\d+$/.test(b)
  if (aNum && bNum) return Math.sign(Number(a) - Number(b))
  if (aNum) return -1
  if (bNum) return 1
  return a < b ? -1 : a > b ? 1 : 0
}

function comparePre(a, b) {
  if (!a.length && !b.length) return 0
  if (!a.length) return 1
  if (!b.length) return -1
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] === undefined) return -1
    if (b[i] === undefined) return 1
    const result = compareIdentifier(a[i], b[i])
    if (result) return result
  }
  return 0
}

export function compareSemver(a, b) {
  const pa = parseSemver(a)
  const pb = parseSemver(b)
  if (!pa) throw new Error(`not a semver: ${a}`)
  if (!pb) throw new Error(`not a semver: ${b}`)
  for (let i = 0; i < 3; i++) {
    if (pa.core[i] !== pb.core[i]) return Math.sign(pa.core[i] - pb.core[i])
  }
  return comparePre(pa.pre, pb.pre)
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npm test --prefix /Users/mohammad/Desktop/baselane/mods-catalog`
Expected: PASS, 10 tests.

- [ ] **Step 6: Prove a test can fail**

In a scratch copy, change `if (!a.length) return 1` to `return -1` in `comparePre`, run the semver test against it, and confirm `a prerelease is lower than its release` fails. Delete the scratch copy.

- [ ] **Step 7: Commit**

```bash
git -C /Users/mohammad/Desktop/baselane/mods-catalog add package.json .gitignore lib test
git -C /Users/mohammad/Desktop/baselane/mods-catalog commit -m "Add name and semver helpers"
```

---

### Task 3: Entry format (R2 core)

**Files:**
- Create: `lib/entry.mjs`, `test/entry.test.mjs`

**Interfaces:**
- Consumes: `NAME_PATTERN` from `lib/names.mjs`.
- Produces: `CATEGORIES: readonly string[]`, `parseEntryText(text: string | null): { entry: object | null, error: string | null }`, `validateEntry(entry: unknown, fileName: string): string[]`, `sourceRepo(source): string` (`owner/repo`), `sourcePath(source): string` (`'.'` for a `github` source).

- [ ] **Step 1: Write the failing tests**

`test/entry.test.mjs`:
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CATEGORIES, parseEntryText, validateEntry, sourceRepo, sourcePath } from '../lib/entry.mjs'

const VALID = {
  name: 'cost-meter',
  source: { source: 'git-subdir', url: 'baselane-sh/mods', path: 'plugins/cost-meter', ref: 'cost-meter--v0.2.0' },
  category: 'band',
  tags: ['cost', 'usage'],
  screenshots: ['docs/band.png'],
}
const withChange = change => ({ ...VALID, ...change })
const errorsFor = (entry, file = 'cost-meter.json') => validateEntry(entry, file)

test('a valid entry has no errors', () => {
  assert.deepEqual(errorsFor(VALID), [])
})

test('a github source with only repo and ref is valid', () => {
  assert.deepEqual(errorsFor(withChange({ source: { source: 'github', repo: 'acme/cost-meter', ref: 'v1.0.0' } })), [])
})

test('the categories list matches the spec', () => {
  assert.deepEqual([...CATEGORIES], ['guard', 'pane', 'band', 'command', 'sound', 'style', 'stats', 'nudge', 'lifecycle', 'render'])
})

test('the file name must equal the entry name', () => {
  assert.match(errorsFor(VALID, 'other.json').join(), /file name must be cost-meter\.json/)
})

test('unknown top-level fields are refused', () => {
  assert.match(errorsFor(withChange({ version: '1.0.0' })).join(), /not allowed: version/)
})

test('an author-set sha is refused with a clear message', () => {
  const source = { ...VALID.source, sha: 'a'.repeat(40) }
  assert.match(errorsFor(withChange({ source })).join(), /sha is set by the catalog/)
})

test('a source that is not on github.com is refused', () => {
  const source = { source: 'url', url: 'https://gitlab.com/a/b.git', ref: 'v1' }
  assert.match(errorsFor(withChange({ source })).join(), /git-subdir" or "github/)
})

test('a git-subdir path that leaves the repo is refused', () => {
  for (const path of ['../x', '/abs', 'a/../../b', '']) {
    assert.match(errorsFor(withChange({ source: { ...VALID.source, path } })).join(), /relative path/, path)
  }
})

test('a missing ref is refused', () => {
  const { ref, ...source } = VALID.source
  assert.match(errorsFor(withChange({ source })).join(), /ref must be the tag/)
})

test('a category outside the list is refused', () => {
  assert.match(errorsFor(withChange({ category: 'games' })).join(), /category must be one of/)
})

test('tags must be at most 8 unique valid items', () => {
  for (const tags of [Array.from({ length: 9 }, (_, i) => `t${i}`), ['Cost'], ['a'], ['x', 'x'], 'cost']) {
    assert.match(errorsFor(withChange({ tags })).join(), /tags must be/, JSON.stringify(tags))
  }
})

test('screenshots must be at most 6 relative image paths', () => {
  for (const screenshots of [['a.svg'], ['../a.png'], Array.from({ length: 7 }, (_, i) => `s${i}.png`)]) {
    assert.match(errorsFor(withChange({ screenshots })).join(), /screenshots must be/, JSON.stringify(screenshots))
  }
})

test('an entry that is not an object gives one clear error', () => {
  for (const value of [null, [], 'text', 3]) assert.deepEqual(validateEntry(value, 'x.json'), ['the entry must be a JSON object'])
})

test('parseEntryText reports bad JSON without throwing', () => {
  for (const text of ['{"name": "a",}', '﻿{"name":"a"}', '', null]) {
    const { entry, error } = parseEntryText(text)
    assert.equal(entry, null)
    assert.match(error, /not valid JSON|is missing/)
  }
})

test('parseEntryText returns the object for valid JSON', () => {
  assert.deepEqual(parseEntryText(JSON.stringify(VALID)), { entry: VALID, error: null })
})

test('sourceRepo and sourcePath read both source types', () => {
  assert.equal(sourceRepo(VALID.source), 'baselane-sh/mods')
  assert.equal(sourcePath(VALID.source), 'plugins/cost-meter')
  const github = { source: 'github', repo: 'acme/x', ref: 'v1' }
  assert.equal(sourceRepo(github), 'acme/x')
  assert.equal(sourcePath(github), '.')
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test --prefix /Users/mohammad/Desktop/baselane/mods-catalog`
Expected: FAIL with `Cannot find module '.../lib/entry.mjs'`.

- [ ] **Step 3: Write the code**

`lib/entry.mjs`:
```js
import { NAME_PATTERN } from './names.mjs'

export const CATEGORIES = Object.freeze(['guard', 'pane', 'band', 'command', 'sound', 'style', 'stats', 'nudge', 'lifecycle', 'render'])

const ENTRY_KEYS = new Set(['$schema', 'name', 'source', 'category', 'tags', 'screenshots'])
const SOURCE_KEYS = { 'git-subdir': ['source', 'url', 'path', 'ref'], github: ['source', 'repo', 'ref'] }
const REPO = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/
const REF = /^[A-Za-z0-9._\/-]{1,100}$/
const TAG = /^[a-z0-9-]{2,24}$/
const IMAGE = /\.(png|jpe?g|webp|gif)$/i

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)

function isRelativePath(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 200 &&
    !value.startsWith('/') && !value.includes('\\') && !value.split('/').includes('..')
}

function sourceErrors(source) {
  if (!isObject(source)) return ['source must be an object']
  const allowed = SOURCE_KEYS[source.source]
  if (!allowed) return ['source.source must be "git-subdir" or "github"']
  const errors = []
  if ('sha' in source) errors.push('source.sha is set by the catalog; remove it')
  const extra = Object.keys(source).filter(key => !allowed.includes(key) && key !== 'sha')
  if (extra.length) errors.push(`source fields not allowed: ${extra.join(', ')}`)
  const repo = source.source === 'github' ? source.repo : source.url
  if (!REPO.test(repo ?? '')) errors.push(`source.${source.source === 'github' ? 'repo' : 'url'} must be a GitHub repo in owner/repo form`)
  if (source.source === 'git-subdir' && !isRelativePath(source.path)) {
    errors.push('source.path must be a relative path inside the repo, without ".."')
  }
  if (typeof source.ref !== 'string' || !REF.test(source.ref)) errors.push('source.ref must be the tag to publish')
  return errors
}

function listErrors(entry) {
  const errors = []
  const { tags, screenshots } = entry
  if (tags !== undefined && !(Array.isArray(tags) && tags.length <= 8 && tags.every(t => TAG.test(t)) && new Set(tags).size === tags.length)) {
    errors.push('tags must be up to 8 unique items of 2 to 24 characters: a-z, 0-9 and "-"')
  }
  if (screenshots !== undefined && !(Array.isArray(screenshots) && screenshots.length <= 6 && screenshots.every(p => isRelativePath(p) && IMAGE.test(p)))) {
    errors.push('screenshots must be up to 6 relative paths to .png, .jpg, .webp or .gif files')
  }
  return errors
}

export function validateEntry(entry, fileName) {
  if (!isObject(entry)) return ['the entry must be a JSON object']
  const errors = []
  const extra = Object.keys(entry).filter(key => !ENTRY_KEYS.has(key))
  if (extra.length) errors.push(`fields not allowed: ${extra.join(', ')}`)
  if (!NAME_PATTERN.test(entry.name ?? '')) {
    errors.push('name must be 2 to 48 characters: a-z, 0-9 and "-", starting with a letter or digit')
  } else if (fileName !== `${entry.name}.json`) {
    errors.push(`the file name must be ${entry.name}.json`)
  }
  errors.push(...sourceErrors(entry.source))
  if (!CATEGORIES.includes(entry.category)) errors.push(`category must be one of: ${CATEGORIES.join(', ')}`)
  return [...errors, ...listErrors(entry)]
}

export function parseEntryText(text) {
  if (typeof text !== 'string' || text.length === 0) return { entry: null, error: 'the entry file is missing or empty' }
  try {
    return { entry: JSON.parse(text), error: null }
  } catch {
    return { entry: null, error: 'the entry file is not valid JSON (no comments, no trailing commas, no byte order mark)' }
  }
}

export function sourceRepo(source) {
  return source.source === 'github' ? source.repo : source.url
}

export function sourcePath(source) {
  return source.source === 'github' ? '.' : source.path
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm test --prefix /Users/mohammad/Desktop/baselane/mods-catalog`
Expected: PASS. Note: the `''` case in `parseEntryText` returns "missing or empty", which the test accepts through `/not valid JSON|is missing/`.

- [ ] **Step 5: Prove a test can fail**

In a scratch copy, delete the `if ('sha' in source)` line and confirm `an author-set sha is refused with a clear message` fails.

- [ ] **Step 6: Commit**

```bash
git -C /Users/mohammad/Desktop/baselane/mods-catalog add lib/entry.mjs test/entry.test.mjs
git -C /Users/mohammad/Desktop/baselane/mods-catalog commit -m "Add the entry format and its validation"
```

---

### Task 4: Claude CLI runner and output parsers

**Files:**
- Create: `lib/claude-cli.mjs`, `test/claude-cli.test.mjs`, `test/fixtures/mods/no-em-dash/` (copy)

**Interfaces:**
- Produces: `splitTopLevel(list: string): string[]`, `parseValidate(output: string): { passed: boolean, hooks: string[], calls: string[] }` (sorted, unique), `parseTestRun(output: string): { total: number, failed: number }`, `runClaude(args: string[], opts?: { timeoutMs?: number }): Promise<{ code: number, output: string }>`.

- [ ] **Step 1: Copy the fixture mod**

Run: `cp -R /Users/mohammad/Desktop/baselane/mods/plugins/no-em-dash /Users/mohammad/Desktop/baselane/mods-catalog/test/fixtures/mods/no-em-dash`

- [ ] **Step 2: Write the failing tests**

`test/claude-cli.test.mjs`:
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { splitTopLevel, parseValidate, parseTestRun, runClaude } from '../lib/claude-cli.mjs'

const VALIDATE_TWO_MODULES = `Validating hooks: /x/hooks/hooks.json

  ❯ ./register.ts hooks: tool.call, session.start, command.run{command=?}, ui.render{component=AbovePrompt}
  ❯ ./register.ts calls: $.clock.every, $.session.usage, $.ui.toast
  ❯ ./register.ts state writes: cost-meter.reading
  ❯ ./extra.ts hooks: tool.call, ui.render{component=Pane,requestId=x}
  ❯ ./extra.ts calls: $.process.run

✔ Validation passed
`
const VALIDATE_FAILED = `
  ❯ modules../missing.js: empty: /x/hooks/missing.js: no such file

✘ Validation failed
`

test('splitTopLevel keeps commas inside braces', () => {
  assert.deepEqual(splitTopLevel('a, b{c=1,d=2}, e'), ['a', 'b{c=1,d=2}', 'e'])
})

test('parseValidate merges hooks and calls from every module, sorted and unique', () => {
  assert.deepEqual(parseValidate(VALIDATE_TWO_MODULES), {
    passed: true,
    hooks: ['command.run{command=?}', 'session.start', 'tool.call', 'ui.render{component=AbovePrompt}', 'ui.render{component=Pane,requestId=x}'],
    calls: ['$.clock.every', '$.process.run', '$.session.usage', '$.ui.toast'],
  })
})

test('parseValidate reports a failed validation', () => {
  assert.deepEqual(parseValidate(VALIDATE_FAILED), { passed: false, hooks: [], calls: [] })
})

test('parseTestRun reads the totals', () => {
  assert.deepEqual(parseTestRun(' 11 pass\n 0 fail\nRan 11 tests across 2 files. [0.47s]\n'), { total: 11, failed: 0 })
  assert.deepEqual(parseTestRun(' 2 pass\n 1 fail\nRan 3 tests across 1 files.\n'), { total: 3, failed: 1 })
  assert.deepEqual(parseTestRun(' 1 pass\n 0 fail\nRan 1 test across 1 file.\n'), { total: 1, failed: 0 })
  assert.deepEqual(parseTestRun('claude plugin test: no *.test.ts or *.test.tsx under /x'), { total: 0, failed: 0 })
})

const hasClaude = spawnSync('claude', ['--version']).status === 0
const FIXTURE = fileURLToPath(new URL('./fixtures/mods/no-em-dash', import.meta.url))

test('the real claude CLI validates and tests the fixture mod', { skip: !hasClaude && 'claude is not on PATH' }, async () => {
  const validate = await runClaude(['plugin', 'validate', FIXTURE])
  assert.equal(validate.code, 0, validate.output)
  const parsed = parseValidate(validate.output)
  assert.ok(parsed.passed)
  assert.ok(parsed.hooks.length > 0)
  const run = await runClaude(['plugin', 'test', FIXTURE])
  assert.equal(run.code, 0, run.output)
  assert.ok(parseTestRun(run.output).total > 0)
})
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `npm test --prefix /Users/mohammad/Desktop/baselane/mods-catalog`
Expected: FAIL with `Cannot find module '.../lib/claude-cli.mjs'`.

- [ ] **Step 4: Write the code**

`lib/claude-cli.mjs`:
```js
import { execFile } from 'node:child_process'

export function splitTopLevel(list) {
  const items = []
  let depth = 0
  let current = ''
  for (const char of list) {
    if (char === '{') depth += 1
    if (char === '}') depth -= 1
    if (char === ',' && depth === 0) {
      items.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  items.push(current.trim())
  return items.filter(Boolean)
}

// Lines look like "  ❯ ./register.ts hooks: a, b{c=1}". A mod can have several modules.
const LINE = /❯ \S+ (hooks|calls): (.*)$/

export function parseValidate(output) {
  const found = { hooks: new Set(), calls: new Set() }
  for (const line of output.split('\n')) {
    const match = LINE.exec(line)
    if (match) for (const item of splitTopLevel(match[2])) found[match[1]].add(item)
  }
  return {
    passed: /✔ Validation passed/.test(output),
    hooks: [...found.hooks].sort(),
    calls: [...found.calls].sort(),
  }
}

export function parseTestRun(output) {
  const ran = /Ran (\d+) tests? across/.exec(output)
  const failed = /^\s*(\d+) fail\b/m.exec(output)
  return { total: ran ? Number(ran[1]) : 0, failed: failed ? Number(failed[1]) : 0 }
}

export function runClaude(args, { timeoutMs = 240_000 } = {}) {
  const env = { ...process.env, DISABLE_AUTOUPDATER: '1' }
  return new Promise(resolve => {
    execFile('claude', args, { env, timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      const code = error ? (typeof error.code === 'number' ? error.code : 1) : 0
      resolve({ code, output: `${stdout}${stderr}` })
    })
  })
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npm test --prefix /Users/mohammad/Desktop/baselane/mods-catalog`
Expected: PASS. The real-CLI test runs (it is not skipped) on this machine.

- [ ] **Step 6: Prove a test can fail**

In a scratch copy, change `if (char === ',' && depth === 0)` to `if (char === ',')` and confirm `splitTopLevel keeps commas inside braces` fails.

- [ ] **Step 7: Commit**

```bash
git -C /Users/mohammad/Desktop/baselane/mods-catalog add lib/claude-cli.mjs test/claude-cli.test.mjs test/fixtures
git -C /Users/mohammad/Desktop/baselane/mods-catalog commit -m "Add the claude CLI runner and output parsers"
```

---

### Task 5: Git tag resolution and fetch (R4 core)

**Files:**
- Create: `lib/git.mjs`, `test/helpers.mjs`, `test/git.test.mjs`

**Interfaces:**
- Produces: `repoUrl(repo: string, base?: string): string` (default base `https://github.com/`, result `<base><owner>/<repo>.git`), `resolveTag(url: string, tag: string): Promise<string | null>` (commit SHA, peeled for annotated tags; rejects when the repo cannot be read), `fetchTag(url: string, tag: string, sha: string, dest: string): Promise<string>` (checks out the tag in `dest`, rejects with `tag <t> now points to <x>, not <sha>` on a mismatch).
- Produces (test helpers): `tempDir(prefix?): Promise<string>`, `writeTree(root, files: Record<string, string | object>): Promise<string>`, `makeGitRepo(dir?): Promise<{ dir, url, run(args): string }>`.

- [ ] **Step 1: Write the test helpers**

`test/helpers.mjs`:
```js
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'

export const tempDir = (prefix = 'mc-') => mkdtemp(path.join(os.tmpdir(), prefix))

export async function writeTree(root, files) {
  for (const [relative, content] of Object.entries(files)) {
    const full = path.join(root, relative)
    await mkdir(path.dirname(full), { recursive: true })
    await writeFile(full, typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`)
  }
  return root
}

const GIT_ENV = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' }

export async function makeGitRepo(dir) {
  const root = dir ?? await tempDir('repo-')
  await mkdir(root, { recursive: true })
  const run = args => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', env: GIT_ENV })
  run(['init', '-q', '-b', 'main'])
  return { dir: root, url: `file://${root}`, run }
}
```

- [ ] **Step 2: Write the failing tests**

`test/git.test.mjs`:
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { repoUrl, resolveTag, fetchTag } from '../lib/git.mjs'
import { tempDir, writeTree, makeGitRepo } from './helpers.mjs'

async function repoWithTags() {
  const repo = await makeGitRepo()
  await writeTree(repo.dir, { 'a.txt': 'one' })
  repo.run(['add', '.'])
  repo.run(['commit', '-qm', 'one'])
  const first = repo.run(['rev-parse', 'HEAD']).trim()
  repo.run(['tag', 'light-v1'])
  repo.run(['tag', '-a', 'annotated-v1', '-m', 'v1'])
  repo.run(['branch', 'branch-only'])
  await writeTree(repo.dir, { 'a.txt': 'two' })
  repo.run(['commit', '-qam', 'two'])
  const second = repo.run(['rev-parse', 'HEAD']).trim()
  return { ...repo, first, second }
}

test('repoUrl builds a github.com URL by default', () => {
  assert.equal(repoUrl('acme/x'), 'https://github.com/acme/x.git')
  assert.equal(repoUrl('acme/x', 'file:///tmp/git/'), 'file:///tmp/git/acme/x.git')
})

test('a lightweight tag resolves to its commit', async () => {
  const repo = await repoWithTags()
  assert.equal(await resolveTag(repo.url, 'light-v1'), repo.first)
})

test('an annotated tag resolves to its commit, not the tag object', async () => {
  const repo = await repoWithTags()
  assert.equal(await resolveTag(repo.url, 'annotated-v1'), repo.first)
})

test('a branch name or a missing tag resolves to null', async () => {
  const repo = await repoWithTags()
  assert.equal(await resolveTag(repo.url, 'branch-only'), null)
  assert.equal(await resolveTag(repo.url, 'main'), null)
  assert.equal(await resolveTag(repo.url, 'nope'), null)
})

test('a repo that cannot be read rejects', async () => {
  await assert.rejects(resolveTag('file:///does/not/exist', 'v1'))
})

test('fetchTag checks out the tagged commit', async () => {
  const repo = await repoWithTags()
  const dest = await tempDir('fetch-')
  await fetchTag(repo.url, 'annotated-v1', repo.first, dest)
  assert.equal(await readFile(path.join(dest, 'a.txt'), 'utf8'), 'one')
})

test('fetchTag rejects when the tag moved away from the checked SHA', async () => {
  const repo = await repoWithTags()
  const dest = await tempDir('fetch-')
  await assert.rejects(fetchTag(repo.url, 'light-v1', repo.second, dest), /now points to/)
})
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `npm test --prefix /Users/mohammad/Desktop/baselane/mods-catalog`
Expected: FAIL with `Cannot find module '.../lib/git.mjs'`.

- [ ] **Step 4: Write the code**

`lib/git.mjs`:
```js
import { execFile } from 'node:child_process'

// Never prompt for credentials: a private repo must fail, not hang.
const GIT_ENV = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' }

function git(args) {
  return new Promise((resolve, reject) => {
    execFile('git', args, { env: GIT_ENV, timeout: 120_000, maxBuffer: 32 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(`git ${args[0]} failed: ${stderr.trim() || error.message}`))
      else resolve(stdout)
    })
  })
}

export function repoUrl(repo, base = 'https://github.com/') {
  return `${base}${repo}.git`
}

export async function resolveTag(url, tag) {
  const out = await git(['ls-remote', '--tags', url])
  const refs = new Map(out.trim().split('\n').filter(Boolean).map(line => {
    const [sha, ref] = line.split('\t')
    return [ref, sha]
  }))
  // "^{}" is the commit an annotated tag points to.
  return refs.get(`refs/tags/${tag}^{}`) ?? refs.get(`refs/tags/${tag}`) ?? null
}

export async function fetchTag(url, tag, sha, dest) {
  await git(['init', '-q', dest])
  await git(['-C', dest, 'fetch', '-q', '--depth', '1', url, `refs/tags/${tag}`])
  const fetched = (await git(['-C', dest, 'rev-parse', 'FETCH_HEAD^{commit}'])).trim()
  if (fetched !== sha) throw new Error(`tag ${tag} now points to ${fetched}, not ${sha}`)
  await git(['-C', dest, 'checkout', '-q', 'FETCH_HEAD'])
  return dest
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npm test --prefix /Users/mohammad/Desktop/baselane/mods-catalog`
Expected: PASS.

- [ ] **Step 6: Prove a test can fail**

In a scratch copy, swap the `??` order so the direct ref is read first, and confirm `an annotated tag resolves to its commit, not the tag object` fails.

- [ ] **Step 7: Commit**

```bash
git -C /Users/mohammad/Desktop/baselane/mods-catalog add lib/git.mjs test/helpers.mjs test/git.test.mjs
git -C /Users/mohammad/Desktop/baselane/mods-catalog commit -m "Add tag resolution and fetch at a tag"
```

---

### Task 6: Size and shape (R8 core)

**Files:**
- Create: `lib/shape.mjs`, `test/shape.test.mjs`

**Interfaces:**
- Consumes: `tempDir`, `writeTree` from `test/helpers.mjs`.
- Produces: `MAX_PLUGIN_BYTES = 10485760`, `MAX_SCREENSHOT_BYTES = 2097152`, `checkShape(dir: string, screenshots?: string[]): Promise<string[]>`.

- [ ] **Step 1: Write the failing tests**

`test/shape.test.mjs`:
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { symlink, truncate, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { checkShape, MAX_PLUGIN_BYTES, MAX_SCREENSHOT_BYTES } from '../lib/shape.mjs'
import { tempDir, writeTree } from './helpers.mjs'

const smallMod = async () => writeTree(await tempDir(), { 'hooks/hooks.json': '{}', 'docs/shot.png': 'png' })

test('a small mod with a real screenshot passes', async () => {
  assert.deepEqual(await checkShape(await smallMod(), ['docs/shot.png']), [])
})

test('a mod over 10 MB fails', async () => {
  const dir = await smallMod()
  await writeTree(dir, { 'big.bin': '' })
  await truncate(path.join(dir, 'big.bin'), MAX_PLUGIN_BYTES + 1)
  assert.match((await checkShape(dir)).join(), /limit is 10 MB/)
})

test('a top-level bin folder fails', async () => {
  const dir = await smallMod()
  await mkdir(path.join(dir, 'bin'))
  assert.match((await checkShape(dir)).join(), /top-level bin/)
})

test('a symlink that leaves the mod fails, one inside it passes', async () => {
  const dir = await smallMod()
  await symlink('docs/shot.png', path.join(dir, 'inside.png'))
  assert.deepEqual(await checkShape(dir), [])
  await symlink('../../etc', path.join(dir, 'outside'))
  assert.match((await checkShape(dir)).join(), /outside points outside the mod/)
})

test('a missing or large screenshot fails', async () => {
  const dir = await smallMod()
  assert.match((await checkShape(dir, ['docs/none.png'])).join(), /does not exist/)
  await truncate(path.join(dir, 'docs/shot.png'), MAX_SCREENSHOT_BYTES + 1)
  assert.match((await checkShape(dir, ['docs/shot.png'])).join(), /over 2 MB/)
})

test('a .git folder at the root does not count toward the size', async () => {
  const dir = await smallMod()
  await writeTree(dir, { '.git/big': '' })
  await truncate(path.join(dir, '.git/big'), MAX_PLUGIN_BYTES + 1)
  assert.deepEqual(await checkShape(dir), [])
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test --prefix /Users/mohammad/Desktop/baselane/mods-catalog`
Expected: FAIL with `Cannot find module '.../lib/shape.mjs'`.

- [ ] **Step 3: Write the code**

`lib/shape.mjs`:
```js
import { lstat, readdir, readlink } from 'node:fs/promises'
import path from 'node:path'

export const MAX_PLUGIN_BYTES = 10 * 1024 * 1024
export const MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024

const isInside = (root, target) => target === root || target.startsWith(root + path.sep)

async function walk(dir, root) {
  let bytes = 0
  const errors = []
  for (const name of await readdir(dir)) {
    if (dir === root && name === '.git') continue
    const full = path.join(dir, name)
    const info = await lstat(full)
    if (info.isSymbolicLink()) {
      const target = path.resolve(path.dirname(full), await readlink(full))
      if (!isInside(root, target)) errors.push(`${path.relative(root, full)} points outside the mod`)
    } else if (info.isDirectory()) {
      const inner = await walk(full, root)
      bytes += inner.bytes
      errors.push(...inner.errors)
    } else {
      bytes += info.size
    }
  }
  return { bytes, errors }
}

async function infoOrNull(file) {
  try {
    return await lstat(file)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

async function screenshotErrors(root, screenshots) {
  const errors = []
  for (const shot of screenshots) {
    const info = await infoOrNull(path.join(root, shot))
    if (!info || !info.isFile()) errors.push(`screenshot ${shot} does not exist`)
    else if (info.size > MAX_SCREENSHOT_BYTES) errors.push(`screenshot ${shot} is over 2 MB`)
  }
  return errors
}

export async function checkShape(dir, screenshots = []) {
  const root = path.resolve(dir)
  const { bytes, errors } = await walk(root, root)
  const sizeErrors = bytes > MAX_PLUGIN_BYTES ? [`the mod is ${(bytes / 1048576).toFixed(1)} MB; the limit is 10 MB`] : []
  const bin = await infoOrNull(path.join(root, 'bin'))
  const binErrors = bin?.isDirectory() ? ['the mod has a top-level bin/ folder; move executables to scripts/'] : []
  return [...errors, ...sizeErrors, ...binErrors, ...await screenshotErrors(root, screenshots)]
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm test --prefix /Users/mohammad/Desktop/baselane/mods-catalog`
Expected: PASS.

- [ ] **Step 5: Prove a test can fail**

In a scratch copy, delete the `.git` skip line and confirm `a .git folder at the root does not count toward the size` fails.

- [ ] **Step 6: Commit**

```bash
git -C /Users/mohammad/Desktop/baselane/mods-catalog add lib/shape.mjs test/shape.test.mjs
git -C /Users/mohammad/Desktop/baselane/mods-catalog commit -m "Add the size and shape check"
```

---

### Task 7: The rules engine (R1 to R10)

**Files:**
- Create: `lib/rules.mjs`, `test/rules.test.mjs`

**Interfaces:**
- Consumes: everything from Tasks 2 to 6.
- Produces:
  - `RULES: readonly { id: string, name: string, hint: string }[]` in run order R1 to R10.
  - `runRules(input, io): Promise<Report>` where
    - `input = { changedFiles: { status: string, path: string }[], entryText: string | null, prAuthor: string, listedNames: string[], renamedNames: string[], lockOnMain: Lock | null }`
    - `io = { repoUrl(repo): string, resolveTag(url, tag): Promise<string|null>, fetchMod(url, tag, sha): Promise<string> /* checkout root */, validate(dir): Promise<{code, output}>, test(dir): Promise<{code, output}>, checkShape(dir, screenshots): Promise<string[]> }`
    - `Report = { ok: boolean, rules: { id, name, status: 'pass'|'fail'|'skip', message?, hint? }[], result: Result | null }`
    - `Result = { name, sha, ref, version, hooks: string[], calls: string[], testCount: number, manifest: { description, author: { name, ... }, license, homepage?, repository? } }`

- [ ] **Step 1: Write the failing tests**

`test/rules.test.mjs`:
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RULES, runRules } from '../lib/rules.mjs'
import { tempDir, writeTree } from './helpers.mjs'

const SHA = 'a'.repeat(40)
const MANIFEST = { name: 'cost-meter', version: '0.2.0', description: 'A band.', author: { name: 'Baselane' }, license: 'MIT' }
const ENTRY = {
  name: 'cost-meter',
  source: { source: 'git-subdir', url: 'baselane-sh/mods', path: 'plugins/cost-meter', ref: 'cost-meter--v0.2.0' },
  category: 'band',
}
const VALIDATE_OK = '  ❯ ./register.ts hooks: tool.call\n  ❯ ./register.ts calls: $.ui.toast\n\n✔ Validation passed\n'
const TEST_OK = ' 3 pass\n 0 fail\nRan 3 tests across 1 files.\n'
const LOCK = { name: 'cost-meter', version: '0.1.0', submitter: 'alice' }

async function checkout({ manifest = MANIFEST, hooks = true } = {}) {
  const files = { 'plugins/cost-meter/.claude-plugin/plugin.json': manifest }
  if (hooks) files['plugins/cost-meter/hooks/hooks.json'] = { modules: ['./register.js'] }
  return writeTree(await tempDir(), files)
}

const makeIo = (root, change = {}) => ({
  repoUrl: repo => `https://github.com/${repo}.git`,
  resolveTag: async () => SHA,
  fetchMod: async () => root,
  validate: async () => ({ code: 0, output: VALIDATE_OK }),
  test: async () => ({ code: 0, output: TEST_OK }),
  checkShape: async () => [],
  ...change,
})

const makeInput = (change = {}) => ({
  changedFiles: [{ status: 'A', path: 'entries/cost-meter.json' }],
  entryText: JSON.stringify(ENTRY),
  prAuthor: 'alice',
  listedNames: [],
  renamedNames: [],
  lockOnMain: null,
  ...change,
})

const statuses = report => Object.fromEntries(report.rules.map(rule => [rule.id, rule.status]))
const failed = report => report.rules.find(rule => rule.status === 'fail')

test('RULES run in the order R1 to R10', () => {
  assert.deepEqual(RULES.map(rule => rule.id), ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10'])
})

test('a good new entry passes every rule and returns the result', async () => {
  const report = await runRules(makeInput(), makeIo(await checkout()))
  assert.equal(report.ok, true)
  assert.deepEqual(report.result, {
    name: 'cost-meter', sha: SHA, ref: 'cost-meter--v0.2.0', version: '0.2.0',
    hooks: ['tool.call'], calls: ['$.ui.toast'], testCount: 3,
    manifest: { description: 'A band.', author: { name: 'Baselane' }, license: 'MIT' },
  })
})

test('a failure stops the run and skips the later rules', async () => {
  const report = await runRules(makeInput({ changedFiles: [{ status: 'A', path: 'entries/a.json' }, { status: 'A', path: 'entries/b.json' }] }), makeIo(await checkout()))
  assert.equal(report.ok, false)
  assert.equal(report.result, null)
  assert.equal(statuses(report).R1, 'fail')
  assert.ok(RULES.slice(1).every(rule => statuses(report)[rule.id] === 'skip'))
  assert.match(failed(report).hint, /exactly one file/)
})

test('R1 refuses a removal and a file outside entries/', async () => {
  const root = await checkout()
  for (const file of [{ status: 'D', path: 'entries/cost-meter.json' }, { status: 'M', path: 'lock/cost-meter.json' }]) {
    const report = await runRules(makeInput({ changedFiles: [file] }), makeIo(root))
    assert.equal(failed(report).id, 'R1', file.path)
  }
})

test('R2 refuses bad JSON and a bad entry', async () => {
  const root = await checkout()
  for (const entryText of ['{"name":', JSON.stringify({ ...ENTRY, category: 'games' })]) {
    assert.equal(failed(await runRules(makeInput({ entryText }), makeIo(root))).id, 'R2')
  }
})

test('R2 refuses a new name that clashes with a listed or removed name', async () => {
  const root = await checkout()
  assert.equal(failed(await runRules(makeInput({ listedNames: ['costmeter'] }), makeIo(root))).id, 'R2')
  assert.equal(failed(await runRules(makeInput({ renamedNames: ['cost_meter'] }), makeIo(root))).id, 'R2')
})

test('R2 lets an existing entry keep its own name', async () => {
  const report = await runRules(makeInput({ listedNames: ['cost-meter'], lockOnMain: LOCK }), makeIo(await checkout()))
  assert.equal(report.ok, true)
})

test('R3 refuses an update by someone other than the submitter', async () => {
  const report = await runRules(makeInput({ prAuthor: 'mallory', lockOnMain: LOCK }), makeIo(await checkout()))
  assert.equal(failed(report).id, 'R3')
  assert.match(failed(report).message, /belongs to alice/)
})

test('R4 refuses a missing tag and an unreadable repo', async () => {
  const root = await checkout()
  assert.equal(failed(await runRules(makeInput(), makeIo(root, { resolveTag: async () => null }))).id, 'R4')
  const unreadable = makeIo(root, { resolveTag: async () => { throw new Error('auth') } })
  assert.match(failed(await runRules(makeInput(), unreadable)).message, /must be a public repo/)
})

test('R4 fetches the resolved SHA at the tag', async () => {
  const root = await checkout()
  let args
  await runRules(makeInput(), makeIo(root, { fetchMod: async (...a) => { args = a; return root } }))
  assert.deepEqual(args, ['https://github.com/baselane-sh/mods.git', 'cost-meter--v0.2.0', SHA])
})

test('R5 refuses a manifest with a wrong name, version, description, author or license', async () => {
  const cases = [
    { ...MANIFEST, name: 'other' },
    { ...MANIFEST, version: '1.0' },
    { ...MANIFEST, description: 'x'.repeat(201) },
    { ...MANIFEST, author: undefined },
    { ...MANIFEST, license: '' },
  ]
  for (const manifest of cases) {
    const report = await runRules(makeInput(), makeIo(await checkout({ manifest })))
    assert.equal(failed(report).id, 'R5', JSON.stringify(manifest))
  }
})

test('R5 refuses a missing plugin.json', async () => {
  const root = await tempDir()
  assert.match(failed(await runRules(makeInput(), makeIo(root))).message, /plugin\.json does not exist/)
})

test('R6 refuses a plugin without hooks/hooks.json', async () => {
  const report = await runRules(makeInput(), makeIo(await checkout({ hooks: false })))
  assert.equal(failed(report).id, 'R6')
})

test('R7 refuses a failed validation and one with no hooks', async () => {
  const root = await checkout()
  const failing = makeIo(root, { validate: async () => ({ code: 1, output: '✘ Validation failed\n' }) })
  assert.equal(failed(await runRules(makeInput(), failing)).id, 'R7')
  const noHooks = makeIo(root, { validate: async () => ({ code: 0, output: '✔ Validation passed\n' }) })
  assert.match(failed(await runRules(makeInput(), noHooks)).message, /no hooks/)
})

test('R8 reports the shape errors', async () => {
  const report = await runRules(makeInput(), makeIo(await checkout(), { checkShape: async () => ['too big'] }))
  assert.equal(failed(report).id, 'R8')
  assert.equal(failed(report).message, 'too big')
})

test('R9 refuses failed tests and zero tests', async () => {
  const root = await checkout()
  const failing = makeIo(root, { test: async () => ({ code: 1, output: ' 1 pass\n 1 fail\nRan 2 tests across 1 files.\n' }) })
  assert.equal(failed(await runRules(makeInput(), failing)).id, 'R9')
  const none = makeIo(root, { test: async () => ({ code: 0, output: 'Ran 0 tests across 0 files.\n' }) })
  assert.match(failed(await runRules(makeInput(), none)).message, /no tests ran/)
})

test('R10 needs a higher version than the listed one', async () => {
  const root = await checkout()
  for (const version of ['0.2.0', '0.3.0-beta.1']) {
    const report = await runRules(makeInput({ lockOnMain: { ...LOCK, version } }), makeIo(root))
    assert.equal(failed(report).id, 'R10', version)
  }
  const higher = await runRules(makeInput({ lockOnMain: { ...LOCK, version: '0.1.9' } }), makeIo(root))
  assert.equal(higher.ok, true)
})

test('an unexpected IO error fails the current rule instead of crashing', async () => {
  const io = makeIo(await checkout(), { test: async () => { throw new Error('spawn claude ENOENT') } })
  const report = await runRules(makeInput(), io)
  assert.equal(failed(report).id, 'R9')
  assert.match(failed(report).message, /internal error: spawn claude ENOENT/)
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test --prefix /Users/mohammad/Desktop/baselane/mods-catalog`
Expected: FAIL with `Cannot find module '.../lib/rules.mjs'`.

- [ ] **Step 3: Write the code**

`lib/rules.mjs`:
```js
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { parseEntryText, validateEntry, sourceRepo, sourcePath } from './entry.mjs'
import { findNameClash } from './names.mjs'
import { parseSemver, compareSemver } from './semver.mjs'
import { parseValidate, parseTestRun } from './claude-cli.mjs'

export const RULES = Object.freeze([
  { id: 'R1', name: 'Scope', hint: 'Change exactly one file, under entries/. A maintainer handles removals and every other file.' },
  { id: 'R2', name: 'Entry', hint: 'Make the entry match the format on the submit page, and pick a name that is not taken.' },
  { id: 'R3', name: 'Owner', hint: 'Only the first submitter can update a mod. Ask a maintainer to move the mod to you.' },
  { id: 'R4', name: 'Tag', hint: 'Push the tag to a public github.com repo and put the tag name in source.ref.' },
  { id: 'R5', name: 'Manifest', hint: 'In .claude-plugin/plugin.json set name (equal to the entry name), version (semver), description (200 characters or fewer), author and license.' },
  { id: 'R6', name: 'Is a mod', hint: 'A mod has hooks/hooks.json that points to its hooks module.' },
  { id: 'R7', name: 'Validate', hint: 'Run claude plugin validate on the mod folder and fix what it reports.' },
  { id: 'R8', name: 'Size and shape', hint: 'Keep the mod at 10 MB or less, with no top-level bin/ and no symlink that leaves the mod. Each screenshot is 2 MB or less.' },
  { id: 'R9', name: 'Tests', hint: 'Run claude plugin test on the mod folder. At least one test must run and every test must pass.' },
  { id: 'R10', name: 'Version', hint: 'Raise version in plugin.json. Users get new code only when the version changes.' },
])

class RuleFailure extends Error {}
const failWith = message => { throw new RuleFailure(message) }
const lastLines = (text, count = 30) => text.trim().split('\n').slice(-count).join('\n')
const ENTRY_FILE = /^entries\/[^/]+\.json$/

async function readJson(file) {
  let text
  try { text = await readFile(file, 'utf8') } catch { failWith(`${path.basename(file)} does not exist`) }
  try { return JSON.parse(text) } catch { failWith(`${path.basename(file)} is not valid JSON`) }
}

function manifestErrors(manifest, name) {
  const errors = []
  if (manifest?.name !== name) errors.push(`plugin.json name is ${JSON.stringify(manifest?.name)}, not ${name}`)
  if (!parseSemver(manifest?.version)) errors.push('plugin.json version must be semver, for example 1.0.0')
  const description = manifest?.description
  if (typeof description !== 'string' || !description.trim() || description.length > 200) errors.push('plugin.json description must be 1 to 200 characters')
  const author = manifest?.author
  if (!(typeof author === 'string' && author.trim()) && !(typeof author?.name === 'string' && author.name.trim())) errors.push('plugin.json author must be set')
  if (typeof manifest?.license !== 'string' || !manifest.license.trim()) errors.push('plugin.json license must be set')
  return errors
}

const STEPS = {
  async R1(input) {
    const files = input.changedFiles
    if (files.length !== 1) failWith(`the PR changes ${files.length} files`)
    const [file] = files
    if (!['A', 'M'].includes(file.status)) failWith(`the PR removes or renames ${file.path}`)
    if (!ENTRY_FILE.test(file.path)) failWith(`${file.path} is not under entries/`)
  },
  async R2(input, io, state) {
    const { entry, error } = parseEntryText(input.entryText)
    if (error) failWith(error)
    const errors = validateEntry(entry, path.basename(input.changedFiles[0].path))
    if (errors.length) failWith(errors.join('\n'))
    const clash = input.lockOnMain ? null : findNameClash(entry.name, [...input.listedNames, ...input.renamedNames])
    if (clash) failWith(`the name ${entry.name} is too close to ${clash}, which is taken`)
    state.entry = entry
  },
  async R3(input) {
    const lock = input.lockOnMain
    if (lock && lock.submitter !== input.prAuthor) failWith(`${lock.name} belongs to ${lock.submitter}`)
  },
  async R4(input, io, state) {
    const { source } = state.entry
    const url = io.repoUrl(sourceRepo(source))
    let sha
    try { sha = await io.resolveTag(url, source.ref) } catch { failWith(`cannot read ${sourceRepo(source)}; it must be a public repo on github.com`) }
    if (!sha) failWith(`the repo has no tag named ${source.ref}`)
    try { state.root = await io.fetchMod(url, source.ref, sha) } catch (error) { failWith(`cannot fetch tag ${source.ref}: ${error.message}`) }
    state.sha = sha
    state.dir = path.join(state.root, sourcePath(source))
  },
  async R5(input, io, state) {
    const manifest = await readJson(path.join(state.dir, '.claude-plugin', 'plugin.json'))
    const errors = manifestErrors(manifest, state.entry.name)
    if (errors.length) failWith(errors.join('\n'))
    state.manifest = manifest
  },
  async R6(input, io, state) {
    const info = await stat(path.join(state.dir, 'hooks', 'hooks.json')).catch(() => null)
    if (!info?.isFile()) failWith('hooks/hooks.json does not exist')
  },
  async R7(input, io, state) {
    const run = await io.validate(state.dir)
    const parsed = parseValidate(run.output)
    if (run.code !== 0 || !parsed.passed) failWith(`claude plugin validate failed:\n${lastLines(run.output)}`)
    if (!parsed.hooks.length) failWith('validate found no hooks; a mod registers at least one hook')
    state.hooks = parsed.hooks
    state.calls = parsed.calls
  },
  async R8(input, io, state) {
    const errors = await io.checkShape(state.dir, state.entry.screenshots ?? [])
    if (errors.length) failWith(errors.join('\n'))
  },
  async R9(input, io, state) {
    const run = await io.test(state.dir)
    const counts = parseTestRun(run.output)
    if (run.code !== 0 || counts.failed > 0) failWith(`claude plugin test failed:\n${lastLines(run.output)}`)
    if (counts.total < 1) failWith('no tests ran; add at least one *.test.ts file')
    state.testCount = counts.total
  },
  async R10(input, io, state) {
    const lock = input.lockOnMain
    if (lock && compareSemver(state.manifest.version, lock.version) <= 0) {
      failWith(`version ${state.manifest.version} is not higher than the listed ${lock.version}`)
    }
  },
}

function pickManifest(manifest) {
  const author = typeof manifest.author === 'string' ? { name: manifest.author } : manifest.author
  const optional = Object.fromEntries(['homepage', 'repository']
    .filter(key => typeof manifest[key] === 'string')
    .map(key => [key, manifest[key]]))
  return { description: manifest.description, author, license: manifest.license, ...optional }
}

function resultFrom(state) {
  return {
    name: state.entry.name, sha: state.sha, ref: state.entry.source.ref, version: state.manifest.version,
    hooks: state.hooks, calls: state.calls, testCount: state.testCount, manifest: pickManifest(state.manifest),
  }
}

export async function runRules(input, io) {
  const state = {}
  const outcomes = []
  let failure = null
  for (const rule of RULES) {
    if (failure) { outcomes.push({ id: rule.id, name: rule.name, status: 'skip' }); continue }
    try {
      await STEPS[rule.id](input, io, state)
      outcomes.push({ id: rule.id, name: rule.name, status: 'pass' })
    } catch (error) {
      if (!(error instanceof RuleFailure)) console.error(error)
      const message = error instanceof RuleFailure ? error.message : `internal error: ${error.message}`
      failure = { id: rule.id, name: rule.name, status: 'fail', message, hint: rule.hint }
      outcomes.push(failure)
    }
  }
  return { ok: !failure, rules: outcomes, result: failure ? null : resultFrom(state) }
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm test --prefix /Users/mohammad/Desktop/baselane/mods-catalog`
Expected: PASS.

- [ ] **Step 5: Prove a test can fail**

In a scratch copy, change `<= 0` in R10 to `< 0` and confirm `R10 needs a higher version than the listed one` fails for `0.2.0`.

- [ ] **Step 6: Commit**

```bash
git -C /Users/mohammad/Desktop/baselane/mods-catalog add lib/rules.mjs test/rules.test.mjs
git -C /Users/mohammad/Desktop/baselane/mods-catalog commit -m "Add the rules engine, R1 to R10"
```

---

### Task 8: PR comment and PR input

**Files:**
- Create: `lib/report.mjs`, `lib/pr-input.mjs`, `test/report.test.mjs`, `test/pr-input.test.mjs`

**Interfaces:**
- Consumes: `RULES` from `lib/rules.mjs`; `makeGitRepo`, `writeTree` from helpers.
- Produces:
  - `COMMENT_MARKER = '<!-- mods-catalog-check -->'`, `renderComment(report): string`. Rule names come from `RULES`, never from the report. Messages appear only inside `~~~` fences.
  - `gatherInput({ base, head, author }, gitText?: (args: string[]) => string): RulesInput` (the `input` shape of `runRules`). The default `gitText` runs `git` in `process.cwd()`.

- [ ] **Step 1: Write the failing tests**

`test/report.test.mjs`:
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { COMMENT_MARKER, renderComment } from '../lib/report.mjs'

const PASSED = {
  ok: true,
  rules: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10'].map(id => ({ id, status: 'pass' })),
  result: { name: 'cost-meter', sha: 'a'.repeat(40), version: '0.2.0', hooks: ['tool.call'], calls: ['$.ui.toast'], testCount: 3 },
}

test('a passing report starts with the marker and names the mod and SHA', () => {
  const body = renderComment(PASSED)
  assert.ok(body.startsWith(COMMENT_MARKER))
  assert.match(body, /All checks passed for `cost-meter` 0\.2\.0 at `aaaaaaaaaaaa`/)
  assert.match(body, /\| R7 \| Validate \| ✔ \|/)
  assert.match(body, /`tool\.call`/)
})

test('a failing report shows the message in a fence and the hint', () => {
  const rules = [{ id: 'R1', status: 'pass' }, { id: 'R2', status: 'fail', message: 'bad\n@someone [x](https://evil)', hint: 'Fix the entry.' }]
  const body = renderComment({ ok: false, rules, result: null })
  assert.match(body, /\| R2 \| Entry \| ✘ \|/)
  assert.match(body, /\| R3 \| Owner \| - \|/)
  assert.match(body, /~~~\nbad\n@someone \[x\]\(https:\/\/evil\)\n~~~/)
  assert.match(body, /Fix the entry\./)
})

test('a forged rule name or fence in the report cannot break out', () => {
  const rules = [{ id: 'R1', name: 'FORGED', status: 'fail', message: 'a\n~~~\n# heading' }]
  const body = renderComment({ ok: false, rules, result: null })
  assert.doesNotMatch(body, /FORGED/)
  assert.doesNotMatch(body, /\n~~~\n# heading/)
})
```

`test/pr-input.test.mjs`:
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { gatherInput } from '../lib/pr-input.mjs'
import { makeGitRepo, writeTree } from './helpers.mjs'

async function catalog() {
  const repo = await makeGitRepo()
  await writeTree(repo.dir, {
    'renames.json': { gone: null },
    'entries/old.json': { name: 'old' },
    'lock/old.json': { name: 'old', version: '1.0.0', submitter: 'bob' },
  })
  repo.run(['add', '.'])
  repo.run(['commit', '-qm', 'base'])
  const base = repo.run(['rev-parse', 'HEAD']).trim()
  const gitText = args => execFileSync('git', ['-C', repo.dir, ...args], { encoding: 'utf8' })
  return { repo, base, gitText }
}

test('a new entry: one added file, its text, the listed and removed names, no lock', async () => {
  const { repo, base, gitText } = await catalog()
  await writeTree(repo.dir, { 'entries/new.json': '{"name":"new"}' })
  repo.run(['add', '.'])
  repo.run(['commit', '-qm', 'add new'])
  const head = repo.run(['rev-parse', 'HEAD']).trim()
  assert.deepEqual(gatherInput({ base, head, author: 'carol' }, gitText), {
    changedFiles: [{ status: 'A', path: 'entries/new.json' }],
    entryText: '{"name":"new"}',
    prAuthor: 'carol',
    listedNames: ['old'],
    renamedNames: ['gone'],
    lockOnMain: null,
  })
})

test('an update reads the lock from the base commit', async () => {
  const { repo, base, gitText } = await catalog()
  await writeTree(repo.dir, { 'entries/old.json': { name: 'old', category: 'band' } })
  repo.run(['commit', '-qam', 'update old'])
  const head = repo.run(['rev-parse', 'HEAD']).trim()
  const input = gatherInput({ base, head, author: 'bob' }, gitText)
  assert.deepEqual(input.changedFiles, [{ status: 'M', path: 'entries/old.json' }])
  assert.deepEqual(input.lockOnMain, { name: 'old', version: '1.0.0', submitter: 'bob' })
})

test('a removal has no entry text', async () => {
  const { repo, base, gitText } = await catalog()
  repo.run(['rm', '-q', 'entries/old.json'])
  repo.run(['commit', '-qm', 'remove'])
  const head = repo.run(['rev-parse', 'HEAD']).trim()
  const input = gatherInput({ base, head, author: 'bob' }, gitText)
  assert.deepEqual(input.changedFiles, [{ status: 'D', path: 'entries/old.json' }])
  assert.equal(input.entryText, null)
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test --prefix /Users/mohammad/Desktop/baselane/mods-catalog`
Expected: FAIL with `Cannot find module '.../lib/report.mjs'`.

- [ ] **Step 3: Write the code**

`lib/report.mjs`:
```js
import { RULES } from './rules.mjs'

export const COMMENT_MARKER = '<!-- mods-catalog-check -->'
const ICON = { pass: '✔', fail: '✘', skip: '-' }

// Report text comes from untrusted mod output: keep it inside a fence it cannot close.
const fence = text => `~~~\n${String(text).replaceAll('~~~', '~ ~ ~')}\n~~~`

function table(report) {
  const byId = new Map(report.rules.map(rule => [rule.id, rule]))
  const rows = RULES.map(rule => `| ${rule.id} | ${rule.name} | ${ICON[byId.get(rule.id)?.status] ?? '-'} |`)
  return ['| Rule | Check | Result |', '| :- | :- | :- |', ...rows].join('\n')
}

function failureDetail(report) {
  const failure = report.rules.find(rule => rule.status === 'fail')
  if (!failure) return ''
  const rule = RULES.find(r => r.id === failure.id)
  return `\n\n**${failure.id} failed.**\n\n${fence(failure.message ?? '')}\n\n${rule?.hint ?? ''}`
}

function capabilities(result) {
  const list = items => items.map(item => `\`${item}\``).join(', ') || 'none'
  return `\n\nHooks: ${list(result.hooks)}\n\nCalls: ${list(result.calls)}\n\nTests run: ${result.testCount}`
}

export function renderComment(report) {
  const summary = report.ok
    ? `All checks passed for \`${report.result.name}\` ${report.result.version} at \`${report.result.sha.slice(0, 12)}\`.`
    : 'A check failed. Fix the item marked ✘, then push a new commit to this PR.'
  const detail = report.ok ? capabilities(report.result) : failureDetail(report)
  return `${COMMENT_MARKER}\n${summary}\n\n${table(report)}${detail}\n`
}
```

`lib/pr-input.mjs`:
```js
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const defaultGit = args => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

function parseJsonOrNull(text) {
  if (text === null) return null
  try { return JSON.parse(text) } catch { return null }
}

function changedFiles(gitText, base, head) {
  return gitText(['diff', '--name-status', '--no-renames', `${base}...${head}`])
    .trim().split('\n').filter(Boolean)
    .map(line => {
      const [status, ...rest] = line.split('\t')
      return { status: status[0], path: rest.join('\t') }
    })
}

export function gatherInput({ base, head, author }, gitText = defaultGit) {
  const show = (ref, file) => { try { return gitText(['show', `${ref}:${file}`]) } catch { return null } }
  const files = changedFiles(gitText, base, head)
  const single = files.length === 1 ? files[0] : null
  const name = single ? path.basename(single.path, '.json') : null
  const listedNames = gitText(['ls-tree', '--name-only', base, 'lock/'])
    .trim().split('\n').filter(Boolean).map(file => path.basename(file, '.json'))
  return {
    changedFiles: files,
    entryText: single && single.status !== 'D' ? show(head, single.path) : null,
    prAuthor: author,
    listedNames,
    renamedNames: Object.keys(parseJsonOrNull(show(base, 'renames.json')) ?? {}),
    lockOnMain: name ? parseJsonOrNull(show(base, `lock/${name}.json`)) : null,
  }
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm test --prefix /Users/mohammad/Desktop/baselane/mods-catalog`
Expected: PASS.

- [ ] **Step 5: Prove a test can fail**

In a scratch copy, remove the `replaceAll('~~~', '~ ~ ~')` call and confirm `a forged rule name or fence in the report cannot break out` fails.

- [ ] **Step 6: Commit**

```bash
git -C /Users/mohammad/Desktop/baselane/mods-catalog add lib/report.mjs lib/pr-input.mjs test/report.test.mjs test/pr-input.test.mjs
git -C /Users/mohammad/Desktop/baselane/mods-catalog commit -m "Add the PR comment and PR input gathering"
```

---

### Task 9: Lock and merge verification

**Files:**
- Create: `lib/lock.mjs`, `lib/merge.mjs`, `test/lock.test.mjs`, `test/merge.test.mjs`

**Interfaces:**
- Consumes: `NAME_PATTERN`, `parseSemver`, `compareSemver`.
- Produces:
  - `makeLock(result, { previous: Lock | null, submitter: string, now: string /* YYYY-MM-DD */ }): Lock` where `Lock = Result & { submitter, listedAt, updatedAt }`.
  - `validateReport(report: unknown): string[]` (checks the untrusted artifact shape: `ok`, `rules`, `prNumber`, `headSha`, `prAuthor`, and `result` when `ok`).
  - `prMatchesRun(pr, runHeadSha: string): boolean`.
  - `verifyForMerge({ report, pr, files, entry, lsRemoteSha, lockOnMain }): string[]`.

- [ ] **Step 1: Write the failing tests**

`test/lock.test.mjs`:
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeLock } from '../lib/lock.mjs'

const RESULT = { name: 'x', sha: 'a'.repeat(40), ref: 'x--v1.0.0', version: '1.0.0', hooks: ['tool.call'], calls: [], testCount: 2, manifest: { description: 'd', author: { name: 'a' }, license: 'MIT' } }

test('a new lock records the submitter and today as both dates', () => {
  assert.deepEqual(makeLock(RESULT, { previous: null, submitter: 'alice', now: '2026-10-05' }), {
    ...RESULT, submitter: 'alice', listedAt: '2026-10-05', updatedAt: '2026-10-05',
  })
})

test('an update keeps the first submitter and listing date', () => {
  const previous = { ...RESULT, submitter: 'alice', listedAt: '2026-01-01', updatedAt: '2026-01-01' }
  const lock = makeLock({ ...RESULT, version: '1.1.0' }, { previous, submitter: 'maintainer', now: '2026-10-05' })
  assert.equal(lock.submitter, 'alice')
  assert.equal(lock.listedAt, '2026-01-01')
  assert.equal(lock.updatedAt, '2026-10-05')
  assert.equal(lock.version, '1.1.0')
})
```

`test/merge.test.mjs`:
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateReport, prMatchesRun, verifyForMerge } from '../lib/merge.mjs'

const HEAD = 'c'.repeat(40)
const SHA = 'a'.repeat(40)
const REPORT = {
  ok: true, prNumber: 7, headSha: HEAD, prAuthor: 'alice',
  rules: [{ id: 'R1', status: 'pass' }],
  result: { name: 'x', sha: SHA, ref: 'v1', version: '1.0.0', hooks: ['tool.call'], calls: [], testCount: 1, manifest: { description: 'd', author: { name: 'a' }, license: 'MIT' } },
}
const PR = { state: 'open', head: { sha: HEAD }, user: { login: 'alice' } }
const FILES = [{ filename: 'entries/x.json', status: 'added' }]
const ENTRY = { name: 'x', source: { source: 'github', repo: 'alice/x', ref: 'v1' }, category: 'band' }
const good = change => ({ report: REPORT, pr: PR, files: FILES, entry: ENTRY, lsRemoteSha: SHA, lockOnMain: null, ...change })

test('a well-formed report has no shape errors', () => {
  assert.deepEqual(validateReport(REPORT), [])
  assert.deepEqual(validateReport({ ...REPORT, ok: false, result: null }), [])
})

test('a malformed report is refused', () => {
  const cases = [null, [], { ...REPORT, headSha: 'short' }, { ...REPORT, prNumber: '7' }, { ...REPORT, result: { ...REPORT.result, sha: 'x' } },
    { ...REPORT, result: { ...REPORT.result, name: '../x' } }, { ...REPORT, result: { ...REPORT.result, testCount: 0 } },
    { ...REPORT, result: { ...REPORT.result, hooks: 'tool.call' } }, { ...REPORT, result: { ...REPORT.result, version: 'one' } }]
  for (const report of cases) assert.ok(validateReport(report).length > 0, JSON.stringify(report))
})

test('prMatchesRun needs the PR head to be the checked commit', () => {
  assert.equal(prMatchesRun(PR, HEAD), true)
  assert.equal(prMatchesRun({ ...PR, head: { sha: 'd'.repeat(40) } }, HEAD), false)
})

test('a good PR verifies with no errors', () => {
  assert.deepEqual(verifyForMerge(good()), [])
})

test('each broken condition stops the merge', () => {
  const cases = {
    closed: { pr: { ...PR, state: 'closed' } },
    'new commit': { pr: { ...PR, head: { sha: 'd'.repeat(40) } } },
    'two files': { files: [...FILES, { filename: 'entries/y.json', status: 'added' }] },
    'workflow file': { files: [{ filename: '.github/workflows/check.yml', status: 'modified' }] },
    'other entry': { files: [{ filename: 'entries/y.json', status: 'added' }] },
    removal: { files: [{ filename: 'entries/x.json', status: 'removed' }] },
    'tag moved': { lsRemoteSha: 'b'.repeat(40) },
    'tag gone': { lsRemoteSha: null },
    'ref differs': { entry: { ...ENTRY, source: { ...ENTRY.source, ref: 'v2' } } },
    'name differs': { entry: { ...ENTRY, name: 'y' } },
    'other owner': { lockOnMain: { name: 'x', version: '0.9.0', submitter: 'bob' } },
    'no version bump': { lockOnMain: { name: 'x', version: '1.0.0', submitter: 'alice' } },
    'failed report': { report: { ...REPORT, ok: false } },
  }
  for (const [label, change] of Object.entries(cases)) {
    assert.ok(verifyForMerge(good(change)).length > 0, label)
  }
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test --prefix /Users/mohammad/Desktop/baselane/mods-catalog`
Expected: FAIL with `Cannot find module '.../lib/lock.mjs'`.

- [ ] **Step 3: Write the code**

`lib/lock.mjs`:
```js
export function makeLock(result, { previous, submitter, now }) {
  return {
    ...result,
    submitter: previous?.submitter ?? submitter,
    listedAt: previous?.listedAt ?? now,
    updatedAt: now,
  }
}
```

`lib/merge.mjs`:
```js
import { NAME_PATTERN } from './names.mjs'
import { parseSemver, compareSemver } from './semver.mjs'

const HEX40 = /^[0-9a-f]{40}$/
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const isStringList = value => Array.isArray(value) && value.length <= 300 && value.every(item => typeof item === 'string' && item.length <= 300)

function resultErrors(result) {
  if (!isObject(result)) return ['result is missing']
  const errors = []
  if (!NAME_PATTERN.test(result.name ?? '')) errors.push('result.name is not a valid name')
  if (!HEX40.test(result.sha ?? '')) errors.push('result.sha is not a full SHA')
  if (typeof result.ref !== 'string' || !result.ref) errors.push('result.ref is missing')
  if (!parseSemver(result.version)) errors.push('result.version is not semver')
  if (!isStringList(result.hooks) || !isStringList(result.calls)) errors.push('result.hooks and result.calls must be lists of strings')
  if (!Number.isInteger(result.testCount) || result.testCount < 1) errors.push('result.testCount must be 1 or more')
  const m = result.manifest
  if (!isObject(m) || typeof m.description !== 'string' || m.description.length > 200 || typeof m.license !== 'string' || !isObject(m.author)) {
    errors.push('result.manifest is not valid')
  }
  return errors
}

// The report comes from a run that executed untrusted code: treat every field as data.
export function validateReport(report) {
  if (!isObject(report)) return ['the report is not an object']
  const errors = []
  if (typeof report.ok !== 'boolean') errors.push('ok must be true or false')
  if (!Number.isInteger(report.prNumber) || report.prNumber < 1) errors.push('prNumber must be a positive integer')
  if (!HEX40.test(report.headSha ?? '')) errors.push('headSha is not a full SHA')
  if (!Array.isArray(report.rules)) errors.push('rules must be a list')
  if (report.ok === true) errors.push(...resultErrors(report.result))
  return errors
}

export function prMatchesRun(pr, runHeadSha) {
  return pr?.head?.sha === runHeadSha
}

function ownerAndVersionErrors(report, pr, lockOnMain) {
  if (!lockOnMain) return []
  const errors = []
  if (lockOnMain.submitter !== pr.user.login) errors.push(`${lockOnMain.name} belongs to ${lockOnMain.submitter}`)
  if (compareSemver(report.result.version, lockOnMain.version) <= 0) errors.push('the version is not higher than the listed one')
  return errors
}

export function verifyForMerge({ report, pr, files, entry, lsRemoteSha, lockOnMain }) {
  if (!report.ok) return ['the check did not pass']
  const errors = []
  const name = report.result.name
  if (pr.state !== 'open') errors.push('the PR is not open')
  if (pr.head.sha !== report.headSha) errors.push('the PR has commits that were not checked')
  const onlyEntry = files.length === 1 && files[0].filename === `entries/${name}.json` && ['added', 'modified'].includes(files[0].status)
  if (!onlyEntry) errors.push(`the PR must change only entries/${name}.json`)
  if (entry?.name !== name) errors.push('the entry name differs from the checked name')
  if (entry?.source?.ref !== report.result.ref) errors.push('the entry ref differs from the checked ref')
  if (lsRemoteSha !== report.result.sha) errors.push('the tag no longer points to the checked commit')
  return [...errors, ...ownerAndVersionErrors(report, pr, lockOnMain)]
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm test --prefix /Users/mohammad/Desktop/baselane/mods-catalog`
Expected: PASS.

- [ ] **Step 5: Prove a test can fail**

In a scratch copy, delete the `lsRemoteSha` line in `verifyForMerge` and confirm the `tag moved` case fails.

- [ ] **Step 6: Commit**

```bash
git -C /Users/mohammad/Desktop/baselane/mods-catalog add lib/lock.mjs lib/merge.mjs test/lock.test.mjs test/merge.test.mjs
git -C /Users/mohammad/Desktop/baselane/mods-catalog commit -m "Add lock files and merge verification"
```

---

### Task 10: Marketplace generator and publish script

**Files:**
- Create: `lib/marketplace.mjs`, `scripts/publish.mjs`, `renames.json`, `verified.json`, `test/marketplace.test.mjs`

**Interfaces:**
- Produces: `MARKETPLACE_NAME`, `OWNER`, `GALLERY_URL`, `isVerified(name, sha, verified): boolean`, `pairListings(entries: Map, locks: Map): { pairs: {entry, lock}[], warnings: string[] }` (pairs sorted by name), `marketplaceEntry(pair, verified): object`, `buildMarketplace({ pairs, verified, renames }): object` (throws when a listed name is also in `renames`).
- Produces: `node scripts/publish.mjs [root]` writes `<root>/.claude-plugin/marketplace.json` and prints warnings to stderr.

- [ ] **Step 1: Write the failing tests**

`test/marketplace.test.mjs`:
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pairListings, buildMarketplace, isVerified } from '../lib/marketplace.mjs'
import { tempDir, writeTree } from './helpers.mjs'

const SHA = 'a'.repeat(40)
const ENTRY = { name: 'cost-meter', source: { source: 'git-subdir', url: 'baselane-sh/mods', path: 'plugins/cost-meter', ref: 'cost-meter--v0.2.0' }, category: 'band', tags: ['cost'] }
const LOCK = {
  name: 'cost-meter', sha: SHA, ref: 'cost-meter--v0.2.0', version: '0.2.0', hooks: ['tool.call'], calls: ['$.ui.toast'], testCount: 3,
  manifest: { description: 'A band.', author: { name: 'Baselane', url: 'https://baselane.sh' }, license: 'MIT' },
  submitter: 'mohammad0omar', listedAt: '2026-10-05', updatedAt: '2026-10-05',
}

test('pairListings pairs entries with locks and warns about the rest', () => {
  const entries = new Map([['cost-meter', ENTRY], ['new', { name: 'new' }]])
  const locks = new Map([['cost-meter', LOCK], ['orphan', { name: 'orphan' }]])
  const { pairs, warnings } = pairListings(entries, locks)
  assert.deepEqual(pairs, [{ entry: ENTRY, lock: LOCK }])
  assert.deepEqual(warnings, ['entries/new.json has no lock file and is not listed', 'lock/orphan.json has no entry and is not listed'])
})

test('buildMarketplace writes the golden marketplace', () => {
  const marketplace = buildMarketplace({ pairs: [{ entry: ENTRY, lock: LOCK }], verified: [{ name: 'cost-meter', sha: SHA, reviewer: 'm', date: '2026-10-05' }], renames: { gone: null } })
  assert.deepEqual(marketplace, {
    name: 'baselane-mods',
    owner: { name: 'Baselane', url: 'https://baselane.sh' },
    description: 'Claude Code mods, checked and pinned. Browse them at https://mods.baselane.sh',
    forceRemoveDeletedPlugins: true,
    renames: { gone: null },
    plugins: [{
      name: 'cost-meter',
      source: { source: 'git-subdir', url: 'baselane-sh/mods', path: 'plugins/cost-meter', ref: 'cost-meter--v0.2.0', sha: SHA },
      description: 'A band.',
      author: { name: 'Baselane', url: 'https://baselane.sh' },
      license: 'MIT',
      homepage: 'https://mods.baselane.sh/mods/cost-meter/',
      repository: 'https://github.com/baselane-sh/mods',
      category: 'band',
      tags: ['cost'],
      metadata: {
        version: '0.2.0', submitter: 'mohammad0omar', verified: true,
        hooks: ['tool.call'], calls: ['$.ui.toast'], gallery: 'https://mods.baselane.sh/mods/cost-meter/',
      },
    }],
  })
})

test('verification is tied to the SHA', () => {
  assert.equal(isVerified('cost-meter', SHA, [{ name: 'cost-meter', sha: 'b'.repeat(40) }]), false)
})

test('a listed name that is also in renames is an error', () => {
  assert.throws(() => buildMarketplace({ pairs: [{ entry: ENTRY, lock: LOCK }], verified: [], renames: { 'cost-meter': null } }), /also in renames\.json/)
})

const SCRIPT = fileURLToPath(new URL('../scripts/publish.mjs', import.meta.url))
const hasClaude = (() => { try { execFileSync('claude', ['--version']); return true } catch { return false } })()

test('the publish script writes a marketplace that claude plugin validate accepts', { skip: !hasClaude && 'claude is not on PATH' }, async () => {
  const root = await writeTree(await tempDir(), {
    'entries/cost-meter.json': ENTRY, 'lock/cost-meter.json': LOCK, 'verified.json': [], 'renames.json': {},
  })
  execFileSync('node', [SCRIPT, root])
  const written = JSON.parse(await readFile(path.join(root, '.claude-plugin/marketplace.json'), 'utf8'))
  assert.equal(written.plugins[0].metadata.verified, false)
  const out = execFileSync('claude', ['plugin', 'validate', root], { encoding: 'utf8' })
  assert.match(out, /Validation passed/)
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test --prefix /Users/mohammad/Desktop/baselane/mods-catalog`
Expected: FAIL with `Cannot find module '.../lib/marketplace.mjs'`.

- [ ] **Step 3: Write the code**

`lib/marketplace.mjs`:
```js
import { sourceRepo } from './entry.mjs'

export const MARKETPLACE_NAME = 'baselane-mods'
export const OWNER = Object.freeze({ name: 'Baselane', url: 'https://baselane.sh' })
export const GALLERY_URL = 'https://mods.baselane.sh'

export function isVerified(name, sha, verified) {
  return verified.some(item => item.name === name && item.sha === sha)
}

export function pairListings(entries, locks) {
  const pairs = []
  const warnings = []
  for (const [name, entry] of entries) {
    const lock = locks.get(name)
    if (lock) pairs.push({ entry, lock })
    else warnings.push(`entries/${name}.json has no lock file and is not listed`)
  }
  for (const name of locks.keys()) {
    if (!entries.has(name)) warnings.push(`lock/${name}.json has no entry and is not listed`)
  }
  return { pairs: pairs.sort((a, b) => a.entry.name.localeCompare(b.entry.name)), warnings }
}

// The version goes in metadata: the docs say not to set it in both the entry and plugin.json.
export function marketplaceEntry({ entry, lock }, verified) {
  const gallery = `${GALLERY_URL}/mods/${entry.name}/`
  const { manifest } = lock
  return {
    name: entry.name,
    source: { ...entry.source, sha: lock.sha },
    description: manifest.description,
    author: manifest.author,
    license: manifest.license,
    homepage: manifest.homepage ?? gallery,
    repository: manifest.repository ?? `https://github.com/${sourceRepo(entry.source)}`,
    category: entry.category,
    ...(entry.tags?.length ? { tags: entry.tags } : {}),
    metadata: {
      version: lock.version, submitter: lock.submitter, verified: isVerified(entry.name, lock.sha, verified),
      hooks: lock.hooks, calls: lock.calls, gallery,
    },
  }
}

export function buildMarketplace({ pairs, verified, renames }) {
  for (const { entry } of pairs) {
    if (Object.hasOwn(renames, entry.name)) throw new Error(`${entry.name} is listed and also in renames.json`)
  }
  return {
    name: MARKETPLACE_NAME,
    owner: { ...OWNER },
    description: `Claude Code mods, checked and pinned. Browse them at ${GALLERY_URL}`,
    forceRemoveDeletedPlugins: true,
    ...(Object.keys(renames).length ? { renames } : {}),
    plugins: pairs.map(pair => marketplaceEntry(pair, verified)),
  }
}
```

`scripts/publish.mjs`:
```js
#!/usr/bin/env node
// Writes .claude-plugin/marketplace.json from entries/, lock/, verified.json and renames.json.
// Reads only files in the repo; needs no network.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pairListings, buildMarketplace } from '../lib/marketplace.mjs'

const root = path.resolve(process.argv[2] ?? '.')

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    throw new Error(`publish: cannot read ${path.relative(root, file)}: ${error.message}`)
  }
}

async function readJsonDir(dir) {
  const names = await readdir(path.join(root, dir)).catch(() => [])
  const pairs = await Promise.all(names.filter(n => n.endsWith('.json'))
    .map(async n => [path.basename(n, '.json'), await readJson(path.join(root, dir, n))]))
  return new Map(pairs)
}

const { pairs, warnings } = pairListings(await readJsonDir('entries'), await readJsonDir('lock'))
for (const warning of warnings) console.warn(`publish: ${warning}`)
const marketplace = buildMarketplace({
  pairs,
  verified: await readJson(path.join(root, 'verified.json')),
  renames: await readJson(path.join(root, 'renames.json')),
})
await mkdir(path.join(root, '.claude-plugin'), { recursive: true })
await writeFile(path.join(root, '.claude-plugin', 'marketplace.json'), `${JSON.stringify(marketplace, null, 2)}\n`)
console.log(`publish: ${marketplace.plugins.length} mods listed`)
```

`renames.json`:
```json
{}
```

`verified.json`:
```json
[]
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm test --prefix /Users/mohammad/Desktop/baselane/mods-catalog`
Expected: PASS, including the real `claude plugin validate` test.

- [ ] **Step 5: Prove a test can fail**

In a scratch copy, add `version: lock.version,` to the object `marketplaceEntry` returns, and confirm the golden test fails.

- [ ] **Step 6: Commit**

```bash
git -C /Users/mohammad/Desktop/baselane/mods-catalog add lib/marketplace.mjs scripts/publish.mjs renames.json verified.json test/marketplace.test.mjs
git -C /Users/mohammad/Desktop/baselane/mods-catalog commit -m "Add the marketplace generator and publish script"
```

---

### Task 11: Check, merge and maintainer scripts, with an end-to-end test

**Files:**
- Create: `lib/io.mjs`, `scripts/check-pr.mjs`, `scripts/merge-pr.mjs`, `scripts/lock.mjs`, `test/e2e.test.mjs`

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `realIo({ gitBase?: string }): io` in `lib/io.mjs` (the `io` shape of `runRules`, with real git, the real `claude` CLI and `checkShape`; `gitBase` defaults to `process.env.MODS_CATALOG_GIT_BASE ?? 'https://github.com/'`).
  - `node scripts/check-pr.mjs <out.json>` with env `PR_NUMBER`, `PR_AUTHOR`, `HEAD_SHA`, `BASE_SHA`. Writes the report (adds `prNumber`, `headSha`, `prAuthor`). Exit 1 when a rule fails.
  - `node scripts/merge-pr.mjs <report.json>` with env `GITHUB_REPOSITORY`, `WORKFLOW_HEAD_SHA`, `CHECK_CONCLUSION`, `GH_TOKEN`.
  - `node scripts/lock.mjs --submitter <login> <name...>` writes `lock/<name>.json` for each name that passes. Exit 1 if any fails.

- [ ] **Step 1: Write the real IO**

`lib/io.mjs`:
```js
import { mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { repoUrl, resolveTag, fetchTag } from './git.mjs'
import { runClaude } from './claude-cli.mjs'
import { checkShape } from './shape.mjs'

// MODS_CATALOG_GIT_BASE lets the end-to-end test serve repos from file:// URLs.
export function realIo({ gitBase = process.env.MODS_CATALOG_GIT_BASE ?? 'https://github.com/' } = {}) {
  return {
    repoUrl: repo => repoUrl(repo, gitBase),
    resolveTag,
    fetchMod: async (url, tag, sha) => fetchTag(url, tag, sha, await mkdtemp(path.join(os.tmpdir(), 'mod-'))),
    validate: dir => runClaude(['plugin', 'validate', dir]),
    test: dir => runClaude(['plugin', 'test', dir]),
    checkShape,
  }
}
```

- [ ] **Step 2: Write the check script**

`scripts/check-pr.mjs`:
```js
#!/usr/bin/env node
// check.yml entry point. Runs untrusted mod code, so the job has no secrets and a
// read-only token. Writes the report even when a rule fails, then exits 1.
import { writeFile } from 'node:fs/promises'
import { gatherInput } from '../lib/pr-input.mjs'
import { runRules } from '../lib/rules.mjs'
import { realIo } from '../lib/io.mjs'

const [outPath] = process.argv.slice(2)
const { PR_NUMBER, PR_AUTHOR, HEAD_SHA, BASE_SHA } = process.env
if (!outPath || !PR_NUMBER || !PR_AUTHOR || !HEAD_SHA || !BASE_SHA) {
  console.error('usage: PR_NUMBER PR_AUTHOR HEAD_SHA BASE_SHA node scripts/check-pr.mjs <out.json>')
  process.exit(2)
}

const input = gatherInput({ base: BASE_SHA, head: HEAD_SHA, author: PR_AUTHOR })
const report = await runRules(input, realIo())
const full = { ...report, prNumber: Number(PR_NUMBER), headSha: HEAD_SHA, prAuthor: PR_AUTHOR }
await writeFile(outPath, `${JSON.stringify(full, null, 2)}\n`)
for (const rule of report.rules) console.log(`${rule.id} ${rule.name}: ${rule.status}${rule.message ? `\n${rule.message}` : ''}`)
process.exitCode = report.ok ? 0 : 1
```

- [ ] **Step 3: Write the maintainer lock script**

`scripts/lock.mjs`:
```js
#!/usr/bin/env node
// Maintainer path (spec 4.4): run R2 to R10 on entries already in the working tree
// and write their lock files. Usage: node scripts/lock.mjs --submitter <login> <name...>
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { runRules } from '../lib/rules.mjs'
import { realIo } from '../lib/io.mjs'
import { makeLock } from '../lib/lock.mjs'

const args = process.argv.slice(2)
const at = args.indexOf('--submitter')
const submitter = at >= 0 ? args[at + 1] : null
const names = args.filter((_, i) => i !== at && i !== at + 1)
if (!submitter || !names.length) {
  console.error('usage: node scripts/lock.mjs --submitter <login> <name...>')
  process.exit(2)
}

const readOrNull = file => readFile(file, 'utf8').catch(() => null)
const today = new Date().toISOString().slice(0, 10)
const listedNames = (await readdir('lock').catch(() => [])).map(f => path.basename(f, '.json'))
const renamedNames = Object.keys(JSON.parse(await readFile('renames.json', 'utf8')))
let failures = 0

for (const name of names) {
  const lockText = await readOrNull(`lock/${name}.json`)
  const lockOnMain = lockText ? JSON.parse(lockText) : null
  const input = {
    changedFiles: [{ status: lockOnMain ? 'M' : 'A', path: `entries/${name}.json` }],
    entryText: await readOrNull(`entries/${name}.json`),
    prAuthor: lockOnMain?.submitter ?? submitter,
    listedNames: listedNames.filter(listed => listed !== name),
    renamedNames,
    lockOnMain,
  }
  const report = await runRules(input, realIo())
  const failure = report.rules.find(rule => rule.status === 'fail')
  if (failure) {
    failures += 1
    console.error(`${name}: ${failure.id} ${failure.name} failed\n${failure.message}`)
    continue
  }
  const lock = makeLock(report.result, { previous: lockOnMain, submitter, now: today })
  await mkdir('lock', { recursive: true })
  await writeFile(`lock/${name}.json`, `${JSON.stringify(lock, null, 2)}\n`)
  console.log(`${name}: locked ${lock.version} at ${lock.sha.slice(0, 12)}`)
}
process.exitCode = failures ? 1 : 0
```

- [ ] **Step 4: Write the merge script**

`scripts/merge-pr.mjs`:
```js
#!/usr/bin/env node
// merge.yml entry point. Trusted: never runs PR code. Treats the check report as
// untrusted data and re-checks it against GitHub before it merges and writes the lock.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { validateReport, prMatchesRun, verifyForMerge } from '../lib/merge.mjs'
import { renderComment, COMMENT_MARKER } from '../lib/report.mjs'
import { validateEntry, sourceRepo } from '../lib/entry.mjs'
import { resolveTag, repoUrl } from '../lib/git.mjs'
import { makeLock } from '../lib/lock.mjs'

const { GITHUB_REPOSITORY: repo, WORKFLOW_HEAD_SHA: runHeadSha, CHECK_CONCLUSION: conclusion } = process.env
const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' })
const ghJson = args => JSON.parse(run('gh', ['api', ...args]))
const stop = message => { console.error(`merge: ${message}`); process.exit(1) }
const parseOrNull = text => { try { return JSON.parse(text) } catch { return null } }

function upsertComment(number, body) {
  const filter = `.[] | select(.user.type == "Bot" and (.body | contains("${COMMENT_MARKER}"))) | .id`
  const id = run('gh', ['api', '--paginate', `repos/${repo}/issues/${number}/comments`, '--jq', filter]).trim().split('\n')[0]
  if (id) run('gh', ['api', '-X', 'PATCH', `repos/${repo}/issues/comments/${id}`, '-f', `body=${body}`])
  else run('gh', ['api', `repos/${repo}/issues/${number}/comments`, '-f', `body=${body}`])
}

async function entryAtHead(pr, name) {
  run('git', ['fetch', '-q', 'origin', `pull/${pr.number}/head`])
  let text = null
  try { text = run('git', ['show', `${pr.head.sha}:entries/${name}.json`]) } catch { return null }
  return parseOrNull(text)
}

async function writeLock(report, pr, lockOnMain) {
  run('git', ['pull', '-q', '--ff-only', 'origin', 'main'])
  const lock = makeLock(report.result, { previous: lockOnMain, submitter: pr.user.login, now: new Date().toISOString().slice(0, 10) })
  const file = `lock/${lock.name}.json`
  await mkdir('lock', { recursive: true })
  await writeFile(file, `${JSON.stringify(lock, null, 2)}\n`)
  run('git', ['add', file])
  run('git', ['commit', '-qm', `Lock ${lock.name} ${lock.version} at ${lock.sha.slice(0, 12)}`])
  run('git', ['push', '-q', 'origin', 'HEAD:main'])
}

const report = parseOrNull(await readFile(process.argv[2], 'utf8').catch(() => 'null'))
const shapeErrors = report ? validateReport(report) : ['the check report is missing or not JSON']
if (shapeErrors.length) stop(shapeErrors.join('; '))

const pr = ghJson([`repos/${repo}/pulls/${report.prNumber}`])
if (!prMatchesRun(pr, runHeadSha)) stop('the report names a PR whose head is not the checked commit')
upsertComment(report.prNumber, renderComment(report))
if (conclusion !== 'success' || !report.ok) process.exit(0)

const name = report.result.name
// Two files are enough to refuse the merge, so one small page is enough to decide.
const files = ghJson([`repos/${repo}/pulls/${report.prNumber}/files?per_page=3`])
const entry = await entryAtHead(pr, name)
const lockOnMain = parseOrNull(await readFile(`lock/${name}.json`, 'utf8').catch(() => 'null'))
const entryErrors = entry ? validateEntry(entry, `${name}.json`) : ['the entry cannot be read at the PR head']
const lsRemoteSha = entry ? await resolveTag(repoUrl(sourceRepo(entry.source)), entry.source.ref).catch(() => null) : null
const errors = [...entryErrors, ...verifyForMerge({ report, pr, files, entry, lsRemoteSha, lockOnMain })]
if (errors.length) stop(`not merging: ${errors.join('; ')}`)

run('gh', ['pr', 'merge', String(report.prNumber), '--repo', repo, '--squash', '--match-head-commit', pr.head.sha])
await writeLock(report, pr, lockOnMain)
console.log(`merge: merged #${report.prNumber} and locked ${name}`)
```

- [ ] **Step 5: Write the end-to-end test**

This test builds a fake author repo and a fake catalog repo on disk, runs `check-pr.mjs` against them with real git and the real `claude` CLI, writes the lock, publishes, and installs the mod into a clean home folder.

`test/e2e.test.mjs`:
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeLock } from '../lib/lock.mjs'
import { tempDir, writeTree, makeGitRepo } from './helpers.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = path.join(here, 'fixtures/mods/no-em-dash')
const SCRIPTS = path.join(here, '../scripts')
const hasClaude = spawnSync('claude', ['--version']).status === 0

async function authorRepo(gitBase) {
  const version = JSON.parse(await readFile(path.join(FIXTURE, '.claude-plugin/plugin.json'), 'utf8')).version
  const author = await makeGitRepo(path.join(gitBase, 'acme/mods.git'))
  await cp(FIXTURE, path.join(author.dir, 'plugins/no-em-dash'), { recursive: true })
  author.run(['add', '.'])
  author.run(['commit', '-qm', 'add mod'])
  author.run(['tag', `no-em-dash--v${version}`])
  return { version, tag: `no-em-dash--v${version}` }
}

async function catalogWithPr(tag) {
  const catalog = await makeGitRepo()
  await writeTree(catalog.dir, { 'renames.json': {}, 'verified.json': [] })
  catalog.run(['add', '.'])
  catalog.run(['commit', '-qm', 'base'])
  const base = catalog.run(['rev-parse', 'HEAD']).trim()
  const entry = { name: 'no-em-dash', source: { source: 'git-subdir', url: 'acme/mods', path: 'plugins/no-em-dash', ref: tag }, category: 'guard' }
  await writeTree(catalog.dir, { 'entries/no-em-dash.json': entry })
  catalog.run(['add', '.'])
  catalog.run(['commit', '-qm', 'submit'])
  return { catalog, base, head: catalog.run(['rev-parse', 'HEAD']).trim() }
}

test('a submitted mod is checked, locked, published and installable', { skip: !hasClaude && 'claude is not on PATH', timeout: 300_000 }, async () => {
  const gitBase = await tempDir('git-')
  const { version, tag } = await authorRepo(gitBase)
  const { catalog, base, head } = await catalogWithPr(tag)
  const env = { ...process.env, MODS_CATALOG_GIT_BASE: `file://${gitBase}/`, PR_NUMBER: '1', PR_AUTHOR: 'alice', BASE_SHA: base, HEAD_SHA: head }

  execFileSync('node', [path.join(SCRIPTS, 'check-pr.mjs'), 'report.json'], { cwd: catalog.dir, env, stdio: 'pipe' })
  const report = JSON.parse(await readFile(path.join(catalog.dir, 'report.json'), 'utf8'))
  assert.equal(report.ok, true)
  assert.equal(report.result.version, version)

  const lock = makeLock(report.result, { previous: null, submitter: 'alice', now: '2026-10-05' })
  await mkdir(path.join(catalog.dir, 'lock'), { recursive: true })
  await writeFile(path.join(catalog.dir, 'lock/no-em-dash.json'), JSON.stringify(lock))
  execFileSync('node', [path.join(SCRIPTS, 'publish.mjs'), catalog.dir])

  // Point the published entry at the local author repo so the install needs no network.
  const file = path.join(catalog.dir, '.claude-plugin/marketplace.json')
  const marketplace = JSON.parse(await readFile(file, 'utf8'))
  marketplace.plugins[0].source.url = `file://${gitBase}/acme/mods.git`
  await writeFile(file, JSON.stringify(marketplace))

  const home = await tempDir('home-')
  const claudeEnv = { PATH: process.env.PATH, HOME: home, DISABLE_AUTOUPDATER: '1' }
  execFileSync('claude', ['plugin', 'marketplace', 'add', catalog.dir], { env: claudeEnv })
  execFileSync('claude', ['plugin', 'install', 'no-em-dash@baselane-mods'], { env: claudeEnv })
  const list = execFileSync('claude', ['plugin', 'list'], { env: claudeEnv, encoding: 'utf8' })
  assert.match(list, /no-em-dash@baselane-mods/)
})
```

- [ ] **Step 6: Run the end-to-end test**

Run: `node --test /Users/mohammad/Desktop/baselane/mods-catalog/test/e2e.test.mjs`
Expected: PASS. If `claude plugin install` fails on the `file://` `git-subdir` source, stop: record the exact error and report it. Do not change the source type of the real catalog to make the test pass.

- [ ] **Step 7: Run the whole suite**

Run: `npm test --prefix /Users/mohammad/Desktop/baselane/mods-catalog`
Expected: PASS, no skipped tests on this machine.

- [ ] **Step 8: Commit**

```bash
git -C /Users/mohammad/Desktop/baselane/mods-catalog add lib/io.mjs scripts test/e2e.test.mjs
git -C /Users/mohammad/Desktop/baselane/mods-catalog commit -m "Add the check, merge and maintainer scripts with an end-to-end test"
```

---

### Task 12: Workflows and repo files

**Files:**
- Create: `.github/workflows/check.yml`, `.github/workflows/merge.yml`, `.github/workflows/publish.yml`, `.github/CODEOWNERS`, `.github/ISSUE_TEMPLATE/report.yml`, `README.md`

**Interfaces:**
- Consumes: the scripts from Tasks 10 and 11; action SHAs and the CLI install line from `docs/spike-github.md`.
- Produces: a required status check named `check`; repo variable `CATALOG_APP_ID` and secret `CATALOG_APP_KEY` are read only by `merge.yml` and `publish.yml`.

- [ ] **Step 1: Write `check.yml`**

Replace each `<...-sha>` with the SHA from `docs/spike-github.md`.

```yaml
name: check
on:
  pull_request:
    branches: [main]
permissions:
  contents: read
concurrency:
  group: check-${{ github.event.pull_request.number }}
  cancel-in-progress: true
jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@<checkout-sha> # v4
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: actions/setup-node@<setup-node-sha> # v4
        with:
          node-version: 22
      - run: npm install -g @anthropic-ai/claude-code@2.1.289
        env:
          DISABLE_AUTOUPDATER: '1'
      - run: node scripts/check-pr.mjs check-report.json
        env:
          PR_NUMBER: ${{ github.event.pull_request.number }}
          PR_AUTHOR: ${{ github.event.pull_request.user.login }}
          HEAD_SHA: ${{ github.event.pull_request.head.sha }}
          BASE_SHA: ${{ github.event.pull_request.base.sha }}
      - if: always()
        uses: actions/upload-artifact@<upload-artifact-sha> # v4
        with:
          name: check-report
          path: check-report.json
          if-no-files-found: ignore
          retention-days: 7
```

- [ ] **Step 2: Write `merge.yml`**

```yaml
name: merge
on:
  workflow_run:
    workflows: [check]
    types: [completed]
permissions:
  contents: read
  actions: read
concurrency:
  group: merge
  cancel-in-progress: false
jobs:
  merge:
    if: github.event.workflow_run.event == 'pull_request' && github.event.workflow_run.conclusion != 'cancelled'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - id: app
        uses: actions/create-github-app-token@<app-token-sha> # v1
        with:
          app-id: ${{ vars.CATALOG_APP_ID }}
          private-key: ${{ secrets.CATALOG_APP_KEY }}
      # main's own code only. The PR head is fetched as data inside merge-pr.mjs.
      - uses: actions/checkout@<checkout-sha> # v4
        with:
          ref: main
          token: ${{ steps.app.outputs.token }}
      - uses: actions/setup-node@<setup-node-sha> # v4
        with:
          node-version: 22
      - uses: actions/download-artifact@<download-artifact-sha> # v4
        with:
          name: check-report
          path: report
          run-id: ${{ github.event.workflow_run.id }}
          github-token: ${{ github.token }}
      - run: |
          git config user.name "baselane-mods-catalog[bot]"
          git config user.email "bot@baselane.sh"
          node scripts/merge-pr.mjs report/check-report.json
        env:
          GH_TOKEN: ${{ steps.app.outputs.token }}
          WORKFLOW_HEAD_SHA: ${{ github.event.workflow_run.head_sha }}
          CHECK_CONCLUSION: ${{ github.event.workflow_run.conclusion }}
```

- [ ] **Step 3: Write `publish.yml`**

```yaml
name: publish
on:
  push:
    branches: [main]
    paths-ignore: ['.claude-plugin/marketplace.json']
  schedule:
    - cron: '0 3 * * *'
  workflow_dispatch:
permissions:
  contents: read
concurrency:
  group: publish
  cancel-in-progress: true
jobs:
  publish:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - id: app
        uses: actions/create-github-app-token@<app-token-sha> # v1
        with:
          app-id: ${{ vars.CATALOG_APP_ID }}
          private-key: ${{ secrets.CATALOG_APP_KEY }}
      - uses: actions/checkout@<checkout-sha> # v4
        with:
          ref: main
          token: ${{ steps.app.outputs.token }}
      - uses: actions/setup-node@<setup-node-sha> # v4
        with:
          node-version: 22
      - run: npm install -g @anthropic-ai/claude-code@2.1.289
        env:
          DISABLE_AUTOUPDATER: '1'
      - run: node scripts/publish.mjs
      - run: claude plugin validate .
      - run: |
          git config user.name "baselane-mods-catalog[bot]"
          git config user.email "bot@baselane.sh"
          git add .claude-plugin/marketplace.json
          git diff --cached --quiet || { git commit -m "Publish marketplace.json"; git push origin HEAD:main; }
```

- [ ] **Step 4: Write the repo files**

`.github/CODEOWNERS` (the team is created at launch in Plan C; on the spike repo use `@mohammad0omar`):
```text
*          @baselane-sh/maintainers
/entries/
```

`.github/ISSUE_TEMPLATE/report.yml`:
```yaml
name: Report a mod
description: Tell the maintainers about a mod that is broken, harmful or against the rules. For a security problem, use private vulnerability reporting instead.
labels: [report]
body:
  - type: input
    id: mod
    attributes:
      label: Mod name
      description: The name in the install line.
    validations:
      required: true
  - type: dropdown
    id: kind
    attributes:
      label: What is wrong
      options:
        - It does something its page does not say
        - It is broken
        - It copies another mod
        - Other
    validations:
      required: true
  - type: textarea
    id: details
    attributes:
      label: Details
      description: What you saw, and the steps to see it again.
    validations:
      required: true
```

`README.md`:
```markdown
# Baselane mods catalog

The catalog behind https://mods.baselane.sh. Every mod here passed automated checks and is pinned to the commit that passed them.

## Install a mod

    /plugin marketplace add baselane-sh/mods-catalog
    /plugin install <name>@baselane-mods

Turn on auto-update (`/plugin` > Marketplaces > baselane-mods) so that updates and removals reach you.

## Publish a mod

1. Put your mod in a public github.com repo and push a tag, for example `v1.0.0`.
2. Fork this repo and add one file, `entries/<name>.json`:

        {
          "name": "<name>",
          "source": { "source": "github", "repo": "<owner>/<repo>", "ref": "v1.0.0" },
          "category": "guard",
          "tags": ["git"],
          "screenshots": ["docs/screenshot.png"]
        }

   For a mod in a subfolder, use `{ "source": "git-subdir", "url": "<owner>/<repo>", "path": "<folder>", "ref": "<tag>" }`.
3. Open a pull request. The bot runs the checks and comments the result. When every check passes, it merges.

Your first pull request waits for a maintainer to approve the run. To update a mod, raise `version` in `plugin.json`, push a new tag, and change `ref`.

## Maintainers

- `npm test` runs the test suite.
- `node scripts/lock.mjs --submitter <login> <name...>` checks entries in the working tree and writes their lock files.
- `node scripts/publish.mjs` writes `.claude-plugin/marketplace.json`.
- To take a mod down: delete `entries/<name>.json` and `lock/<name>.json`, and add `"<name>": null` to `renames.json`.
```

- [ ] **Step 5: Lint the workflows**

Run: `npx --yes @action-validator/cli@0.6.0 .github/workflows/check.yml .github/workflows/merge.yml .github/workflows/publish.yml` from the repo root.
Expected: no errors. If the tool is not available, run `ruby -ryaml -e 'ARGV.each { |f| YAML.load_file(f) }' .github/workflows/*.yml` to at least confirm valid YAML, and say so in the task report.

- [ ] **Step 6: Commit**

```bash
git -C /Users/mohammad/Desktop/baselane/mods-catalog add .github README.md
git -C /Users/mohammad/Desktop/baselane/mods-catalog commit -m "Add the check, merge and publish workflows and the repo files"
```

---

### Task 13: Workflow security run on the spike repo

**Operator actions needed:** push to `mohammad0omar/mods-catalog-spike` (ask first), and create the author test repo `mohammad0omar/mods-catalog-spike-author` (public, deleted after this task).

**Files:**
- Create: `docs/spike-workflows.md` in mods-catalog

**Interfaces:**
- Consumes: the whole repo from Tasks 2 to 12.
- Produces: `docs/spike-workflows.md` with one line per scenario: expected result, actual result, run link.

- [ ] **Step 1: Prepare the author repo**

Copy `test/fixtures/mods/no-em-dash` and `/Users/mohammad/Desktop/baselane/mods/plugins/cost-meter` into `mods-catalog-spike-author/plugins/`, commit, and tag `no-em-dash--v<version>` and `cost-meter--v<version>` with their `plugin.json` versions. Push the branch and the tags.

- [ ] **Step 2: Push the catalog to the spike repo**

In a scratch clone of mods-catalog: set `.github/CODEOWNERS` to `@mohammad0omar`, remove the old `spike.yml`, push to `mohammad0omar/mods-catalog-spike` `main` with the maintainer bypass.

- [ ] **Step 3: Run the scenarios**

Each scenario is one branch and one PR in the spike repo. For scenarios that are not fork PRs, note it: the fork-only parts (the first-time approval hold, the empty `workflow_run.pull_requests`) are covered only by scenario 6.

| # | PR | Expected |
| :- | :- | :- |
| 1 | Adds `entries/no-em-dash.json` (git-subdir, author repo, its tag) | `check` passes. Bot comment shows all ✔. Bot merges. `lock/no-em-dash.json` appears. `publish` commits `marketplace.json` with the SHA. |
| 2 | Adds `entries/cost-meter.json` and edits `scripts/check-pr.mjs` to always pass | `check` fails R1, or passes with a faked report. Either way `merge` does not merge (`must change only entries/`). |
| 3 | Adds two entries | `check` fails R1. No merge. |
| 4 | A maintainer commit sets `submitter` in `lock/no-em-dash.json` to `someone-else`; then a PR from `mohammad0omar` bumps no-em-dash | `check` fails R3. No merge. Revert the lock change afterwards. |
| 5 | Re-submits `no-em-dash` with the same version | `check` fails R10. |
| 6 | Optional, needs a second GitHub account: a fork PR from that account | The run waits for "Approve and run". After approval, scenario 1 behavior. |

The "tag moved after the check" case is covered by the unit test in Task 9 (`tag moved`), because the merge starts seconds after the check and the move cannot be timed by hand.

- [ ] **Step 4: Install from the spike marketplace**

Run with a clean home:
```bash
H=$(mktemp -d)
HOME=$H claude plugin marketplace add mohammad0omar/mods-catalog-spike
HOME=$H claude plugin install no-em-dash@baselane-mods
HOME=$H claude plugin list
```
Expected: `no-em-dash@baselane-mods` is listed and enabled.

- [ ] **Step 5: Record and commit**

Write each scenario's result and run link to `docs/spike-workflows.md`, then:
```bash
git -C /Users/mohammad/Desktop/baselane/mods-catalog add docs/spike-workflows.md
git -C /Users/mohammad/Desktop/baselane/mods-catalog commit -m "Record the workflow security run"
```

- [ ] **Step 6: Clean up (ask the operator first)**

Delete `mohammad0omar/mods-catalog-spike` and `mohammad0omar/mods-catalog-spike-author`. Keep the GitHub App; Plan C installs it on the real catalog repo.
