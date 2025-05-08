import { useContext } from 'react';

import { DynamicPluginContext } from '../context/DynamicPluginContext';
import { DynamicRootConfig } from '../types';

/** Hook to access the dynamic plugin configuration */
export function useDynamicPlugin(): DynamicRootConfig {
  const context = useContext(DynamicPluginContext);

  if (!context) {
    throw new Error('useDynamicPlugin must be used within a DynamicPluginProvider');
  }

  return context.config;
}

export default useDynamicPlugin;
