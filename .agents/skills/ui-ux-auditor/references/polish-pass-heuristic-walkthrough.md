# 5-Minute Heuristic Walkthrough

A fast manual pass to catch the most common overlooked details before or alongside the full checklist audit. Takes about five minutes; do it by actually interacting with the interface, not by reading code.

1. **Check the last pixel.** Open the screen without browser chrome if possible, zoom to 50%. Look at the very last element on the page — trailing whitespace, unflush bottom elements, orphaned words or broken lines at paragraph ends. Catches basic alignment/layout misses.

2. **Test every button state.** Click and hold each interactive element — does the pressed/active state feel immediate and satisfying? Try double-clicking a submit button — does the disabled state correctly prevent a second submission?

3. **Tab through the whole flow.** Use only the `Tab` key. Can every control be reached? Is the focus indicator clearly visible on each one? Does the order match the visual layout (left-to-right, top-to-bottom)? This surfaces accessibility failures fast.

4. **Look for motion — both missing and excessive.** Trigger a simple action (checkbox, dropdown). Was there a subtle, fast (<400ms) animation confirming it happened? Then hunt for the opposite: any single animation that feels slow, linear, or doesn't ease naturally.

5. **Read every label out loud.** Ask a question about a destructive/consequential action ("what happens if I delete this?") before looking at the screen, then check whether the UI actually answers it clearly and prominently. Tests whether copy and confirmation prompts are doing their job.

Fold whatever this surfaces into the main audit report rather than treating it as a separate deliverable — it's a triage tool to find issues fast, not a second report format.
