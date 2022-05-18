import { eventDispatcher } from "@deepkit/event";
import { UnitOfWorkEvent } from "@deepkit/orm";
import { entity, Excluded } from "@deepkit/type";
import { compare, hash } from "bcryptjs";
import { DatabasePreInsert } from "src/database/database-event";
import { Filterable } from "src/resource/resource-filter.typings";
import { Orderable } from "src/resource/resource-order.typings";
import { Entity } from "src/shared/entity";

@entity.name("user")
export class User extends Entity {
  name!: string & Filterable & Orderable;
  email!: string & Filterable & Orderable;
  password!: string & Filterable & Orderable & Excluded;

  async hashPassword(): Promise<void> {
    const hashed = this.password.length === 60;
    if (hashed) return;
    this.password = await hash(this.password, 10);
  }

  async verify(password: string): Promise<boolean> {
    return compare(password, this.password);
  }
}

export class UserEventListener {
  @eventDispatcher.listen(DatabasePreInsert)
  async preInsert(event: UnitOfWorkEvent<User>): Promise<void> {
    await Promise.all(event.items.map((user) => user.hashPassword()));
  }
}
