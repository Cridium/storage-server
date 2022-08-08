import { createHttpError, HttpRequest } from "@deepkit/http";

export class HttpRangeNotSatisfiableError extends createHttpError(
  416,
  "Range not satisfiable",
) {}

export function getContentLength(request: HttpRequest): number {
  const result = request.headers["content-length"];
  if (!result) throw new Error("Content-Length header is missing");
  return +result;
}
