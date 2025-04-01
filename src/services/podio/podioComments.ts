
import { callPodioApi, hasValidTokens } from './podioAuth';

// Define the CommentItem interface
export interface CommentItem {
  id: number;
  text: string;
  author: {
    name: string;
    avatar?: string;
  };
  createdAt: string;
}

// Get comments for a specific item
export const getCommentsFromPodio = async (itemId: number): Promise<CommentItem[]> => {
  try {
    if (!hasValidTokens()) {
      console.error('Not authenticated with Podio');
      return [];
    }
    
    // Get the comments from Podio for this item
    const response = await callPodioApi(`comment/item/${itemId}`);
    
    if (!response || !Array.isArray(response)) {
      console.log('No comments found or invalid response');
      return [];
    }
    
    // Transform the Podio comment format to our application format
    const comments: CommentItem[] = response.map((comment: any) => ({
      id: comment.comment_id,
      text: comment.value || '',
      author: {
        name: comment.created_by.name || 'Unknown',
        avatar: comment.created_by.avatar_url,
      },
      createdAt: comment.created_on,
    }));
    
    return comments;
  } catch (error) {
    console.error('Error getting comments:', error);
    return [];
  }
};

// Add a comment to an item
export const addCommentToPodio = async (itemId: number, comment: string): Promise<boolean> => {
  try {
    if (!hasValidTokens()) {
      console.error('Not authenticated with Podio');
      return false;
    }
    
    // Create the comment data
    const commentData = {
      value: comment
    };
    
    // Call the Podio API to add the comment
    await callPodioApi(`comment/item/${itemId}`, {
      method: 'POST',
      body: JSON.stringify(commentData),
    });
    
    return true;
  } catch (error) {
    console.error('Error adding comment:', error);
    return false;
  }
};

// Add a comment to a packing spec - convenience function
export const addCommentToPackingSpec = async (packingSpecId: number, comment: string): Promise<boolean> => {
  return addCommentToPodio(packingSpecId, comment);
};
