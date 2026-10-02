import { Mail, Copy, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export function Contact() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText("contact@redsouth.eu");
    setCopied(true);
    toast.success(t("auth.copied_success", "Copied to clipboard"));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container mx-auto max-w-6xl py-12 px-4 md:py-20 min-h-[calc(100vh-4rem)] flex items-center">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
        {/* Left: Image Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="w-full h-[400px] md:h-[600px] rounded-3xl overflow-hidden shadow-2xl relative"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent z-20 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/50 to-orange-500/50 mix-blend-multiply z-10 pointer-events-none" />
          <img 
            src="/contact-wallpaper.png" 
            alt="Contact" 
            className="w-full h-full object-cover object-[center_25%] grayscale contrast-125" 
          />
        </motion.div>

        {/* Right: Text and Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col items-start space-y-8"
        >
          <div className="space-y-4">
            <h1 className="inline-block font-heading text-4xl tracking-tight lg:text-5xl font-bold font-krona">
              {t("contact.title")}
            </h1>
            <p className="text-xl text-muted-foreground">
              {t("contact.subtitle")}
            </p>
          </div>
          
          <p className="text-base text-muted-foreground leading-relaxed max-w-lg">
            {t("contact.description")}
          </p>

          <div className="flex items-center pt-4">
            <div className="flex items-stretch rounded-md overflow-hidden shadow-lg shadow-primary/20">
              <Button size="lg" asChild className="relative group border-0 bg-white hover:bg-white rounded-none rounded-l-md px-6 h-12">
                <a href="mailto:contact@redsouth.eu">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FF0000] to-[#FF5500] transition-opacity duration-500 group-hover:opacity-0" />
                  <div className="relative flex items-center gap-2">
                    <Mail className="w-5 h-5 text-white group-hover:text-[#FF0000] transition-colors duration-500" />
                    <span className="font-bold text-white group-hover:text-[#FF0000] transition-colors duration-500">
                      {t('contact.button')}
                    </span>
                  </div>
                </a>
              </Button>

              <Button size="lg" onClick={copyEmail} className="relative group border-0 bg-white hover:bg-white rounded-none rounded-r-md px-4 h-12" title={t('contact.copy_email')}>
                <div className="absolute inset-0 bg-gradient-to-r from-[#FF5500] to-[#FF9D00] transition-opacity duration-500 group-hover:opacity-0" />
                <div className="relative flex items-center justify-center">
                  {copied ? (
                    <Check className="w-5 h-5 text-white group-hover:text-[#FF9D00] transition-colors duration-500" />
                  ) : (
                    <Copy className="w-5 h-5 text-white group-hover:text-[#FF9D00] transition-colors duration-500" />
                  )}
                </div>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
