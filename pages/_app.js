import Head from 'next/head';
import '../styles/globals.css'; // Global styles

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Better Anex</title>
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
