/*
 * Copyright 2024 The Backstage Authors
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

import { AnyApiFactory, AnyExternalRoutes as LegacyAnyExternalRoutes, BackstagePlugin, IconComponent, AnyRoutes as LegacyAnyRoutes, ConfigApi, AnyRouteRefParams } from '@backstage/core-plugin-api';
import { CreateAppRouteBinder, FrontendFeature } from '@backstage/frontend-app-api';
import { CreateAppFeatureLoader } from '@backstage/frontend-defaults';
import { DynamicConfig, DynamicModuleEntry, DynamicPluginConfig, RemotePlugins, bindAppRoutes, extractDynamicConfig } from '@internal/app-utils';
import { init, loadRemote, registerPlugins, registerRemotes } from '@module-federation/enhanced/runtime';
import { compatWrapper, convertLegacyPageExtension, convertLegacyRouteRef, convertLegacyRouteRefs } from '@backstage/core-compat-api';
import { AnyRoutes, ApiBlueprint, ExtensionDefinition, IconBundleBlueprint, NavItemBlueprint, ThemeBlueprint, createFrontendPlugin } from '@backstage/frontend-plugin-api';
import {
  RouteRef as LegacyRouteRef,
  getComponentData,
} from '@backstage/core-plugin-api';
import { ComponentType, ReactNode } from 'react';
import React from 'react';
import { MenuIcon } from '@internal/app-utils';
import { NavComponentBlueprint, customNavBar } from './NavBar';
import appPlugin from '@backstage/plugin-app';
import { ConfigReader } from '@backstage/config';
import { overrideBaseUrlConfigs } from '@internal/app-utils';
import { AppRouteBinder, defaultConfigLoader } from '@backstage/core-app-api';
import { FieldExtensionOptions } from '@backstage/plugin-scaffolder-react';
import { FormFieldBlueprint, createFormField } from '@backstage/plugin-scaffolder-react/alpha';

export class NewFrontendBridge implements CreateAppFeatureLoader {
  #dynamicPluginsConfig?: DynamicConfig;
  #remotePlugins: RemotePlugins = {};

  getLoaderName() {
    return 'dynamic-plugins-loader';
  }

  async configLoader() {
    return { 
      config: ConfigReader.fromConfigs(
        overrideBaseUrlConfigs(
          await defaultConfigLoader())),
    };
  }

  async load(options: {
    config: ConfigApi
  }): Promise<{
    features: FrontendFeature[];
  }> {
    const { config } = options;
    const baseUrl = config.getString('backend.baseUrl');
    this.#dynamicPluginsConfig = extractDynamicConfig(config.get<DynamicPluginConfig>('dynamicPlugins'));
    const scopedConfig = getScopedConfig(this.#dynamicPluginsConfig);

    try {
      const frontendPluginManifests: {
        [key: string]: { name: string; manifestLocation: string };
      } = await (
        await fetch(`${baseUrl}/api/scalprum/plugins`)
      ).json();

      if (!(window as any).__load_plugin_entry__) {
        (window as any).__load_plugin_entry__ = (pluginName: string, entryModule: any) => {
          (window as any)[pluginName] = entryModule;
        };
      }

      // Use the pluginModules to know what we should load, and also to possibly
      // define the module renaming in the module federation plugin.

      init({
        name: 'backstageHost',
        remotes: [],
        shareStrategy: "loaded-first",
        shared: {
          '@scalprum/core': {
            scope: 'default',
            lib: () => import('@scalprum/core'),
            shareConfig: {
              singleton: true,
              requiredVersion: (await import('@scalprum/core/package.json')).version,
              eager: true,
            },
          },
          '@scalprum/react-core': {
            scope: 'default',
            lib: () => import('@scalprum/react-core'),
            shareConfig: {
              singleton: true,
              requiredVersion: (await import('@scalprum/react-core/package.json')).version,
              eager: true,
            },
          },
        },
      });

      registerPlugins([{
        name: 'scalprum-bridge-module-name-plugin',
        afterResolve: (args) => {
          if (!args.expose.startsWith('./')) {
            return args;
          }
          const moduleWithoutPrefix = args.expose.replace(/^\.\/+/, '');
          if (scopedConfig[args.remote.name]?.[moduleWithoutPrefix]) {
            args.expose = moduleWithoutPrefix;
          }
          return args
        },
        resolveShare: (args) => {
          // eslint-disable-next-line no-console
          console.warn(
            `resolveShare Args: ${args}`,
          );
          return args;
        },
        loadShare: (args) => {
          // eslint-disable-next-line no-console
          console.warn(
            `loadShare Args: ${args}`,
          );
        },

      }]);

      const remotes = await Promise.all(Object.values(frontendPluginManifests).map(async m => {
        const { loadScripts: [entry] } = await (
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

      // eslint-disable-next-line guard-for-in
      for (const scope in scopedConfig) {
        if (!frontendPluginManifests[scope]) {
          // eslint-disable-next-line no-console
          console.warn(
            `Dynamic plugin ${scope} unknown`,
          );
          continue;
        }

        // eslint-disable-next-line guard-for-in
        for (const mod in scopedConfig[scope]) {
          // eslint-disable-next-line no-console
          console.info(
            `Loading module ${mod} dynamic plugin ${scope} from ${frontendPluginManifests[scope]}`,
          );
          const module = await loadRemote<RemotePlugins[0][0]>(`${scope}/${mod}`);
          if (module) {
            // eslint-disable-next-line no-console
            console.info(
              `Module ${mod} of dynamic plugin ${scope} loaded from ${frontendPluginManifests[scope]}`,
            );

            this.#remotePlugins[scope] = this.#remotePlugins[scope] || {};
            this.#remotePlugins[scope][mod] = module;
          }
        }
      }

      const renderIcon = (iconName: string) => (() => compatWrapper(<MenuIcon icon={iconName} />)) as IconComponent;


      enum DefaultTheme {
        light,
        dark,
      }

      const overriddenThemes: (keyof typeof DefaultTheme)[] = [];

      // eslint-disable-next-line guard-for-in
      for (const scope in scopedConfig) {
        if (this.#remotePlugins[scope] === undefined) {
          continue;
        }
        const backstagePlugins: Array<BackstagePlugin<{}>> = [];
        const pluginModule = Object.values(scopedConfig[scope]).find(c => c.pluginModules.length > 0)?.pluginModules?.[0]?.module;
        if (pluginModule) {
          const remoteBackstagePlugins = Object.values(this.#remotePlugins[scope]?.[pluginModule] ?? {})?.filter(
            imported => {
              const prototype = Object.getPrototypeOf(imported);
              return (
                prototype !== undefined &&
                [
                  'getId',
                  'getApis',
                  'getFeatureFlags',
                  'provide',
                  'routes',
                  'externalRoutes',
                ].every(field => field in prototype)
              );
            }) as BackstagePlugin<{}>[];

          remoteBackstagePlugins.forEach(rp => {
            if (!backstagePlugins.some(p => p.getId() === rp.getId())) {
              backstagePlugins.push(rp);
            }
          });

          if (backstagePlugins.length > 1) {
            // eslint-disable-next-line no-console
            console.warn(
              `2 exported plugins in a single module !!!!!!`,
            );
          }
        }

        const pluginLegacyFactories = backstagePlugins.flatMap(p => [...p.getApis()]);
        const apiFactories = [
          ...Object.values(scopedConfig[scope])
            .flatMap(cfg => cfg.apiFactories.map(f => this.#remotePlugins[f.scope]?.[f.module]?.[f.importName] as AnyApiFactory
            )).filter(f => f && !pluginLegacyFactories.some(pf => pf.api.id === f.api.id)),
          ...pluginLegacyFactories
        ]
          .map(factory =>
            ApiBlueprint.make({ name: factory.api.id, params: { factory } }),
          );

        const referencedRoutes: AnyRoutes = {};

        const dynamicRouteItems = Object.values(scopedConfig[scope])
          .flatMap(cfg => cfg.dynamicRoutes.flatMap(r => {
            if (!r.menuItem) {
              return [undefined];
            }
            const Page = this.#remotePlugins[r.scope]?.[r.module]?.[r.importName] as (ComponentType<{ children?: ReactNode; }> | undefined);
            if (!Page) {
              return [undefined];
            }
            const element = <Page />;
            const legacyRouteRef = getComponentData<LegacyRouteRef<undefined>>(
              element,
              'core.mountPoint',
            );

            const menuItemExtension: Array<ExtensionDefinition> = [];
            if (r.menuItem && legacyRouteRef) {
              const routeRef = convertLegacyRouteRef(legacyRouteRef);
              referencedRoutes[r.importName] = routeRef;

              if ('text' in r.menuItem!) {
                menuItemExtension.push(NavItemBlueprint.make({
                  params: {
                    title: r.menuItem.text,
                    icon: renderIcon(r.menuItem.icon),
                    routeRef: routeRef,
                  },
                  attachTo: {
                    id: 'app/nav',
                    input: 'items',
                  },
                }));
              } else {
                const MenuItemComponent = this.#remotePlugins[r.scope]?.[r.menuItem.module ?? r.module]?.[r.menuItem.importName];
                if (MenuItemComponent !== undefined) {
                  menuItemExtension.push(NavComponentBlueprint.make({
                    params: {
                      Component: MenuItemComponent as React.ComponentType<{}>,
                      routeRef: routeRef,
                      config: r.menuItem?.config?.props,
                    },
                    attachTo: {
                      id: 'app/nav',
                      input: 'components',
                    },
                  }));
                }
              }
            }
            return [
              convertLegacyPageExtension(Page, {
                defaultPath: r.path
              }),
              ...menuItemExtension,
            ];
          })).filter((e): e is ExtensionDefinition<any> => e !== undefined);

        type ResolvedIcon = {
          name: string,
          component: IconComponent,
        };
        const icons: ResolvedIcon[] = Object.values(scopedConfig[scope])
          .flatMap(cfg => cfg.appIcons.map(i => {
            const importedIcon = this.#remotePlugins[i.scope]?.[i.module]?.[i.importName];
            if (!importedIcon) {
              return undefined;
            }
            return {
              name: i.name,
              component: importedIcon as IconComponent,
            };
          })).filter((i): i is ResolvedIcon => i !== undefined);

        const themes = Object.values(scopedConfig[scope])
          .flatMap(cfg => cfg.themes.map(t => {
            const importedThemeProvider = this.#remotePlugins[t.scope]?.[t.module]?.[t.importName];
            if (!importedThemeProvider) {
              return undefined;
            }

            const themeName = t.id;
            if (themeName in DefaultTheme) {
              overriddenThemes.push(themeName as keyof typeof DefaultTheme);
            }

            return ThemeBlueprint.make({
              name: t.id,
              params: {
                theme: {
                  id: t.id,
                  title: t.title,
                  icon: compatWrapper(<MenuIcon icon={t.icon} />),
                  variant: t.variant,
                  Provider: importedThemeProvider as (props: {
                    children: React.ReactNode;
                  }) => JSX.Element | null,
                },
              }
            });
          })).filter((e): e is ExtensionDefinition<any> => e !== undefined);

        const scaffolderFieldExtensions = Object.values(scopedConfig[scope])
          .flatMap(cfg => cfg.scaffolderFieldExtensions.map(e => {
            const ImportedExtension = this.#remotePlugins[e.scope]?.[e.module]?.[e.importName] as ((...args: any[]) => any);
            if (!ImportedExtension) {
              return undefined;
            }

            if (!ImportedExtension) {
              return [undefined];
            }
            const element = <ImportedExtension />;
            const fieldExtensionOptions = getComponentData<FieldExtensionOptions>(
              element,
              'scaffolder.extensions.field.v1',
            );

            if (fieldExtensionOptions === undefined) {
              return undefined;
            }

            return FormFieldBlueprint.make({
              name: e.importName,
              params: {
                field: async () => createFormField({
                  name: fieldExtensionOptions.name,
                  component: fieldExtensionOptions.component,
                  validation: fieldExtensionOptions.validation,
                  schema: fieldExtensionOptions.schema,
                }),
              },
            });
          })).filter((e): e is ExtensionDefinition<any> => e !== undefined);


        const extensions: ExtensionDefinition[] = [
          ...apiFactories,
          ...dynamicRouteItems,
          ...themes,
          ...icons.length === 0 ? [] :
            [IconBundleBlueprint.make({
              name: `${scope}-appIcons`,
              params: {
                icons: Object.fromEntries(icons.map(i => {
                  return [i.name, i.component];
                })),
              },
            })],
        ];
        const pluginsRoutes = convertLegacyRouteRefs<LegacyAnyRoutes>(Object.assign(
          {} as LegacyAnyRoutes,
          ...backstagePlugins.map(p => p.routes),
        ));
        const pluginsRouteRefs = Object.values(pluginsRoutes);
        const routes = {
          ...pluginsRoutes,
          ...Object.fromEntries(
            Object.entries(referencedRoutes)
              .filter(([_, rrr]) => !pluginsRouteRefs.includes(rrr))
          ),
        };

        const externalRoutes = convertLegacyRouteRefs<LegacyAnyExternalRoutes>(Object.assign(
          {} as LegacyAnyRoutes,
          ...backstagePlugins.map(p => p.externalRoutes),
        ));

        const plugin =
          createFrontendPlugin({
            id: scope,
            extensions,
            featureFlags: backstagePlugins.flatMap(p => [...p.getFeatureFlags()]),
            routes,
            externalRoutes,
          });

        features.push(plugin);
      }

      features.push(appPlugin.withOverrides({
        extensions: [
          customNavBar,
          ...overriddenThemes.map(t =>
            appPlugin.getExtension(`theme:app/${t}`).override({ disabled: true }),
          ),
        ],
      }));

      return { features: features };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        `Failed to fetch scalprum configuration`,
        err
      );
      return { features: [] };
    }
  }

  bindRoutes(context: { bind: CreateAppRouteBinder }): void {    
    if (!this.#dynamicPluginsConfig) {
      return;
    }
    const { bind } = context;
    const { routeBindingTargets, routeBindings } = this.#dynamicPluginsConfig;
    const resolvedRouteBindingTargets = Object.fromEntries(
      routeBindingTargets?.reduce<[string, BackstagePlugin<{}>][]>(
        (acc, { name, importName, scope, module }) => {
          const plugin = this.#remotePlugins[scope]?.[module]?.[importName];
          if (plugin) {
            acc.push([name, plugin as BackstagePlugin<{}>]);
          } else {
            // eslint-disable-next-line no-console
            console.warn(
              `Plugin ${scope} is not configured properly: ${module}.${importName} not found, ignoring routeBindings target: ${name}`,
            );
          }
          return acc;
        },
        [],
      ) ?? []);

    const bindAsOldBind: AppRouteBinder = (externalRoutes, targetRoutes) => {
      type TargetRoute = false | LegacyRouteRef<AnyRouteRefParams> | undefined;
      bind(
        convertLegacyRouteRefs(externalRoutes), 
        Object.fromEntries(
          Object.entries<TargetRoute>(targetRoutes).map(
            ([key, value]) => [
              key,
              value ? convertLegacyRouteRef(value) : value,
            ]
          )
        ) as any,
      )
    };

    bindAppRoutes(bindAsOldBind, resolvedRouteBindingTargets, routeBindings);
  }
}

function getScopedConfig(dynamicConfig: DynamicConfig) {
  const {
    pluginModules,
    apiFactories,
    appIcons,
    dynamicRoutes,
    mountPoints,
    routeBindingTargets,
    scaffolderFieldExtensions,
    themes: pluginThemes,
  } = dynamicConfig;
  type Scoped = DynamicModuleEntry & {
    config: Partial<DynamicConfig>
  };
  return [
    ...pluginModules.map<Scoped>(pm => ({
      scope: pm.scope,
      module: pm.module,
      config: {
        pluginModules: [pm],
      }
    })),
    ...routeBindingTargets.map<Scoped>(rbt => ({
      scope: rbt.scope,
      module: rbt.module,
      config: {
        routeBindingTargets: [rbt],
      },
    })),
    ...mountPoints.map<Scoped>(mp => ({
      scope: mp.scope,
      module: mp.module,
      config: {
        mountPoints: [mp],
      },
    })),
    ...dynamicRoutes.map<Scoped>(dr => ({
      scope: dr.scope,
      module: dr.module,
      config: {
        dynamicRoutes: [dr],
      },
    })),
    ...appIcons.map<Scoped>(ai => ({
      scope: ai.scope,
      module: ai.module,
      config: {
        appIcons: [ai],
      },
    })),
    ...apiFactories.map<Scoped>(af => ({
      scope: af.scope,
      module: af.module,
      config: {
        apiFactories: [af],
      },
    })),
    ...scaffolderFieldExtensions.map<Scoped>(sfe => ({
      scope: sfe.scope,
      module: sfe.module,
      config: {
        scaffolderFieldExtensions: [sfe],
      },
    })),
    ...pluginThemes.map<Scoped>(pt => ({
      scope: pt.scope,
      module: pt.module,
      config: {
        themes: [pt],
      },
    })),
  ].reduce<{
    [scope: string]: {
      [module: string]: DynamicConfig
    }
  }>((acc, curr) => {
    if (!acc[curr.scope]) {
      acc[curr.scope] = {};
    }

    if (!acc[curr.scope][curr.module]) {
      acc[curr.scope][curr.module] = {
        pluginModules: [],
        routeBindingTargets: [],
        mountPoints: [],
        dynamicRoutes: [],
        appIcons: [],
        apiFactories: [],
        scaffolderFieldExtensions: [],
        themes: [],
        menuItems: [],
        entityTabs: [],
        routeBindings: [],
      };
    }

    acc[curr.scope][curr.module].pluginModules.push(...(curr.config.pluginModules ?? []));
    acc[curr.scope][curr.module].routeBindingTargets.push(...(curr.config.routeBindingTargets ?? []));
    acc[curr.scope][curr.module].mountPoints.push(...(curr.config.mountPoints ?? []));
    acc[curr.scope][curr.module].dynamicRoutes.push(...(curr.config.dynamicRoutes ?? []));
    acc[curr.scope][curr.module].appIcons.push(...(curr.config.appIcons ?? []));
    acc[curr.scope][curr.module].apiFactories.push(...(curr.config.apiFactories ?? []));
    acc[curr.scope][curr.module].scaffolderFieldExtensions.push(...(curr.config.scaffolderFieldExtensions ?? []));
    acc[curr.scope][curr.module].themes.push(...(curr.config.themes ?? []));

    return acc;
  }, {});
}
