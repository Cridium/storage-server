import { App } from "@deepkit/app";
import { ClassType } from "@deepkit/core";
import { createTestingApp, TestingFacade } from "@deepkit/framework";
import { http, HttpRequest } from "@deepkit/http";
import { Database } from "@deepkit/orm";
import { AutoIncrement, PrimaryKey } from "@deepkit/type";
import { HttpExtensionModule } from "@deepkit-rest/http-extension";
import { rest, RestCoreModule } from "@deepkit-rest/rest-core";
import { RestCrudModule } from "@deepkit-rest/rest-crud";
import { CoreModule } from "src/core/core.module";
import { RequestContext } from "src/core/request-context";
import { DatabaseExtensionModule } from "src/database-extension/database-extension.module";
import { JwtModule } from "src/jwt/jwt.module";
import { User } from "src/user/user.entity";

import { AuthModule } from "./auth.module";
import { AuthCaptchaService } from "./auth-captcha.service";
import { AuthTokenService } from "./auth-token.service";

describe("Auth", () => {
  let facade: TestingFacade<App<any>>;
  let database: Database;

  async function setup(controllers: ClassType[] = []) {
    facade = createTestingApp({
      imports: [
        new CoreModule(),
        new HttpExtensionModule(),
        new RestCoreModule(),
        new RestCrudModule(),
        new DatabaseExtensionModule(),
        new JwtModule({ secret: "secret" }),
        new AuthModule(),
      ],
      controllers,
    });
    database = facade.app.get(Database);
    await database.migrate();
    await facade.startServer();
  }

  describe("AuthGuard", () => {
    let user: User;
    let auth: string;
    class MyEntity {
      id: number & PrimaryKey & AutoIncrement = 0;
    }
    @rest.resource(MyEntity, "api")
    class MyResource {
      constructor(private context: RequestContext) {}
      @rest.action("GET")
      @http.group("auth-required")
      action() {
        expect(this.context.user).toMatchObject({ id: user.id });
      }
    }

    beforeEach(async () => {
      await setup([MyResource]);
      user = new User({
        name: "name",
        email: "email@email.com",
        password: "password",
      });
      await database.persist(user);
      auth = `Bearer ${await facade.app
        .get(AuthTokenService, AuthModule)
        .signAccess(user)}`;
    });

    it("should forbid unauthorized requests", async () => {
      const response = await facade.request(HttpRequest.GET("/api"));
      expect(response.statusCode).toBe(401);
    });

    it("should allow authorized requests", async () => {
      const response = await facade.request(
        HttpRequest.GET("/api").header("authorization", auth),
      );
      expect(response.statusCode).toBe(200);
    });
  });

  describe("API", () => {
    beforeEach(async () => {
      await setup();
    });

    describe("POST /auth/captcha", () => {
      test("response", async () => {
        const response = await facade.request(
          HttpRequest.POST("/api/auth/captcha"),
        );
        expect(response.statusCode).toBe(200);
        expect(response.json).toEqual({
          key: expect.any(String),
          svg: expect.stringMatching(/<svg .*><\/svg>/u),
        });
      });
    });

    describe("POST /auth/register", () => {
      test("response", async () => {
        const spy = jest
          .spyOn(AuthCaptchaService.prototype, "verify")
          .mockReturnValue();
        const response = await facade.request(
          HttpRequest.POST("/api/auth/register").json({
            name: "name",
            email: "email@email.com",
            password: "password",
            captchaKey: "key",
            captchaResult: "result",
          }),
        );
        expect(spy).toHaveBeenCalled();
        expect(response.statusCode).toBe(200);
        const user = await database.query(User).findOne();
        const { id, name, email } = user;
        const createdAt = user.createdAt.toISOString();
        expect(response.json).toEqual({
          user: { id, name, email, createdAt, verifiedAt: null },
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        });
      });
    });
  });
});
