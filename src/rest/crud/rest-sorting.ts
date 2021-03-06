import { ClassType } from "@deepkit/core";
import { FieldName, Query } from "@deepkit/orm";
import { purify } from "src/common/type";
import { HttpRequestParsed } from "src/http-extension/http-request-parsed.service";

import { RestActionContext } from "../core/rest-action";
import { RestOrderMapFactory } from "../crud-models/rest-order-map";
import { RestQueryProcessor } from "./rest-crud";

export interface RestSortingCustomizations {
  sorters?: ClassType<RestEntitySorter>[];
}

export interface RestEntitySorter extends RestQueryProcessor {}

export class RestGenericSorter implements RestEntitySorter {
  param = "order";

  constructor(
    protected request: HttpRequestParsed,
    protected context: RestActionContext,
    protected orderMapFactory: RestOrderMapFactory,
  ) {}

  processQuery<Entity>(query: Query<Entity>): Query<Entity> {
    const entityType = this.context.getEntitySchema().getClassType();
    const orderMapSchema = this.orderMapFactory.build(entityType);
    const orderMapParam = this.param;
    const queries = this.request.getQueries();
    const orderMap = purify<object>(
      queries[orderMapParam] ?? {},
      orderMapSchema.type,
    );

    if (orderMap)
      Object.entries(orderMap).forEach(([field, order]) => {
        query = query.orderBy(field as FieldName<Entity>, order as any);
      });

    return query;
  }
}
