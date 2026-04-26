import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="max-w-md text-center">
        <span className="font-mono uppercase tracking-[0.12em] text-[11px] font-bold text-caption">
          Error · 404
        </span>
        <h1 className="mt-3 font-display text-7xl font-black leading-none text-ink">404</h1>
        <h2 className="mt-4 font-display text-2xl font-black text-ink">Page Not Found</h2>
        <p className="mt-2 font-serif text-sm text-page-ink">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center border-2 border-ink bg-paper px-6 py-3 font-sans text-[13px] font-bold uppercase tracking-[0.04em] text-ink transition-colors duration-150 hover:bg-ink hover:text-paper"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Serve a nation hackathon" },
      { name: "description", content: "Hack-nation hackathon project" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Serve a nation hackathon" },
      { property: "og:description", content: "Hack-nation hackathon project" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Serve a nation hackathon" },
      { name: "twitter:description", content: "Hack-nation hackathon project" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fbbdc8ac-137e-465a-88ca-a0ae6a7af7e0/id-preview-1b2fdcd0--c0cae58e-636f-4a15-a873-3d14a695e5ce.lovable.app-1777185616240.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fbbdc8ac-137e-465a-88ca-a0ae6a7af7e0/id-preview-1b2fdcd0--c0cae58e-636f-4a15-a873-3d14a695e5ce.lovable.app-1777185616240.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
