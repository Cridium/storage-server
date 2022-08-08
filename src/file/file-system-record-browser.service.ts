import { Query } from "@deepkit/orm";
import { join } from "path";

import { FileSystemRecord } from "./file-system-record.entity";

export class FileSystemRecordBrowser {
  constructor() {}

  async trackPath(
    path: string,
    query: Query<FileSystemRecord>,
  ): Promise<FileSystemRecord | null> {
    let record: FileSystemRecord | undefined;
    path = join(...path.split("/"));
    for (const segment of path.split("/")) {
      record = await query
        .filter({ name: segment, ...(record ? { parent: record } : {}) })
        .findOneOrUndefined();
      if (!record) return null;
    }
    return record ?? null;
  }

  async aggregateSize(query: Query<FileSystemRecord>): Promise<number> {
    return query
      .filter({ type: "file" })
      .withSum("contentSize", "contentSizeTotal")
      .findOne()
      .then((r) => r.contentSizeTotal ?? 0); // may be null (bug?)
  }
}
