
import { callPodioApi } from './podioAuth';

export interface CommentItem {
  id: number;
  text: string;
  createdBy: string;
  createdAt: string;
  rich_value?: string;
  files?: any[];
}

// Get comments for a specific item from Podio
export const getCommentsFromPodio = async (itemId: number): Promise<CommentItem[]> => {
  try {
    if (!itemId) {
      console.warn('No item ID provided to getCommentsFromPodio');
      return [];
    }
    
    console.log(`Fetching comments for Podio item ID: ${itemId}`);
    
    // Call the correct Podio API endpoint for comments
    // According to Podio docs: GET /comment/item/{item_id}/
    const response = await callPodioApi(`/comment/item/${itemId}/`);
    
    if (!response) {
      console.warn('No response received from Podio API for comments');
      return [];
    }
    
    console.log('Raw comment response from Podio:', response);
    
    // Check if we have comments in the response
    if (!response.comments || !Array.isArray(response.comments)) {
      console.warn('No comments array found in Podio response or invalid format', response);
      return [];
    }
    
    console.log(`Found ${response.comments.length} comments from Podio`);
    
    // Transform Podio comment format to our internal format
    return response.comments.map((comment: any) => {
      // Extract creator name based on what's available
      let creatorName = 'Unknown';
      if (comment.created_by) {
        if (comment.created_by.name) {
          creatorName = comment.created_by.name;
        } else if (comment.created_by.user_id && comment.created_by.user_id > 0) {
          creatorName = `User ${comment.created_by.user_id}`;
        } else if (comment.created_by.type === 'app') {
          creatorName = comment.created_by.name || 'System';
        }
      } else if (comment.user && comment.user.name) {
        creatorName = comment.user.name;
      }
      
      // Determine text content: prefer rich_value over value
      const textContent = comment.rich_value || comment.value || '';
      
      return {
        id: comment.comment_id,
        text: textContent,
        createdBy: creatorName,
        createdAt: comment.created_on || new Date().toISOString(),
        rich_value: comment.rich_value,
        files: comment.files || []
      };
    });
  } catch (error) {
    console.error('Error fetching comments from Podio:', error);
    return [];
  }
};

// Add a comment to a Podio item
export const addCommentToPodio = async (itemId: number, comment: string): Promise<boolean> => {
  try {
    if (!itemId) {
      console.error('No item ID provided to addCommentToPodio');
      return false;
    }
    
    if (!comment || !comment.trim()) {
      console.error('Empty comment provided to addCommentToPodio');
      return false;
    }
    
    console.log(`Adding comment to Podio item ID: ${itemId}`);
    
    // According to Podio docs, we should POST to /comment/item/{item_id}/
    // The request body needs a 'value' field with the comment text
    const response = await callPodioApi(`/comment/item/${itemId}/`, {
      method: 'POST',
      body: JSON.stringify({
        value: comment
      })
    });
    
    console.log('Comment submission response:', response);
    
    if (!response || !response.comment_id) {
      console.warn('No valid response received when adding comment to Podio:', response);
      return false;
    }
    
    console.log('Successfully added comment to Podio with ID:', response.comment_id);
    return true;
  } catch (error) {
    console.error('Error adding comment to Podio:', error);
    return false;
  }
};

// Helper function for packing spec comments - convenience wrapper
export const addCommentToPackingSpec = async (specId: number, comment: string): Promise<boolean> => {
  return addCommentToPodio(specId, comment);
};
