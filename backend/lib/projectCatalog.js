import { readFileSync } from "node:fs";

export const projects = Object.freeze(JSON.parse(
  readFileSync(new URL("../../data/seed-projects.json", import.meta.url), "utf8")
));

export const projectsById = new Map(projects.map((project) => [project.id, project]));
