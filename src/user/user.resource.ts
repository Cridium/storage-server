import {
  http,
  HttpAccessDeniedError,
  HttpBadRequestError,
  HttpBody,
  HttpNotFoundError,
} from "@deepkit/http";
import { Inject } from "@deepkit/injector";
import { Database, Query } from "@deepkit/orm";
import { ReflectionProperty } from "@deepkit/type";
import { NoContentResponse } from "@deepkit-rest/http-extension";
import { rest } from "@deepkit-rest/rest-core";
import {
  ResponseReturnType,
  RestCrudActionContext,
  RestCrudKernel,
  RestRetrievingCustomizations,
  RestSerializationCustomizations,
  RestSingleFieldRetriever,
} from "@deepkit-rest/rest-crud";
import { RequestContext } from "src/core/request-context";
import { AppEntitySerializer, AppResource } from "src/core/rest";
import { InjectDatabaseSession } from "src/database-extension/database-tokens";
import { EmailEngine } from "src/email-engine/email-engine.interface";

import { User } from "./user.entity";
import { UserVerificationCodePool } from "./user-verification-code";

@rest.resource(User)
@http.group("auth-required")
export class UserResource
  extends AppResource<User>
  implements
    RestRetrievingCustomizations,
    RestSerializationCustomizations<User>
{
  readonly retriever = UserRetriever;
  readonly serializer = UserSerializer;

  constructor(
    database: Database,
    private requestContext: RequestContext,
    private databaseSession: InjectDatabaseSession,
    private crud: RestCrudKernel<User>,
    private crudContext: RestCrudActionContext<User>,
    private mailer: EmailEngine,
    private verificationCodePool: UserVerificationCodePool,
  ) {
    super(database);
  }

  getQuery(): Query<User> {
    return this.databaseSession.query(User);
  }

  @rest.action("GET")
  async list(): Promise<ResponseReturnType> {
    return this.crud.list();
  }

  @rest.action("GET", ":pk")
  async retrieve(): Promise<ResponseReturnType> {
    return this.crud.retrieve();
  }

  @rest.action("PATCH", ":pk")
  @http.group("self-only")
  async update(): Promise<ResponseReturnType> {
    return this.crud.update();
  }

  @rest.action("PUT", ":pk/verification")
  @http.group("self-only")
  @http
    .response(204, "Verification requested")
    .response(403, "Duplicate verification request")
  async requestVerification(): Promise<NoContentResponse> {
    try {
      const userId = this.requestContext.user.id;
      const code = this.verificationCodePool.request(userId);
      const user = await this.crudContext.getEntity();
      await this.mailer.send({
        subject: "Verify Your Email",
        content: `Verification Code: ${code}`,
        contentInHtml: `Verification Code: <b>${code}</b>`,
        recipients: [{ address: user.email }],
      });
    } catch (error) {
      throw new HttpAccessDeniedError("Duplicate verification request");
    }
    return new NoContentResponse();
  }

  @rest.action("GET", ":pk/verification")
  @http.group("self-only")
  @http
    .response(204, "Pending verification exists")
    .response(404, "No pending verification")
  async inspectVerification(): Promise<NoContentResponse> {
    const code = this.verificationCodePool.obtain(this.requestContext.user.id);
    if (!code) throw new HttpNotFoundError("No pending verification");
    return new NoContentResponse();
  }

  @rest.action("PUT", ":pk/verification/confirmation")
  @http.group("self-only")
  @http
    .response(204, "Verified")
    .response(400, "Code not match")
    .response(404, "No pending verification")
  async confirmVerification(
    { code }: HttpBody<{ code: string }>, //
  ): Promise<NoContentResponse> {
    const userId = this.requestContext.user.id;
    const codeExpected = this.verificationCodePool.obtain(userId);
    if (!codeExpected) throw new HttpNotFoundError("No pending verification");
    const user = await this.crudContext.getEntity();
    if (code !== codeExpected) throw new HttpBadRequestError("Code not match");
    this.verificationCodePool.remove(userId);
    user.verifiedAt = new Date();
    return new NoContentResponse();
  }
}

export class UserRetriever extends RestSingleFieldRetriever {
  private requestContext!: Inject<RequestContext>;

  protected override transformValue(
    raw: unknown,
    schema: ReflectionProperty,
  ): unknown {
    if (raw === "me") return this.requestContext.user.id;
    return super.transformValue(raw, schema);
  }
}

export class UserSerializer extends AppEntitySerializer<User> {}
