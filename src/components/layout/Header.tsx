import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/useAuthStore";
import { UserDropdown } from "./UserDropdown";
import { AlertsDropdown } from "./AlertsDropdown";
import { User } from "lucide-react";

export function Header() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, isLoading } = useAuthStore();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center relative">
        <Link to="/" className="flex items-center gap-2 flex-none cursor-pointer select-none outline-none">
          <img src="/banner.svg" alt="RedSouth Logo" className="h-9" />
        </Link>
        
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink asChild active={location.pathname === "/"} className={navigationMenuTriggerStyle()}>
                  <Link to="/">{t('header.home')}</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger>{t('header.services')}</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                    <li className="row-span-2">
                      <NavigationMenuLink asChild>
                        <Link
                          to="/account"
                          className="flex h-full w-full select-none flex-col justify-end rounded-md p-6 no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <img src="/logo-colored.svg" alt="Logo" className="h-8 w-8 mb-1" />
                          <div className="mb-2 mt-1 text-lg font-medium">
                            {t('account.title')}
                          </div>
                          <p className="text-sm leading-tight text-muted-foreground line-clamp-3">
                            {t('account.description')}
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <a href="https://modpkg.redsouth.eu" target="_blank" rel="noopener noreferrer" className="flex select-none gap-3 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                          <img src="/modpkg/logo.svg" alt="MODPKG Logo" className="h-8 w-8 mt-0.5" />
                          <div className="space-y-1">
                            <div className="text-sm font-medium leading-none">MODPKG</div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1">
                              {t('header.modpkg')}
                            </p>
                          </div>
                        </a>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <a href="https://onelauncher.redsouth.eu" target="_blank" rel="noopener noreferrer" className="flex select-none gap-3 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                          <img src="/one-launcher/logo.svg" alt="ONE Launcher Logo" className="h-8 w-8 mt-0.5" />
                          <div className="space-y-1">
                            <div className="text-sm font-medium leading-none">ONE Launcher</div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1">
                              {t('header.onelauncher')}
                            </p>
                          </div>
                        </a>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild active={location.pathname.startsWith("/projects")} className={navigationMenuTriggerStyle()}>
                  <Link to="/projects">{t('projects_page.title', 'Projects')}</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild active={location.pathname.startsWith("/blog")} className={navigationMenuTriggerStyle()}>
                  <Link to="/blog">{t('header.blog', 'Blog')}</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild active={location.pathname === "/contact"} className={navigationMenuTriggerStyle()}>
                  <Link to="/contact">{t('header.contact', 'Contact')}</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild active={location.pathname.startsWith("/account")} className={navigationMenuTriggerStyle()}>
                  <Link to="/account">{t('header.account', 'Mi cuenta')}</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <AlertsDropdown />
          {isLoading ? (
            <div className="h-10 w-20 bg-muted animate-pulse rounded-md"></div>
          ) : user ? (
            <UserDropdown />
          ) : (
            <>
              <Button variant="default" className="relative group border-0 overflow-hidden bg-white hover:bg-white" asChild>
                <Link to="/auth/signin" className="flex items-center justify-center w-full px-2">
                  {/* Gradient Background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FF0000] to-[#FF9D00] transition-opacity duration-500 group-hover:opacity-0" />
                  
                  <div className="relative flex items-center justify-center w-full gap-2">
                    {/* White Text (Base) */}
                    <span className="font-bold text-white transition-opacity duration-500 group-hover:opacity-0 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t('header.login')}
                    </span>
                    
                    {/* Gradient Text (Hover) */}
                    <span className="absolute inset-0 flex items-center justify-center font-bold bg-gradient-to-r from-[#FF0000] to-[#FF9D00] bg-clip-text text-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 gap-2">
                      <User className="h-4 w-4 text-[#FF5500]" />
                      {t('header.login')}
                    </span>
                  </div>
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
