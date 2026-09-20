# AI Q&A Grounding

Owner: Nicholas Marshall

Scope notes for the **Grounded AI Q&A** feature (see README Core Features). This covers the Sprint 0 scoping items on the "Design AI Q&A grounding layer" Trello card: grounding source selection, retrieval flow, response guardrails, and the open question of team-maintained data vs. live search.

## Goal

Allow users to ask build-related questions and receive useful answers based on HandyDad's approved project, materials, dimension, and safety information rather than relying on unrestricted AI-generated responses.

The goal is not to create a general-purpose DIY chatbot. The Q&A system should stay grounded in the selected HandyDad project and clearly identify when the available project data is not enough to support an answer.

## 1. Grounding Source Decision

**Decision:** Use **team-maintained and approved data as the primary grounding source for the MVP** rather than unrestricted live web search.

The initial project library is expected to contain only 5–8 seed projects, so the grounding layer can retrieve directly from structured project data without requiring a large external search system.

**Primary MVP sources:**

- Project dimensions and required clearances
- Project instructions and build steps
- Materials and quantities
- Budget-tier material information
- Dimension-fit and complication rules
- Safety notes associated with the project
- Team-approved reference material

The model should answer using retrieved information from these sources whenever a question depends on project-specific facts.

**Live search decision:** General live web search should not be part of the initial Q&A flow. Unrestricted search would make responses harder to reproduce, test, and validate.

Live or external data may be introduced later for narrowly defined information that changes frequently, such as current material pricing, but those sources should be explicitly approved rather than allowing unrestricted web retrieval.

## 2. Grounding & Retrieval Flow

The MVP Q&A flow should follow these steps:

1. User selects or is currently viewing a HandyDad project.
2. User submits a question about the project.
3. System identifies the type of question being asked.
4. System retrieves relevant approved information for the selected project.
5. Retrieved information is provided to the AI model as grounding context.
6. Model generates an answer using the supplied context.
7. Guardrails check the response for unsupported dimensions, quantities, pricing, or safety claims.
8. System returns the answer to the user.
9. If sufficient supporting information is unavailable, the system tells the user that the answer cannot be verified from the available HandyDad data.

The model should prefer project-specific information over general model knowledge whenever the two could conflict.

## 3. Question Categories

For the MVP, questions can be grouped into a small number of categories:

- **Project Instructions:** Questions about build steps or the order of construction
- **Materials:** Questions about required materials, substitutions, or quantities
- **Dimensions:** Questions involving project measurements, fit, or clearance
- **Safety:** Questions involving structural concerns, tools, load-bearing components, or potentially unsafe modifications
- **Local Code:** Questions involving permits, zoning, setbacks, electrical rules, or other location-specific requirements
- **General DIY:** Basic explanatory questions that do not change project measurements or safety requirements

Safety and Local Code questions should receive stricter handling than ordinary project questions.

## 4. Response Guardrails

The Q&A system should follow these rules:

- Do not invent project dimensions or clearances.
- Do not invent material quantities.
- Do not invent or assume material prices.
- Do not claim a structure or modification is safe unless approved reference information supports the claim.
- Do not assume local building, zoning, electrical, or permit requirements.
- Structural, load-bearing, electrical, plumbing, and similar safety-relevant questions should be treated as higher-risk questions.
- If the available project data does not support an answer, clearly state that the answer cannot be verified.
- Prefer information from the selected HandyDad project over general AI knowledge.
- Separate documented project requirements from optional suggestions.
- Preserve enough source information internally to identify what project data was used to generate the response.

For example, if a user asks whether a smaller support post can replace the one specified in a project, the AI should not approve the substitution unless HandyDad's approved project or safety data explicitly supports it.

## 5. MVP Data Approach

A vector database is not required for the initial project library.

With only 5–8 seed projects, the MVP can retrieve information directly from structured project data using fields such as:

- Project name
- Difficulty
- Estimated build time
- Dimensions
- Required clearances
- Materials
- Material quantities
- Instructions
- Complication rules
- Safety notes

Project data can initially be stored in structured JSON or the application's primary database.

Example project structure:

```json
{
  "project": "Mudroom Bench",
  "difficulty": "beginner",
  "dimensions": {
    "width_cm": 121.92,
    "depth_cm": 45.72,
    "height_cm": 50.8
  },
  "materials": [],
  "instructions": [],
  "safety_notes": []
}
