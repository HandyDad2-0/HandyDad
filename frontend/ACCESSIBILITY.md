# Accessibility pass: evidence

Trello: Shaket, Accessibility pass on frontend screens (Sprint 2).
Target: WCAG 2.1 AA for the five existing screens (Project Library, Project Detail,
Enter Dimensions, Space Check Results, Monthly Challenge).

## How it was checked

| Check | Method |
| --- | --- |
| Automated rules | axe-core (wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice) run in headless Chromium on 11 states: library, library with filter active, detail, dimensions, dimensions with error, results with flags, challenge empty, submit modal open, modal with error, leaderboard with a voted row, backend down |
| Keyboard only | Skip link, tab order, Enter/Space on cards, chips, form submit, voting; Escape and Tab trap in the modal; focus restored to the opener |
| Focus after navigation | Focus moves to the screen's h1 and `document.title` updates on each screen change |
| Colour contrast | Computed ratios for text and accent colours against their backgrounds (4.5:1 minimum) |
| Reflow | Horizontal overflow measured at 320px and 375px width on all five screens |
| Target size | Interactive elements measured against 24x24 px |

## Result

axe-core violations: 5 rule types across 10 states before, 0 on all 11 states after.

## What was fixed

- **Landmarks and structure:** skip link, `main`, labelled `nav` with `aria-current`, one `h1` per screen, headings in order.
- **Focus:** visible two-tone focus ring on every control; focus moves to the new screen's heading after navigation; page title reflects the screen.
- **Contrast:** `--accent` darkened to `#9b5c33`; photo-placeholder text uses the dark accent.
- **Project Library:** filter chips are real toggle buttons (`aria-pressed`) in labelled groups; cards are list items with a single stretched link button.
- **Project Detail:** facts are a description list instead of loose divs.
- **Enter Dimensions:** real `form`, label/input association, `aria-required`, `aria-invalid`, error in `role="alert"` linked by `aria-describedby`, focus sent to the first invalid field, obstacles grouped in a `fieldset`/`legend`.
- **Results:** flag severity shown as text as well as colour; decorative icons hidden from assistive tech.
- **Monthly Challenge:** leaderboard is an ordered list; vote button names the build and its count and stays focusable when already voted (`aria-disabled`); vote and submit results announced through a polite live region; submit form is a proper modal dialog (`role="dialog"`, `aria-modal`, labelled, focus moved in, Escape closes, Tab trapped, focus restored).
- **Small screens:** header wraps, detail and tier layouts stack, no horizontal scroll at 320px.
- **Targets:** checkboxes enlarged to 24x24 px; nav tabs and back links have a 24px minimum height.

## Known limits

- No real screen reader (VoiceOver, NVDA, JAWS) was available, so announcements are verified from the DOM (roles, names, live regions), not by listening.
- Placeholder photo boxes are hidden from assistive tech; real photos will need meaningful alt text when they exist.
- The Describe Your Idea and Ask HandyDad screens do not exist yet and need their own pass.
- The height field on Enter Dimensions is only code-reviewed: no seed project currently triggers it.
- The "Save to My Projects" button is still a non-functional placeholder.
