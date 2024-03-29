import { createModule } from "@deepkit/app";
import { Database, DatabaseSession } from "@deepkit/orm";

import { DatabaseExtensionModuleConfig } from "./database-extension.config";
import { DatabaseListener } from "./database-extension.listener";
import { DatabaseInitializer } from "./database-initializer.service";

export class DatabaseExtensionModule extends createModule(
  {
    providers: [
      DatabaseInitializer,
      {
        provide: DatabaseSession,
        useFactory: (db: Database) => db.createSession(),
        scope: "http",
      },
    ],
    listeners: [DatabaseListener],
    config: DatabaseExtensionModuleConfig,
    forRoot: true,
  },
  "database",
) {}
