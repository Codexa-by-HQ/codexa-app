import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BrandLogo } from "@/core/components/BrandLogo";
import { useBranding } from "@/core/contexts/Session";
import { cn, logoUrl } from "@/core/lib/utils";

/**
 * The application's own logo, with its dark mode variant, or the Codexa leaf
 * when it has none. Both variants render and CSS shows the one for the
 * current theme, so a theme switch never waits for a request. A logo that
 * fails to load falls back to the leaf.
 */
export function AppLogo({ className }: { className?: string }) {
  const branding = useBranding()?.branding;
  const light = logoUrl(branding?.logo);
  const dark = logoUrl(branding?.darkLogo) ?? light;
  if (!light && !dark) return <BrandLogo className={className} />;

  return (
    <>
      <Logo src={light ?? dark!} className={cn("dark:hidden", className)} />
      <Logo src={dark!} className={cn("hidden dark:flex", className)} />
    </>
  );
}

function Logo({ src, className }: { src: string; className?: string }) {
  return (
    <Avatar className={cn("rounded-none after:hidden", className)}>
      <AvatarImage src={src} alt="" className="rounded-none object-contain" />
      <AvatarFallback className="rounded-none bg-transparent">
        <BrandLogo className="size-full" />
      </AvatarFallback>
    </Avatar>
  );
}
