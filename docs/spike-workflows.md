# Workflow test on GitHub (2026-10-05)

Repo: baselane-sh/mods-catalog-spike (temporary). Its main held the reviewed catalog code with an empty catalog and the same ruleset as the real repo (no force push, no deletion). Author mods lived on the `author` branch of the same repo.

| # | Pull request | Expected | Result |
| :- | :- | :- | :- |
| S1 | Adds `entries/no-em-dash.json` (git-subdir, tag `no-em-dash--v0.2.0`) | Check passes, bot merges, lock written, marketplace lists it | As expected. Lock has the real SHA (dd7bf0d8e574) and the real hooks (`prompt.compose`). `marketplace.json` lists `no-em-dash`. PR #1. |
| S2 | Adds `entries/evil-dash.json` and replaces `scripts/check-pr.mjs` with one that uploads a forged passing report (no hooks, description FORGED) | Check passes on the forged report, merge refuses, nothing locked | As expected. Merge job: "R1 Scope failed at merge: the PR changes 2 files". The PR comment shows the merge job's own result. PR #2 stays open. |
| S3 | Changes only tags on `no-em-dash`, same version | R10 fails, no merge | As expected: "version 0.2.0 is not higher than the listed 0.2.0". PR #3. |

## The test sandbox

The first review asked whether a mod's own test could start a process that rewrites the check report. With Claude Code 2.1.289 it cannot:

- `claude plugin test` refuses any import except the mod's own files and `claude-code` ("a hooks module imports its own files by relative path and "claude-code", nothing else"). `node:child_process` and dynamic `import()` do not load.
- Inside a test, `Bun`, `process`, `require` and `fetch` are not defined.

The merge job still recomputes every rule except R9 from the tag, so a future change to the test sandbox does not open this path.

## Not covered live

- A fork PR from a first-time contributor (needs a second GitHub account). The repo setting is `first_time_contributors`.
- Takedown on a user's machine (`forceRemoveDeletedPlugins`). The generator writes the field and the `renames` entry; the uninstall itself is Claude Code behaviour from its docs.
- Pages deploy on the spike repo failed by design: Pages is not enabled there. On the real repo the deploy is green.
