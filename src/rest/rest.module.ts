import { AppModule, createModule } from "@deepkit/app";
import { ClassType } from "@deepkit/core";

import { RestConfig } from "./rest.config";
import { restClass } from "./rest.decorator";
import { RestResource } from "./rest.interface";
import { RestListener } from "./rest.listener";
import { RestParameterResolver } from "./rest.parameter-resolver";
import { RestResourceManager } from "./rest-resource-manager.service";

export class RestModule extends createModule({
  config: RestConfig,
  providers: [RestResourceManager, RestParameterResolver],
  exports: [RestResourceManager, RestParameterResolver],
  listeners: [RestListener],
}) {
  readonly registry = new RestResourceRegistry();

  override process(): void {
    this.addProvider({
      provide: RestResourceRegistry,
      useValue: this.registry,
    });
  }

  override processController(
    module: AppModule<any, any>,
    type: ClassType<any>,
  ): void {
    const isResource = !!restClass._fetch(type);
    if (!isResource) return;
    if (!module.isProvided(type)) module.addProvider(type);
    this.registry.add({ module, type });
  }
}

export class RestResourceRegistry extends Set<RestResourceRegistryItem> {}

export interface RestResourceRegistryItem {
  type: ClassType<RestResource<unknown>>;
  module: AppModule<any>;
}