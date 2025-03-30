
// This module handles interactions with Podio comments

import { callPodioApi, hasValidPodioTokens, refreshPodioToken } from './podioAuth';

export interface CommentItem {
  id: number;
  text: string;
  createdBy: string;
  createdAt: string;
}

// Get comments from Podio for a specific item
export const getCommentsFromPodio = async (itemId: number): Promise<CommentItem[]> => {
  try {
    console.log('Fetching comments for item ID:', itemId);
    
    if (!hasValidPodioTokens() && !await refreshPodioToken()) {
      throw new Error('Not authenticated with Podio API');
    }
    
    // Call Podio API to get comments
    const endpoint = `comment/item/${itemId}`;
    
    const response = await callPodioApi(endpoint);
    
    if (!response || !Array.isArray(response)) {
      console.log('No comments found or invalid response');
      return [];
    }
    
    // Transform Podio comments into our CommentItem format
    const comments: CommentItem[] = response.map((comment: any) => ({
      id: comment.comment_id,
      text: comment.value,
      createdBy: comment.created_by.name || 'Podio User',
      createdAt: comment.created_on
    }));
    
    console.log(`Found ${comments.length} comments for item ID ${itemId}`);
    return comments;
  } catch (error) {
    console.error('Error fetching comments from Podio:', error);
    throw new Error('Failed to fetch comments from Podio');
  }
};

// Function to add a comment to a Podio item
export const addCommentToPodio = async (
  itemId: number,
  comment: string,
  userName?: string
): Promise<boolean> => {
  try {
    console.log(`Adding comment to Podio item ${itemId}: ${comment}`);
    
    if (!hasValidPodioTokens() && !await refreshPodioToken()) {
      throw new Error('Not authenticated with Podio API');
    }
    
    // Get user info from localStorage for company name
    const userInfo = localStorage.getItem('user_info');
    const companyName = userInfo ? JSON.parse(userInfo).name : (userName || 'Customer Portal User');
    
    // Prepare the comment data - prepend with company name
    const commentData = {
      value: `[${companyName}] ${comment}`,
      external_id: `customer_comment_${Date.now()}`,
    };
    
    // Post the comment to Podio
    const endpoint = `comment/item/${itemId}`;
    
    await callPodioApi(endpoint, {
      method: 'POST',
      body: JSON.stringify(commentData),
    });
    
    return true;
  } catch (error) {
    console.error('Error adding comment to Podio:', error);
    throw new Error('Failed to add comment to Podio');
  }
};

// Function to add a comment to a packing spec
export const addCommentToPackingSpec = async (
  specId: number,
  comment: string,
  userName?: string
): Promise<boolean> => {
  try {
    console.log(`Adding comment to packing spec ${specId}: ${comment}`);
    
    // Store user information in localStorage to identify comments made by the current user
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      // We already have this information stored when the user logs in
      console.log('User info already stored in localStorage');
    } else if (userName) {
      // If not stored yet for some reason, add basic info
      localStorage.setItem('user_info', JSON.stringify({
        username: userName,
        name: userName // Use userName directly instead of a hardcoded value
      }));
    }
    
    const success = await addCommentToPodio(specId, comment, userName);
    
    if (!success) {
      throw new Error('Failed to add comment to Podio');
    }
    
    return true;
  } catch (error) {
    console.error('Error adding comment to packing spec:', error);
    throw new Error('Failed to add comment to packing specification');
  }
};
