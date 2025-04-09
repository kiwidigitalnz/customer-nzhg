
import { callPodioApi } from './podioAuth';

export interface CommentItem {
  id: number;
  text: string;
  createdBy: string;
  createdAt: string;
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
    const response = await callPodioApi(`/comment/item/${itemId}/`);
    
    if (!response || !response.comments) {
      console.warn('No comments found in Podio response', response);
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
      
      return {
        id: comment.comment_id,
        text: comment.value || comment.rich_value || '',
        createdBy: creatorName,
        createdAt: comment.created_on || new Date().toISOString()
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
    
    // Call the correct Podio API endpoint with POST method
    const response = await callPodioApi(`/comment/item/${itemId}/`, {
      method: 'POST',
      body: JSON.stringify({
        value: comment
      })
    });
    
    if (!response) {
      console.warn('No response received when adding comment to Podio');
      return false;
    }
    
    console.log('Successfully added comment to Podio:', response);
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
