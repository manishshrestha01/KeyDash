import { useEffect } from "react";

const Meta = ({ title, description, url, keywords }) => {
  const defaultTitle = "KeyDash | Fast & Clean Online Typing Test";
  const defaultDescription =
  "KeyDash: Fast, clean online typing test with multiple modes, real-time WPM, accuracy tracking, and a competitive leaderboard.";
  const defaultUrl = "https://keydash.shresthamanish.info.np/";
  const resolvedTitle = title || defaultTitle;
  const resolvedDescription = description || defaultDescription;
  const resolvedUrl = url || defaultUrl;
  
  useEffect(() => {
    document.title = resolvedTitle;
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "KeyDash",
      "url": resolvedUrl,
      "potentialAction": {
        "@type": "SearchAction",
        "target": `https://keydash.shresthamanish.info.np/search?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    };

    const upsertMeta = (name, content) => {
      if (!name) return;
      let element = document.head.querySelector(`meta[name="${name}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute("name", name);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    upsertMeta("description", resolvedDescription);
    upsertMeta("viewport", "width=device-width, initial-scale=1");
    upsertMeta("keywords", keywords || "");
    upsertMeta("robots", "index, follow");

    let canonicalLink = document.head.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", resolvedUrl);

    let jsonLdScript = document.head.querySelector('script[data-keydash-meta="website-jsonld"]');
    if (!jsonLdScript) {
      jsonLdScript = document.createElement("script");
      jsonLdScript.setAttribute("type", "application/ld+json");
      jsonLdScript.setAttribute("data-keydash-meta", "website-jsonld");
      document.head.appendChild(jsonLdScript);
    }
    jsonLdScript.textContent = JSON.stringify(structuredData);
  }, [keywords, resolvedDescription, resolvedTitle, resolvedUrl]);

  return null;
};

export default Meta;
