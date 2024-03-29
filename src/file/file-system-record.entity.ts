import {
  BackReference,
  entity,
  Group,
  integer,
  Positive,
  Reference,
} from "@deepkit/type";
import {
  Filterable,
  InCreation,
  InUpdate,
  Orderable,
} from "@deepkit-rest/rest-crud";
import { PartialRequired } from "src/common/utilities";
import { AppEntity } from "src/core/entity";
import { FileSystemRecordToTag } from "src/core/entity-pivots";
import { FileSystemTag } from "src/file/file-system-tag.entity";
import { User } from "src/user/user.entity";

// prettier-ignore
@entity.name("file-system-record").collection("file-system-records")
export class FileSystemRecord extends AppEntity<FileSystemRecord> {
  owner!: User & Reference & Filterable & Orderable;
  parent?: FileSystemRecord & Reference & Filterable & Orderable & InCreation & InUpdate = undefined;
  children: FileSystemRecord[] & BackReference & Group<"internal"> = [];
  name!: string & Filterable & Orderable & InCreation & InUpdate;
  type!: ('file' | "directory") & InCreation;
  tags: FileSystemTag[] & BackReference<{ via: typeof FileSystemRecordToTag }> & Group<"internal"> = [];
  contentKey?: string = undefined;
  contentIntegrity?: string = undefined;
  contentSize?: integer & Positive & Filterable & Orderable = undefined;

  constructor(input: Pick<FileSystemRecord, "owner" | "name" | "parent" | "type">) {
    super();
    this.assign(input)
  }

  isContentDefined(): this is FileSystemRecordContentDefined {
    return !!this.contentKey && !!this.contentIntegrity && !!this.contentSize;
  }
}

export interface FileSystemRecordContentDefined
  extends PartialRequired<
    FileSystemRecord,
    "contentKey" | "contentIntegrity" | "contentSize"
  > {}
