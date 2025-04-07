
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
    // Pass the correct endpoint to get comments for a specific item
    const response = await callPodioApi(`/comment/item/${itemId}/`);
    
    if (!response || !Array.isArray(response.comments)) {
      return [];
    }
    
    // Mock Podio comments
    return [
      {
        id: 1,
        text: 'This is a mock comment',
        createdBy: 'System',
        createdAt: new Date().toISOString()
      }
    ];
  } catch (error) {
    console.error('Error fetching comments from Podio:', error);
    return [];
  }
};

// Add a comment to a Podio item
export const addCommentToPodio = async (itemId: number, comment: string): Promise<boolean> => {
  try {
    // Pass correct endpoint and options for adding a comment
    const response = await callPodioApi(`/comment/item/${itemId}/`, {
      method: 'POST',
      body: JSON.stringify({
        value: comment
      })
    });
    
    // Simulate a successful comment addition
    return true;
  } catch (error) {
    console.error('Error adding comment to Podio:', error);
    return false;
  }
};

// Helper function for packing spec comments
export const addCommentToPackingSpec = async (specId: number, comment: string): Promise<boolean> => {
  return addCommentToPodio(specId, comment);
};
