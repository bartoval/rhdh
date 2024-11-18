import { Entity } from '@backstage/catalog-model';
import { ApiHolder } from '@backstage/core-plugin-api';

import { conditionsArrayMapper } from '../utils';
import { extractMenuItems } from './extractMenuItems';
import {
  ApiFactory,
  AppIcon,
  BindingTarget,
  DynamicConfig,
  DynamicPluginConfig,
  DynamicRoute,
  EntityTabEntry,
  MountPoint,
  MountPointConfigRawIf,
  PluginModule,
  RouteBinding,
  ScaffolderFieldExtension,
  ThemeEntry,
} from './types';

/**
 * Converts the dynamic plugin configuration structure to the data structure
 * required by the dynamic UI, substituting in any defaults as needed
 */
export function extractDynamicConfig(
  dynamicPlugins: DynamicPluginConfig = { frontend: {} },
) {
  const frontend = dynamicPlugins.frontend || {};
  const config: DynamicConfig = {
    pluginModules: [],
    apiFactories: [],
    appIcons: [],
    dynamicRoutes: [],
    menuItems: [],
    entityTabs: [],
    mountPoints: [],
    routeBindings: [],
    routeBindingTargets: [],
    scaffolderFieldExtensions: [],
    themes: [],
  };
  config.pluginModules = Object.entries(frontend).reduce<PluginModule[]>(
    (pluginSet, [scope, customProperties]) => {
      pluginSet.push({
        scope,
        module: customProperties.pluginModule ?? 'PluginRoot',
      });
      return pluginSet;
    },
    [],
  );
  config.dynamicRoutes = Object.entries(frontend).reduce<DynamicRoute[]>(
    (pluginSet, [scope, customProperties]) => {
      pluginSet.push(
        ...(customProperties.dynamicRoutes ?? []).map(route => ({
          ...route,
          module: route.module ?? 'PluginRoot',
          importName: route.importName ?? 'default',
          scope,
        })),
      );
      return pluginSet;
    },
    [],
  );
  config.menuItems = extractMenuItems(frontend);
  config.routeBindings = Object.entries(frontend).reduce<RouteBinding[]>(
    (pluginSet, [_, customProperties]) => {
      pluginSet.push(...(customProperties.routeBindings?.bindings ?? []));
      return pluginSet;
    },
    [],
  );
  config.routeBindingTargets = Object.entries(frontend).reduce<BindingTarget[]>(
    (pluginSet, [scope, customProperties]) => {
      pluginSet.push(
        ...(customProperties.routeBindings?.targets ?? []).map(target => ({
          ...target,
          module: target.module ?? 'PluginRoot',
          name: target.name ?? target.importName,
          scope,
        })),
      );
      return pluginSet;
    },
    [],
  );
  config.mountPoints = Object.entries(frontend).reduce<MountPoint[]>(
    (accMountPoints, [scope, { mountPoints }]) => {
      accMountPoints.push(
        ...(mountPoints ?? []).map(mountPoint => ({
          ...mountPoint,
          module: mountPoint.module ?? 'PluginRoot',
          importName: mountPoint.importName ?? 'default',
          scope,
        })),
      );
      return accMountPoints;
    },
    [],
  );
  config.appIcons = Object.entries(frontend).reduce<AppIcon[]>(
    (accAppIcons, [scope, { appIcons }]) => {
      accAppIcons.push(
        ...(appIcons ?? []).map(icon => ({
          ...icon,
          module: icon.module ?? 'PluginRoot',
          importName: icon.importName ?? 'default',
          scope,
        })),
      );
      return accAppIcons;
    },
    [],
  );
  config.apiFactories = Object.entries(frontend).reduce<ApiFactory[]>(
    (accApiFactories, [scope, { apiFactories }]) => {
      accApiFactories.push(
        ...(apiFactories ?? []).map(api => ({
          module: api.module ?? 'PluginRoot',
          importName: api.importName ?? 'default',
          scope,
        })),
      );
      return accApiFactories;
    },
    [],
  );
  config.scaffolderFieldExtensions = Object.entries(frontend).reduce<
    ScaffolderFieldExtension[]
  >((accScaffolderFieldExtensions, [scope, { scaffolderFieldExtensions }]) => {
    accScaffolderFieldExtensions.push(
      ...(scaffolderFieldExtensions ?? []).map(scaffolderFieldExtension => ({
        module: scaffolderFieldExtension.module ?? 'PluginRoot',
        importName: scaffolderFieldExtension.importName ?? 'default',
        scope,
      })),
    );
    return accScaffolderFieldExtensions;
  }, []);
  config.entityTabs = Object.entries(frontend).reduce<EntityTabEntry[]>(
    (accEntityTabs, [scope, { entityTabs }]) => {
      accEntityTabs.push(
        ...(entityTabs ?? []).map(entityTab => ({
          ...entityTab,
          scope,
        })),
      );
      return accEntityTabs;
    },
    [],
  );
  config.themes = Object.entries(frontend).reduce<ThemeEntry[]>(
    (accThemeEntries, [scope, { themes }]) => {
      accThemeEntries.push(
        ...(themes ?? []).map(theme => ({
          ...theme,
          module: theme.module ?? 'PluginRoot',
          scope,
        })),
      );
      return accThemeEntries;
    },
    [],
  );
  return config;
}

/**
 * Evaluate the supplied conditional map.  Used to determine the visibility of
 * tabs in the UI
 * @param conditional
 * @returns
 */
export function configIfToCallable(conditional: MountPointConfigRawIf) {
  return (entity: Entity, context?: { apis: ApiHolder }) => {
    if (conditional?.allOf) {
      return conditional.allOf
        .map(conditionsArrayMapper)
        .every(f => f(entity, context));
    }
    if (conditional?.anyOf) {
      return conditional.anyOf
        .map(conditionsArrayMapper)
        .some(f => f(entity, context));
    }
    if (conditional?.oneOf) {
      return (
        conditional.oneOf
          .map(conditionsArrayMapper)
          .filter(f => f(entity, context)).length === 1
      );
    }
    return true;
  };
}
