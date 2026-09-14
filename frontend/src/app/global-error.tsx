"use client";

export default function GlobalError({
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground max-w-md text-sm">
            The application hit an unexpected error. Your chats and data are
            unaffected — try again, or reload the page.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
