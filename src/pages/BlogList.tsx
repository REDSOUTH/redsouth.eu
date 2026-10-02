import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion } from "framer-motion";

interface BlogPostMeta {
  slug: string;
  date: string;
  image?: string;
  title: Record<string, string>;
  excerpt: Record<string, string>;
}

export default function BlogList() {
  const { t, i18n } = useTranslation();
  const [posts, setPosts] = useState<BlogPostMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/blog/posts.json")
      .then((res) => res.json())
      .then((data: BlogPostMeta[]) => {
        // Sort posts by date (newest first)
        const sorted = data.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setPosts(sorted);
      })
      .catch((err) => console.error("Failed to load blog posts:", err))
      .finally(() => setLoading(false));
  }, []);

  const currentLang = (i18n.language || "en").split("-")[0];

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
            {t("blog.title", "Blog")}
          </h1>
          <p className="text-xl text-muted-foreground">
            {t("blog.desc", "News, updates, and thoughts from the team.")}
          </p>
        </div>
      </motion.div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-muted rounded-t-lg"></div>
              <CardHeader>
                <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                <div className="h-6 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full mb-2"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, index) => (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="h-full"
            >
              <Link to={`/blog/${post.slug}`} className="group outline-none block h-full">
                <Card className="flex flex-col overflow-hidden h-full transition-colors group-hover:border-primary">
                  {post.image ? (
                    <div className="aspect-video w-full overflow-hidden bg-muted">
                      <img
                        src={post.image}
                        alt={post.title[currentLang] || post.title["en"]}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video w-full flex items-center justify-center bg-muted/50 border-b">
                      <img src="/logo-colored.svg" alt="REDSOUTH" className="w-16 h-16 grayscale transition-transform duration-500 group-hover:scale-[1.03]" />
                    </div>
                  )}
                  <CardHeader>
                    <CardDescription>
                      {new Date(post.date).toLocaleDateString(currentLang, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </CardDescription>
                    <CardTitle className="line-clamp-2">
                      {post.title[currentLang] || post.title["en"]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 pb-6">
                    <p className="line-clamp-3 text-muted-foreground text-sm">
                      {post.excerpt[currentLang] || post.excerpt["en"]}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
