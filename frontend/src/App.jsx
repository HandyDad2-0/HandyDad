import { useEffect, useRef, useState } from "react";
import ProjectLibrary from "./screens/ProjectLibrary.jsx";
import ProjectDetail from "./screens/ProjectDetail.jsx";
import EnterDimensions from "./screens/EnterDimensions.jsx";
import SpaceCheckResults from "./screens/SpaceCheckResults.jsx";
import MonthlyChallenge from "./screens/MonthlyChallenge.jsx";
import DescribeIdea from "./screens/DescribeIdea.jsx";
import MyProjects from "./screens/MyProjects.jsx";
import { loadSaved, saveList, addSaved, removeSaved, visibleSaved, SAVED_KEY } from "./lib/savedProjects.js";
import { getProjectById } from "./data/projects.js";

const LIBRARY_SCREENS = ["library", "detail", "dimensions", "results", "idea"];

// Simple state-based navigation for the scaffold — no router dependency
// yet. Swap for react-router (or similar) once there are enough screens
// to need real URLs/deep-linking.
export default function App() {
  const [screen, setScreen] = useState({ name: "library" });
  // Saved ("My Projects") ids live here so the detail page, the My Projects
  // screen and the nav count always agree. Persisted to localStorage.
  const [savedIds, setSavedIds] = useState(loadSaved);
  const [storageOk, setStorageOk] = useState(true);
  const lastScreenKey = useRef(null);

  // The app swaps screens with state instead of real page loads, so
  // assistive tech isn't told anything changed. After each screen change we
  // update the document title and move focus to the new screen's <h1>.
  // Comparing against the previous screen (rather than "first render") keeps
  // the page from stealing focus on arrival, including under StrictMode's
  // double-invoked effects in development.
  useEffect(() => {
    const key = `${screen.name}:${screen.projectId ?? ""}`;
    const heading = document.querySelector("main h1");
    document.title = heading ? `${heading.textContent} \u2014 HandyDad` : "HandyDad";
    const changed = lastScreenKey.current !== null && lastScreenKey.current !== key;
    lastScreenKey.current = key;
    if (changed && heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus();
    }
  }, [screen.name, screen.projectId]);

  function updateSaved(next) {
    setSavedIds(next);
    setStorageOk(saveList(next));
  }

  // Keep other open tabs in step: a change made in one tab shows in the rest.
  useEffect(() => {
    function onStorage(e) {
      if (e.key === SAVED_KEY || e.key === null) setSavedIds(loadSaved());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Count only projects that still exist, so the nav always matches the list.
  const savedCount = visibleSaved(savedIds, getProjectById).length;
  const libraryActive = LIBRARY_SCREENS.includes(screen.name);

  return (
    <div>
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="app-header">
        <div className="brand">
          <span aria-hidden="true">🏠</span> HandyDad
        </div>
        <nav className="nav-tabs" aria-label="Main">
          <button
            className={`nav-tab ${libraryActive ? "active" : ""}`}
            aria-current={libraryActive ? "page" : undefined}
            onClick={() => setScreen({ name: "library" })}
          >
            Project Library
          </button>
          <button
            className={`nav-tab ${screen.name === "challenge" ? "active" : ""}`}
            aria-current={screen.name === "challenge" ? "page" : undefined}
            onClick={() => setScreen({ name: "challenge" })}
          >
            Monthly Challenge
          </button>
          <button
            className={`nav-tab ${screen.name === "saved" ? "active" : ""}`}
            aria-current={screen.name === "saved" ? "page" : undefined}
            onClick={() => setScreen({ name: "saved" })}
          >
            My Projects{savedCount > 0 ? ` (${savedCount})` : ""}
          </button>
        </nav>
      </header>

      <main id="main" tabIndex={-1}>

      {screen.name === "library" && (
        <ProjectLibrary
          onSelectProject={(id) => setScreen({ name: "detail", projectId: id })}
          onDescribeIdea={() => setScreen({ name: "idea" })}
        />
      )}

      {screen.name === "detail" && (
        <ProjectDetail
          projectId={screen.projectId}
          from={screen.from}
          isSaved={savedIds.includes(screen.projectId)}
          onToggleSaved={(id) => updateSaved(savedIds.includes(id) ? removeSaved(savedIds, id) : addSaved(savedIds, id))}
          storageOk={storageOk}
          onBack={() => setScreen({ name: screen.from === "saved" ? "saved" : "library" })}
          onCheckSpace={(id) => setScreen({ name: "dimensions", projectId: id, from: screen.from })}
        />
      )}

      {screen.name === "dimensions" && (
        <EnterDimensions
          projectId={screen.projectId}
          onBack={() => setScreen({ name: "detail", projectId: screen.projectId, from: screen.from })}
          onSubmit={(input) => setScreen({ name: "results", projectId: screen.projectId, input, from: screen.from })}
        />
      )}

      {screen.name === "results" && (
        <SpaceCheckResults
          projectId={screen.projectId}
          input={screen.input}
          onEditDimensions={() => setScreen({ name: "dimensions", projectId: screen.projectId })}
        />
      )}

      {screen.name === "idea" && (
        <DescribeIdea
          onBack={() => setScreen({ name: "library" })}
          onSelectProject={(id) => setScreen({ name: "detail", projectId: id })}
        />
      )}

      {screen.name === "saved" && (
        <MyProjects
          savedIds={savedIds}
          storageOk={storageOk}
          onSelectProject={(id) => setScreen({ name: "detail", projectId: id, from: "saved" })}
          onRemove={(id) => updateSaved(removeSaved(savedIds, id))}
          onBrowse={() => setScreen({ name: "library" })}
        />
      )}

      {screen.name === "challenge" && <MonthlyChallenge />}
      </main>
    </div>
  );
}
