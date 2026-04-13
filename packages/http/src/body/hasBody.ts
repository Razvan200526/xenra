export function hasBody(req: Request): boolean {
  const contentLength = req.headers.get("content-length");
  const transferEncoding = req.headers.get("transfer-encoding");

  if (transferEncoding) return true;
  if (contentLength === null) return false;

  const parsed = Number(contentLength);
  return Number.isFinite(parsed) && parsed > 0;
}
