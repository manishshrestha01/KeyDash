import { useEffect } from "react";

const SITE_URL = "https://keydash.shresthamanish.info.np";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

const toAbsoluteUrl = (value) => {
  if (!value) return null;
  try {
    return new URL(value, SITE_URL).toString();
  } catch {
    return null;
  }
};

const toCanonicalUrl = (value) => {
  const absolute = toAbsoluteUrl(value) || SITE_URL;
  try {
    const parsed = new URL(absolute);
    const normalizedPath =
      parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/+$/, "");
    return `${parsed.origin}${normalizedPath}`;
  } catch {
    return SITE_URL;
  }
};

const Meta = ({
  title,
  description,
  url,
  keywords,
  image,
  imageAlt,
  type = "website",
  twitterCard = "summary_large_image",
  noIndex = false,
  noFollow = false,
  structuredData = null,
}) => {
  const defaultTitle = "KeyDash | Free Online Typing Test with Multiplayer, AI Battles & Achievements";
  const defaultDescription =
    "KeyDash is a free online typing test platform with multiplayer races, AI battles, 1200+ achievements, coding practice, Nepali typing, and competitive leaderboards.";
  const runtimePathUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}`
      : SITE_URL;

  const resolvedTitle = title || defaultTitle;
  const resolvedDescription = description || defaultDescription;
  const resolvedUrl = toCanonicalUrl(url || runtimePathUrl);
  const resolvedImage = toAbsoluteUrl(image || DEFAULT_OG_IMAGE) || DEFAULT_OG_IMAGE;
  const resolvedImageAlt = imageAlt || resolvedTitle;
  const robotsContent = [
    noIndex ? "noindex" : "index",
    noFollow ? "nofollow" : "follow",
    "max-image-preview:large",
    "max-snippet:-1",
    "max-video-preview:-1",
  ].join(", ");

  const defaultStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "KeyDash",
        url: SITE_URL,
      },
      {
        "@type": "WebApplication",
        name: "KeyDash",
        applicationCategory: "EducationalApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript and a modern browser",
        description: resolvedDescription,
        url: resolvedUrl,
      },
    ],
  };

  const resolvedStructuredData = structuredData || defaultStructuredData;

  useEffect(() => {
    document.title = resolvedTitle;

    const upsertMeta = (name, content) => {
      if (!name) return;
      let element = document.head.querySelector(`meta[name="${name}"]`);
      if (content === null || content === undefined || content === "") {
        if (element) element.remove();
        return;
      }
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute("name", name);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    const upsertPropertyMeta = (property, content) => {
      if (!property) return;
      let element = document.head.querySelector(`meta[property="${property}"]`);
      if (content === null || content === undefined || content === "") {
        if (element) element.remove();
        return;
      }
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute("property", property);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    upsertMeta("description", resolvedDescription);
    upsertMeta("viewport", "width=device-width, initial-scale=1");
    upsertMeta("keywords", keywords);
    upsertMeta("robots", robotsContent);
    upsertMeta("theme-color", "#101826");

    upsertMeta("twitter:card", twitterCard);
    upsertMeta("twitter:title", resolvedTitle);
    upsertMeta("twitter:description", resolvedDescription);
    upsertMeta("twitter:image", resolvedImage);
    upsertMeta("twitter:image:alt", resolvedImageAlt);

    upsertPropertyMeta("og:title", resolvedTitle);
    upsertPropertyMeta("og:description", resolvedDescription);
    upsertPropertyMeta("og:url", resolvedUrl);
    upsertPropertyMeta("og:type", type);
    upsertPropertyMeta("og:site_name", "KeyDash");
    upsertPropertyMeta("og:image", resolvedImage);
    upsertPropertyMeta("og:image:width", "1200");
    upsertPropertyMeta("og:image:height", "630");
    upsertPropertyMeta("og:image:alt", resolvedImageAlt);

    let canonicalLink = document.head.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", resolvedUrl);

    let jsonLdScript = document.head.querySelector(
      'script[data-keydash-meta="website-jsonld"]'
    );
    if (!jsonLdScript) {
      jsonLdScript = document.createElement("script");
      jsonLdScript.setAttribute("type", "application/ld+json");
      jsonLdScript.setAttribute("data-keydash-meta", "website-jsonld");
      document.head.appendChild(jsonLdScript);
    }
    jsonLdScript.textContent = JSON.stringify(resolvedStructuredData);
  }, [
    keywords,
    noFollow,
    noIndex,
    resolvedDescription,
    resolvedImage,
    resolvedImageAlt,
    resolvedStructuredData,
    resolvedTitle,
    resolvedUrl,
    robotsContent,
    twitterCard,
    type,
  ]);

  return null;
};

export default Meta;
