import { App } from "@deepkit/app";
import { FrameworkModule } from "@deepkit/framework";
import { HttpExtensionModule } from "@deepkit-rest/http-extension";
import { RestCoreModule } from "@deepkit-rest/rest-core";
import { RestCrudModule } from "@deepkit-rest/rest-crud";

import { AuthModule } from "./auth/auth.module";
import { CoreModule } from "./core/core.module";
import { DatabaseExtensionModule } from "./database-extension/database-extension.module";
import { EmailEngineModule } from "./email-engine/email-engine.module";
import { FileModule } from "./file/file.module";
import { FileEngineModule } from "./file-engine/file-engine.module";
import { JwtModule } from "./jwt/jwt.module";
import { UserModule } from "./user/user.module";

new App({
  imports: [
    new FrameworkModule(),
    new CoreModule(),
    new HttpExtensionModule(),
    new RestCoreModule({ prefix: "api" }),
    new RestCrudModule(),
    new DatabaseExtensionModule(),
    new FileEngineModule(),
    new EmailEngineModule(),
    new JwtModule(),
    new AuthModule(),
    new UserModule(),
    new FileModule(),
  ],
})
  .loadConfigFromEnv()
  .run();
