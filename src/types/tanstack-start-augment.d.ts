// Force-load TanStack Start's module augmentation that adds the `server`
// property to file route options. The package's barrel uses `export type *`
// which strips side-effect augmentations, so we reference the source file
// directly via TypeScript's nodenext-style subpath resolution.
import "@tanstack/start-client-core";

// Re-declare the augmentation locally as a fallback. This mirrors
// node_modules/@tanstack/start-client-core/dist/esm/serverRoute.d.ts.
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
              (ctx: { request: Request; params: any; context: any; pathname: string; next: any }) => Response | Promise<Response> | undefined | Promise<undefined>
            >
          >
        | ((opts: { createHandlers: (...args: any[]) => any }) => any);
    };
  }
}

export {};
