# Heuristic Evaluation & Cognitive Walkthrough

## Nielsen's 10 Usability Heuristics

Use these as the wide-net first pass over any interface. For each, note concrete violations, not just "this could be better."

1. **Visibility of system status** — the system should always keep users informed through appropriate feedback within reasonable time (loading indicators, progress bars, confirmation toasts). A 0.3s+ delay with no feedback reads as broken, not slow.
2. **Match between system and the real world** — speak the user's language, follow real-world conventions, present information in a natural, logical order. Icons without labels are a common violation — if a novice couldn't name what an icon does, flag it.
3. **User control and freedom** — users need a clearly marked "emergency exit" (cancel, undo, back) for actions taken by mistake. Check every irreversible action (delete, submit, purchase) for a confirmation step or undo window.
4. **Consistency and standards** — users shouldn't have to wonder whether different words, situations, or actions mean the same thing. Check terminology and interaction patterns are used identically across the whole product, and that platform conventions (iOS/Android/web) are respected — see Jakob's Law in interaction-laws.md.
5. **Error prevention** — better than a good error message is a design that prevents the problem from occurring in the first place (confirmation dialogs before destructive actions, constraints that prevent invalid input). This heuristic feeds directly into the forms/error-handling checklist.
6. **Recognition rather than recall** — minimize memory load by making objects, actions, and options visible. Don't make users remember information from one screen to use on another.
7. **Flexibility and efficiency of use** — accelerators (shortcuts, saved presets) unseen by novice users can speed up interaction for experts.
8. **Aesthetic and minimalist design** — interfaces shouldn't contain irrelevant or rarely needed information; every extra unit of information competes with the relevant ones.
9. **Help users recognize, diagnose, and recover from errors** — error messages in plain language, precisely indicating the problem, constructively suggesting a solution. See component-checklists.md for the full error-handling checklist.
10. **Help and documentation** — even though it's better if the system can be used without documentation, it may be necessary to provide help; it should be easy to search, focused on the user's task, and list concrete steps.

## Cognitive Walkthrough

Complements the heuristics by focusing on learnability — specifically, whether a first-time user can complete a task without help. Best applied to onboarding flows and any "first run" experience.

For each step in a task, ask:
1. **Will the user try to achieve the right outcome?** (Does the task match what they're trying to do?)
2. **Will the user notice that the correct action is available?** (Is the control visible, not buried in a menu?)
3. **Will the user associate the correct action with the outcome they're trying to achieve?** (Does the label/icon make sense, or does it require guessing?)
4. **If the correct action is performed, will the user see that progress is being made?** (Feedback after the action — this overlaps with heuristic #1.)

A "no" at any step is a discoverability or clarity failure worth flagging — note which step failed and why, since the fix differs (step 2 failures need better visual prominence; step 3 failures need better labeling/icons; step 4 failures need feedback design).
