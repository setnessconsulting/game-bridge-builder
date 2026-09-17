import BridgeBuilderCandidate from "./components/BridgeBuilderCandidate";

export default function App() {
  return (
    <main className="page-shell">
      <div className="demo-shell">
        <header className="page-copy">
          <p className="eyebrow">Standalone qualification build</p>
          <h1>Bridge Builder</h1>
          <p>
            A candidate build for the shared games site. This build remains
            independent from LevelBest until the approval gates are complete.
          </p>
        </header>
        <section aria-label="Bridge Builder game" className="demo-panel">
          <BridgeBuilderCandidate />
        </section>
      </div>
    </main>
  );
}
