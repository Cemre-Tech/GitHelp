# gitHelp

**Understand Git while getting things done.** A dependency-free terminal companion in English and Turkish
for people who want to share their projects without memorizing Git commands.

[Türkçe / full documentation](README.md) · [Contributing](CONTRIBUTING.md) · [MIT](LICENSE)

gitHelp explains each step, offers numbered choices, shows the actual command, and asks for
explicit approval before making changes. Pressing Enter at a confirmation means **no**.

## Run from source

Requires Node.js 22+ and Git 2.28+. No npm dependencies or build step.
Browser sign-in, repository creation and PR creation also need [GitHub CLI](https://cli.github.com).
Basic Git commands work without `gh`; push/pull still need working Git authentication.

```sh
npm start
npm run demo
```

## Choose your language

Menus, learning explanations, questions, confirmations, and gitHelp error messages are available in both languages.

```sh
npm start -- --lang en
npm start -- --lang tr
npm run demo -- --lang en
```

With the local command linked: `githelp --lang en` or `githelp push --lang en`.
The `--lang=en` spelling also works. Preference order is `--lang`, `GITHELP_LANG`, then your system locale
(`LC_ALL`, `LC_MESSAGES`, `LANG`, or the OS default). Unsupported system locales fall back to English.
No project settings are written. Raw Git/GitHub CLI output follows those tools’ own locale settings.

To keep a preference in your current terminal session:

```powershell
$env:GITHELP_LANG = 'en'
```

Or in a POSIX shell: `export GITHELP_LANG=en`.

The package has **not been published to npm**. Do not assume `npx githelp` installs this project.
To make the local command available, run `npm link` in this directory; then run `githelp` in your project.

## Keep it with your project

```sh
githelp install
node .github/githelp/cli.mjs --lang en
```

Alternatively, from the source directory: `node src/cli.mjs install "../my-project" --lang en`.
The installer copies the standalone runtime and its MIT license into `.github/githelp`. It does not
edit the target project's package metadata, environment files or workflows, and refuses to overwrite
an existing installation. Commit that directory to share the tool with your team.

## Connect through your browser

You do not need to create or paste a token for every push. With GitHub CLI installed, run from the source directory:

```sh
npm start -- login --lang en
```

With the local command linked, run `githelp login` in your project instead.
A valid saved active GitHub CLI session is reused. Otherwise, after showing the plan and receiving your approval,
gitHelp starts GitHub's browser sign-in. Enter the one-time code displayed by GitHub CLI on GitHub's page.
Fresh sign-in needs an interactive terminal.
If a reused session still prefers SSH, the plan also updates GitHub CLI's user/host transport preference to HTTPS,
without signing in again. This keeps repositories created later with `publish` on HTTPS too.

The plan also shows supported GitHub SSH addresses that can be changed to HTTPS. For example,
`git@github.com:owner/project.git` becomes `https://github.com/owner/project.git` for the same repository.
Fetch addresses and separate push addresses keep their own repository destinations. After confirmation, gitHelp
configures the GitHub CLI credential helper for GitHub HTTPS in this project's `.git/config`. Unsupported multiple
addresses, inherited settings and URL rewrites stop the operation instead of guessing a destination.
`login` does not commit or push: choose `push` separately when ready. This flow can also resolve
`Permission denied (publickey)` when a GitHub remote is using SSH without a usable key.

gitHelp does not save credentials in `.github/githelp`. GitHub CLI stores your session, using the OS credential
store where available; if it cannot use that store, it may fall back to a plaintext user configuration file.
Sign-in saves GitHub CLI user/host preferences. The HTTPS preference can affect other `gh` accounts on that host,
and GitHub CLI may offer to configure Git authentication. gitHelp's own helper and remote edits apply to this
repository. See the [official sign-in documentation](https://cli.github.com/manual/gh_auth_login).

`GH_TOKEN` and `GITHUB_TOKEN` take precedence over saved sessions. Remove those variables from the current
terminal session before using persisted browser sign-in; never paste their values into gitHelp or an issue.
To preview without opening a browser or changing configuration or remotes:

```sh
npm start -- login --dry-run --lang en
```

## Commands

```sh
githelp status
githelp commit
githelp push
githelp pull
githelp branch
githelp pr
githelp init
githelp connect
githelp login
githelp publish
githelp doctor
githelp learn
githelp push --dry-run
```

`init` starts Git on `main`; `connect` adds an existing GitHub remote; `publish` creates a
GitHub repository with a visibility choice, defaulting to private. `doctor` checks setup and can set
a repository-local commit identity. `pr` opens a draft PR within the selected GitHub repository.
Use `login` to prepare a saved GitHub CLI session for PR/repository creation and HTTPS Git access.

Turkish command aliases such as `kaydet`, `gonder`, `dal`, `kur`, and `giris` / `giriş` remain available in either language.
English confirmations accept `yes` / `y`, and pressing Enter means `no`. To select every file in a commit,
enter `all`; to pick individual files, enter numbers such as `1,3`.

```text
You: push
gitHelp: Which branch should we send?
  1. feature/theme — the branch you are working on now
  2. main — the shared main branch
You: 1
gitHelp: Which remote repository should we use?
  1. origin — https://github.com/example/project.git
You: 1
gitHelp: feature/theme → origin/feature/theme
        [shows the actual Git command]
Shall we do this? (yes/no) [no] > yes
✓ Your commits were sent.
```

## Behavior

- Explicit file selection; previously staged, unselected files block a commit.
- Selected files are committed in full; partial-line staging is not preserved for those files.
- Filename heuristics block likely credential files. This is not a content or history secret scanner.
- Push uses an explicit, same-name branch refspec without tags, submodule pushes or force.
- Pull is fast-forward only. Diverged histories require manual review.
- Switching branches and creating PRs require a clean worktree.
- Dry-run previews mutations without executing them or opening a sign-in browser; local reads and CLI auth checks may still run.
- No automatic reset, history rewriting, branch deletion or conflict resolution.
- Existing Git hooks, signing settings and authentication remain in effect.

This first version supports github.com and PRs within one repository. Cross-fork PRs, Enterprise hosts,
remote branch checkout, differently named pull upstreams and merge/rebase management are outside its scope.

## Verify

```sh
npm run check
npm test
npm pack --dry-run
```

Tests use disposable local Git repositories, isolated Git settings and local bare remotes. They do not
contact GitHub, sign in to your account or modify your actual projects. Sign-in tests use simulated command results;
live browser sign-in and GitHub PR/repository creation are not covered by the automated suite.
GitHub Actions is configured for Node.js 22/24 on Linux, macOS and Windows.
