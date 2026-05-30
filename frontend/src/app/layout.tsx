import type { Metadata } from "next";
import "./page.module.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "AICOIN — Pay Per Token. Zero Gas.",
  description: "The universal payment layer for AI. Build, register, earn. No gatekeepers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Suppress removeChild/insertBefore errors caused by browser extensions (MetaMask, etc.)
              (function() {
                const originalRemoveChild = Node.prototype.removeChild;
                Node.prototype.removeChild = function(child) {
                  try {
                    return originalRemoveChild.call(this, child);
                  } catch(e) {
                    if (e.name === 'NotFoundError') {
                      return child;
                    }
                    throw e;
                  }
                };

                const originalInsertBefore = Node.prototype.insertBefore;
                Node.prototype.insertBefore = function(newNode, refNode) {
                  try {
                    return originalInsertBefore.call(this, newNode, refNode);
                  } catch(e) {
                    if (e.name === 'NotFoundError') {
                      return newNode;
                    }
                    throw e;
                  }
                };

                // Suppress specific console errors from extensions
                const originalConsoleError = console.error;
                console.error = function(...args) {
                  const msg = args.join(' ');
                  if (
                    msg.includes('removeChild') || 
                    msg.includes('insertBefore') ||
                    msg.includes('NotFoundError') ||
                    msg.includes('translated-ltr')
                  ) {
                    return;
                  }
                  originalConsoleError.apply(console, args);
                };
              })();
            `,
          }}
        />
      </head>
      <body>
        <Providers>
          <Navbar />
          <main>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}