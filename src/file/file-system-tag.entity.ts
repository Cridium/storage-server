import { BackReference, entity, Group, Reference } from "@deepkit/type";
import {
  Filterable,
  InCreation,
  InUpdate,
  Orderable,
} from "@deepkit-rest/rest-crud";
import { AppEntity } from "src/core/entity";
import { FileSystemRecordToTag } from "src/core/entity-pivots";
import { FileSystemRecord } from "src/file/file-system-record.entity";
import { User } from "src/user/user.entity";

type BackRefViaPivot = BackReference<{ via: typeof FileSystemRecordToTag }>;

@entity.name("file-system-tag").collection("file-system-tags")
export class FileSystemTag extends AppEntity<FileSystemTag> {
  owner!: User & Reference & Filterable & Orderable;
  name!: string & Filterable & Orderable & InCreation & InUpdate;
  files: FileSystemRecord[] & BackRefViaPivot & Group<"internal"> = [];
  constructor(input: Pick<FileSystemTag, "owner" | "name">) {
    super();
    this.assign(input);
  }
}
