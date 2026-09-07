import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Markdown } from "@/components/ui/markdown";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface BlogPostMeta {
  slug: string;
  date: string;
  image?: string;
  title: Record<string, string>;
  excerpt: Record<string, string>;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [content, setContent] = useState<string>("");
  const [meta, setMeta] = useState<BlogPostMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // 1. Fetch metadata to get the image and title
    fetch("/blog/posts.json")
      .then((res) => res.json())
      .then((data: BlogPostMeta[]) => {
        const postMeta = data.find((p) => p.slug === slug);
        if (postMeta) {
          setMeta(postMeta);
        }
      })
      .catch((err) => console.error("Failed to load blog meta:", err));

    // 2. Fetch the markdown content
    const lang = (i18n.language || "en").split("-")[0];
    fetch(`/blog/${lang}/${slug}.md`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Not found");
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) throw new Error("Not found");
        const text = await res.text();
        if (text.trim().toLowerCase().startsWith("<!doctype html>")) throw new Error("Not found");
        return text;
      })
      .then((text) => {
        setContent(text);
        setError(false);
        setLoading(false);
      })
      .catch(() => {
        // Fallback to English if the translation doesn't exist
        if (lang !== "en") {
          fetch(`/blog/en/${slug}.md`)
            .then(async (res) => {
              if (!res.ok) throw new Error("Not found");
              const contentType = res.headers.get("content-type");
              if (contentType && contentType.includes("text/html")) throw new Error("Not found");
              const text = await res.text();
              if (text.trim().toLowerCase().startsWith("<!doctype html>")) throw new Error("Not found");
              return text;
            })
            .then((text) => {
              setContent(text);
              setError(false);
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
        } else {
          setError(true);
          setLoading(false);
        }
      });
  }, [slug, i18n.language]);

  if (loading) {
    return (
      <div className="container max-w-4xl py-12 px-4">
        <Skeleton className="h-10 w-32 mb-8" />
        <Skeleton className="h-[400px] w-full rounded-xl mb-12" />
        <Skeleton className="h-12 w-3/4 mb-6" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6 mb-8" />
        <Skeleton className="h-6 w-1/2 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-4xl py-24 px-4 text-center">
        <h1 className="text-4xl font-bold font-krona mb-4">{t("blog.not_found", "Post not found")}</h1>
        <p className="text-muted-foreground mb-8">
          {t("blog.not_found_desc", "The requested blog post could not be loaded or does not exist.")}
        </p>
        <Button onClick={() => navigate("/blog")} variant="outline">
          {t("blog.back", "Back to all blogs")}
        </Button>
      </div>
    );
  }

  const currentLang = (i18n.language || "en").split("-")[0];

  return (
    <article className="container max-w-4xl py-12 px-4">
      <div className="flex items-center justify-between mb-8">
        <Link 
          to="/blog" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          {t("blog.back", "Back to all blogs")}
        </Link>

        {meta && (
          <time dateTime={meta.date} className="text-sm text-muted-foreground">
            {new Date(meta.date).toLocaleDateString(currentLang, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
        )}
      </div>

      {meta && (
        <h1 className="font-heading text-3xl md:text-5xl font-bold font-krona mb-8">
          {meta.title[currentLang] || meta.title["en"]}
        </h1>
      )}

      {meta && (
        meta.image ? (
          <div className="mb-12 overflow-hidden rounded-xl bg-muted aspect-[21/9] md:aspect-[16/9] shadow-lg">
            <img
              src={meta.image}
              alt={meta.title[currentLang] || meta.title["en"]}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="mb-12 flex items-center justify-center rounded-xl bg-muted/50 border aspect-[21/6] shadow-sm">
            <img src="/logo-colored.svg" alt="REDSOUTH" className="w-24 h-24 grayscale" />
          </div>
        )
      )}

      <Markdown content={content} />
    </article>
  );
}
