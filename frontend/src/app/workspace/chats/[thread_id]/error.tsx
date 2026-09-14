"use client";

import Link from "next/link";

export default function ChatThreadError({
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold">This chat hit an error</h2>
      <p className="text-muted-foreground max-w-md text-sm">
        Only this conversation view crashed — your other chats and data are
        unaffected. Try again, or go back to the chat list.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
        >
          Try again
        </button>
        <Link
          href="/workspace/chats/new"
          className="rounded-md border px-4 py-2 text-sm font-medium"
        >
          New chat
        </Link>
      </div>
    </main>
  );
}
