import { createTestingApp } from "@deepkit/framework";
import { http, HttpRequest, RouteConfig } from "@deepkit/http";

import {
  HttpActionMeta,
  HttpControllerMeta,
  HttpInjectorContext,
  HttpRouteConfig,
} from "./http-common";
import { HttpExtensionModule } from "./http-extension.module";

describe("Http Extension", () => {
  test("additional providers", async () => {
    let assertion!: () => void;
    @http.controller().group("group")
    class MyController {
      constructor(
        private injector: HttpInjectorContext,
        private routeConfig: HttpRouteConfig,
        private actionMeta: HttpActionMeta,
        private controllerMeta: HttpControllerMeta,
      ) {}
      @http.GET()
      route() {
        assertion = () => {
          expect(this.injector.scope?.name).toBe("http");
          expect(this.routeConfig).toBeInstanceOf(RouteConfig);
          expect(this.actionMeta).toMatchObject({ methodName: "route" });
          expect(this.controllerMeta).toMatchObject({ groups: ["group"] });
        };
      }
    }
    const facade = createTestingApp({
      imports: [new HttpExtensionModule()],
      controllers: [MyController],
    });
    await facade.startServer();
    const response = await facade.request(HttpRequest.GET("/"));
    expect(response.statusCode).toBe(200);
    assertion();
  });
});
