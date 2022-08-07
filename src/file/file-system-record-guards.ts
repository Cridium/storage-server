import { HttpBadRequestError, HttpNotFoundError } from "@deepkit/http";
import { rest, RestGuard } from "@deepkit-rest/rest-core";
import { RestCrudActionContext } from "@deepkit-rest/rest-crud";

import { FileSystemRecord } from "./file-system-record.entity";

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
