import { useEffect } from "react";

const Meta = ({ title, description, url, keywords }) => {
  const defaultTitle = "KeyDash | Fast & Clean Online Typing Test";
  const defaultDescription =
  "KeyDash: Fast, clean online typing test with multiple modes, real-time WPM, accuracy tracking, and a competitive leaderboard.";
  const defaultUrl = "https://keydash.shresthamanish.info.np/";
  
  useEffect(() => {
    if (typeof document === "undefined") return;

    const resolvedTitle = title || defaultTitle;
    const resolvedDescription = description || defaultDescription;
    const resolvedUrl = url || defaultUrl;
    const resolvedKeywords = keywords || "";

    document.title = resolvedTitle;

    const upsertMetaByName = (name, content) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", name);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    const upsertLinkByRel = (rel, href) => {
      let link = document.querySelector(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", rel);
        document.head.appendChild(link);
      }
      link.setAttribute("href", href);
    };

    upsertMetaByName("description", resolvedDescription);
    upsertMetaByName("viewport", "width=device-width, initial-scale=1");
    upsertMetaByName("keywords", resolvedKeywords);
    upsertMetaByName("robots", "index, follow");
    upsertLinkByRel("canonical", resolvedUrl);

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

    const scriptId = "keydash-structured-data";
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData).replace(/</g, "\\u003c");
  }, [title, description, url, keywords]);

  return null;
};

export default Meta;
