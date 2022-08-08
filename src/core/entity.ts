import { ClassType } from "@deepkit/core";
import { PrimaryKey, UUID, uuid } from "@deepkit/type";
import { Filterable, Orderable } from "@deepkit-rest/rest-crud";

/**
 * The constructor of all derived classes must have a parameter
 * with proper type for entity initialization.
 * @example
 *  class MyEntity extends AppEntity {
 *    name!: string;
 *    constructor(input: Pick<MyEntity, "name">) {
 *      super()
 *      this.assign(input);
 *    }
 *  }
 */
export abstract class AppEntity<Derived extends AppEntity<Derived>> {
  id: UUID & PrimaryKey & Filterable & Orderable = uuid();
  createdAt: Date & Filterable & Orderable = new Date();
  assign(input: Partial<Derived>): this {
    Object.assign(this, input);
    return this;
  }
}

export interface AppEntityType<Derived extends AppEntity<Derived> = never> {
  new (input: object): AppEntity<Derived>;
}

export function isAppEntityType(
  classType: ClassType,
): classType is AppEntityType {
  return classType.prototype instanceof AppEntity;
}
