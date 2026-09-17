import BridgeBuilder from "./components/BridgeBuilder";

export default function App() {
  return (
    <main className="page-shell">
      <div className="demo-shell">
        <header className="page-copy">
          <p className="eyebrow">LevelBest game laboratory</p>
          <h1>Bridge Builder</h1>
          <p>
            Build a stable bridge by reasoning about balance, load, and
            structure. Try a design, inspect the result, and revise it.
          </p>
        </header>
        <section aria-label="Bridge Builder game" className="demo-panel">
          <BridgeBuilder />
        </section>
      </div>
    </main>
  );
}
