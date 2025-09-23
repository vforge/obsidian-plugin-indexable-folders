# To-Do List

This document tracks planned features and improvements for the Indexable Folders plugin.

## Development Tasks

- [ ] Finish testing setup

## Future Enhancements

### Drag-and-Drop Reordering for Indexed Folders

- **Goal:** Implement drag-and-drop functionality within the file explorer to allow users to visually reorder indexed folders.
- **Trigger:** A user drags an indexed folder and drops it before or after another indexed folder within the same parent directory.
- **Core Behavior:** The plugin should automatically re-index the moved folder and any affected sibling folders to reflect the new order.

#### Re-indexing Logic

- When a folder is moved, its index should be updated to reflect its new position.
- Other folders should be shifted to maintain a continuous sequence of indices.
- The re-indexing should be efficient, only affecting the necessary folders.

#### Example Scenario

- **Initial State:**
  - `01_Alpha`
  - `02_Bravo`
  - `03_Charlie`
  - `04_Delta`
- **User Action:**
  - The user drags the `04_Delta` folder and drops it between `01_Alpha` and `02_Bravo`.
- **Expected Final State:**
  - `01_Alpha` (unchanged)
  - `02_Delta` (renamed from `04_Delta`)
  - `03_Bravo` (renamed from `02_Bravo`)
  - `04_Charlie` (renamed from `03_Charlie`)
