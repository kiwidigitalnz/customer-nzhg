
import { getFileFromPodio, extractPodioFileId } from '../services/imageProxy';

/**
 * Handler for API requests to /api/podio-image/:fileId
 */
export const handlePodioImageRequest = async (req: Request): Promise<Response> => {
  try {
    // Extract file ID from path
    const url = new URL(req.url);
    const fileId = url.pathname.split('/').pop();
    
    if (!fileId) {
      return new Response('File ID is required', { status: 400 });
    }
    
    console.log(`Handling proxy request for file ID: ${fileId}`);
    
    // Get file from Podio
    const imageData = await getFileFromPodio(fileId);
    
    // Return the image data directly with appropriate headers
    return new Response(imageData.blob, {
      status: 200,
      headers: {
        'Content-Type': imageData.contentType || 'image/jpeg',
        'Cache-Control': 'max-age=3600'
      }
    });
  } catch (error) {
    console.error('Error in Podio image proxy:', error);
    return new Response('Failed to fetch image', { status: 500 });
  }
};
