/**
 * Frontend liveness probe for container orchestration.
 *
 * Independent of the Gateway: answers whether this Next.js process is up,
 * while Gateway health stays at /api/langgraph -> /health (rewritten) and
 * the Gateway's own /health/ready readiness probe.
 */
export async function GET() {
  return Response.json({
    status: "ok",
    service: "deer-flow-frontend",
    time: new Date().toISOString(),
  });
}
