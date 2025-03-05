import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <title>Better Anex - Texas A&M Grade Distribution</title>
        <meta name="description" content="View grade distributions and professor performance for Texas A&M courses. Compare professors, track GPA trends, and make informed decisions about your classes." />
        <meta name="keywords" content="Texas A&M, grades, GPA, professor ratings, course statistics, A&M grades, grade distribution" />
        <meta name="author" content="Alyan Tharani" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Better Anex - Texas A&M Grade Distribution" />
        <meta property="og:description" content="View grade distributions and professor performance for Texas A&M courses. Compare professors, track GPA trends, and make informed decisions about your classes." />
        <meta property="og:site_name" content="Better Anex" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Better Anex - Texas A&M Grade Distribution" />
        <meta name="twitter:description" content="View grade distributions and professor performance for Texas A&M courses. Compare professors, track GPA trends, and make informed decisions about your classes." />
        
        {/* Favicon */}
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* Theme Color */}
        <meta name="theme-color" content="#000000" />

        {/* Prevent FOUC (Flash of Unstyled Content) */}
        <style>{`
          body {
            background-color: #000000;
            color: #ffffff;
            margin: 0;
            padding: 0;
            opacity: 0;
            transition: opacity 0.2s ease-in;
          }
          body.loaded {
            opacity: 1;
          }
        `}</style>
      </Head>
      <body>
        <Main />
        <NextScript />
        <script dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', function() {
              document.body.classList.add('loaded');
            });
          `
        }} />
      </body>
    </Html>
  )
} 