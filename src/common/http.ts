import { createHttpError } from "@deepkit/http";

export class HttpRangeNotSatisfiableError extends createHttpError(
  416,
  "Range not satisfiable",
) {}
