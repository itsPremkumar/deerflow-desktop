import { redirect } from "next/navigation";

/**
 * Desktop-first entry: skip the marketing landing page and open the 2.0
 * chat directly (the same destination as "Get Started with 2.0").
 *
 * Routing through `/workspace` keeps every mode correct: it sends normal
 * deployments to a fresh `/workspace/chats/new` composer and static-demo
 * deployments to their fixture thread. Blog/docs remain available by direct
 * URL; the agent workflow is untouched — only the `/` landing target changes.
 */
export default function HomePage() {
  redirect("/workspace");
}
