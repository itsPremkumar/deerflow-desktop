import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-muted-foreground text-sm font-medium tracking-wide">
        404
      </p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        The page you are looking for does not exist or was moved.
      </p>
      <Link
        href="/"
        className="text-sm font-medium underline underline-offset-4"
      >
        Back to home
      </Link>
    </main>
  );
}
