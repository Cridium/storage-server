import { App } from "@deepkit/app";
import { FrameworkModule } from "@deepkit/framework";

import { AuthModule } from "./auth/auth.module";
import { entities } from "./core/entities";
import { fileEngineRegistry } from "./core/file-engines/registry";
import { RequestContext } from "./core/request-context";
import { DatabaseModule } from "./database/database.module";
import { FileModule } from "./file/file.module";
import { FileEngineModule } from "./file-engine/file-engine.module";
import { UserModule } from "./user/user.module";

new App({
  imports: [
    new FrameworkModule(),
    new DatabaseModule().withEntities(...entities),
    new FileEngineModule().withRegistry(fileEngineRegistry),
    new AuthModule(),
    new UserModule(),
    new FileModule(),
  ],
  providers: [{ provide: RequestContext, scope: "http" }],
})
  .loadConfigFromEnv()
  .run();
