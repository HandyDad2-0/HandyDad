# HandyDad

**A personalized weekend build planner for family DIY projects.**

HandyDad helps parents plan short-to-medium home builds — treehouses, mudroom benches, garage tool walls, reading nooks, and similar projects — around their actual yard or room dimensions, budget, timeline, and skill level. Instead of relying on static plan libraries or generic PDFs, HandyDad checks a chosen design against the user's real space, generates a budget-tiered materials list, and answers build questions with grounded, sourced information rather than an open-ended chatbot.

This repository is the codebase for our CSCE 4901 Capstone I / II project.

---

## Table of Contents

- [Problem](#problem)
- [Target Users](#target-users)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [Project Status](#project-status)
- [Team](#team)
- [Getting Started](#getting-started)
- [Repository Structure](#repository-structure)
- [Contributing](#contributing)

---

## Problem

Parents who want to build something for their kids or make house chores easier currently have two options: static blog posts / PDF plan libraries with fixed dimensions and material lists, or decades-old project books that are equally static and don't reflect current material prices. Commercial tools like YardCost or Yard AI exist for professional landscaping and exterior work, but nothing serves the "build something with the kids this weekend" niche with real personalization.

HandyDad fills that gap: a personalized, interactive build planner for family-oriented DIY projects and chore-easing home upgrades.

## Target Users

- Parents/guardians looking for a weekend or week-long project to build with or for their kids
- DIY beginners who want guardrails — safety flags, skill-appropriate suggestions
- Anyone looking to reduce household friction (mudroom clutter, garage disorganization, laundry routing) through a small home build

## Core Features

- **Project Library** — curated, filterable project categories (kid structures, chore-easing builds), filterable by time commitment and skill level
- **Space Input & Complication Flagging** — manual dimension entry checked against a chosen design for fit, clearance, slope/grading, and basic load-bearing concerns
- **Budget-Tiered Materials List** — the same project shown at multiple price tiers with real, itemized shopping lists
- **Grounded Q&A** — a build-question assistant that answers using sourced, current reference data rather than unconstrained generation
- **Time/Skill Matching** — filters for available time and builder experience level

## Tech Stack

- **Frontend:** React (responsive, mobile-friendly for garage/yard use)
- **Backend:** Project/plan data model, budget-tier logic, dimension-fit rules engine
- **Space measurement:** Manual entry for MVP; AR-based measurement (ARKit/ARCore or WebXR) as a Capstone II stretch goal
- **Data:** Seed project library maintained by the team; pricing kept current via a maintained reference source

## Project Status

Currently in **Capstone I, Sprint 0** — establishing scope, requirements, and the initial project library.

| Milestone | Target |
|---|---|
| Team & repo setup | Sprint 0 |
| Requirements doc | Sprint 0 |
| Initial project library (5–8 seed projects) | Sprint 0 |
| Core data model + dimension input + materials list | Sprint 0–1 |
| Basic complication flagging | Sprint 1 |
| MVP frontend | Sprint 1 |
| Grounded AI Q&A integration | Capstone II |
| AR/camera measurement (stretch) | Capstone II |

## Team

| Name | Role |
|---|---|
| Shaket Regmi | Frontend & UX |
| Razee Nepal | Budget & Materials Engine |
| Anish Jaiswal | Space Measurement |
| Nicholas Marshall | AI Q&A Integration |
| Austin Ridge | Project Library & Rules Engine |

## Getting Started

Setup instructions will be added once the initial project scaffold is in place.

```bash
git clone https://github.com/nichonmarshall-cyber/HandyDad.git
cd HandyDad
```

## Repository Structure

```
HandyDad/
├── frontend/       # React application
├── backend/        # API, data models, rules engine
├── docs/           # Requirements, design docs, sprint artifacts
└── README.md
```

*(Structure will evolve as the codebase is built out.)*

## Contributing

This is a student capstone project developed by the team listed above. See `CONTRIBUTING.md` for branch naming, commit conventions, and pull request expectations.
