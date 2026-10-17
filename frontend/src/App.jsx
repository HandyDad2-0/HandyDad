import { useEffect, useRef, useState } from "react";
import ProjectLibrary from "./screens/ProjectLibrary.jsx";
import ProjectDetail from "./screens/ProjectDetail.jsx";
import EnterDimensions from "./screens/EnterDimensions.jsx";
import SpaceCheckResults from "./screens/SpaceCheckResults.jsx";
import MonthlyChallenge from "./screens/MonthlyChallenge.jsx";

const LIBRARY_SCREENS = ["library", "detail", "dimensions", "results"];

// Simple state-based navigation for the scaffold — no router dependency
// yet. Swap for react-router (or similar) once there are enough screens
// to need real URLs/deep-linking.
export default function App() {
  const [screen, setScreen] = useState({ name: "library" });
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
        </nav>
      </header>

      <main id="main" tabIndex={-1}>

      {screen.name === "library" && (
        <ProjectLibrary onSelectProject={(id) => setScreen({ name: "detail", projectId: id })} />
      )}

      {screen.name === "detail" && (
        <ProjectDetail
          projectId={screen.projectId}
          onBack={() => setScreen({ name: "library" })}
          onCheckSpace={(id) => setScreen({ name: "dimensions", projectId: id })}
        />
      )}

      {screen.name === "dimensions" && (
        <EnterDimensions
          projectId={screen.projectId}
          onBack={() => setScreen({ name: "detail", projectId: screen.projectId })}
          onSubmit={(input) => setScreen({ name: "results", projectId: screen.projectId, input })}
        />
      )}

      {screen.name === "results" && (
        <SpaceCheckResults
          projectId={screen.projectId}
          input={screen.input}
          onEditDimensions={() => setScreen({ name: "dimensions", projectId: screen.projectId })}
        />
      )}

      {screen.name === "challenge" && <MonthlyChallenge />}
      </main>
    </div>
  );
}
