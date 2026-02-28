export function json(res: any, status: number, payload: unknown): void {
  res.status(status).setHeader("content-type", "application/json").send(JSON.stringify(payload));
}

export function methodNotAllowed(res: any, allowed: string[]): void {
  res.setHeader("allow", allowed.join(", "));
  json(res, 405, { error: "Method Not Allowed" });
}
