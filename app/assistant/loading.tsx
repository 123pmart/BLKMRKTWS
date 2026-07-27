export default function AssistantLoading() {
  return (
    <main className="assistant-shell" aria-busy="true" aria-label="Loading product assistant">
      <div className="assistant-loading-mark" />
      <div className="assistant-loading-line" />
      <div className="assistant-loading-panel" />
    </main>
  );
}
