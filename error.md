the /code command inserts a dedicated code block – a distinct, shaded container that displays text in a monospace font, preserves indentation and spacing, and most importantly, adds syntax highlighting for dozens of programming languages.

It is designed for writing, reading, and sharing actual code snippets (Python, JavaScript, HTML, CSS, JSON, etc.) without losing formatting.

How to insert it

You have several ways to create a code block:

Slash Command: Type /code on a new empty line and press Enter. (Typing /codeblock also works).

Markdown Shortcut: Type three backticks (```) on a new line and press Enter – it will instantly convert into a code block.

Block Menu: Click the + button that appears on the left margin of a new line, and select Code under the "Basic blocks" section.

Key Features & How They Work

Once you insert a code block, you get several powerful tools:

Language Selection (Syntax Highlighting):

When you first create the block, a small dropdown menu appears at the top-left corner (defaulting to "Plain Text").

Click it and select your language (e.g., Python, JavaScript, HTML, SQL, C++, etc.).

Notion will automatically color-code keywords, strings, variables, and comments based on that language. If you leave it as "Plain Text", no colors are applied.

Copy to Clipboard:

Hover your mouse over the top-right corner of any code block. You will see a "Copy" button. Click it, and the entire content of the block is instantly copied to your clipboard with one click.

Full-Width Toggle:

At the top-right, next to the copy button, there is a "Full width" toggle (arrows pointing outward).

By default, the code block is constrained to your page margins. Clicking this makes the block stretch across the entire screen width, which is very useful for long lines of code that would otherwise wrap awkwardly.

Wrap Toggle:

Next to the full-width button, there is a "Wrap" toggle.

When turned off, long lines of code scroll horizontally (you'll see a scrollbar).

When turned on, long lines of text automatically break onto the next line so you can see everything without scrolling sideways.

Difference from Inline Code

Notion has two ways to write code, and it's important to know the difference:

Feature	Inline Code	Code Block
How to insert	Type  (backticks) around text, e.g., let x = 5;	/code or triple backticks ``` |
Formatting	Appears inside a paragraph with a grey background	Standalone block with a dark/grey shaded background
Syntax Highlighting	❌ No	✅ Yes (based on language selected)
Multi-line support	❌ No (single line only)	✅ Yes (ideal for entire functions/classes)
Copy button	❌ No	✅ Yes
Use inline code for mentioning a variable, function name, or short command inside a sentence. Use the code block for entire scripts, algorithms, or configurations.

Limitations to Keep in Mind

No Line Numbers: Notion does not currently display line numbers on the side of the code block.

No Live Editing/Execution: It is purely for display. You cannot run or compile code inside Notion.

Language Support: It supports all major languages, but if you are working with an obscure niche language, it might not have syntax highlighting. You can always fall back to "Plain Text".

No Indentation Guides: It won't show vertical lines to help you match indentation levels (unlike many dedicated code editors).

Bonus Tip: Turning a Text Block into a Code Block

If you've already typed text and realize it should have been a code block, you don't need to re-type it. Just:

Click the ⋮⋮ (drag handle) on the left of the block.

Select "Turn into" and choose Code.

Then select the correct language from the dropdown.

1. /equation (Math & Formulas)
The /equation command inserts a mathematical formula written in LaTeX (a typesetting language for math). Notion gives you two ways to do this: a standalone block (via /equation) and inline text (via a shortcut).

How to insert a Block Equation:

Slash Command: Type /equation on a new empty line and press Enter.

A large empty box will appear. Type your LaTeX code inside (e.g., \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}), and Notion will instantly render it as a clean, centered mathematical expression.

How to insert an Inline Equation (inside a sentence):

Type $$ (two dollar signs), then immediately type your LaTeX code, and close with $$.

Alternative: Type your equation, highlight it, and press Cmd/Ctrl + E to convert it into an inline equation.

Example: $$E = mc^2$$ will appear as a neat E = mc² inside your paragraph.

Key Features & Options:

Toggle Block/Inline: After creating an equation, click the ⋮⋮ (drag handle) or click the equation itself. A small popup will appear, letting you switch between "Block" (centered, standalone) and "Inline" (embedded in text).

LaTeX Support: Supports most standard LaTeX syntax, including fractions (\frac), integrals (\int), sums (\sum), Greek letters (\alpha, \beta), and matrices.

Limitations:

No Live Preview while typing: You must hit Enter or click away to see the rendered result. The code remains visible inside the block until you click out.

No auto-complete: Unlike dedicated math editors, Notion doesn't suggest LaTeX commands as you type.

Basic rendering: It doesn't support very advanced LaTeX packages or custom macros.

2. /date (Dates & Time)
The /date command inserts a dynamic date picker directly into your text. It’s perfect for setting deadlines, scheduling events, or tracking milestones inside any page.

How to insert it:

Slash Command: Type /date on a new line or anywhere inside a paragraph, and press Enter. A date block will appear.

Inline Text: You can also type /date mid-sentence, and it will insert the date picker right where your cursor is.

How it works:

Click the date block – a calendar popup will open.

Pick a day: Click on a date.

Add a time (optional): Toggle the "Include time" switch at the bottom of the calendar to set a specific hour and minute.

Set a date range (optional): Toggle the "End date" switch to pick a start and end date (useful for events or projects spanning multiple days).

Display Formats:

After selecting a date, you can click the date block again and choose how it displays:

Relative: "Tomorrow," "In 3 days," "Yesterday" (updates dynamically).

Absolute: "Jan 20, 2026" or "20/01/2026" (based on your system locale).

Time: "10:30 AM" or "14:30" depending on your 12/24-hour settings.

Limitations:

Static block: It doesn't automatically update as a countdown timer (it shows "in 2 days" but stays a fixed text block on the page).

No recurring dates: You cannot set a recurring event (e.g., "every Monday"). You have to create separate date blocks or use a database with a Date property for that.

 /math is a slash command that inserts a mathematical equation using LaTeX (specifically the KaTeX library). It’s designed for writing beautifully formatted math—fractions, integrals, square roots, matrices, Greek letters, and more—in your notes, technical documentation, homework, or anywhere you need equations.

How to insert it
Notion gives you two formats for equations: Block (standalone, centered) and Inline (embedded inside a sentence).

1. Block Equation (Standalone)
Slash Command: Type /math on a new empty line and press Enter. A new equation block will appear.

Block Menu: Click the + that appears on the left margin of a new line, scroll down, and select Block equation.

Once the block is created, click inside it to type or paste your LaTeX code.

2. Inline Equation (Inside Text)
You have three ways to insert an equation inline:

Text Shortcut: Type $$ (two dollar signs), then your equation, then close with $$ again. For example: $$E = mc^2$$ becomes a formatted equation.

Keyboard Shortcut: Press Ctrl/Cmd + Shift + E to open the equation input, type your equation, and press Enter.

Formatting Menu: Highlight the text you want to convert, click the √x button in the formatting toolbar, or use Ctrl/Cmd + Shift + E.

Key Features & How They Work
LaTeX / KaTeX Rendering: Notion uses the KaTeX library to render equations, which supports a large subset of LaTeX functions. You can write fractions (\frac), integrals (\int), sums (\sum), Greek letters (\alpha, \beta), matrices, and much more.

Block ↔ Inline Conversion: You can convert a block equation to inline (and vice versa) using the "Turn into" menu on the block's drag handle (⋮⋮).

Edit Inline Equations: Click on any existing inline equation to open the equation input and edit it. Changes reflect live on your page. You can also navigate to an equation using arrow keys—the input opens when your cursor passes over it.

Keyboard Shortcut for Editing: With an equation block selected, press Cmd/Ctrl + Enter/Return to start editing.

Limitations to Keep in Mind
Not Full LaTeX: KaTeX supports most, but not all, LaTeX notation. If your equation doesn't render correctly, check the supported functions list.

No Live Preview While Typing (Block): In a block equation, you type the LaTeX code, and it renders only after you click away or press Enter.

No Auto-Complete: Notion doesn't suggest LaTeX commands as you type.

No Equation Numbering: You cannot automatically number equations (e.g., (1), (2)) like in professional LaTeX editors.

Third-party Extensions: Some Chrome extensions exist to convert $...$ syntax into native Notion inline equations, but these are not officially supported.

/math vs. /equation – Are they the same?
Yes, they are the exact same feature. /math and /equation are simply two different slash commands that do the same thing: they both insert a mathematical equation block.

Command	Result
/math	Inserts a block equation
/equation	Inserts a block equation
Think of them as synonyms—use whichever you remember first.

Quick Reference
Feature	How to do it
Block equation	Type /math or /equation on a new line, press Enter
Inline equation	Type $$...$$ around your equation
Inline equation (keyboard)	Ctrl/Cmd + Shift + E
Edit a block equation	Click inside it, or press Cmd/Ctrl + Enter
Edit an inline equation	Click on it
Convert block ↔ inline	Use the "Turn into" menu (⋮⋮)



/divider is not working , /divider is a slash command that inserts a horizontal rule (a thin grey line) across the width of your page. It acts as a visual separator to break up content, making long
  documents, databases, or notes much easier to scan.
  
  How to use it
  
  You have three ways to insert a divider:
  
  Slash Command (Fastest): Type /divider on a new empty line and press Enter.
  
  Markdown Shortcut: Type --- (three hyphens) on a new line and press Enter – it will automatically turn into a divider.
  
  Block Menu: Hover over the left margin of a new line, click the + button, and select Divider under the "Basic blocks" section.
  
  Shortened Alias: Typing /div and pressing Enter also works.
  
  The Main Feature: Using it for Presentations (Slide Breaks)
  
  The most powerful use of the /divider command is its integration with Notion's Presentation Mode. Here, dividers don't just style your page—they define your slides.
  
  Here’s exactly how it works:
  
  Slide Boundaries: Every time you place a divider on your page, it tells Notion, "End the current slide here and start a new one."
  
  Cover Slide: The title and page icon at the very top of your page automatically become the first (cover) slide.
  
  Launching the Presentation: Once your dividers are set, click the ••• (three dots) menu in the top-right corner of your page and select Present.
  
  Keyboard Shortcut: You can also launch it instantly using ⌘ + Option + P (Mac) or Ctrl + Alt + P (Windows).

  Example:
  If you have 3 dividers on a page, Notion will create 4 total slides (1 cover + 3 sections).

  Important Limitations to Keep in Mind

  Style is fixed: Notion dividers are always a simple, thin light-grey line. You cannot change their color, thickness, or style (no dotted or dashed lines).

  No native vertical dividers: /divider only creates horizontal lines. If you want a "vertical" separator, you have to use workarounds like creating two or three columns (by dragging blocks side-by-side) or using a Quot
  block (/quote) to create a left-side vertical bar.

  Paywall for Presentations: While inserting dividers is free, using them to actually present (Presentation Mode) is a feature reserved for Notion's paid plans (Plus, Business, or Enterprise). On the free plan, you can
  insert the lines, but you won't see the "Present" option in the menu.