# Contributing to HandyDad

This document describes how our team works in this repository. Following it keeps our git history clean and makes Sprint reviews (and grading) easier to follow.

## Branching

- `main` — always stable/working. Nothing broken gets merged here.
- Feature branches: `feature/<short-description>` (e.g. `feature/dimension-fit-check`)
- Bug fixes: `fix/<short-description>`
- Docs-only changes: `docs/<short-description>`

Create your branch off `main`:

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

## Commit Messages

Keep commits small and focused. Use plain, descriptive messages in the imperative mood:

```
Add budget tier selector to materials list
Fix dimension input validation on decimal values
Update README with team roles
```

Avoid vague commits like `fix stuff` or `update`.

## Pull Requests

1. Push your branch and open a PR into `main`.
2. Fill out a short description of what changed and why.
3. Tag at least one teammate for review before merging.
4. Resolve merge conflicts locally, not in the GitHub UI, whenever possible.
5. Delete the branch after merging.

## Issues / Task Tracking

We track tasks on our Trello board, mirrored from the sprint backlog. Reference the related Trello card in your PR description when relevant.

## Code Style

- Keep functions small and named clearly.
- Comment non-obvious logic, especially in the dimension-fit and budget-tier rules engine.
- Match existing formatting/style in a file rather than introducing a new convention mid-file.

## Questions

Bring blockers to the team sync or post in the team channel — don't sit on something for days before flagging it.
