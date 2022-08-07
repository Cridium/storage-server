import {
  http,
  HttpBadRequestError,
  HttpNotFoundError,
  HttpQuery,
  HttpRequest,
  HttpResponse,
} from "@deepkit/http";
import { Inject } from "@deepkit/injector";
import { Database, Query } from "@deepkit/orm";
import { integer, Minimum } from "@deepkit/type";
import { NoContentResponse } from "@deepkit-rest/http-extension";
import { rest } from "@deepkit-rest/rest-core";
import {
  ResponseReturnType,
  RestCrudActionContext,
  RestCrudKernel,
  RestSerializationCustomizations,
} from "@deepkit-rest/rest-crud";
import { HttpRangeParser } from "src/core/http-range-parser.service";
import { RequestContext } from "src/core/request-context";
import { AppEntitySerializer, AppResource } from "src/core/rest";
import { InjectDatabaseSession } from "src/database-extension/database-tokens";
import { FileEngine } from "src/file-engine/file-engine.interface";
import { User } from "src/user/user.entity";

import { FileChunkUploadManager } from "./file-chunk-upload-manager.service";
import { FileStreamUtils } from "./file-stream.utils";
import {
  FileSystemRecord,
  FileSystemRecordContentDefined,
} from "./file-system-record.entity";
import { FileSystemRecordBrowser } from "./file-system-record-browser.service";

@rest.resource(FileSystemRecord, "files")
@http.group("auth-required")
export class FileSystemRecordResource
  extends AppResource<FileSystemRecord>
  implements RestSerializationCustomizations<FileSystemRecord>
{
  readonly serializer = FileSystemRecordSerializer;

  constructor(
    database: Database,
    private databaseSession: InjectDatabaseSession,
    private context: RequestContext,
    private crud: RestCrudKernel<FileSystemRecord>,
    private crudContext: RestCrudActionContext<FileSystemRecord>,
    private engine: FileEngine,
    private rangeParser: HttpRangeParser,
    private browser: FileSystemRecordBrowser,
    private chunkUploadManager: FileChunkUploadManager,
  ) {
    super(database);
  }

  getQuery(): Query<FileSystemRecord> {
    const userRef = this.database.getReference(User, this.context.user.id);
    return this.databaseSession
      .query(FileSystemRecord)
      .filter({ owner: userRef });
  }

  @rest.action("GET")
  async list(path?: HttpQuery<string>): Promise<ResponseReturnType> {
    if (!path) return this.crud.list();
    const record = await this.browser.trackPath(path, this.getQuery());
    const records = record ? [record] : [];
    const serializer = this.crudContext.getSerializer();
    const paginator = this.crudContext.getPaginator();
    const body = await paginator.buildBody(
      async () => Promise.all(records.map((r) => serializer.serialize(r))),
      async () => records.length,
    );
    return body;
  }

  @rest.action("POST")
  async create(): Promise<ResponseReturnType> {
    return this.crud.create();
  }

  @rest.action("GET", ":pk")
  async retrieve(): Promise<ResponseReturnType> {
    return this.crud.retrieve();
  }

  @rest.action("PATCH", ":pk")
  async update(): Promise<ResponseReturnType> {
    return this.crud.update();
  }

  @rest.action("DELETE", ":pk")
  async delete(): Promise<ResponseReturnType> {
    const record = await this.crudContext.getEntity();
    await this.chunkUploadManager.clear(record.id);
    return this.crud.delete();
  }

  @rest.action("PUT", ":pk/content")
  async upload(request: HttpRequest): Promise<NoContentResponse> {
    const record = await this.crudContext.getEntity();
    if (record.type !== "file") throw new HttpBadRequestError();
    const contentSize = getContentLength(request);
    const [contentKey, contentIntegrity] = await Promise.all([
      this.engine.store(request),
      FileStreamUtils.hash(request),
    ]);
    record.assign({ contentKey, contentIntegrity, contentSize });
    return new NoContentResponse();
  }

  @rest.action("GET", ":pk/content")
  @http.group("file-only", "content-defined-only")
  async download(
    response: HttpResponse,
    request: HttpRequest,
  ): Promise<HttpResponse> {
    const record =
      (await this.crudContext.getEntity()) as FileSystemRecordContentDefined;

    if (!request.headers["range"]) {
      const stream = await this.engine.fetch(record.contentKey);
      return stream.pipe(response);
    }

    const rangesRaw = request.headers["range"];
    const { contentKey, contentSize } = record;
    const [start, end] = this.rangeParser.parseSingle(rangesRaw, contentSize);
    const stream = await this.engine.fetch(contentKey, { start, end });
    response.setHeader("Content-Range", `bytes ${start}-${end}/${contentSize}`);
    response.writeHead(206); // `.status()` would accidentally `.end()` the response, and will be removed in the future, so we call `writeHead()` here.
    return stream.pipe(response);
  }

  @rest.action("GET", ":pk/content/chunks")
  @http.group("file-only")
  async listChunks(): Promise<number[]> {
    const record = await this.crudContext.getEntity();
    return this.chunkUploadManager.inspect(record.id);
  }

  @rest.action("PUT", ":pk/content/chunks/:index")
  @http.group("file-only")
  async uploadChunk(
    request: HttpRequest,
    index: (integer & Minimum<1>) | "last",
  ): Promise<NoContentResponse> {
    const record = await this.crudContext.getEntity();
    const order = index === "last" ? undefined : index;
    await this.chunkUploadManager.store(record.id, request, order);
    if (index === "last") {
      const stream = await this.chunkUploadManager.merge(record.id);
      const [contentKey, contentIntegrity, contentSize] = await Promise.all([
        this.engine.store(stream),
        FileStreamUtils.hash(stream),
        FileStreamUtils.size(stream),
      ]);
      record.assign({ contentKey, contentIntegrity, contentSize });
    }
    return new NoContentResponse();
  }

  @rest.action("DELETE", ":pk/content/chunks")
  @http.group("file-only")
  async clearChunks(): Promise<NoContentResponse> {
    const record = await this.crudContext.getEntity();
    await this.chunkUploadManager.clear(record.id);
    return new NoContentResponse();
  }

  @rest.action("GET", ":pk/integrity")
  @http.group("file-only", "content-defined-only")
  async verify(): Promise<NoContentResponse> {
    const record =
      (await this.crudContext.getEntity()) as FileSystemRecordContentDefined;
    const stream = await this.engine.fetch(record.contentKey);
    const integrity = await FileStreamUtils.hash(stream);
    if (integrity !== record.contentIntegrity) throw new HttpNotFoundError();
    return new NoContentResponse();
  }
}

export class FileSystemRecordSerializer extends AppEntitySerializer<FileSystemRecord> {
  protected database!: InjectDatabaseSession;
  protected requestContext!: Inject<RequestContext>;

  override async deserializeCreation(
    payload: Record<string, unknown>,
  ): Promise<FileSystemRecord> {
    const entity = await super.deserializeCreation(payload);
    await this.validateParent(entity);
    return entity;
  }

  override async deserializeUpdate(
    entity: FileSystemRecord,
    payload: Record<string, unknown>,
  ): Promise<FileSystemRecord> {
    const parentPrev = entity.parent;
    entity = await super.deserializeUpdate(entity, payload);
    if (entity.parent !== parentPrev) await this.validateParent(entity);
    return entity;
  }

  protected override createEntity(
    data: Partial<FileSystemRecord>,
  ): FileSystemRecord {
    const userId = this.requestContext.user.id;
    data.owner = this.database.getReference(User, userId);
    return super.createEntity(data);
  }

  private async validateParent(entity: FileSystemRecord) {
    if (entity.parent) {
      const query = this.context.getResource().getQuery();
      const parent = await query.filter(entity.parent).findOneOrUndefined();
      if (parent?.type !== "directory")
        throw new HttpBadRequestError("Invalid parent");
    }
  }
}

function getContentLength(request: HttpRequest): number {
  const result = request.headers["content-length"];
  if (!result) throw new Error("Content-Length header is missing");
  return +result;
}
