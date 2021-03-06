import { App } from "@deepkit/app";
import { ClassType } from "@deepkit/core";
import { createTestingApp, TestingFacade } from "@deepkit/framework";
import { HttpKernel, HttpRequest } from "@deepkit/http";
import { Inject, ProviderWithScope } from "@deepkit/injector";
import { Database, Query } from "@deepkit/orm";
import { SQLiteDatabaseAdapter } from "@deepkit/sqlite";
import {
  AutoIncrement,
  Maximum,
  MaxLength,
  PrimaryKey,
  Reference,
} from "@deepkit/type";
import { HttpExtensionModule } from "src/http-extension/http-extension.module";
import { RestModule } from "src/rest/rest.module";

import { rest } from "./core/rest-decoration";
import { RestResource } from "./core/rest-resource";
import { RestCrudKernel, RestQueryProcessor } from "./crud/rest-crud";
import {
  RestFilteringCustomizations,
  RestGenericFilter,
} from "./crud/rest-filtering";
import {
  RestOffsetLimitPaginator,
  RestPageNumberPaginator,
  RestPaginationCustomizations,
} from "./crud/rest-pagination";
import {
  RestFieldBasedRetriever,
  RestFieldBasedRetrieverCustomizations,
  RestRetrievingCustomizations,
} from "./crud/rest-retrieving";
import {
  RestGenericSorter,
  RestSortingCustomizations,
} from "./crud/rest-sorting";
import { InCreation } from "./crud-models/rest-creation-schema";
import { Filterable } from "./crud-models/rest-filter-map";
import { Orderable } from "./crud-models/rest-order-map";
import { InUpdate } from "./crud-models/rest-update-schema";

describe("REST CRUD", () => {
  let facade: TestingFacade<App<any>>;
  let requester: HttpKernel;
  let database: Database;

  async function prepare<Entity>(
    resource: ClassType<RestResource<Entity>>,
    entities: ClassType[] = [],
    providers: ProviderWithScope[] = [],
  ) {
    facade = createTestingApp({
      imports: [
        new HttpExtensionModule(),
        new RestModule({ prefix: "", versioning: false }),
      ],
      controllers: [resource],
      providers: [
        {
          provide: Database,
          useValue: new Database(new SQLiteDatabaseAdapter(), entities),
        },
        ...providers,
      ],
    });
    requester = facade.app.get(HttpKernel);
    database = facade.app.get(Database);
    await database.migrate();
    await facade.startServer();
  }

  class MyEntity {
    id: number & AutoIncrement & PrimaryKey = 0;
    constructor(public name: string = "") {}
  }
  class MyResource implements RestResource<MyEntity> {
    protected db!: Inject<Database>;
    protected crud!: Inject<RestCrudKernel<MyEntity>>;
    getDatabase(): Database {
      return this.db;
    }
    getQuery(): Query<MyEntity> {
      return this.db.query(MyEntity);
    }
  }

  describe("List", () => {
    describe("Basic", () => {
      @rest.resource(MyEntity, "api")
      class TestingResource
        extends MyResource
        implements RestPaginationCustomizations
      {
        readonly paginator = RestOffsetLimitPaginator;
        @rest.action("GET")
        list() {
          return this.crud.list();
        }
      }
      it("should work", async () => {
        await prepare(TestingResource, [MyEntity]);
        await database.persist(new MyEntity());
        const response = await requester.request(HttpRequest.GET("/api"));
        expect(response.statusCode).toBe(200);
        expect(response.json).toEqual({
          total: 1,
          items: [{ id: 1, name: expect.any(String) }],
        });
      });
    });

    describe("Pagination", () => {
      describe("RestLimitOffsetPaginator", () => {
        @rest.resource(MyEntity, "api")
        class TestingResource
          extends MyResource
          implements RestPaginationCustomizations
        {
          readonly paginator = RestOffsetLimitPaginator;
          @rest.action("GET")
          list() {
            return this.crud.list();
          }
        }

        beforeEach(async () => {
          await prepare(TestingResource, [MyEntity]);
        });

        it.each`
          query                      | items
          ${null}                    | ${[{ id: 1, name: expect.any(String) }, { id: 2, name: expect.any(String) }, { id: 3, name: expect.any(String) }]}
          ${{ limit: 1, offset: 1 }} | ${[{ id: 2, name: expect.any(String) }]}
          ${{ limit: 1, offset: 0 }} | ${[{ id: 1, name: expect.any(String) }]}
          ${{ limit: 2, offset: 1 }} | ${[{ id: 2, name: expect.any(String) }, { id: 3, name: expect.any(String) }]}
          ${{ limit: 1, offset: 2 }} | ${[{ id: 3, name: expect.any(String) }]}
        `("should work when query is $query", async ({ query, items }) => {
          await database.persist(
            new MyEntity(),
            new MyEntity(),
            new MyEntity(),
          );
          const request = HttpRequest.GET("/api");
          if (query) request.query(query);
          const response = await requester.request(request);
          expect(response.json).toEqual({ total: 3, items });
        });

        it.each`
          limit      | offset
          ${0}       | ${1}
          ${-1}      | ${1}
          ${1}       | ${-1}
          ${"a"}     | ${"b"}
          ${9999999} | ${1}
          ${1}       | ${9999999}
        `(
          "should fail when limit is $limit and offset is $offset",
          async ({ limit, offset }) => {
            const response = await requester.request(
              HttpRequest.GET("/api").query({ limit, offset }),
            );
            expect(response.statusCode).toBe(400);
          },
        );
      });
      describe("RestPageNumberPaginator", () => {
        @rest.resource(MyEntity, "api")
        class TestingResource
          extends MyResource
          implements RestPaginationCustomizations
        {
          readonly paginator = RestPageNumberPaginator;
          @rest.action("GET")
          list() {
            return this.crud.list();
          }
        }

        beforeEach(async () => {
          await prepare(TestingResource, [MyEntity]);
        });

        it.each`
          query                   | items
          ${null}                 | ${[{ id: 1, name: expect.any(String) }, { id: 2, name: expect.any(String) }, { id: 3, name: expect.any(String) }]}
          ${{ page: 1, size: 2 }} | ${[{ id: 1, name: expect.any(String) }, { id: 2, name: expect.any(String) }]}
          ${{ page: 2, size: 1 }} | ${[{ id: 2, name: expect.any(String) }]}
          ${{ page: 2, size: 2 }} | ${[{ id: 3, name: expect.any(String) }]}
        `(
          "should work when page is $page and size is $size",
          async ({ query, items }) => {
            await database.persist(
              new MyEntity(),
              new MyEntity(),
              new MyEntity(),
            );
            const request = HttpRequest.GET("/api");
            if (query) request.query(query);
            const response = await requester.request(request);
            expect(response.json).toEqual({ total: 3, items });
          },
        );

        it.each`
          page     | size
          ${0}     | ${1}
          ${1}     | ${0}
          ${99999} | ${1}
          ${1}     | ${99999}
        `(
          "should fail when page is $page and size is $size",
          async ({ page, size }) => {
            const response = await requester.request(
              HttpRequest.GET("/api").query({ page, size }),
            );
            expect(response.statusCode).toBe(400);
          },
        );
      });
    });

    describe("Filtering", () => {
      describe("RestGenericFilter", () => {
        class Entity1 {
          id: number & AutoIncrement & PrimaryKey & Maximum<3> & Filterable = 0;
          ref!: Entity2 & Reference & Filterable;
        }
        class Entity2 {
          id: number & AutoIncrement & PrimaryKey = 0;
        }
        @rest.resource(Entity1, "api")
        class TestingResource
          implements RestResource<Entity1>, RestFilteringCustomizations
        {
          readonly filters = [RestGenericFilter];
          constructor(
            private database: Database,
            private crud: RestCrudKernel<Entity1>,
          ) {}
          getDatabase(): Database {
            return this.database;
          }
          getQuery(): Query<Entity1> {
            return this.database.query(Entity1);
          }
          @rest.action("GET")
          list() {
            return this.crud.list();
          }
        }

        beforeEach(async () => {
          await prepare(TestingResource, [Entity1, Entity2]);
        });

        it.each`
          query                                          | total | items
          ${null}                                        | ${3}  | ${[{ id: 1, ref: expect.any(Number) }, { id: 2, ref: expect.any(Number) }, { id: 3, ref: expect.any(Number) }]}
          ${"filter[id][$eq]=1"}                         | ${1}  | ${[{ id: 1, ref: expect.any(Number) }]}
          ${"filter[id][$gt]=1"}                         | ${2}  | ${[{ id: 2, ref: expect.any(Number) }, { id: 3, ref: expect.any(Number) }]}
          ${"filter[ref][$eq]=1"}                        | ${1}  | ${[{ id: 1, ref: expect.any(Number) }]}
          ${"filter[ref][$in][]=1"}                      | ${1}  | ${[{ id: 1, ref: expect.any(Number) }]}
          ${"filter[ref][$in][]=1&filter[ref][$in][]=2"} | ${2}  | ${[{ id: 1, ref: expect.any(Number) }, { id: 2, ref: expect.any(Number) }]}
        `("should work with query $query", async ({ query, total, items }) => {
          const entities = new Array(3).fill(1).map(() => new Entity1());
          entities.forEach((entity) => (entity.ref = new Entity2()));
          await database.persist(...entities);
          const request = HttpRequest.GET("/api");
          if (query) request["queryPath"] = query;
          const response = await requester.request(request);
          expect(response.json).toEqual({ total, items });
        });

        it("should fail with invalid query", async () => {
          const request = HttpRequest.GET("/api");
          request["queryPath"] = "filter[id][$eq]=99999";
          const response = await requester.request(request);
          expect(response.statusCode).toBe(400);
        });
      });
    });

    describe("Sorting", () => {
      describe("RestGenericSorter", () => {
        class TestingEntity {
          id: number & AutoIncrement & PrimaryKey & Orderable = 0;
        }
        @rest.resource(TestingEntity, "api")
        class TestingResource implements RestSortingCustomizations {
          readonly sorters = [RestGenericSorter];
          constructor(
            private database: Database,
            private crud: RestCrudKernel<TestingEntity>,
          ) {}
          getDatabase(): Database {
            return this.database;
          }
          getQuery(): Query<TestingEntity> {
            return this.database.query(TestingEntity);
          }
          @rest.action("GET")
          list() {
            return this.crud.list();
          }
        }

        beforeEach(async () => {
          await prepare(TestingResource, [TestingEntity]);
        });

        it.each`
          query               | items
          ${null}             | ${[{ id: 1 }, { id: 2 }]}
          ${"order[id]=asc"}  | ${[{ id: 1 }, { id: 2 }]}
          ${"order[id]=desc"} | ${[{ id: 2 }, { id: 1 }]}
        `("should work with query $query", async ({ query, items }) => {
          await database.persist(new TestingEntity(), new TestingEntity());
          const request = HttpRequest.GET("/api");
          if (query) request["queryPath"] = query;
          const response = await requester.request(request);
          expect(response.json).toEqual({ total: 2, items });
        });

        it("should fail with invalid query", async () => {
          const request = HttpRequest.GET("/api");
          request["queryPath"] = "order[id]=asdfasdf";
          const response = await requester.request(request);
          expect(response.statusCode).toBe(400);
        });
      });
    });
  });

  describe("Create", () => {
    describe("RestGenericSerializer", () => {
      class TestingEntity {
        id: number & AutoIncrement & PrimaryKey = 0;
        name!: string & InCreation;
      }
      @rest.resource(TestingEntity, "api")
      class TestingResource implements RestResource<TestingEntity> {
        constructor(
          private crud: RestCrudKernel<TestingEntity>,
          private database: Database,
        ) {}
        getDatabase(): Database {
          return this.database;
        }
        getQuery(): Query<TestingEntity> {
          return this.database.query(TestingEntity);
        }
        @rest.action("POST")
        create() {
          return this.crud.create();
        }
      }

      beforeEach(async () => {
        await prepare(TestingResource, [TestingEntity]);
      });

      test("basic", async () => {
        const payload = {
          name: "test",
        };
        const response = await requester.request(
          HttpRequest.POST("/api").json(payload),
        );
        expect(response.statusCode).toBe(201);
        expect(response.json).toEqual({ id: 1, name: "test" });
        expect(await database.query(TestingEntity).count()).toBe(1);
      });

      test("validation", async () => {
        const response = await requester.request(
          HttpRequest.POST("/api").json({}),
        );
        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe("Retrieve", () => {
    describe("Basic", () => {
      @rest.resource(MyEntity, "api").lookup("id")
      class TestingResource extends MyResource {
        @rest.action("GET").detailed()
        retrieve() {
          return this.crud.retrieve();
        }
      }
      it("should work", async () => {
        await prepare(TestingResource, [MyEntity]);
        await database.persist(new MyEntity());
        const response = await requester.request(HttpRequest.GET("/api/1"));
        expect(response.statusCode).toBe(200);
      });
    });

    describe("RestFieldBasedRetriever", () => {
      test("lookup name as target field", async () => {
        @rest.resource(MyEntity, "api").lookup("id")
        class TestingResource
          extends MyResource
          implements RestRetrievingCustomizations
        {
          readonly retriever = RestFieldBasedRetriever;
          @rest.action("GET").detailed()
          retrieve() {
            return this.crud.retrieve();
          }
        }
        await prepare(TestingResource, [MyEntity]);
        await database.persist(new MyEntity());
        const response = await requester.request(HttpRequest.GET("/api/1"));
        expect(response.json).toMatchObject({ id: 1 });
      });

      test("primary key as target field", async () => {
        @rest.resource(MyEntity, "api").lookup("pk")
        class TestingResource
          extends MyResource
          implements RestRetrievingCustomizations
        {
          readonly retriever = RestFieldBasedRetriever;
          @rest.action("GET").detailed()
          retrieve() {
            return this.crud.retrieve();
          }
        }
        await prepare(TestingResource, [MyEntity]);
        await database.persist(new MyEntity());
        const response = await requester.request(HttpRequest.GET("/api/1"));
        expect(response.json).toMatchObject({ id: 1 });
      });

      test("custom field as target field", async () => {
        @rest.resource(MyEntity, "api").lookup("id")
        class TestingResource
          extends MyResource
          implements
            RestRetrievingCustomizations,
            RestFieldBasedRetrieverCustomizations<MyEntity>
        {
          readonly retriever = RestFieldBasedRetriever;
          readonly retrievesOn = "name";
          @rest.action("GET").detailed()
          retrieve() {
            return this.crud.retrieve();
          }
        }
        await prepare(TestingResource, [MyEntity]);
        await database.persist(new MyEntity("name"));
        const response = await requester.request(HttpRequest.GET("/api/name"));
        expect(response.json).toMatchObject({ id: 1 });
      });

      test("invalid lookup name and no custom field specified", async () => {
        @rest.resource(MyEntity, "api").lookup("invalid")
        class TestingResource
          extends MyResource
          implements RestRetrievingCustomizations
        {
          readonly retriever = RestFieldBasedRetriever;
          @rest.action("GET").detailed()
          retrieve() {
            return this.crud.retrieve();
          }
        }
        await prepare(TestingResource, [MyEntity]);
        await database.persist(new MyEntity("name"));
        const response = await requester.request(HttpRequest.GET("/api/name"));
        expect(response.statusCode).toBe(500);
      });
    });

    describe("Custom Lookup", () => {
      @rest.resource(MyEntity, "api").lookup("test")
      class TestingResource
        extends MyResource
        implements RestRetrievingCustomizations
      {
        readonly retriever = TestingRetriever;
        @rest.action("GET").detailed()
        retrieve() {
          return this.crud.retrieve();
        }
      }
      class TestingRetriever implements RestQueryProcessor {
        processQuery<Entity>(query: Query<Entity>): Query<Entity> {
          return query.filterField("id" as any, 1);
        }
      }

      it("should work", async () => {
        await prepare(
          TestingResource,
          [MyEntity],
          [{ provide: TestingRetriever, scope: "http" }],
        );
        await database.persist(new MyEntity());
        const response = await requester.request(HttpRequest.GET("/api/any"));
        expect(response.statusCode).toBe(200);
        expect(response.json["id"]).toBe(1);
      });
    });
  });

  describe("Update", () => {
    describe("RestGenericSerializer", () => {
      class TestingEntity {
        id: number & AutoIncrement & PrimaryKey = 0;
        name!: string & MaxLength<10> & InUpdate;
      }
      @rest.resource(TestingEntity, "api")
      class TestingResource implements RestResource<TestingEntity> {
        constructor(
          private crud: RestCrudKernel<TestingEntity>,
          private database: Database,
        ) {}
        getDatabase(): Database {
          return this.database;
        }
        getQuery(): Query<TestingEntity> {
          return this.database.query(TestingEntity);
        }
        @rest.action("PATCH").detailed()
        update() {
          return this.crud.update();
        }
      }

      beforeEach(async () => {
        await prepare(TestingResource, [TestingEntity]);
        const entity = new TestingEntity();
        entity.name = "test";
        await database.persist(entity);
      });

      test("basic", async () => {
        const payload = { name: "updated" };
        const response = await requester.request(
          HttpRequest.PATCH("/api/1").json(payload),
        );
        expect(response.statusCode).toBe(200);
        expect(response.json).toEqual({ id: 1, name: "updated" });
        expect(await database.query(TestingEntity).findOne()).toMatchObject({
          name: "updated",
        });
      });

      test("property optional", async () => {
        const response = await requester.request(
          HttpRequest.PATCH("/api/1").json({}),
        );
        expect(response.statusCode).toBe(200);
        expect(response.json).toEqual({ id: 1, name: "test" });
        expect(await database.query(TestingEntity).findOne()).toMatchObject({
          name: "test",
        });
      });

      test("validation", async () => {
        const response = await requester.request(
          HttpRequest.PATCH("/api/1").json({ name: "alsdfhlasdhfladhflaskfj" }),
        );
        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe("Delete", () => {
    test("response", async () => {
      @rest.resource(MyEntity, "api")
      class TestingResource extends MyResource {
        @rest.action("DELETE").detailed()
        delete() {
          return this.crud.delete();
        }
      }
      await prepare(TestingResource, [MyEntity]);
      await database.persist(new MyEntity());
      const response = await requester.request(HttpRequest.DELETE("/api/1"));
      expect(response.statusCode).toBe(204);
      expect(response.bodyString).toBe("");
      expect(await database.query(MyEntity).count()).toBe(0);
    });
  });
});
