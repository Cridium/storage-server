import { HttpAccessDeniedError } from "@deepkit/http";
import { HttpRequestParsed } from "@deepkit-rest/http-extension";
import { RestGuard } from "@deepkit-rest/rest-core";
import { RequestContext } from "src/core/request-context";

export class UserSelfOnlyGuard implements RestGuard {
  constructor(
    private request: HttpRequestParsed,
    private requestContext: RequestContext,
  ) {}

  async guard(): Promise<void> {
    const parameters = this.request.getPathParams();
    if (
      parameters["pk"] !== this.requestContext.user.id &&
      parameters["pk"] !== "me"
    )
      throw new HttpAccessDeniedError("Cannot perform on other users");
  }
}
