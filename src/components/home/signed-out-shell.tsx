import { BackgroundLayer } from "./sections/background-layer";
import { SiteHeader } from "./sections/site-header";
import { Hero } from "./sections/hero";
import { Narrative } from "./sections/narrative";
import { Stack } from "./sections/stack";
import { Modes } from "./sections/modes";
import { SelfHost } from "./sections/self-host";
import { Faq } from "./sections/faq";
import { SiteFooter } from "./sections/site-footer";

/**
 * Top-level layout for the signed-out home experience. The shell owns
 * the scroll container, page chrome (header/footer), and the gradient
 * backdrop; every content slot below is a self-contained section that
 * lives under `./sections/`.
 *
 * Static-only — no auth, no data fetching, no Convex queries. The
 * router's `LandingRoute` decides when to mount this shell vs. redirect
 * an authenticated user to `/chat`, so anything specific to a logged-in
 * user belongs upstream.
 */
export function SignedOutShell() {
  return (
    <div className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto scroll-pt-20">
      <BackgroundLayer />

      <SiteHeader />

      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-20 px-4 pb-20 pt-10 sm:gap-28 sm:px-6 sm:pb-24 sm:pt-12 md:gap-32 md:pt-16">
        <Hero />
        <Stack />
        <Narrative />
        <Modes />
        <SelfHost />
        <Faq />
      </main>

      <SiteFooter />
    </div>
  );
}
