# gitHelp

**Understand Git while getting things done.** A dependency-free terminal companion in English and Turkish
for people who want to share their projects without memorizing Git commands.

[Türkçe / full documentation](README.md) · [Contributing](CONTRIBUTING.md) · [MIT](LICENSE)

gitHelp explains each step, offers numbered choices, shows the actual command, and asks for
explicit approval before making changes. Pressing Enter at a confirmation means **no**.

## Use gitHelp in another project — recommended

Requires Node.js 22+ and Git 2.28+. Your project can use any language or framework; it does not need
Node dependencies or a `package.json`. [GitHub CLI](https://cli.github.com) is only needed for browser
sign-in, creating a GitHub repository from the terminal, or opening a PR.

This example assumes your existing project is named `my-project`. Open a terminal in the folder that
contains it, then download gitHelp alongside it:

```sh
git clone https://github.com/Cemre-Tech/GitHelp.git
cd GitHelp
node src/cli.mjs install "../my-project" --lang en
```

Check the destination shown by the installer and answer `yes` to copy the tool. Replace `../my-project`
with the path to **your existing project folder**. Keep paths in quotes, especially if they contain spaces.
An absolute path also works, for example `"C:/Projects/My App"` on Windows or `"/home/me/projects/My App"`
on Linux. `GitHelp` is the downloaded tool's source folder; `my-project` is the project you want to work on.

Now enter your project and start its installed copy:

```sh
cd "../my-project"
node .github/githelp/cli.mjs --lang en
```

**From now on, the second command is all you need**, run from your project's root folder. Its menus and
Git commands operate on that folder. Use `--lang tr` for Turkish. Run `setup` from the menu if GitHub
access or the repository address is missing; an existing Git repository does not need `init` again.

The installer copies the runtime into your project's `.github/githelp` folder. It needs no global
installation or `npm install`, and the downloaded GitHelp source folder is no longer needed afterward.
`npm start` belongs to gitHelp's source folder; use the `node .github/githelp/cli.mjs` command in your own project.
Commit `.github/githelp` if teammates should use it too. Each teammate needs Node.js and Git;
they need GitHub CLI only for the GitHub CLI features described above and sign in with their own account.

## Run from source

Use this option to try or develop gitHelp inside its downloaded `GitHelp` folder. To work on another
project, follow the installation steps above.

Requires Node.js 22+ and Git 2.28+. No npm dependencies or build step.
Browser sign-in, repository creation from the terminal and PR creation also need [GitHub CLI](https://cli.github.com).
Creating a repository on GitHub's website does not need `gh`. Basic Git commands work without `gh`;
push/pull still need working Git authentication.

```sh
npm start
npm run demo
```

## First launch: connect GitHub

When a GitHub account or repository address is missing, gitHelp recommends connection setup as the first
menu choice. If the GitHub CLI account check cannot finish, it says so instead of assuming you are connected.
You can still inspect local changes or create commits before setting up GitHub.

From your project's root folder, open the same guide directly:

```sh
node .github/githelp/cli.mjs setup --lang en
```

From the GitHelp source folder, use `npm start -- setup --lang en` instead.
With the optional local command linked as described below, use `githelp setup`. The `kurulum` alias works in either language.
The guide offers these methods:

1. **Browser sign-in + HTTPS — recommended and easiest.** With GitHub CLI installed, sign in once.
   Later operations reuse your saved sign-in; you do not create a token for every push. If `gh` is missing,
   the guide shows where to install it. Run `setup` again after installing it.
2. **Use existing HTTPS access.** Choose this if a tool such as Git Credential Manager already connects
   your account. Add the project address while keeping your existing sign-in method.
3. **Use an existing SSH key — advanced.** Choose this if you have already added a working SSH key from
   this computer to GitHub. The guide lets you use the SSH repository address; it does not create a key for you.

Next, choose the address of your existing GitHub repository. If you need a new repository, the guide shows
[GitHub's new repository page](https://github.com/new). **Create an empty repository:** leave the README,
`.gitignore` and license initialization options unchecked. Commit those files with your local project instead,
so GitHub does not start a separate, unrelated history.

There are three separate steps:

- **Sign in:** GitHub identifies your account and uses that account's permissions.
- **Set a repository address:** Choose which GitHub project this folder will send commits to. `origin` is a common short name for this address.
- **Commit and push:** A commit saves selected files on your computer; push sends those commits to the selected GitHub repository.

An address in Git configuration does not prove that the network is reachable or that you have write access.
The guide does not commit or push automatically; it tells you what to do next.

## Choose your language

Menus, learning explanations, questions, confirmations, and gitHelp error messages are available in both languages.

From a project with gitHelp installed:

```sh
node .github/githelp/cli.mjs --lang en
node .github/githelp/cli.mjs --lang tr
```

When working from the GitHelp source folder:

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

## Optional: use the `githelp` command in any project

The package has **not been published to npm**. Do not assume `npx githelp` installs this project.
If you prefer a reusable command instead of copying the tool into each project, run `npm link` from
the downloaded GitHelp source folder, then enter the project you want to work on:

```sh
npm link
cd "../my-project"
githelp --lang en
```

Replace `../my-project` with your project's path. This command also works in other project folders.
Keep the GitHelp source folder while using `npm link`, because the command points to that source.
To copy the runtime into the current project later, run `githelp install`, then use the installed
`node .github/githelp/cli.mjs --lang en` command.

## Share the installed copy with your team

The recommended installation above copies the standalone runtime and its MIT license into `.github/githelp`. It does not
edit the target project's package metadata, environment files or workflows, and refuses to overwrite
an existing installation. Commit that directory to share the tool with your team.
The installed copy offers the same connection guide on first launch when setup is missing.
Open it directly with `node .github/githelp/cli.mjs setup --lang en`.

## Connect through your browser

You do not need to create or paste a token for every push. With GitHub CLI installed, run from your
project's root folder:

```sh
node .github/githelp/cli.mjs login --lang en
```

With the local command linked, run `githelp login` in your project instead. From the GitHelp source
folder, use `npm start -- login --lang en` to work on gitHelp's own repository.
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
`login` does not commit, push or add a missing repository address. Use `setup` for the complete connection
guide. Once your files are committed and a repository address is configured, choose `push` to send them.
This flow can also resolve
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
node .github/githelp/cli.mjs login --dry-run --lang en
```

## Commands

The examples below use the optional linked `githelp` command. With a project-local installation,
replace `githelp` with `node .github/githelp/cli.mjs`; for example, `node .github/githelp/cli.mjs status`.

```sh
githelp status
githelp setup
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

`setup` guides you through choosing account access and adding the GitHub project address.
`init` starts Git on `main`; `connect` adds an existing GitHub address using HTTPS. To keep SSH access,
choose the SSH method in `setup`. After making a first commit, `publish` can create a GitHub repository
from the terminal with a visibility choice, defaulting to private. `doctor` checks setup and can set
a repository-local commit identity. `pr` opens a draft PR within the selected GitHub repository.
Use `login` to prepare a saved GitHub CLI session for PR/repository creation and HTTPS Git access.

For a first upload, run `githelp setup`, `githelp doctor`, `githelp commit`, then `githelp push`.
If Git is not initialized yet, use `githelp init` first. The setup guide helps you connect an existing
repository or create an empty one on GitHub's website.

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
