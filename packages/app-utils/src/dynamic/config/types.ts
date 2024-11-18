import { Entity } from '@backstage/catalog-model';

export type RouteBinding = {
  bindTarget: string;
  bindMap: {
    [target: string]: string;
  };
};

export type DynamicModuleEntry = {
  scope: string;
  module: string;
};

export type MountPointConfigBase = {
  layout?: Record<string, string>;
  props?: Record<string, any>;
};

export type MountPointConfigRawIf = {
  [key in 'allOf' | 'oneOf' | 'anyOf']?: (
    | {
        [key: string]: string | string[];
      }
    | Function
  )[];
};

export type MountPointConfigRaw = MountPointConfigBase & {
  if?: MountPointConfigRawIf;
};

export type DynamicRouteMenuItem =
  | {
      text: string;
      icon: string;
      parent?: string;
      priority?: number;
    }
  | {
      module?: string;
      importName: string;
      config?: {
        props?: Record<string, any>;
      };
    };
export type MenuItemConfig = {
  icon?: string;
  title?: string;
  priority?: number;
  parent?: string;
};
export type MenuItem = {
  name: string;
  title: string;
  icon: string;
  children: MenuItem[];
  priority?: number;
  to?: string;
  parent?: string;
};
export type DynamicRoute = DynamicModuleEntry & {
  importName: string;
  path: string;
  menuItem?: DynamicRouteMenuItem;
  config?: {
    props?: Record<string, any>;
  };
};
export type PluginModule = DynamicModuleEntry;

export type MountPoint = DynamicModuleEntry & {
  mountPoint: string;
  importName: string;
  config?: MountPointConfigRaw;
};
export type AppIcon = DynamicModuleEntry & {
  name: string;
  importName: string;
};
export type ApiFactory = DynamicModuleEntry & {
  importName: string;
};
export type ScaffolderFieldExtension = DynamicModuleEntry & {
  importName: string;
};
export type EntityTab = {
  mountPoint: string;
  path: string;
  title: string;
};
export type EntityTabEntry = {
  scope: string;
  mountPoint: string;
  path: string;
  title: string;
};
export type ThemeEntry = DynamicModuleEntry & {
  id: string;
  title: string;
  variant: 'light' | 'dark';
  icon: string;
  importName: string;
};
export type CustomProperties = {
  pluginModule?: string;
  dynamicRoutes?: (DynamicModuleEntry & {
    importName?: string;
    module?: string;
    path: string;
    menuItem?: DynamicRouteMenuItem;
  })[];
  menuItems?: { [key: string]: MenuItemConfig };
  routeBindings?: {
    targets: BindingTarget[];
    bindings: RouteBinding[];
  };
  entityTabs?: EntityTab[];
  mountPoints?: MountPoint[];
  appIcons?: AppIcon[];
  apiFactories?: ApiFactory[];
  scaffolderFieldExtensions?: ScaffolderFieldExtension[];
  themes?: ThemeEntry[];
};
export type FrontendConfig = {
  [key: string]: CustomProperties;
};
export type DynamicPluginConfig = {
  frontend?: FrontendConfig;
};
export type DynamicConfig = {
  pluginModules: PluginModule[];
  apiFactories: ApiFactory[];
  appIcons: AppIcon[];
  dynamicRoutes: DynamicRoute[];
  menuItems: MenuItem[];
  entityTabs: EntityTabEntry[];
  mountPoints: MountPoint[];
  routeBindings: RouteBinding[];
  routeBindingTargets: BindingTarget[];
  scaffolderFieldExtensions: ScaffolderFieldExtension[];
  themes: ThemeEntry[];
};
export type BindingTarget = DynamicModuleEntry & {
  name: string;
  importName: string;
};
export type MountPointConfig = MountPointConfigBase & {
  if: (e: Entity) => boolean;
};
