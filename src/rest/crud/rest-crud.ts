import { HttpNotFoundError } from "@deepkit/http";
import { HttpInjectorContext } from "src/http-extension/http-common";

import {
  RestActionContext,
  RestActionContextReader,
} from "../core/rest-action";
import { RestResource } from "../core/rest-resource";
import { RestFilteringCustomizations } from "./rest-filtering";
import { RestPaginationCustomizations } from "./rest-pagination";
import {
  RestFieldBasedRetriever,
  RestRetrievingCustomizations,
} from "./rest-retrieving";
import { RestSortingCustomizations } from "./rest-sorting";

export class RestCrudService {
  constructor(
    private injector: HttpInjectorContext,
    private contextReader: RestActionContextReader,
  ) {}

  async list<Entity>(
    context: RestActionContext<Entity>,
  ): Promise<RestList<Entity>> {
    const { module } = context;
    const resource: RestResource<Entity> &
      RestPaginationCustomizations &
      RestFilteringCustomizations &
      RestSortingCustomizations = this.contextReader.getResource(context);

    let query = resource.query();

    if (resource.filters)
      resource.filters
        .map((type) => this.injector.resolve(module, type)())
        .forEach((filter) => (query = filter.filter(context, query)));

    const total = await query.count();

    if (resource.sorters)
      resource.sorters
        .map((type) => this.injector.resolve(module, type)())
        .forEach((sorter) => (query = sorter.sort(context, query)));
    if (resource.paginator)
      query = this.injector
        .resolve(module, resource.paginator)()
        .paginate(context, query);

    const items = await query.find();

    return { total, items };
  }

  async retrieve<Entity>(context: RestActionContext<Entity>): Promise<Entity> {
    const { module, actionMeta } = context;
    if (!actionMeta.detailed) throw new Error("Not a detailed action");
    const resource: RestResource<Entity> & RestRetrievingCustomizations =
      this.contextReader.getResource(context);
    const retrieverType = resource.retriever ?? RestFieldBasedRetriever;
    const retriever = this.injector.resolve(module, retrieverType)();
    const query = retriever.retrieve(context, resource.query());
    const result = await query.findOneOrUndefined();
    if (!result) throw new HttpNotFoundError();
    return result;
  }
}

export interface RestList<Entity> {
  total: number;
  items: Entity[];
}