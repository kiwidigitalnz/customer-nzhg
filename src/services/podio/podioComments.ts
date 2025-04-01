
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
    const response = await callPodioApi(`comment/item/${itemId}`, {}, 'packingspec');
    
    if (!response || !Array.isArray(response)) {
      return [];
    }
    
    // Map Podio comments to our format
    return response.map((comment: any) => ({
      id: comment.comment_id,
      text: comment.value || '',
      createdBy: comment.created_by?.name || 'Unknown',
      createdAt: comment.created_on
    }));
  } catch (error) {
    console.error('Error fetching comments from Podio:', error);
    return [];
  }
};

// Add a comment to a Podio item
export const addCommentToPodio = async (itemId: number, comment: string): Promise<boolean> => {
  try {
    const response = await callPodioApi(`comment/item/${itemId}`, {
      method: 'POST',
      body: JSON.stringify({
        value: comment
      })
    }, 'packingspec');
    
    return !!response;
  } catch (error) {
    console.error('Error adding comment to Podio:', error);
    return false;
  }
};

// Helper function for packing spec comments
export const addCommentToPackingSpec = async (specId: number, comment: string): Promise<boolean> => {
  return addCommentToPodio(specId, comment);
};
