import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { MOCK_POSTS, getPostBySlug } from "@/lib/blog-mock";

export const revalidate = 3600;

export function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of Object.keys(MOCK_POSTS) as Array<keyof typeof MOCK_POSTS>) {
    for (const post of MOCK_POSTS[locale]) {
      params.push({ locale, slug: post.slug });
    }
  }
  return params;
}

export default async function BlogPostPage({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  setRequestLocale(params.locale);
  const post = getPostBySlug(params.locale, params.slug);
  if (!post) notFound();
  const t = await getTranslations("blog.list");

  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 py-20 lg:py-28">
      <Link
        href="/blog"
        className="inline-flex items-center text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        ← {t("backToList")}
      </Link>

      <div
        className={"aspect-[16/7] rounded-[22px] bg-gradient-to-br " + post.gradient + " border border-border mb-10"}
        aria-hidden
      />

      <div className="text-[11px] font-mono text-muted-foreground mb-3">
        {post.publishedAt} · {post.readTime}
      </div>
      <h1 className="text-[32px] sm:text-[44px] lg:text-[52px] font-semibold leading-[1.1] tracking-tight text-foreground">
        {post.title}
      </h1>
      <p className="mt-4 text-[17px] text-muted-foreground leading-relaxed">{post.excerpt}</p>

      <div
        className="prose-body mt-10 space-y-5 text-[16px] leading-[1.7] text-foreground/90 [&_em]:italic [&_p]:m-0"
        dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
      />
    </article>
  );
}
