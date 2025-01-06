import { compatWrapper } from '@backstage/core-compat-api';
import { Sidebar } from '@backstage/core-components';
import {
    AnyRouteRefParams,
    RouteRef,
    coreExtensionData,
    createExtensionBlueprint,
    createExtensionDataRef,
    createExtensionInput,
    useRouteRef,
} from '@backstage/frontend-plugin-api';
import appPlugin from '@backstage/plugin-app';
import React, { ComponentType } from 'react';

const targetDataRef = createExtensionDataRef<{
    Component: ComponentType<{}>;
    routeRef: RouteRef<AnyRouteRefParams>;
    config?: Record<string, any>;
  }>().with({ id: 'core.nav-component.target' });
  
export const NavComponentBlueprint = createExtensionBlueprint({
    kind: 'nav-component',
    attachTo: { id: 'app/nav', input: 'components' },
    output: [ targetDataRef ],
    dataRefs: {
        target: targetDataRef,
    },
    factory: (
        {
            Component,
            routeRef,
            config,
        }: {
            Component: ComponentType<{}>;
            routeRef: RouteRef<AnyRouteRefParams>;
            config?: Record<string, any>
        }
    ) => [
        targetDataRef({
            Component,
            routeRef,
            config,
        }),
    ],
});
  
const SidebarNavComponent = (
    props: {
        routeRef: RouteRef<AnyRouteRefParams>,
        Component: ComponentType<any>,
        config?: Record<string, any>,
        key: string,
    },
  ) => {
    const { Component, routeRef, config, key } = props;
    const link = useRouteRef(routeRef);
    if (!link) {
      return null;
    }
    return <Component to={link()} key={key} {...config}/>;
  };
  
  
const customNavBar = appPlugin.getExtension('app/nav').override({    
    inputs: {
        components: createExtensionInput([NavComponentBlueprint.dataRefs.target]),
    },
    factory(originalFactory, {
        inputs,
    }) {
        const originalOutput = originalFactory();
        const originalElement = originalOutput.get(coreExtensionData.reactElement);

        const nextKey = inputs.items.length;
        // eslint-disable-next-line no-console
        console.log('ComponentItems number: ', inputs.components.length);
        return [
            coreExtensionData.reactElement(
            <Sidebar>
                {originalElement.props.children}
                {
                 inputs.components.map((ci, index) => {
                    return compatWrapper(<SidebarNavComponent
                        {...ci.get(NavComponentBlueprint.dataRefs.target)}
                        key={`${nextKey + index}`}
                    />);
                })}
            </Sidebar>
            ),
        ];
    }
});

export const customAppPlugin = appPlugin.withOverrides({
  extensions: [customNavBar],
});
