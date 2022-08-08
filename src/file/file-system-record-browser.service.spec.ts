import { Database } from "@deepkit/orm";
import { SQLiteDatabaseAdapter } from "@deepkit/sqlite";
import { User } from "src/user/user.entity";

import { FileSystemRecord } from "./file-system-record.entity";
import { FileSystemRecordBrowser } from "./file-system-record-browser.service";

describe("FileSystemRecordBrowser", () => {
  let browser: FileSystemRecordBrowser;
  let database: Database;
  let user: User;

  beforeEach(async () => {
    browser = new FileSystemRecordBrowser();
    const schemas = [User, FileSystemRecord];
    database = new Database(new SQLiteDatabaseAdapter(), schemas);
    await database.migrate();
    user = new User({
      name: "name",
      email: "email@email.com",
      password: "password",
    });
    await database.persist(user);
  });

  describe("trackPath", () => {
    it("should work", async () => {
      const dir = new FileSystemRecord({
        owner: user,
        name: "dir",
        type: "directory",
      });
      const file = new FileSystemRecord({
        owner: user,
        name: "file",
        type: "file",
      }).assign({ parent: dir });
      await database.persist(dir, file);
      const result = await browser.trackPath(
        "dir/file",
        database.query(FileSystemRecord),
      );
      expect(result?.id).toBe(file.id);
    });

    it("should return null when not found", async () => {
      const result = await browser.trackPath(
        "not/found",
        database.query(FileSystemRecord),
      );
      expect(result).toBe(null);
    });
  });

  describe("aggregateSize", () => {
    it("should work", async () => {
      await database.persist(
        new FileSystemRecord({
          owner: user,
          name: "a",
          type: "file",
        }).assign({
          contentSize: 100,
        }),
        new FileSystemRecord({
          owner: user,
          name: "b",
          type: "file",
        }).assign({
          contentSize: 200,
        }),
        new FileSystemRecord({
          owner: user,
          name: "b",
          type: "file",
        }).assign({
          contentSize: undefined,
        }),
      );
      const result = await browser.aggregateSize(
        database.query(FileSystemRecord),
      );
      expect(result).toBe(300);
    });

    it("should return 0 when no record found", async () => {
      const result = await browser.aggregateSize(
        database.query(FileSystemRecord),
      );
      expect(result).toBe(0);
    });
  });
});
