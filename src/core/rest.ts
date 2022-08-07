import { Database, Query } from "@deepkit/orm";
import { RestResource } from "@deepkit-rest/rest-core";
import {
  RestFilteringCustomizations,
  RestGenericFilter,
  RestGenericSerializer,
  RestGenericSorter,
  RestOffsetLimitPaginator,
  RestPaginationCustomizations,
} from "@deepkit-rest/rest-crud";

import { AppEntity, isAppEntityType } from "./entity";

export abstract class AppResource<Entity extends AppEntity<Entity>>
  implements
    RestResource<Entity>,
    RestPaginationCustomizations,
    RestFilteringCustomizations
{
  readonly paginator = RestOffsetLimitPaginator;
  readonly filters = [RestGenericFilter, RestGenericSorter];

  constructor(protected database: Database) {}

  getDatabase(): Database {
    return this.database;
  }

  abstract getQuery(): Query<Entity>;
}

export abstract class AppEntitySerializer<
  Entity extends AppEntity<Entity>,
> extends RestGenericSerializer<Entity> {
  override serializationOptions = { groupsExclude: ["internal"] };

  protected override createEntity(data: Partial<Entity>): Entity {
    const entityType = this.context.getEntitySchema().getClassType();
    if (!isAppEntityType(entityType)) throw new Error("Invalid entity class");
    return new entityType(data) as Entity;
  }

  protected override updateEntity(
    entity: Entity,
    data: Partial<Entity>,
  ): Entity {
    return entity.assign(data);
  }
}
