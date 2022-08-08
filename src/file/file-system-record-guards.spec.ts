import { App } from "@deepkit/app";
import { ClassType } from "@deepkit/core";
import { createTestingApp, TestingFacade } from "@deepkit/framework";
import { http, HttpRequest } from "@deepkit/http";
import { Database, DatabaseAdapter, Query } from "@deepkit/orm";
import { HttpExtensionModule } from "@deepkit-rest/http-extension";
import { rest, RestCoreModule, RestResource } from "@deepkit-rest/rest-core";
import { RestCrudModule } from "@deepkit-rest/rest-crud";
import { CoreModule } from "src/core/core.module";
import { DatabaseExtensionModule } from "src/database-extension/database-extension.module";
import { FileEngineModule } from "src/file-engine/file-engine.module";

import { FileModule } from "./file.module";
import { FileSystemRecord } from "./file-system-record.entity";
import { FileSystemRecordBrowser } from "./file-system-record-browser.service";

let facade: TestingFacade<App<any>>;
let database: Database;

async function setup(controller: ClassType) {
  facade = createTestingApp({
    imports: [
      new HttpExtensionModule(),
      new DatabaseExtensionModule(),
      new RestCoreModule(),
      new RestCrudModule(),
      new CoreModule(),
      new FileEngineModule({ name: "memory" }),
      new FileModule({ quota: 10 }).addController(controller),
    ],
  });
  database = facade.app.get(Database);
  await facade.startServer();
  await database.migrate();
  return facade;
}

describe("FileSystemRecordQuotaGuard", () => {
  test("basic", async () => {
    @rest.resource(FileSystemRecord, "api")
    class MyResource implements RestResource<FileSystemRecord> {
      constructor(private database: Database) {}
      getDatabase(): Database<DatabaseAdapter> {
        return this.database;
      }
      getQuery(): Query<FileSystemRecord> {
        return this.database.query(FileSystemRecord);
      }
      @rest.action("POST")
      @http.group("quota-checking")
      route() {}
    }
    const facade = await setup(MyResource);
    jest
      .spyOn(FileSystemRecordBrowser.prototype, "aggregateSize")
      .mockReturnValue(Promise.resolve(0));
    {
      const request = HttpRequest.POST("/api").body(Buffer.from("12345"));
      const response = await facade.request(request);
      expect(response.statusCode).toBe(200);
    }
    {
      const request = HttpRequest.POST("/api").body(Buffer.from("12345678901"));
      const response = await facade.request(request);
      expect(response.statusCode).toBe(403);
    }
  });
});
