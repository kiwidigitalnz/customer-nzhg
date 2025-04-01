
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
  
  // For POST requests, we'll read the body in handlePodioTokenRequest
  // Create a proper request object
  const tokenRequest = new Request(url.href, {
    method: 'POST',
    body: url.searchParams.toString() || null,  // Use search params if present
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    }
  });
  
  handlePodioTokenRequest(tokenRequest)
    .then(response => {
      console.log('Token proxy response status:', response.status);
      return response.text();
    })
    .then(text => {
      try {
        // Try to parse as JSON first
        const data = JSON.parse(text);
        console.log('Token proxy response data:', data);
        document.body.innerHTML = JSON.stringify(data);
        document.querySelector('meta[http-equiv="Content-Type"]')?.setAttribute('content', 'application/json');
      } catch (error) {
        console.error('Error parsing response as JSON:', error);
        // If not valid JSON, show the raw text
        document.body.innerHTML = text;
        document.querySelector('meta[http-equiv="Content-Type"]')?.setAttribute('content', 'text/plain');
      }
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
