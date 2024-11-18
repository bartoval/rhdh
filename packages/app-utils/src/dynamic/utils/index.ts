import { type Entity } from '@backstage/catalog-model';
import { ApiHolder } from '@backstage/core-plugin-api';
import { isKind } from '@backstage/plugin-catalog';

export const isType = (types: string | string[]) => (entity: Entity) => {
  if (!entity?.spec?.type) {
    return false;
  }
  return typeof types === 'string'
    ? entity?.spec?.type === types
    : types.includes(entity.spec.type as string);
};
export const hasAnnotation = (keys: string) => (entity: Entity) =>
  Boolean(entity.metadata.annotations?.[keys]);

export const hasLinks = (entity: Entity) =>
  Boolean(entity.metadata.links?.length);
export function conditionsArrayMapper(
  condition:
    | {
        [key: string]: string | string[];
      }
    | Function,
): (entity: Entity, context?: { apis: ApiHolder }) => boolean {
  if (typeof condition === 'function') {
    return (entity: Entity, context?: { apis: ApiHolder }): boolean =>
      condition(entity, context);
  }
  if (condition.isKind) {
    return isKind(condition.isKind);
  }
  if (condition.isType) {
    return isType(condition.isType);
  }
  if (condition.hasAnnotation) {
    return hasAnnotation(condition.hasAnnotation as string);
  }
  return () => false;
}
