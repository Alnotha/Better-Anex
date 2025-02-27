import "../styles/styles.css"; // ✅ Move global styles here
import { useEffect } from "react";

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    console.log("App Mounted");
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
