import React, { createContext } from 'react';

import { DynamicRootConfig } from '@internal/app-utils';

export type ComponentRegistry = {
  AppProvider: React.ComponentType<React.PropsWithChildren>;
  AppRouter: React.ComponentType<React.PropsWithChildren>;
} & DynamicRootConfig;

const DynamicRootContext = createContext<ComponentRegistry>({
  AppProvider: () => null,
  AppRouter: () => null,
  dynamicRoutes: [],
  entityTabOverrides: {},
  mountPoints: {},
  menuItems: [],
  scaffolderFieldExtensions: [],
});

export default DynamicRootContext;
