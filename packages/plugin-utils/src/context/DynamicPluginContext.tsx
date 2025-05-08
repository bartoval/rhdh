import React, { createContext } from 'react';
import { useScalprum } from '@scalprum/react-core';

import { DynamicRootConfig, ScalprumApiHolder } from '../types';

const defaultConfig: DynamicRootConfig = {
  dynamicRoutes: [],
  entityTabOverrides: {},
  mountPoints: {},
  menuItems: [],
  scaffolderFieldExtensions: [],
};


export interface DynamicPluginContextType {
  config: DynamicRootConfig;
}

export interface DynamicPluginProviderProps {
  children: React.ReactNode;
}

export const DynamicPluginContext = createContext<DynamicPluginContextType>({
  config: defaultConfig,
});


/**
 * Provider component for the DynamicPluginContext
 * This component provides direct access to the Scalprum dynamicRootConfig.
 */
export const DynamicPluginProvider: React.FC<DynamicPluginProviderProps> = ({
  children,
}) => {
  const scalprum = useScalprum<{ api: ScalprumApiHolder }>();
  const config = scalprum?.api?.dynamicRootConfig || defaultConfig;

  const contextValue: DynamicPluginContextType = {
    config,
  };

  return (
    <DynamicPluginContext.Provider value={contextValue}>
      {children}
    </DynamicPluginContext.Provider>
  );
};

export default DynamicPluginContext;
