import { createModule } from "@deepkit/app";

import { FileChunkUploadManager } from "./file-chunk-upload-manager.service";
import {
  FileSystemRecordResource,
  FileSystemRecordSerializer,
} from "./file-system-record.resource";
import { FileSystemRecordBrowser } from "./file-system-record-browser.service";
import {
  FileSystemRecordContentDefinedOnlyGuard,
  FileSystemRecordFileOnlyGuard,
} from "./file-system-record-guards";
import {
  FileSystemTagResource,
  FileSystemTagSerializer,
} from "./file-system-tag.resource";

export class FileModule extends createModule(
  {
    controllers: [FileSystemRecordResource, FileSystemTagResource],
    providers: [
      FileSystemRecordBrowser,
      FileChunkUploadManager,
      { provide: FileSystemRecordSerializer, scope: "http" },
      { provide: FileSystemRecordFileOnlyGuard, scope: "http" },
      { provide: FileSystemRecordContentDefinedOnlyGuard, scope: "http" },
      { provide: FileSystemTagSerializer, scope: "http" },
    ],
  },
  "file",
) {}
