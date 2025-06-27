//pages/_document.js
// This file is used to customize the HTML document structure in a Next.js
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head />
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('datacorp-theme');
                  var validTheme = theme === 'dark' ? 'dark' : 'light';
                  document.documentElement.classList.add(validTheme);
                } catch (e) {
                  document.documentElement.classList.add('light');
                }
              })();
            `,
          }}
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
