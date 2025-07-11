// pages/_app.js - Simplified App (No Firebase Required)
import '../styles/globals.css'
import { ThemeProvider } from 'next-themes'

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Component {...pageProps} />
      {/* Simple toast notification div - you can add react-hot-toast later */}
      <div id="toast-root"></div>
    </ThemeProvider>
  )
}
