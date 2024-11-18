import React from 'react';

import {
  AnyApiFactory,
  AppTheme,
  BackstagePlugin,
} from '@backstage/core-plugin-api';

import { DynamicModuleEntry } from '../config';
import { MountPointConfig } from '../config/types';

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
export type ResolvedMenuItem = {
  name: string;
  title: string;
  icon?: string;
  children?: ResolvedMenuItem[];
  to?: string;
  priority?: number;
};

export type ResolvedDynamicRoute = DynamicModuleEntry & {
  path: string;
  menuItem?: ResolvedDynamicRouteMenuItem;
  Component: React.ComponentType<any>;
  staticJSXContent?: React.ReactNode;
  config: {
    props?: Record<string, any>;
  };
};
export type ResolvedMountPoint = {
  Component: React.ComponentType<React.PropsWithChildren>;
  config?: MountPointConfig;
  staticJSXContent?: React.ReactNode;
};
export type RemotePlugins = {
  [scope: string]: {
    [module: string]: {
      [importName: string]:
        | React.ComponentType<React.PropsWithChildren>
        | ((...args: any[]) => any)
        | BackstagePlugin<{}>
        | {
            element: React.ComponentType<React.PropsWithChildren>;
            staticJSXContent: React.ReactNode;
          }
        | AnyApiFactory;
    };
  };
};
export type EntityTabOverrides = Record<
  string,
  { title: string; mountPoint: string }
>;
export type MountPoints = Record<string, ResolvedMountPoint[]>;
export type AppThemeProvider = Partial<AppTheme> & Omit<AppTheme, 'theme'>;
export type ResolvedScaffolderFieldExtension = {
  scope: string;
  module: string;
  importName: string;
  Component: React.ComponentType<{}>;
};
export type DynamicRootConfig = {
  dynamicRoutes: ResolvedDynamicRoute[];
  entityTabOverrides: EntityTabOverrides;
  mountPoints: MountPoints;
  menuItems: ResolvedMenuItem[];
  scaffolderFieldExtensions: ResolvedScaffolderFieldExtension[];
};
