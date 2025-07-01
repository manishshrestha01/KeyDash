import React from "react";
import { Helmet } from "react-helmet";

const Meta = ({ title, description, url, image }) => {
  const defaultTitle = "KeyDash | Fast & Clean Online Typing Test";
  const defaultDescription =
    "KeyDash is a fast, clean, and minimalist online typing test. Practice with multiple difficulty levels, timed and sentence modes, real-time WPM, accuracy tracking, and a competitive leaderboard.";
  const defaultUrl = "https://keydash.shresthamanish.info.np/";
  const defaultImage = "https://keydash.shresthamanish.info.np/default-og-image.png"; // <-- put your default OG image url here

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "KeyDash",
    "url": url || defaultUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `https://keydash.shresthamanish.info.np/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <Helmet>
      <meta charSet="UTF-8" />
      <title>{title || defaultTitle}</title>
      <meta name="description" content={description || defaultDescription} />
      <link rel="canonical" href={url || defaultUrl} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      
      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title || defaultTitle} />
      <meta property="og:description" content={description || defaultDescription} />
      <meta property="og:url" content={url || defaultUrl} />
      <meta property="og:image" content={image || defaultImage} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title || defaultTitle} />
      <meta name="twitter:description" content={description || defaultDescription} />
      <meta name="twitter:image" content={image || defaultImage} />

      <meta name="robots" content="index, follow" />
      
      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

export default Meta;
