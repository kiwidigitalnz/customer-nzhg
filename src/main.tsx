
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { handlePodioImageRequest } from './api/podioImageProxy';
import { handlePodioTokenRequest } from './api/podioTokenProxy';

// Get current URL
const url = new URL(window.location.href);

// Handle API routes
if (url.pathname === '/api/podio-token') {
  console.log('Handling Podio token request');
  
  // Create a new request with the current URL and method
  const tokenRequest = new Request(url.href, {
    method: 'POST',
    body: url.searchParams.toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  });
  
  handlePodioTokenRequest(tokenRequest)
    .then(response => {
      console.log('Token proxy response status:', response.status);
      response.json().then(data => {
        console.log('Token proxy response data:', data);
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
        error_description: error instanceof Error ? error.message : 'Unknown error'
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
        <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>`;
    });
} else {
  // Normal app rendering
  createRoot(document.getElementById("root")!).render(<App />);
}
