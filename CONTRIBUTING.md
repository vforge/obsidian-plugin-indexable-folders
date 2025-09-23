# Contributing to Obsidian Indexable Folders Plugin

Thank you for your interest in contributing to this project! This document provides information for developers who want to work on the plugin.

> [!NOTE]
> This is a personal project developed with AI assistance for learning purposes. While contributions are welcome, please understand that the codebase may contain areas for improvement and there's no warranty on functionality.

## Development Setup

To work on this plugin locally:

1. Clone this repository.
2. Make sure your NodeJS is at least v22.19.0 (`node --version`).
3. Run `pnpm install` to install dependencies.
4. Run `pnpm dev` to start compilation in watch mode.

To create a production build of the plugin, run the following command:

```bash
pnpm build
```

## Code Quality

This project uses Prettier for code formatting and ESLint for linting. To format and lint the code, use the command:

```bash
pnpm lint
```

This command will automatically format the code with Prettier and then run ESLint to check for issues and apply fixes.

## Releasing New Releases

- Update your `manifest.json` with your new version number, such as `0.0.2`, and the minimum Obsidian version required for your latest release.
- Update your `versions.json` file with `"new-plugin-version": "minimum-obsidian-version"` so older versions of Obsidian can download an older version of your plugin that's compatible.
- Create a new GitHub release using your new version number as the "Tag version". Use the exact version number, don't include a prefix `v`.
- Upload the files `main.js`, `manifest.json`, and `styles.css` as binary attachments.
- Publish the release.

> You can simplify the version bump process by running `pnpm version patch`, `pnpm version minor` or `pnpm version major` after updating `minAppVersion` manually in `manifest.json`. The command will bump the version in `manifest.json` and `package.json`, and add the entry for the new version to `versions.json`.

## Adding your plugin to the community plugin list

- Check the [plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines).
- Publish an initial version.
- Make sure you have a `README.md` file in the root of your repo.
- Make a pull request at <https://github.com/obsidianmd/obsidian-releases> to add your plugin.

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/obsidian-plugin-indexable-folders/`.
