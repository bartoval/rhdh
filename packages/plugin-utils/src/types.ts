import React from 'react';

import { Entity } from '@backstage/catalog-model';
import { ApiHolder } from '@backstage/core-plugin-api';

/**
 * Menu item for a dynamic route.
 */
export type ResolvedDynamicRouteMenuItem =
  | {
      text: string;
      icon: string;
    }
  | {
      Component: React.ComponentType<any>;
      config: {
        props?: Record<string, any>;
      };
    };

/**
 * Menu item in the sidebar.
 */
export type ResolvedMenuItem = {
  name: string;
  title: string;
  icon?: string;
  children?: ResolvedMenuItem[];
  to?: string;
  priority?: number;
};

/**
 * A resolved dynamic route.
 */
export type ResolvedDynamicRoute = {
  scope: string;
  module: string;
  path: string;
  menuItem?: ResolvedDynamicRouteMenuItem;
  Component: React.ComponentType<any>;
  staticJSXContent?: React.ReactNode;
  config: {
    props?: Record<string, any>;
  };
};

/**
 * Configuration for a mount point. Used to configure conditions for rendering.
 */
export type MountPointConfig = {
  layout?: Record<string, string>;
  props?: Record<string, any>;
  if: (e: Entity, context?: { apis: ApiHolder }) => boolean;
};

/**
 * A resolved mount point component.
 */
export type ResolvedMountPoint = {
  Component: React.ComponentType<React.PropsWithChildren<{}>>;
  config?: MountPointConfig;
  staticJSXContent?: React.ReactNode;
};

/**
 * Maps of entity tab overrides.
 */
export type EntityTabOverrides = Record<
  string,
  { title: string; mountPoint: string }
>;

/**
 * Map of mount points by name.
 */
export type MountPoints = Record<string, ResolvedMountPoint[]>;

/**
 * A resolved scaffolder field extension.
 */
export type ResolvedScaffolderFieldExtension = {
  scope: string;
  module: string;
  importName: string;
  Component: React.ComponentType<{}>;
};

/**
 * The main configuration for dynamic plugins.
 */
export type DynamicRootConfig = {
  dynamicRoutes: ResolvedDynamicRoute[];
  entityTabOverrides: EntityTabOverrides;
  mountPoints: MountPoints;
  menuItems: ResolvedMenuItem[];
  scaffolderFieldExtensions: ResolvedScaffolderFieldExtension[];
};

/**
 * The Scalprum API Holder type with dynamicRootConfig property.
 * This is the type that is passed to the Scalprum Provider.
 */
export type ScalprumApiHolder = {
  dynamicRootConfig: DynamicRootConfig;
};
