/// <reference types="vite/client" />

declare global {
  namespace JSX {
    interface IntrinsicElements {
      install: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        installurl?: string;
        manifestid?: string;
      }, HTMLElement>;
    }
  }
}

export {};

