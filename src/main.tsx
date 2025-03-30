
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { handlePodioImageRequest } from './api/podioImageProxy';

// Handle API routes if the URL matches our pattern
const url = new URL(window.location.href);
if (url.pathname.startsWith('/api/podio-image/')) {
  handlePodioImageRequest(new Request(url.href))
    .then(response => {
      // Handle redirect
      if (response.status === 302) {
        const location = response.headers.get('Location');
        if (location) {
          window.location.href = location;
        }
      } else {
        // Handle error
        console.error('Podio image proxy error:', response.status);
      }
    })
    .catch(error => {
      console.error('Podio image proxy error:', error);
    });
} else {
  // Normal app rendering
  createRoot(document.getElementById("root")!).render(<App />);
}
