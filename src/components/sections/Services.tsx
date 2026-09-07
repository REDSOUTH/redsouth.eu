import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export function Services() {
  const { t } = useTranslation();

  const services = [
    {
      id: "modpkg",
      title: "MODPKG",
      description: t('header.modpkg'),
      banner: "/modpkg/banner.svg",
      color: "from-orange-500 to-red-500",
      url: "https://modpkg.zmito.eu",
      invertInLight: false
    },
    {
      id: "onelauncher",
      title: "ONE Launcher",
      description: t('header.onelauncher'),
      banner: "/one-launcher/banner.svg",
      color: "from-red-600 to-orange-600",
      url: "https://onelauncher.zmito.eu",
      invertInLight: true
    }
  ];

  return (
    <section className="py-24 bg-background/50 relative" id="services">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">{t('services.title')}</h2>
          <p className="text-muted-foreground md:text-lg max-w-[600px] mx-auto">
            {t('services.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="h-full"
            >
              <a href={service.url} target="_blank" rel="noopener noreferrer" className="block outline-none h-full">
                <Card className="group relative overflow-hidden border-foreground/5 bg-foreground/5 backdrop-blur-sm transition-colors hover:border-red-500/50 cursor-pointer h-full flex flex-col shadow-none">
                  <CardHeader>
                    <div className="mb-4 overflow-hidden rounded-xl bg-foreground/5 border border-foreground/10 flex items-center justify-center p-4">
                      <img 
                        src={service.banner} 
                        alt={`${service.title} Banner`} 
                        className={`max-h-16 w-auto ${service.invertInLight ? 'dark:brightness-100 brightness-0' : ''}`} 
                      />
                    </div>
                    <CardTitle className="sr-only">{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1">
                    <CardDescription className="text-base flex-1">
                      {service.description}
                    </CardDescription>
                    <div className="mt-6 flex items-center text-sm font-medium text-red-400 group-hover:text-red-300 transition-colors">
                      <span>{t('services.explore')} {service.title}</span>
                      <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:-rotate-45" />
                    </div>
                  </CardContent>
                </Card>
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
