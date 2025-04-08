
import { supabase } from '@/integrations/supabase/client';

// Default placeholder if image can't be loaded
const PLACEHOLDER_IMAGE = 'https://placehold.co/200x200/F0F8FF/0078D7?text=No+Image';

/**
 * Proxies Podio image requests through the Supabase Edge Function
 */
export const getPodioImageUrl = async (fileId: number | string): Promise<string> => {
  if (!fileId) return PLACEHOLDER_IMAGE;
  
  try {
    // Call the Edge Function to get a direct URL to the image
    const { data, error } = await supabase.functions.invoke('podio-image-proxy', {
      method: 'POST',
      body: { fileId }
    });
    
    if (error || !data || !data.url) {
      console.error('Error getting Podio image URL:', error || 'No URL returned');
      return PLACEHOLDER_IMAGE;
    }
    
    return data.url;
  } catch (error) {
    console.error('Failed to proxy Podio image:', error);
    return PLACEHOLDER_IMAGE;
  }
};
