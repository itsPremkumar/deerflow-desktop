"use client";

export default function AgentsError({
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold">Agents view hit an error</h2>
      <p className="text-muted-foreground max-w-md text-sm">
        Only the agents section crashed — chats and other workspace areas are
        unaffected.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
      >
        Try again
      </button>
    </main>
  );
}
