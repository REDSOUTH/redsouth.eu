import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

export function Projects() {
  const { t } = useTranslation();
  // Array vacío por ahora
  const projects: any[] = [];

  return (
    <div className="container mx-auto max-w-5xl py-12 px-4 md:py-20 min-h-[calc(100vh-4rem)]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-start gap-4 md:flex-row md:justify-between md:gap-8 mb-10"
      >
        <div className="flex-1 space-y-4">
          <h1 className="inline-block font-heading text-4xl tracking-tight lg:text-5xl font-bold font-krona">
            {t("projects_page.title", "Projects")}
          </h1>
          <p className="text-xl text-muted-foreground">
            {t("projects_page.desc", "Our servers, mods, and studio creations for third parties.")}
          </p>
        </div>
      </motion.div>

      {projects.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center py-20 text-muted-foreground"
        >
          {t("projects_page.empty", "No projects to display yet. Stay tuned!")}
        </motion.div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((post, index) => (
            <motion.div 
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
