import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getPostsForLocale } from "@/lib/blog-mock";

export const revalidate = 3600;

export default async function BlogListPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("blog.list");
  const posts = getPostsForLocale(params.locale);

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 py-20 lg:py-28">
      <div className="mb-14 max-w-2xl">
        <div className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted-foreground mb-3">
          {t("eyebrow")}
        </div>
        <h1 className="text-[32px] sm:text-[44px] lg:text-[56px] font-semibold leading-[1.05] tracking-tight text-foreground">
          {t("heading")}{" "}
          <span className="text-muted-foreground italic font-normal">
            {t("headingAccent")}
          </span>
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="group rounded-[22px] border border-border bg-card overflow-hidden flex flex-col transition-colors hover:border-amber-400/50"
          >
            <div
              className={
                "aspect-[16/9] bg-gradient-to-br " + p.gradient + " border-b border-border"
              }
              aria-hidden
            />
            <div className="p-6 flex-1 flex flex-col">
              <div className="text-[11px] font-mono text-muted-foreground mb-2">
                {p.publishedAt} · {p.readTime}
              </div>
              <h2 className="text-[18px] sm:text-[19px] font-semibold tracking-tight text-foreground leading-tight mb-2.5">
                {p.title}
              </h2>
              <p className="text-[13px] text-muted-foreground leading-snug">{p.excerpt}</p>
              <span className="mt-5 text-[12px] text-foreground/80 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">
                {t("readMore")} →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
