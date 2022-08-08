import {
  HttpAccessDeniedError,
  HttpBadRequestError,
  HttpNotFoundError,
  HttpRequest,
} from "@deepkit/http";
import { rest, RestGuard } from "@deepkit-rest/rest-core";
import { RestCrudActionContext } from "@deepkit-rest/rest-crud";
import { getContentLength } from "src/common/http";

import { FileModuleConfig } from "./file.config";
import { FileSystemRecord } from "./file-system-record.entity";
import { FileSystemRecordBrowser } from "./file-system-record-browser.service";

@rest.guard("file-only")
export class FileSystemRecordFileOnlyGuard implements RestGuard {
  constructor(private context: RestCrudActionContext<FileSystemRecord>) {}

  async guard(): Promise<void> {
    const entity = await this.context.getEntity();
    if (entity.type !== "file") throw new HttpBadRequestError("Not a file");
  }
}

@rest.guard("content-defined-only")
export class FileSystemRecordContentDefinedOnlyGuard implements RestGuard {
  constructor(private context: RestCrudActionContext<FileSystemRecord>) {}

  async guard(): Promise<void> {
    const entity = await this.context.getEntity();
    if (!entity.isContentDefined())
      throw new HttpNotFoundError("Content not exists");
  }
}

@rest.guard("quota-checking")
export class FileSystemRecordQuotaGuard implements RestGuard {
  constructor(
    private request: HttpRequest,
    private browser: FileSystemRecordBrowser,
    private crudContext: RestCrudActionContext<FileSystemRecord>,
    private quota: FileModuleConfig["quota"],
  ) {}

  async guard(): Promise<void> {
    const query = this.crudContext.getResource().getQuery();
    const sizeNow = await this.browser.aggregateSize(query);
    const sizeNew = getContentLength(this.request);
    if (sizeNow + sizeNew > this.quota)
      throw new HttpAccessDeniedError("Quota exceeded");
  }
}
