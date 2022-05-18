import { FieldName, QuerySelector } from "@deepkit/orm";

export type Filterable = { __meta?: ["filterable"] };

export type FilterableFieldName<Entity> = {
  [Field in FieldName<Entity>]: Entity[Field] extends Filterable
    ? Field
    : never;
}[FieldName<Entity>];

export type ResourceFilterOperator = Extract<
  keyof QuerySelector<unknown>,
  | "$eq"
  | "$gt"
  | "$gte"
  | "$in"
  | "$lt"
  | "$lte"
  | "$ne"
  | "$nin"
  | "$not"
  | "$regex"
>;

export type ResourceFilterOperatorMultiValue = Extract<
  ResourceFilterOperator,
  "$in" | "$nin"
>;

export type ResourceFilterMap<Entity> = {
  [Key in FilterableFieldName<Entity>]?: {
    [Operator in ResourceFilterOperator]?: Operator extends ResourceFilterOperatorMultiValue
      ? Entity[Key][]
      : Entity[Key];
  };
};
