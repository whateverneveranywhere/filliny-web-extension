import { createRoot } from 'react-dom/client';
import App from '@src/App';
import '@extension/ui/dist/global.css';
import tailwindcssOutput from '../dist/tailwind-output.css?inline';

const root = document.createElement('div');
root.id = 'chrome-extension-filliny';
root.style.height = '0';
root.style.width = '0';

document.documentElement.appendChild(root);

const rootIntoShadow = document.createElement('div');
rootIntoShadow.id = 'filliny-shadow-root';

const shadowRoot = root.attachShadow({ mode: 'open' });

// const combinedStyles = `
//   ${tailwindcssOutput}
//   :host {
//     --background: 0 0% 100%;
//     --foreground: 222.2 47.4% 11.2%;
//     --muted: 210 40% 96.1%;
//     --muted-foreground: 215.4 16.3% 46.9%;
//     --popover: 0 0% 100%;
//     --popover-foreground: 222.2 47.4% 11.2%;
//     --border: 214.3 31.8% 91.4%;
//     --input: 214.3 31.8% 91.4%;
//     --card: 0 0% 100%;
//     --card-foreground: 222.2 47.4% 11.2%;
//     --primary: 222.2 47.4% 11.2%;
//     --primary-foreground: 210 40% 98%;
//     --secondary: 210 40% 96.1%;
//     --secondary-foreground: 222.2 47.4% 11.2%;
//     --accent: 210 40% 96.1%;
//     --accent-foreground: 222.2 47.4% 11.2%;
//     --destructive: 0 100% 50%;
//     --destructive-foreground: 210 40% 98%;
//     --ring: 215 20.2% 65.1%;
//     --radius: 0.5rem;
//   }

//   :host(.dark) {
//     --background: 224 71% 4%;
//     --foreground: 213 31% 91%;
//     --muted: 223 47% 11%;
//     --muted-foreground: 215.4 16.3% 56.9%;
//     --accent: 216 34% 17%;
//     --accent-foreground: 210 40% 98%;
//     --popover: 224 71% 4%;
//     --popover-foreground: 215 20.2% 65.1%;
//     --border: 216 34% 17%;
//     --input: 216 34% 17%;
//     --card: 224 71% 4%;
//     --card-foreground: 213 31% 91%;
//     --primary: 210 40% 98%;
//     --primary-foreground: 222.2 47.4% 1.2%;
//     --secondary: 222.2 47.4% 11.2%;
//     --secondary-foreground: 210 40% 98%;
//     --destructive: 0 63% 31%;
//     --destructive-foreground: 210 40% 98%;
//     --ring: 216 34% 17%;
//     --radius: 0.5rem;
//   }
// `;
const combinedStyles = `
  ${tailwindcssOutput}
  :host {
    --background: 0 0% 100%;
    --foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 47.4% 11.2%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 47.4% 11.2%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 100% 50%;
    --destructive-foreground: 210 40% 98%;
    --ring: 215 20.2% 65.1%;
    --radius: 0.5rem;
  }

  :host(.dark) {
    --background: 224 71% 4%;
    --foreground: 213 31% 91%;
    --muted: 223 47% 11%;
    --muted-foreground: 215.4 16.3% 56.9%;
    --accent: 216 34% 17%;
    --accent-foreground: 210 40% 98%;
    --popover: 224 71% 4%;
    --popover-foreground: 215 20.2% 65.1%;
    --border: 216 34% 17%;
    --input: 216 34% 17%;
    --card: 224 71% 4%;
    --card-foreground: 213 31% 91%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 1.2%;
    --secondary: 222.2 47.4% 11.2%;
    --secondary-foreground: 210 40% 98%;
    --destructive: 0 63% 31%;
    --destructive-foreground: 210 40% 98%;
    --ring: 216 34% 17%;
    --radius: 0.5rem;
  }
`;

if (navigator.userAgent.includes('Firefox')) {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = combinedStyles;
  shadowRoot.appendChild(styleElement);
} else {
  const globalStyleSheet = new CSSStyleSheet();
  globalStyleSheet.replaceSync(combinedStyles);
  shadowRoot.adoptedStyleSheets = [globalStyleSheet];
}

shadowRoot.appendChild(rootIntoShadow);

createRoot(rootIntoShadow).render(<App />);
