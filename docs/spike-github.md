# GitHub spike findings (2026-10-05)

Spike repo: baselane-sh/mods-catalog-spike (public, temporary).

- CLI on ubuntu-latest: `npm install -g @anthropic-ai/claude-code@2.1.289` works. `claude --version` prints 2.1.289. `claude plugin validate` passes and `claude plugin test` runs 7 tests on no-em-dash with no login and no API key. Gate passed.
- Ruleset bypass:
  - The GitHub Actions app cannot be a bypass actor: "Actor GitHub Actions integration must be part of the ruleset source or owner organization" (HTTP 422), on a user repo and on an org repo.
  - Deploy keys are turned off for the baselane-sh org (`deploy_keys_enabled_for_repositories: false`), so a deploy key cannot be the bot.
  - A push with the built-in Actions token is refused by a ruleset that requires a PR and the `check` status (GH013).
  - A repository admin (RepositoryRole 5) bypass works: the owner's own push went through.
  - The GitHub App could not be created: the Chrome extension was not connected.
- Decision for the overnight launch: the ruleset on main blocks only force pushes and deletion. `merge.yml` enforces the checks itself, commits with the built-in token, and calls `publish.yml` as a reusable workflow (a push with the built-in token does not start other workflows). The stricter ruleset waits for the GitHub App.
- Action SHAs:
  - actions/checkout@v4 11d5960a326750d5838078e36cf38b85af677262
  - actions/setup-node@v4 49933ea5288caeca8642d1e84afbd3f7d6820020
  - actions/upload-artifact@v4 ea165f8d65b6e75b540449e92b4886f43607fa02
  - actions/download-artifact@v4 d3f86a106a0bac45b974a628896c90dbdf5c8093
  - actions/configure-pages@v5 983d7736d9b0ae728b81ab479565c72886d7745b
  - actions/upload-pages-artifact@v3 56afc609e74202658d3ffba0e8f6dda462b719fa
  - actions/deploy-pages@v4 d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e
