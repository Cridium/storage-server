import { ClassType } from "@deepkit/core";
import { FieldName, Query } from "@deepkit/orm";
import { purify } from "src/common/type";
import { HttpRequestParsed } from "src/http-extension/http-request-parsed.service";

import { RestActionContext } from "../core/rest-action";
import { RestFilterMapFactory } from "../crud-models/rest-filter-map";
import { RestQueryProcessor } from "./rest-crud";

export interface RestFilteringCustomizations {
  filters?: ClassType<RestEntityFilter>[];
}

export interface RestEntityFilter extends RestQueryProcessor {}

export class RestGenericFilter implements RestEntityFilter {
  param = "filter";

  constructor(
    protected request: HttpRequestParsed,
    protected context: RestActionContext,
    protected filterMapFactory: RestFilterMapFactory,
  ) {}

  processQuery<Entity>(query: Query<Entity>): Query<Entity> {
    const database = this.context.getResource().getDatabase();
    const entitySchema = this.context.getEntitySchema();
    const entityType = entitySchema.getClassType();

    const filterMapSchema = this.filterMapFactory.build(entityType);
    const filterMapParam = this.param;
    const queries = this.request.getQueries();
    const filterMap = purify<object>(
      queries[filterMapParam] ?? {},
      filterMapSchema.type,
    );

    if (filterMap)
      Object.entries(filterMap).forEach(([field, condition]) => {
        const fieldSchema = entitySchema.getProperty(field);
        if (fieldSchema.isReference() || fieldSchema.isBackReference()) {
          const foreignSchema = fieldSchema.getResolvedReflectionClass();
          const getReference = (v: any) =>
            database.getReference(foreignSchema, v);
          Object.keys(condition).forEach((operator) => {
            condition[operator] =
              condition[operator] instanceof Array
                ? condition[operator].map(getReference)
                : getReference(condition[operator]);
          });
        }
        query = query.filterField(field as FieldName<Entity>, condition);
      });

    return query;
  }
}
