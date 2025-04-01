import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { handlePodioImageRequest } from './api/podioImageProxy';
import { handlePodioTokenRequest } from './api/podioTokenProxy';

// Handle API routes if the URL matches our pattern
const url = new URL(window.location.href);

// Handle CORS preflight OPTIONS requests - we use a different approach now
// since we can't determine the actual method from window.location
if (url.pathname === '/api/podio-token') {
  // We'll let the handler deal with CORS and method checking
  console.log('Handling Podio token request');
  handlePodioTokenRequest(new Request(url.href, {
    method: 'POST', // Always use POST for token endpoint
    body: window.location.search.substring(1),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  }))
    .then(response => {
      console.log('Proxy response status:', response.status);
      response.json().then(data => {
        console.log('Proxy response data:', data);
        document.body.innerHTML = JSON.stringify(data);
        document.querySelector('meta[http-equiv="Content-Type"]')?.setAttribute('content', 'application/json');
      }).catch(error => {
        console.error('Error parsing response JSON:', error);
        document.body.innerHTML = JSON.stringify({
          error: 'parse_error',
          error_description: 'Failed to parse response JSON: ' + error.message
        });
      });
    })
    .catch(error => {
      console.error('Podio token proxy error:', error);
      document.body.innerHTML = JSON.stringify({
        error: 'proxy_error',
        error_description: error.message
      });
    });
}
// Handle Podio image proxy requests
else if (url.pathname.startsWith('/api/podio-image/')) {
  handlePodioImageRequest(new Request(url.href))
    .then(response => {
      // Handle the response - directly display the image
      if (response.status === 200) {
        response.blob().then(blob => {
          const contentType = response.headers.get('Content-Type') || 'image/jpeg';
          
          // Create an img element and set its source
          document.body.innerHTML = '';
          const img = document.createElement('img');
          img.src = URL.createObjectURL(blob);
          img.style.maxWidth = '100%';
          document.body.appendChild(img);
          
          // Set content type
          document.querySelector('meta[http-equiv="Content-Type"]')?.setAttribute('content', contentType);
        });
      } else {
        // Handle error
        document.body.innerHTML = `<div style="color: red; padding: 20px;">
          <h1>Error Loading Image</h1>
          <p>Status: ${response.status}</p>
          <p>Please try again later</p>
        </div>`;
      }
    })
    .catch(error => {
      console.error('Podio image proxy error:', error);
      document.body.innerHTML = `<div style="color: red; padding: 20px;">
        <h1>Error Loading Image</h1>
        <p>${error.message}</p>
      </div>`;
    });
} else {
  // Normal app rendering
  createRoot(document.getElementById("root")!).render(<App />);
}
