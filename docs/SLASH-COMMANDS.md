To understand how this system works, you have to stop thinking of it as a traditional word processor (like Microsoft Word) and start thinking of it as a **hierarchical database of interactive objects**, often called a **Block-Based Editor** (similar to Notion, Coda, or Anytype).

Here is a deep, step-by-step breakdown of the mechanics, architecture, and the specific behavior you asked about regarding the **Toggle** block.

---

### 1. The Core Architecture: Everything is a "Block"
In this system, your "Page" is not a single file of text. It is a **container** (an array) that holds individual data objects called **Blocks**.

Every block is a structured piece of JSON (or similar) data that looks roughly like this in the background:

```json
{
  "id": "block_abc123",
  "type": "text", 
  "content": "Hello World",
  "children": [],
  "collapsed": false,
  "metadata": {}
}
```

- **`type`**: Defines how the block looks and behaves (text, heading, image, toggle, etc.).
- **`children`**: This is the magic key. It allows **infinite nesting**. A block can contain an array of other block IDs, allowing you to create hierarchies.

---

### 2. How the Slash (`/`) Command Works Mechanically
When you type `/` and a command name:

1. **Interception**: The editor catches your keystroke before the character is rendered.
2. **Contextual Menu**: It pops up a floating menu with a search bar. It filters the list of commands based on what you type after the `/`.
3. **Execution**: When you select a command (e.g., `/toggle`) and press Enter, the editor does the following:
   - It **deletes** the `/toggle` text you just typed.
   - It creates a **new Block object** in the database with `type: "toggle"`.
   - It inserts this new Block at your cursor position.
   - It places your cursor inside the `content` field of that Toggle block so you can type the title.

---

### 3. The Deep Dive: How `/toggle` Works (Addressing your specific example)

You asked: *"If I use /toggle, I can write text, math, anything like I write inside pages – how?"*

Here is the exact mechanical breakdown:

**Step A: Creating the Container**
When you create a Toggle, you are creating a **Parent Block** with a specific visual UI: a small triangle/arrow (▶) next to text. The block's `collapsed` property is set to `true` (hidden) or `false` (open).

**Step B: The Title (Visible part)**
You type the title of the toggle (e.g., "Chapter 1 Notes"). This text is stored in the `content` field of the Toggle block.

**Step C: Adding Content INSIDE the Toggle (The crucial part)**
To write *inside* the toggle, you press **Enter** (to create a new line) and then press **Tab** (or use the indent button). 
By indenting, you are telling the editor: *"Make this new block a child of the Toggle block above me."*

When you do this, the editor updates the database:

- It creates a **new Block** (let's say it's a `text` block).
- It adds the `id` of this new text block to the `children` array of the Toggle block.
- The Toggle now looks like this in the background:

```json
{
  "id": "toggle_001",
  "type": "toggle",
  "content": "Chapter 1 Notes",
  "collapsed": false,
  "children": ["child_text_001", "child_math_001"]
}
```

**Step D: Writing anything inside (Text, Math, Media, etc.)**
Because the `children` array accepts **any block type**, you can use slash commands inside the indented area:

- You type `/text` -> creates a standard paragraph child block.
- You type `/h2` -> creates a heading child block.
- You type `/math` or `/latex` -> creates a **Block-level** math equation child block.
- You type `/image` -> creates an image child block.

**Step E: Inline Math inside the Toggle**
You also asked about writing math. If you don't want a separate math block, but want math *inside a sentence* inside the toggle, you type `$E=mc^2$` or use the `/equation` command. This is an **Inline Command**. It does not create a new block; instead, it wraps the text in a special span that the renderer knows to format using TeX. This inline formatting lives *inside* the `content` string of the child text block.

**The Result**: When you click the arrow (▶) next to "Chapter 1 Notes", the UI tells the rendering engine: *"Render all blocks whose IDs are in my `children` array."* The children are rendered perfectly, exactly as they would be on a main page, because a **Page is just a root-level Block** that contains child blocks.

---

### 4. How the other Categories fit into this Framework

#### **Basic Blocks (Structural)**
- **`/text` & `/plain`**: The default block. Just raw text.
- **`/page`**: Creates a completely new root-level Block (a new page) and opens it. It is the same data structure, just placed at the top level of your workspace database.
- **`/bullet`, `/num`, `/todo`**: These are just visual variations of list blocks. They share the exact same nesting mechanics as the toggle. For a `/todo`, the block has an extra `checked: true/false` property. When you indent a child under a bullet, it becomes a sub-bullet.
- **`/div`**: Creates a visual separator block with no content, just a style.
- **`/quote`**: A text block with a vertical left border and larger font styling.
- **`/h1`, `/h2`, `/h3`**: Text blocks with specific font-size and weight metadata. The system uses these to automatically generate the `/toc` (Table of Contents).

#### **Media Blocks (Rich Content)**
- These blocks have a `type` that tells the renderer to ignore standard text editing and instead display an HTML element (like an `<img>`, `<video>`, or `<iframe>`).
- **`/image`**: The block stores a `source` URL (either uploaded to the server's CDN or linked from Unsplash). The renderer turns this into a responsive image tag.
- **`/pdf` & `/book`**: The block stores the external URL. The renderer uses an embedded viewer (like Google Docs Viewer or an iframe) to display the file directly inside the page.
- **`/code`**: This block has a `language` property (e.g., "javascript"). The renderer uses a syntax-highlighting library (like Prism.js) to color the text stored in its `content`.

#### **Inline Commands (Not Blocks)**
These are the exception; they do **not** create new blocks. Instead, they modify the text *inside* a block's `content` field.

- **`/mention`**: Inserts a special tag (e.g., `@John Doe`) that links to another Block's `id`. When clicked, the editor navigates to that person's page or that specific block.
- **`/date` or `/reminder`**: Inserts a timestamp object. The editor stores this as a Unix timestamp. The UI renders it as a human-readable date, and the system can trigger notifications based on it.
- **`/emoji`**: Opens a Unicode picker; it simply inserts the emoji character (😊) into your text string.
- **`/equation` (Inline)**: Wraps your TeX code (e.g., `\sqrt{4}`) in a specific delimiter. The renderer uses a MathJax or KaTeX library to display it as a beautiful formula *within* the sentence.

#### **Advanced Commands (Block Manipulation)**
- **`/duplicate`**: The editor copies the entire JSON object of the current block, including its `children` array (recursively), generates new IDs for every copy, and pastes it right below.
- **`/moveto`**: Opens a search modal. When you select a target page, the editor removes the current block from its current parent's `children` array and pushes it into the target page's `children` array.
- **`/delete`**: Removes the block's ID from its parent's `children` array and tells the database to garbage-collect that block and its descendants.
- **`/toc`**: The editor scans the current page's entire tree of child blocks, finds every block with `type` starting with `h1`, `h2`, or `h3`, reads their `content`, and dynamically generates a nested, clickable list of links that scroll the viewport to those heading blocks.
- **`/button` or `/template`**: You select a group of child blocks. The editor copies their JSON structure and stores it inside a new "Button" block. When you click the rendered button, the editor pastes a fresh copy of that stored JSON structure at your cursor position.
- **`/bread`**: Renders a horizontal navigation bar by looking at the current block's parent, grandparent, and great-grandparent IDs, displaying their titles as clickable links.

---

### 5. The "Magic" of the Escape (`esc`) Key
When you type `/`, the menu opens. If you press `esc`, the editor simply destroys the floating menu element in the DOM and leaves the literal `/` character you typed in your text so you can write fractions (e.g., "1/2") without triggering the menu.

---

### 6. Summary of the Toggle (Your specific use case)
To directly answer your question:

> *"How does /toggle allow me to write text, math, and anything like I write inside pages?"*

**Because a Toggle block is structurally identical to a Page.** 
A Page is just a block with no parent. A Toggle is a block that hides/shows its children. When you indent content under a toggle, you are building a **child tree**. The rendering engine does not care if the root is a "Page" or a "Toggle"—it recursively renders whatever blocks are in the `children` array. Therefore, **any command available on a page (`/image`, `/math`, `/code`, `/h1`, etc.) is available as a child inside a Toggle.** The Toggle is simply a collapsible folder for your blocks.