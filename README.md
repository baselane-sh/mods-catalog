# Baselane mods catalog

The catalog behind https://baselane-sh.github.io/mods-catalog/. Every mod here passed automated checks and is pinned to the commit that passed them.

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
