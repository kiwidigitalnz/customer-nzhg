
// This module handles Podio comments operations

import { callPodioApi, hasValidPodioTokens, refreshPodioToken } from './podioAuth';

// Types
export interface CommentItem {
  id: number;
  text: string;
  createdBy: string;
  createdAt: string;
}

// Get comments for a specific Podio item
export const getCommentsFromPodio = async (itemId: number): Promise<CommentItem[]> => {
  try {
    if (!hasValidPodioTokens() && !await refreshPodioToken()) {
      throw new Error('Not authenticated with Podio API');
    }
    
    const response = await callPodioApi(`/comment/item/${itemId}`);
    
    if (!response || !Array.isArray(response)) {
      return [];
    }
    
    // Map Podio comments to our app format
    return response.map((comment: any) => ({
      id: comment.comment_id,
      text: comment.value,
      createdBy: comment.created_by?.name || 'Unknown User',
      createdAt: comment.created_on
    }));
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
};

// Add a comment to a Podio item
export const addCommentToPodio = async (
  itemId: number, 
  commentText: string
): Promise<boolean> => {
  try {
    if (!hasValidPodioTokens() && !await refreshPodioToken()) {
      throw new Error('Not authenticated with Podio API');
    }
    
    await callPodioApi(`/comment/item/${itemId}`, 'POST', {
      value: commentText
    });
    
    return true;
  } catch (error) {
    console.error('Error adding comment:', error);
    return false;
  }
};

// Add a comment to a packing spec with user display name prepended
export const addCommentToPackingSpec = async (
  specId: number, 
  commentText: string,
  userDisplayName: string
): Promise<boolean> => {
  try {
    // Prepend the user's name to the comment for better visibility
    const formattedComment = `${userDisplayName}: ${commentText}`;
    
    // Fix: Only pass two arguments to addCommentToPodio as per its definition
    return await addCommentToPodio(specId, formattedComment);
  } catch (error) {
    console.error('Error adding comment to packing spec:', error);
    return false;
  }
};
