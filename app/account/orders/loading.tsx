export default function AccountOrdersLoading() {
  return (
    <main className="account-shell" aria-busy="true">
      <div className="mx-auto w-full max-w-3xl animate-pulse">
        <div className="mb-6 h-9 w-52 rounded bg-muted" />
        <div className="h-56 rounded-xl border bg-card" />
      </div>
    </main>
  );
}
