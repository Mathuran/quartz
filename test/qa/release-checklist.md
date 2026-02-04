# Quartz Release QA Checklist

## Test Run Info
- **Tester:** ___
- **Date:** ___
- **Build/Commit:** ___
- **OS:** ___
- **VS Code Version:** ___

## Setup
1. Clone the repo and run `npm install && npm run build`
2. Open VS Code, press F5 to launch the Extension Development Host
3. Open a `.md` file → Right-click → "Open With..." → "Quartz Markdown Editor"

> **Note on keyboard shortcuts:** This checklist uses macOS shortcuts (Cmd). On Windows/Linux, replace Cmd with Ctrl throughout. For example, Cmd+B becomes Ctrl+B.

---

## 1. Extension Lifecycle

### TC-01.01: Install and Activate Extension

**Steps:**
1. Press F5 in the development workspace to launch the Extension Development Host.
2. Open any `.md` file using the Quartz editor (right-click → "Open With..." → "Quartz Markdown Editor").

**Expected:** The extension activates without errors. The editor renders the markdown content as a WYSIWYG block-based editor.

**Pass/Fail:** Partial Fail
**Notes:** The markdown is being rendered correctly but the blocks aren't being rendered correctly. The brail tab is inside the text box instead of to the left of the box. All the markdown is in one block

---

### TC-01.02: Deactivate Extension

**Steps:**
1. Open a `.md` file with the Quartz editor.
2. Close the Extension Development Host window.
3. Reopen the Extension Development Host and check the VS Code output panel for errors.

**Expected:** No errors are logged on extension deactivation. The host closes cleanly.

**Pass/Fail:** Pass
**Notes:** ___

---

### TC-01.03: No Console Errors on Startup

**Steps:**
1. Launch the Extension Development Host (F5).
2. Open the VS Code Developer Tools (Help → Toggle Developer Tools).
3. Check the Console tab for errors.
4. Open a `.md` file with the Quartz editor.
5. Check the Console tab again.

**Expected:** No errors or warnings related to "quartz" appear in the console during startup or initial file load.

**Pass/Fail:** Pass
**Notes:** ___

---

### TC-01.04: Activation Event on .md File

**Steps:**
1. Launch the Extension Development Host.
2. Do NOT open any `.md` files yet.
3. Verify the Quartz extension is not yet active (check "Running Extensions" in the command palette).
4. Open a `.md` file with the Quartz editor.

**Expected:** The extension activates when the `.md` file is opened with the Quartz custom editor. The `quartz.markdownEditor` view type appears in the editor.

**Pass/Fail:** Pass
**Notes:** ___

---

### TC-01.05: Extension Appears in "Open With" Menu

**Steps:**
1. Launch the Extension Development Host.
2. Right-click on any `.md` file in the Explorer panel.
3. Select "Open With..." from the context menu.

**Expected:** "Quartz Markdown Editor" appears as an option in the "Open With" picker. Selecting it opens the file in the Quartz WYSIWYG editor rather than the default text editor.

**Pass/Fail:** Pass
**Notes:** 

---

## 2. Document Loading

### TC-02.01: Open a Standard .md File

**Steps:**
1. Create a file `test-basic.md` containing a heading, a paragraph, and a bullet list.
2. Open it with the Quartz editor.

**Expected:** All content loads correctly. The heading renders as a heading block, the paragraph as a paragraph block, and the list as a bullet list block.

**Pass/Fail:** Fail
**Notes:** The header, paragraph and bullet points each have a brail block symbol on the row above them and everything is in one block.

---

### TC-02.02: Open an Empty .md File

**Steps:**
1. Create an empty file `test-empty.md` (zero bytes).
2. Open it with the Quartz editor.

**Expected:** The editor opens with an empty document and a cursor ready for input. No errors are thrown.

**Pass/Fail:** fail
**Notes:** the doc opens up empty. It's not obvious where to click to start typing because the row with the brail does nothing. Clicking below the row with the brail show the text box but the text cursor overlaps with the border making it look invisible. Instead of creating a border around the box in focus use a highlight color like how notion does.

---

### TC-02.03: Open a File with YAML Frontmatter

**Steps:**
1. Create a file `test-frontmatter.md` with the following content:
   ```markdown
   ---
   title: Test Document
   date: 2025-01-15
   tags: [test, qa]
   ---

   # Hello World

   This is a test.
   ```
2. Open it with the Quartz editor.

**Expected:** The frontmatter is preserved but not rendered as visible content in the editor. The heading and paragraph render correctly below the frontmatter.

**Pass/Fail:** Pass
**Notes:** ___

---

### TC-02.04: Open a Large File (500+ Lines)

**Steps:**
1. Create or find a `.md` file with 500+ lines of varied markdown content.
2. Open it with the Quartz editor.

**Expected:** The file loads completely within 5 seconds. All content is rendered. Scrolling is smooth throughout the document.

**Pass/Fail:** Failed
**Notes:** Only saw an empty screen with 1 empty code block. Seemed like there are some markdown features not supported yet and an error occured

---

### TC-02.05: Open a File with All Supported Block Types

**Steps:**
1. Create a file `test-all-blocks.md` containing: headings (H1-H6), paragraphs, bullet list, ordered list, task list, code block (with language), blockquote, table, horizontal rule, and an image reference.
2. Open it with the Quartz editor.

**Expected:** Every block type renders correctly in its appropriate visual style. No block types are missing or rendered as plain text.

**Pass/Fail:** Fail
**Notes:** Used the file test/qa/test-all-blocks.md to verify markdown features. Seemed like an error happened and nothing rendered except a single empty block.

---

## 3. Basic Editing

### TC-03.01: Type Text in a Paragraph

**Steps:**
1. Open an empty `.md` file with the Quartz editor.
2. Click in the editor area and type "Hello, World!"

**Expected:** The text appears as you type in a paragraph block. Each character appears immediately with no visible lag.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-03.02: Delete Text with Backspace and Delete Keys

**Steps:**
1. Type "Hello World" in the editor.
2. Place the cursor after "World" and press Backspace 5 times.
3. Place the cursor before "Hello" and press Delete (Fn+Backspace on Mac) 5 times.

**Expected:** Backspace deletes characters to the left. Delete removes characters to the right. The text updates correctly after each keypress.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-03.03: Undo and Redo

**Steps:**
1. Type "First sentence." and press Enter.
2. Type "Second sentence."
3. Press Cmd+Z three times.
4. Press Cmd+Shift+Z (or Cmd+Y) twice.

**Expected:** Undo reverses the most recent edits step by step. Redo restores them. The document state matches expectations after each undo/redo.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-03.04: Cut, Copy, and Paste Text

**Steps:**
1. Type "The quick brown fox" in the editor.
2. Select "quick brown" by double-clicking and extending the selection.
3. Press Cmd+C to copy.
4. Place the cursor at the end of the line and press Cmd+V to paste.
5. Select "quick brown" again and press Cmd+X to cut.
6. Press Cmd+V to paste it elsewhere.

**Expected:** Copy places text on the clipboard. Paste inserts text at the cursor. Cut removes the selected text and places it on the clipboard. All operations preserve formatting.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-03.05: Select All

**Steps:**
1. Open a file with multiple paragraphs.
2. Press Cmd+A.

**Expected:** All content in the editor is selected (highlighted). The selection spans from the first character to the last character.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-03.06: Multi-Line Editing

**Steps:**
1. Type "Line one" and press Enter.
2. Type "Line two" and press Enter.
3. Type "Line three."
4. Place the cursor at the end of "Line one" and press Delete (Fn+Backspace on Mac).

**Expected:** Each Enter keypress creates a new block (paragraph). Pressing Delete at the end of a block merges the next block into the current one, producing "Line oneLine two" on a single line.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-03.07: Cursor Movement with Arrow Keys

**Steps:**
1. Open a file with multiple paragraphs.
2. Use the Left and Right arrow keys to move character by character.
3. Use the Up and Down arrow keys to move between lines.
4. Use Cmd+Left and Cmd+Right (Home/End on Windows/Linux) to jump to line start/end.

**Expected:** Arrow keys move the cursor in the expected direction. Cmd+Left moves to the start of the line. Cmd+Right moves to the end. Up/Down navigate across blocks correctly.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-03.08: Save Document

**Steps:**
1. Open a `.md` file with the Quartz editor.
2. Make a change (type a few characters).
3. Press Cmd+S to save.
4. Close the editor and reopen the file in the default text editor.

**Expected:** The saved file reflects the changes made in the Quartz editor. The markdown output is well-formed.

**Pass/Fail:** ___
**Notes:** ___

---

## 4. Block Types

### TC-04.01: Paragraph Block

**Steps:**
1. Open an empty file.
2. Type a sentence and press Enter twice.
3. Type another sentence.

**Expected:** Two separate paragraph blocks are created, each displaying plain text.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-04.02: Heading 1 Block

**Steps:**
1. Use the slash command menu or type `# ` at the start of a new line.
2. Type "Main Title."

**Expected:** The text renders as a large Heading 1 block with visually distinct styling (largest heading size).

**Pass/Fail:** ___
**Notes:** ___

---

### TC-04.03: Heading 2 Block

**Steps:**
1. Type `## ` at the start of a new line.
2. Type "Section Title."

**Expected:** The text renders as a Heading 2 block with styling smaller than H1 but larger than body text.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-04.04: Heading 3 Block

**Steps:**
1. Type `### ` at the start of a new line.
2. Type "Subsection Title."

**Expected:** The text renders as a Heading 3 block with appropriate styling.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-04.05: Heading 4-6 Blocks

**Steps:**
1. Type `#### Heading 4` on a new line.
2. Type `##### Heading 5` on a new line.
3. Type `###### Heading 6` on a new line.

**Expected:** Each heading renders at its correct level with progressively smaller styling. H4, H5, and H6 are all visually distinct from each other and from body text.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-04.06: Bullet List Block

**Steps:**
1. Type `- ` at the start of a new line.
2. Type "Item one" and press Enter.
3. Type "Item two" and press Enter.
4. Press Enter on an empty list item to exit the list.

**Expected:** A bullet list is created with bullet markers. Each Enter creates a new list item. An empty Enter exits the list and creates a new paragraph.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-04.07: Ordered List Block

**Steps:**
1. Type `1. ` at the start of a new line.
2. Type "First" and press Enter.
3. Type "Second" and press Enter.
4. Type "Third."

**Expected:** A numbered list is created. Items are automatically numbered sequentially (1, 2, 3). Pressing Enter creates the next numbered item.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-04.08: Task List Block

**Steps:**
1. Type `- [ ] ` at the start of a new line.
2. Type "Buy groceries" and press Enter.
3. Type "Clean house."
4. Click the checkbox next to "Buy groceries."

**Expected:** A task list with checkboxes appears. Clicking a checkbox toggles its state (unchecked to checked). New task items are created on Enter with unchecked checkboxes.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-04.09: Code Block

**Steps:**
1. Type three backticks (```) at the start of a new line and press Enter (or Space).
2. Type `javascript` as the language identifier (if prompted or supported).
3. Type `const x = 42;` inside the code block.

**Expected:** A code block is created with a monospace font. Syntax highlighting is applied if a language is specified. The code block is visually distinct from regular text (background color, border, etc.).

**Pass/Fail:** ___
**Notes:** ___

---

### TC-04.10: Blockquote Block

**Steps:**
1. Type `> ` at the start of a new line.
2. Type "This is a quoted statement."

**Expected:** A blockquote block is created with a left border or indent styling. The text appears visually indented or styled differently from regular paragraphs.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-04.11: Table Block

**Steps:**
1. Use the slash command menu to insert a table (type `/table`).
2. Verify a 3x3 table with a header row is created.
3. Click into cells and type content.

**Expected:** A table is inserted with 3 columns and 3 rows (including a header row). Cell borders are visible. Text can be entered into each cell.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-04.12: Horizontal Rule Block

**Steps:**
1. Type `---` at the start of a new line and press Enter (or Space).

**Expected:** A horizontal rule (divider line) is rendered spanning the width of the editor. Content above and below the rule is separated visually.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-04.13: Image Block

**Steps:**
1. Use the slash command menu (type `/image`).
2. When prompted, enter a valid image URL (e.g., `https://via.placeholder.com/150`).

**Expected:** An image block is inserted at the cursor position. If the URL is valid and reachable, the image renders inline. If the URL is invalid, a placeholder or broken-image indicator appears.

**Pass/Fail:** ___
**Notes:** ___

---

## 5. Block Input Rules

### TC-05.01: `# ` Creates Heading 1

**Steps:**
1. On an empty line, type `# ` (hash followed by a space).

**Expected:** The line immediately converts to a Heading 1 block. The `# ` prefix is consumed and does not appear as text.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-05.02: `## ` Creates Heading 2

**Steps:**
1. On an empty line, type `## ` (two hashes followed by a space).

**Expected:** The line converts to a Heading 2 block.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-05.03: `- ` Creates Bullet List

**Steps:**
1. On an empty line, type `- ` (dash followed by a space).

**Expected:** A bullet list block is created with one empty list item ready for typing.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-05.04: `1. ` Creates Ordered List

**Steps:**
1. On an empty line, type `1. ` (one, dot, space).

**Expected:** An ordered list block is created with the first item numbered "1."

**Pass/Fail:** ___
**Notes:** ___

---

### TC-05.05: `- [ ] ` Creates Task List

**Steps:**
1. On an empty line, type `- [ ] ` (dash, space, open bracket, space, close bracket, space).

**Expected:** A task list block is created with one unchecked task item.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-05.06: `> ` Creates Blockquote

**Steps:**
1. On an empty line, type `> ` (greater-than followed by a space).

**Expected:** A blockquote block is created. The `> ` prefix is consumed.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-05.07: Triple Backticks Create Code Block

**Steps:**
1. On an empty line, type three backticks (```) and press Enter or Space.

**Expected:** A code block is created. The backtick characters are consumed. The cursor is placed inside the empty code block.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-05.08: `---` Creates Horizontal Rule

**Steps:**
1. On an empty line, type `---` and press Enter or Space.

**Expected:** A horizontal rule is inserted. The dashes are consumed and replaced with a visual divider line.

**Pass/Fail:** ___
**Notes:** ___

---

## 6. Slash Commands

### TC-06.01: Slash Menu Opens on `/`

**Steps:**
1. Place the cursor on an empty line.
2. Type `/`.

**Expected:** A dropdown/popup menu appears showing available block types (Heading 1-6, Bullet List, Numbered List, Task List, Code Block, Quote, Divider, Table, Image).

**Pass/Fail:** ___
**Notes:** ___

---

### TC-06.02: Select Heading from Slash Menu

**Steps:**
1. Type `/` on an empty line.
2. Type `h1` or `heading` to filter.
3. Click on "Heading 1" or press Enter.

**Expected:** The current block converts to a Heading 1. The slash command text is removed. The cursor is inside the new heading block.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-06.03: Select Bullet List from Slash Menu

**Steps:**
1. Type `/` on an empty line.
2. Type `bullet` or `ul` to filter.
3. Select "Bullet List."

**Expected:** A bullet list block is created at the current position.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-06.04: Select Code Block from Slash Menu

**Steps:**
1. Type `/` on an empty line.
2. Type `code` to filter.
3. Select "Code Block."

**Expected:** A code block is inserted. The cursor is inside the code block ready for input.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-06.05: Select Quote from Slash Menu

**Steps:**
1. Type `/` on an empty line.
2. Type `quote` to filter.
3. Select "Quote."

**Expected:** A blockquote block is created at the current position.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-06.06: Select Table from Slash Menu

**Steps:**
1. Type `/` on an empty line.
2. Type `table` to filter.
3. Select "Table."

**Expected:** A 3x3 table with a header row is inserted at the cursor position.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-06.07: Select Divider from Slash Menu

**Steps:**
1. Type `/` on an empty line.
2. Type `hr` or `divider` to filter.
3. Select "Divider."

**Expected:** A horizontal rule is inserted at the cursor position.

**Pass/Fail:** ___
**Notes:** ___

---

## 7. Formatting Toolbar

### TC-07.01: Toolbar Appears on Text Selection

**Steps:**
1. Type a paragraph of text.
2. Select a word by double-clicking or click-and-drag.

**Expected:** A floating formatting toolbar appears near the selection. The toolbar includes buttons for: Bold, Italic, Strikethrough, Code, Link, and Highlight.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-07.02: Bold via Toolbar

**Steps:**
1. Type "This is important text."
2. Select the word "important."
3. Click the Bold button on the floating toolbar.

**Expected:** The word "important" becomes bold. The text is visually heavier/thicker. Clicking Bold again on the same selection removes the bold formatting.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-07.03: Italic via Toolbar

**Steps:**
1. Select a word in the editor.
2. Click the Italic button on the floating toolbar.

**Expected:** The selected text becomes italicized (slanted). Toggling the button again removes italic.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-07.04: Strikethrough via Toolbar

**Steps:**
1. Select a word in the editor.
2. Click the Strikethrough button on the floating toolbar.

**Expected:** The selected text gets a strikethrough line through it. Toggling again removes the strikethrough.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-07.05: Inline Code via Toolbar

**Steps:**
1. Select a word in the editor.
2. Click the Code button on the floating toolbar.

**Expected:** The selected text is styled as inline code (monospace font, background highlight). Toggling again removes the code formatting.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-07.06: Link via Toolbar

**Steps:**
1. Select a word in the editor.
2. Click the Link button on the floating toolbar.
3. Enter a URL when prompted (e.g., `https://example.com`).

**Expected:** The selected text becomes a hyperlink. It is visually styled differently (underlined, colored). The link URL is stored correctly.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-07.07: Highlight via Toolbar

**Steps:**
1. Select a word in the editor.
2. Click the Highlight button on the floating toolbar.

**Expected:** The selected text is highlighted with a background color. Toggling again removes the highlight.

**Pass/Fail:** ___
**Notes:** ___

---

## 8. Keyboard Shortcuts

> **Note:** All shortcuts below use macOS keys (Cmd). On Windows/Linux, substitute Ctrl for Cmd.

### TC-08.01: Cmd+B for Bold

**Steps:**
1. Select a word.
2. Press Cmd+B.

**Expected:** The selected text becomes bold. Pressing Cmd+B again removes bold.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-08.02: Cmd+I for Italic

**Steps:**
1. Select a word.
2. Press Cmd+I.

**Expected:** The selected text becomes italic. Pressing Cmd+I again removes italic.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-08.03: Cmd+Shift+S for Strikethrough

**Steps:**
1. Select a word.
2. Press Cmd+Shift+S.

**Expected:** The selected text gets a strikethrough. Pressing the shortcut again removes it.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-08.04: Cmd+E for Inline Code

**Steps:**
1. Select a word.
2. Press Cmd+E.

**Expected:** The selected text is formatted as inline code. Pressing Cmd+E again removes the code formatting.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-08.05: Cmd+Shift+H for Highlight

**Steps:**
1. Select a word.
2. Press Cmd+Shift+H.

**Expected:** The selected text is highlighted. Pressing Cmd+Shift+H again removes the highlight.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-08.06: Tab for Indent

**Steps:**
1. Create a bullet list with an item.
2. Place the cursor in the list item.
3. Press Tab.

**Expected:** The list item indents one level, becoming a nested sub-item.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-08.07: Shift+Tab for Unindent

**Steps:**
1. Create a nested (indented) list item.
2. Place the cursor in the nested item.
3. Press Shift+Tab.

**Expected:** The list item unindents one level, moving back to the parent level.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-08.08: Cmd+Shift+7 for Ordered List

**Steps:**
1. Place the cursor on a paragraph line.
2. Press Cmd+Shift+7.

**Expected:** The paragraph converts to an ordered list item. Pressing the shortcut again converts it back to a paragraph.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-08.09: Cmd+Shift+8 for Bullet List

**Steps:**
1. Place the cursor on a paragraph line.
2. Press Cmd+Shift+8.

**Expected:** The paragraph converts to a bullet list item. Pressing the shortcut again converts it back to a paragraph.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-08.10: Cmd+Shift+9 for Task List

**Steps:**
1. Place the cursor on a paragraph line.
2. Press Cmd+Shift+9.

**Expected:** The paragraph converts to a task list item with an unchecked checkbox. Pressing the shortcut again converts it back to a paragraph.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-08.11: Enter Creates a New Block

**Steps:**
1. Type some text in a paragraph.
2. Press Enter at the end of the paragraph.

**Expected:** A new empty paragraph block is created below the current one. The cursor moves to the new block.

**Pass/Fail:** ___
**Notes:** ___

---

## 9. Drag-and-Drop

### TC-09.01: Drag Handle Visible on Hover

**Steps:**
1. Open a file with multiple blocks (paragraphs, headings, lists).
2. Hover the mouse over the left side of any block.

**Expected:** A 6-dot grip drag handle icon appears to the left of the block. The handle is visible only on hover and hidden otherwise.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-09.02: Drag a Block to Reorder

**Steps:**
1. Open a file with at least 3 paragraph blocks (e.g., "Block A", "Block B", "Block C").
2. Hover over "Block A" to reveal the drag handle.
3. Click and drag the handle, moving "Block A" below "Block C."
4. Release the mouse.

**Expected:** "Block A" is moved below "Block C." The document now reads "Block B", "Block C", "Block A." The content of all blocks is preserved.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-09.03: Drag Across Different Block Types

**Steps:**
1. Create a document with a heading, a paragraph, and a list.
2. Drag the paragraph block above the heading block.

**Expected:** The paragraph block moves above the heading. All block types retain their formatting and content after the move.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-09.04: Drop Cursor Indicator

**Steps:**
1. Begin dragging a block via its handle.
2. Move it between two other blocks.

**Expected:** A visual drop cursor/indicator (e.g., a horizontal line or highlighted gap) appears between blocks to show where the dragged block will be placed when dropped.

**Pass/Fail:** ___
**Notes:** ___

---

## 10. Table Editing

### TC-10.01: Create a Table

**Steps:**
1. Use the slash command `/table` to insert a table.

**Expected:** A 3x3 table is inserted with a header row. Cells are editable and have visible borders.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-10.02: Add a Row

**Steps:**
1. Create a table.
2. Place the cursor in the last cell of the last row.
3. Press Tab to move past the last cell (or use a table context menu/button to add a row).

**Expected:** A new row is added to the bottom of the table.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-10.03: Add a Column

**Steps:**
1. Create a table.
2. Use a table context menu, button, or shortcut to add a column.

**Expected:** A new column is appended to the right of the table. All existing rows gain a new empty cell.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-10.04: Delete a Row

**Steps:**
1. Create a table with 3+ rows.
2. Place the cursor in a non-header row.
3. Use a table context menu or button to delete the row.

**Expected:** The row is removed. Remaining rows shift up. The header row is not deletable (or a warning is shown if attempted).

**Pass/Fail:** ___
**Notes:** ___

---

### TC-10.05: Navigate Cells with Tab

**Steps:**
1. Create a table.
2. Click into the first cell and type "A."
3. Press Tab.
4. Type "B."
5. Continue pressing Tab through all cells.

**Expected:** Tab moves the cursor to the next cell (left-to-right, then down to the next row). Content entered in each cell is preserved.

**Pass/Fail:** ___
**Notes:** ___

---

## 11. File I/O

### TC-11.01: Save Preserves Editor Content

**Steps:**
1. Open an existing `.md` file with the Quartz editor.
2. Add a new heading and a paragraph.
3. Press Cmd+S to save.
4. Close the Quartz editor and reopen the file in the default VS Code text editor.

**Expected:** The file contains the newly added heading and paragraph in valid markdown syntax.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-11.02: Save Preserves Frontmatter

**Steps:**
1. Open a file that has YAML frontmatter (e.g., `---\ntitle: Test\n---`).
2. Edit the body content (not the frontmatter).
3. Press Cmd+S to save.
4. Reopen in the default text editor.

**Expected:** The YAML frontmatter is completely preserved, character for character. Only the body content reflects the edits.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-11.03: Dirty Indicator on Change

**Steps:**
1. Open a `.md` file with the Quartz editor.
2. Type a single character.

**Expected:** The file tab shows a dirty/modified indicator (dot or circle on the tab title) immediately after the change. The indicator disappears after saving with Cmd+S.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-11.04: External File Change Detection

**Steps:**
1. Open a `.md` file with the Quartz editor.
2. In a separate terminal or text editor, modify the file's content and save it.
3. Return to the VS Code window with the Quartz editor.

**Expected:** The editor detects the external change and updates its content (or prompts the user to reload). No data corruption occurs.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-11.05: Auto-Save Integration

**Steps:**
1. In VS Code settings, enable "Auto Save" (set to "afterDelay" with a short delay like 1000ms).
2. Open a `.md` file with the Quartz editor.
3. Type some text and wait for the auto-save delay.

**Expected:** The file is automatically saved after the configured delay. The dirty indicator clears. The saved file contains the typed text.

**Pass/Fail:** ___
**Notes:** ___

---

## 12. Configuration

### TC-12.01: Change Font Size

**Steps:**
1. Open VS Code Settings (Cmd+,).
2. Search for "quartz.editor.fontSize".
3. Change the value from the default (16) to 20.
4. Switch to the Quartz editor tab.

**Expected:** The editor text size increases to 20px immediately (without needing to reload or reopen the file).

**Pass/Fail:** ___
**Notes:** ___

---

### TC-12.02: Change Theme

**Steps:**
1. Open VS Code Settings.
2. Change "quartz.editor.theme" from "auto" to "light."
3. Switch to the Quartz editor.
4. Change it to "dark."

**Expected:** The editor respects the theme setting. "light" forces a light background regardless of the VS Code theme. "dark" forces a dark background. "auto" follows the VS Code theme.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-12.03: Toggle Page Layout

**Steps:**
1. Open VS Code Settings.
2. Toggle "quartz.editor.pageLayout" from true (default) to false.

**Expected:** When true, the editor content is displayed within a bordered page container (like a document/letter). When false, the content spans the full width of the editor panel.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-12.04: Change Page Width

**Steps:**
1. Ensure "quartz.editor.pageLayout" is true.
2. Change "quartz.editor.pageWidth" from the default (816) to 600.

**Expected:** The page container narrows to 600px wide. Content reflows to fit the narrower page.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-12.05: Settings Apply Without Reload

**Steps:**
1. Open a `.md` file with the Quartz editor.
2. Change any configuration setting (e.g., fontSize, pageLayout, theme).

**Expected:** The change takes effect immediately in the open editor. No reload, reopen, or restart of the Extension Development Host is required.

**Pass/Fail:** ___
**Notes:** ___

---

## 13. Page Layout

### TC-13.01: Page Layout Enabled Shows Bordered Page

**Steps:**
1. Set "quartz.editor.pageLayout" to true in settings.
2. Open a `.md` file.

**Expected:** The editor content is displayed inside a bordered, centered page container that resembles a document page. There is a visible boundary around the content area.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-13.02: Page Layout Disabled Shows Full Width

**Steps:**
1. Set "quartz.editor.pageLayout" to false in settings.
2. Open a `.md` file.

**Expected:** The editor content spans the full available width of the editor panel. There is no page border or container. Content flows edge-to-edge.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-13.03: Page Width Is Respected

**Steps:**
1. Enable page layout (set to true).
2. Set "quartz.editor.pageWidth" to 600.
3. Open a `.md` file and inspect the page container width.
4. Change pageWidth to 1000.

**Expected:** The page container width matches the configured value. Changing the value updates the width immediately.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-13.04: Page Margin Is Respected

**Steps:**
1. Enable page layout.
2. Set "quartz.editor.pageMargin" to 40.
3. Open a `.md` file.
4. Change pageMargin to 100.

**Expected:** The inner margin (padding) of the page container changes. At 40px, text is closer to the page edge. At 100px, text has more space from the page edge.

**Pass/Fail:** ___
**Notes:** ___

---

## 14. Round-Trip Fidelity

### TC-14.01: Simple File Round-Trip

**Steps:**
1. Create a file `roundtrip-simple.md` with the following content:
   ```markdown
   # Hello

   This is a paragraph.

   - Item A
   - Item B
   ```
2. Open it with the Quartz editor. Do NOT make any changes.
3. Press Cmd+S to save.
4. Open the file in the default text editor.

**Expected:** The file content is identical to the original. No extra whitespace, missing newlines, or formatting changes are introduced.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-14.02: Complex Document Round-Trip

**Steps:**
1. Create a file `roundtrip-complex.md` containing: H1, H2, H3, paragraph, bullet list, ordered list, task list (with some checked), code block with language, blockquote, table, horizontal rule, bold text, italic text, inline code, a link, and strikethrough.
2. Open it with the Quartz editor. Do NOT make any changes.
3. Press Cmd+S to save.
4. Compare the file to the original using `diff` or VS Code's built-in compare.

**Expected:** The file content matches the original with no semantic changes. Minor whitespace normalization is acceptable only if documented as expected behavior.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-14.03: Frontmatter Preserved on Round-Trip

**Steps:**
1. Create a file with YAML frontmatter containing varied types (strings, arrays, booleans, dates):
   ```markdown
   ---
   title: "My Document"
   date: 2025-01-15
   tags: [alpha, beta, gamma]
   draft: false
   ---

   Content here.
   ```
2. Open with the Quartz editor, save, and compare.

**Expected:** The frontmatter block is byte-for-byte identical to the original. No keys are reordered, no values are changed, no quoting is altered.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-14.04: No Data Loss After Edit and Save

**Steps:**
1. Open a complex `.md` file (with many block types) in the Quartz editor.
2. Add one line of text in the middle of the document.
3. Save.
4. Compare with the original file.

**Expected:** Only the added line is different. All surrounding blocks, formatting, and frontmatter remain intact. No data is lost or corrupted.

**Pass/Fail:** ___
**Notes:** ___

---

## 15. Performance

### TC-15.01: Large File Loads Within 5 Seconds

**Steps:**
1. Create a `.md` file with 1000+ lines of varied content (headings, paragraphs, lists, code blocks, tables).
2. Open it with the Quartz editor.
3. Time how long it takes from opening to the content being fully rendered and interactive.

**Expected:** The file loads and becomes interactive within 5 seconds. No blank screens or partial renders persist beyond this time.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-15.02: No Visible Typing Lag

**Steps:**
1. Open a medium-sized file (200+ lines).
2. Place the cursor in the middle of the document.
3. Type a full sentence at normal typing speed.

**Expected:** Characters appear on screen immediately as typed. There is no perceptible lag, flicker, or delay between keypress and character display.

**Pass/Fail:** ___
**Notes:** ___

---

### TC-15.03: Smooth Scrolling

**Steps:**
1. Open a large file (500+ lines).
2. Scroll through the document using the mouse wheel or trackpad.
3. Scroll quickly from top to bottom and back.

**Expected:** Scrolling is smooth with no jank, stuttering, or dropped frames. Content renders correctly during and after scrolling.

**Pass/Fail:** ___
**Notes:** ___

---

## 16. Debounce Behavior

### TC-16.01: Rapid Typing Does Not Cause Excessive Saves

**Steps:**
1. Open a `.md` file with the Quartz editor.
2. Open the VS Code Developer Tools Console.
3. Type rapidly for 5 seconds (e.g., "The quick brown fox jumps over the lazy dog" repeated).
4. Observe the console and/or network activity for save/update messages sent from the webview to the extension host.

**Expected:** The extension does NOT send an update message for every single keystroke. Updates are batched/debounced. You should see significantly fewer update messages than keystrokes (e.g., 2-5 updates for 5 seconds of typing rather than 50+).

**Pass/Fail:** ___
**Notes:** ___

---

### TC-16.02: Content Syncs After Typing Stops

**Steps:**
1. Open a `.md` file with the Quartz editor.
2. Type a sentence and then stop typing.
3. Wait 2-3 seconds.
4. Close the editor tab (without manually saving with Cmd+S).
5. Reopen the file in the default text editor.

**Expected:** The typed content is present in the file. The debounce mechanism flushes pending changes after typing stops, ensuring no data loss even without an explicit save.

**Pass/Fail:** ___
**Notes:** ___

---

## Summary

| # | Feature Area         | Cases | Pass | Fail | Skip |
|---|----------------------|-------|------|------|------|
| 1 | Extension Lifecycle  | 5     |      |      |      |
| 2 | Document Loading     | 5     |      |      |      |
| 3 | Basic Editing        | 8     |      |      |      |
| 4 | Block Types          | 13    |      |      |      |
| 5 | Block Input Rules    | 8     |      |      |      |
| 6 | Slash Commands       | 7     |      |      |      |
| 7 | Formatting Toolbar   | 7     |      |      |      |
| 8 | Keyboard Shortcuts   | 11    |      |      |      |
| 9 | Drag-and-Drop        | 4     |      |      |      |
| 10| Table Editing        | 5     |      |      |      |
| 11| File I/O             | 5     |      |      |      |
| 12| Configuration        | 5     |      |      |      |
| 13| Page Layout          | 4     |      |      |      |
| 14| Round-Trip Fidelity  | 4     |      |      |      |
| 15| Performance          | 3     |      |      |      |
| 16| Debounce Behavior    | 2     |      |      |      |
|   | **Total**            | **96**|      |      |      |

## Sign-Off

- **Overall Result:** PASS / FAIL
- **Blocking Issues Found:** ___
- **Tester Signature:** ___
- **Date:** ___
