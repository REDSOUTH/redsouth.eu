import { Header } from "@/components/layout/Header";
import { GlobalBanners } from "@/components/layout/GlobalBanners";
import { Outlet, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Moon, Sun, Laptop, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import "flag-icons/css/flag-icons.min.css";

export function Layout() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-red-500/30 selection:text-red-200">
      <Header />
      <GlobalBanners />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="pt-8 pb-8 border-t border-border/40 bg-background/50">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-8">
            <div className="col-span-2 md:col-span-4 lg:col-span-2">
              <Link to="/" className="inline-block mb-2 hover:opacity-80 transition-opacity">
                <img src="/banner.svg" alt="REDSOUTH Studio" className="h-12 w-auto" />
              </Link>
              <p className="text-sm text-muted-foreground max-w-sm">
                {t('footer.description')}
              </p>
            </div>
            
            <div className="col-span-1">
              <h3 className="font-semibold mb-2 text-sm">{t('footer.projects')}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="https://modpkg.redsouth.eu" className="hover:text-foreground transition-colors">MODPKG</a></li>
                <li><a href="https://onelauncher.redsouth.eu" className="hover:text-foreground transition-colors">ONE Launcher</a></li>
                <li><Link to="/account" className="hover:text-foreground transition-colors">REDSOUTH Account</Link></li>
              </ul>
            </div>

            <div className="col-span-1">
              <h3 className="font-semibold mb-2 text-sm">{t('footer.community_title')}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="https://github.com/REDSOUTH" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">{t('footer.source_code')}</a></li>
                <li><a href="https://github.com/REDSOUTH/redsouth.redsouth.eu/issues" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">{t('footer.report_issue')}</a></li>
                <li><a href="https://buymeacoffee.com/redsouth" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">{t('footer.support')}</a></li>
              </ul>
            </div>
            
            <div className="col-span-1">
              <h3 className="font-semibold mb-2 text-sm">{t('footer.legal_title')}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/legal/terms" className="hover:text-foreground transition-colors">{t('footer.legal.terms')}</Link></li>
                <li><Link to="/legal/privacy" className="hover:text-foreground transition-colors">{t('footer.legal.privacy')}</Link></li>
                <li><Link to="/legal/cookies" className="hover:text-foreground transition-colors">{t('footer.legal.cookies')}</Link></li>
                <li><Link to="/legal/trademarks" className="hover:text-foreground transition-colors">{t('footer.legal.trademarks')}</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground text-center md:text-left">
              © {new Date().getFullYear()} REDSOUTH Studio. {t('footer.rights')}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Scroll to Top */}
              <Button variant="ghost" size="icon" onClick={scrollToTop} className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground">
                <ArrowUp className="h-4 w-4" />
                <span className="sr-only">Scroll to top</span>
              </Button>

              {/* Theme Switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground">
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => setTheme("light")}
                    className={`cursor-pointer ${theme === 'light' ? 'bg-accent/50' : ''}`}
                  >
                    <Sun className="h-4 w-4" /> Light
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setTheme("dark")}
                    className={`cursor-pointer ${theme === 'dark' ? 'bg-accent/50' : ''}`}
                  >
                    <Moon className="h-4 w-4" /> Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setTheme("system")}
                    className={`cursor-pointer ${theme === 'system' ? 'bg-accent/50' : ''}`}
                  >
                    <Laptop className="h-4 w-4" /> System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Language Switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-2 px-3 cursor-pointer text-muted-foreground hover:text-foreground">
                    <Globe className="h-4 w-4" />
                    <span>{i18n.language.startsWith('es') ? 'Español' : 'English'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[120px]">
                  <DropdownMenuItem 
                    onClick={() => changeLanguage('en')}
                    className={`cursor-pointer ${i18n.language.startsWith('en') ? 'bg-accent/50' : ''}`}
                  >
                    <span className="fi fi-us text-base rounded-[2px] overflow-hidden"></span> English
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => changeLanguage('es')}
                    className={`cursor-pointer ${i18n.language.startsWith('es') ? 'bg-accent/50' : ''}`}
                  >
                    <span className="fi fi-es text-base rounded-[2px] overflow-hidden"></span> Español
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
