/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { FrontendFeature } from '@backstage/frontend-app-api';
import { CreateAppFeatureLoader } from '@backstage/frontend-defaults';
import { init, loadRemote, registerPlugins, registerRemotes } from '@module-federation/enhanced/runtime';

export const dynamicFrontendFeaturesLoader: CreateAppFeatureLoader = {
  getLoaderName() {
    return 'dynamic-plugins-loader';
  },

  async load({ config }) {
    const baseUrl = config.getString('backend.baseUrl');
    try {
      const frontendPluginManifests: {
        [key: string]: { name: string; manifestLocation: string };
      } = await (
        await fetch(`${baseUrl}/api/scalprum/plugins`)
      ).json();

      init({
        name: 'rhdh',
        remotes: [],
        shared: {
          '@scalprum/core': {
            version: '0.7.0',
            scope: 'default',
            lib: () => import('@scalprum/core'),
            shareConfig: {
              singleton: true,
              requiredVersion: '^0.7.0',
            },
          },
          '@scalprum/react-core': {
            version: '0.8.0',
            scope: 'default',
            lib: () => import('@scalprum/react-core'),
            shareConfig: {
              singleton: true,
              requiredVersion: '^0.8.0',
            },
          },    
        },
      });
      
      registerPlugins([{
        name: 'scalprum-bridge-module-name-plugin',
        afterResolve: (args) => {
          if (args.expose === './PluginRoot') {
            args.expose = 'PluginRoot'
          }
          return args
        },
      }]);
      
      if (! (window as any).__load_plugin_entry__) {
        (window as any).__load_plugin_entry__ = (pluginName: string, entryModule: any) => {
          (window as any)[pluginName] = entryModule;
        };
      }

      const remotes = await Promise.all(Object.values(frontendPluginManifests).map(async m => {
        const { loadScripts: [ entry ] } = await (
          await fetch(m.manifestLocation)
        ).json();

        return {
          name: m.name,
          entry: m.manifestLocation.replace(/plugin-manifest.json$/, entry),
          type: 'jsonp',          
        } as Parameters<typeof init>[0]['remotes'][0]; 
      }));

      registerRemotes(remotes);

      const features: FrontendFeature[] = [];

      for (const m of Object.values(frontendPluginManifests)) {
        // eslint-disable-next-line no-console
        console.info(
          `Loading dynamic plugin ${m.name} from ${m.manifestLocation}`,
        );
        const module = await loadRemote<any>(`${m.name}/PluginRoot`);
        if (module) {
          // eslint-disable-next-line no-console
          console.info(
            `Dynamic plugin ${m.name} loaded from ${m.manifestLocation}`,
          );


          features.push(module.default);
        }
      }

      return { features: features };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        `Failed to fetch scalprum configuration`,
        err
      );
      return { features: [] };
    }
  },
};
