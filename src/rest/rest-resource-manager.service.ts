import { ClassType } from "@deepkit/core";
import { http } from "@deepkit/http";
import { join } from "path";

import { RestConfig } from "./rest.config";
import { restClass } from "./rest.decorator";
import { RestResource } from "./rest.interface";
import { RestResourceMeta } from "./rest.meta";
import { RestParameterResolver } from "./rest.parameter-resolver";

export class RestResourceManager {
  constructor(private config: RestConfig) {}

  setup(type: ResourceClassType): void {
    const meta = this.getMetaOrThrow(type);
    const path =
      this.config.versioning && meta.version
        ? `${this.config.prefix}/${this.config.versioning}${meta.version}/${meta.name}`
        : `${this.config.prefix}/${meta.name}`;
    http.controller(path)(type);
    Object.keys(meta.actions).forEach((name) => this.setupAction(type, name));
  }

  setupAction(type: ResourceClassType, name: string): void {
    const resourceMeta = this.getMetaOrThrow(type).validate();
    const actionMeta = resourceMeta.actions[name].validate();
    let path = actionMeta.detailed ? `:${resourceMeta.lookup}` : "";
    if (actionMeta.suffix) path = join(path, actionMeta.suffix);
    http[actionMeta.method](path)(type.prototype, name);
    if (actionMeta.detailed) {
      const resolver = RestParameterResolver;
      http.resolveParameterByName("lookup", resolver)(type.prototype, name);
      http.resolveParameterByName("target", resolver)(type.prototype, name);
    }
  }

  private getMetaOrThrow(type: ResourceClassType): RestResourceMeta {
    const meta = restClass._fetch(type)?.validate();
    if (!meta) throw new Error("Resource not decorated");
    return meta;
  }
}

type ResourceClassType = ClassType<RestResource<unknown>>;