import { useState } from "react";
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

  return (
    <div>
      <header className="app-header">
        <div className="brand">
          <span>🏠</span> HandyDad
        </div>
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${LIBRARY_SCREENS.includes(screen.name) ? "active" : ""}`}
            onClick={() => setScreen({ name: "library" })}
          >
            Project Library
          </button>
          <button
            className={`nav-tab ${screen.name === "challenge" ? "active" : ""}`}
            onClick={() => setScreen({ name: "challenge" })}
          >
            Monthly Challenge
          </button>
        </nav>
      </header>

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
    </div>
  );
}
