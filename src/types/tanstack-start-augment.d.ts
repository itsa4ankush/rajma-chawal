// Ambient module augmentation that adds the `server` property to TanStack
// Router's file route options. The official augmentation lives in
// @tanstack/start-client-core/dist/esm/serverRoute.d.ts but is not loaded
// because the package's barrel uses `export type *` (which strips
// side-effect augmentations).
//
// This file MUST stay ambient — no top-level import/export — so the
// augmentation is global.

declare module "@tanstack/router-core" {
  interface FilebaseRouteOptionsInterface<
    TRegister,
    TParentRoute extends import("@tanstack/router-core").AnyRoute = import("@tanstack/router-core").AnyRoute,
    TId extends string = string,
    TPath extends string = string,
    TSearchValidator = undefined,
    TParams = {},
    TLoaderDeps extends Record<string, any> = {},
    TLoaderFn = undefined,
    TRouterContext = {},
    TRouteContextFn = import("@tanstack/router-core").AnyContext,
    TBeforeLoadFn = import("@tanstack/router-core").AnyContext,
    TRemountDepsFn = import("@tanstack/router-core").AnyContext,
    TSSR = unknown,
    TServerMiddlewares = unknown,
    THandlers = undefined,
  > {
    server?: {
      middleware?: ReadonlyArray<any>;
      handlers?:
        | Partial<
            Record<
              "ANY" | "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD",
              (ctx: {
                request: Request;
                params: any;
                context: any;
                pathname: string;
                next: (...args: any[]) => any;
              }) => Response | Promise<Response> | undefined | Promise<undefined>
            >
          >
        | ((opts: { createHandlers: (...args: any[]) => any }) => any);
    };
  }
}
