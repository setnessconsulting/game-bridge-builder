import BridgeBuilder from "./components/BridgeBuilder";
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
          <p className="eyebrow">LevelBest game laboratory</p>
          <h1>Bridge Builder</h1>
          <p>
            {game132
              ? "GAME-132 qualification slice: compose exact lengths through the Phaser presentation while the TypeScript engine remains the sole correctness authority."
              : "Build a stable bridge by reasoning about balance, load, and structure. Try a design, inspect the result, and revise it."}
          </p>
        </header>
        <section aria-label="Bridge Builder game" className="demo-panel">
          {game132 ? (
            <BridgeBuilderPhaserHost reducedMotion={reducedMotion} />
          ) : (
            <BridgeBuilder />
          )}
        </section>
      </div>
    </main>
  );
}
