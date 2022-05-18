import { FieldName } from "@deepkit/orm";

export type Orderable = { __meta?: ["orderable"] };

export type OrderableFieldName<Entity> = {
  [Key in FieldName<Entity>]: Entity[Key] extends Orderable ? Key : never;
}[FieldName<Entity>];

export type ResourceOrder = "asc" | "desc";

export type ResourceOrderMap<Entity> = {
  [Key in OrderableFieldName<Entity>]?: ResourceOrder;
};
