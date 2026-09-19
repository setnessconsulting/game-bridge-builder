import BridgeBuilderCandidate from "./components/BridgeBuilderCandidate";
import BridgeBuilderPhaserHost from "./components/BridgeBuilderPhaserHost";

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const game132 = params.get("game132") === "1";
  const reducedMotion = params.get("reduced") === "1";

  return (
    <main className="page-shell">
      <div
        className="demo-shell"
        style={game132 ? { maxWidth: 1120 } : undefined}
      >
        <header className="page-copy">
          <p className="eyebrow">Bridge Builder</p>
          <h1>Bridge Builder</h1>
          <p>
            {game132
              ? "Build each bridge to fit its span exactly."
              : "Choose planks, close the gap, and build each bridge to fit exactly."}
          </p>
        </header>
        <section aria-label="Bridge Builder game" className="demo-panel">
          {game132 ? (
            <BridgeBuilderPhaserHost reducedMotion={reducedMotion} />
          ) : (
            <BridgeBuilderCandidate />
          )}
        </section>
      </div>
    </main>
  );
}
