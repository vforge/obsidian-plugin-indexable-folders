# Obsidian Indexable Folders Plugin

This plugin for Obsidian enhances folder organization by allowing you to prefix folders with an index (e.g., `01_Notes`). It then visually transforms these folders in the file explorer, creating a clean, organized, and navigable structure.

## Features

- **Visual Folder Indexing**: Automatically styles folders named with a `number_` prefix (e.g., `01_Projects`) by displaying the number as a styled "pill" and hiding the prefix from the folder name.
- **Custom Prefixes**: A settings option allows you to define a list of non-numeric, case-insensitive prefixes (e.g., `zz`, `archive`) that receive the same styling treatment.
- **Context Menu Actions**: Right-clicking on an indexed folder provides powerful reordering options:
  - **Move up/down**: Shifts the folder's index by one, automatically cascading the change to other folders to maintain a unique sequence.
  - **Update index...**: Opens a dialog to set a specific index, intelligently shifting other folders to accommodate the new position.
- **Indexed Status Bar Path**: The status bar displays the full, styled path of the active file's parent folders, including the index pills, providing clear context for nested notes.
- **Customizable Separator**: The separator used in the status bar path can be customized in the settings (defaults to "→").

## Support

If you find this plugin useful, you can support my work by buying me a coffee.

<a href="https://www.buymeacoffee.com/vforge1">
    <img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=vforge1&button_colour=FFDD00&font_colour=000000&font_family=Inter&outline_colour=000000&coffee_colour=ffffff" alt="Buy Me A Coffee">
</a>

## Development

To work on this plugin locally:

1. Clone this repository.
2. Make sure your NodeJS is at least v16 (`node --version`).
3. Run `pnpm install` to install dependencies.
4. Run `pnpm dev` to start compilation in watch mode.

To create a production build of the plugin, run the following command:

```bash
pnpm run build
```

### Testing

This project includes comprehensive tests (95 tests) to ensure reliability within Obsidian's ecosystem. The test suite is organized in the `tests/` directory:

- **Unit tests**: Pure logic testing without external dependencies
- **Integration tests**: Tests with Obsidian API interactions
- **Complete API mocks**: Realistic Obsidian API simulation

```bash
# Run all tests
pnpm test:run

# Run tests in watch mode
pnpm test

# Run tests with UI
pnpm test:ui
```

For detailed information about the test suite, see [`tests/README.md`](tests/README.md).

### Code Quality

This project uses ESLint to maintain code quality. To run the linter, use the command:

```bash
pnpm lint
```

## Releasing New Releases

- Update your `manifest.json` with your new version number, such as `1.0.1`, and the minimum Obsidian version required for your latest release.
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
