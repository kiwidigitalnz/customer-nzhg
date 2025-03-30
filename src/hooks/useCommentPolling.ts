
import { useState, useEffect, useRef } from 'react';
import { getCommentsFromPodio } from '../services/podioApi';

interface Comment {
  id: number;
  text: string;
  createdBy: string;
  createdAt: string;
}

/**
 * Custom hook that polls for new comments from Podio
 * @param itemId The ID of the item to get comments for
 * @param initialComments Initial comments to start with
 * @param isActive Whether polling should be active (e.g., comments tab is open)
 * @param pollingInterval How often to poll for new comments (in ms)
 */
export const useCommentPolling = (
  itemId: number,
  initialComments: Comment[] = [],
  isActive: boolean = true,
  pollingInterval: number = 15000
) => {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastPollTimeRef = useRef<number>(Date.now());

  // Function to fetch comments
  const fetchComments = async () => {
    if (!itemId || !isActive) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Only fetch new comments
      const fetchedComments = await getCommentsFromPodio(itemId);
      
      // Check if we have new comments
      if (fetchedComments.length !== comments.length) {
        setComments(fetchedComments);
      } else {
        // Check if any comments have different content
        const hasChanges = fetchedComments.some((fetchedComment, index) => {
          if (index >= comments.length) return true;
          return fetchedComment.id !== comments[index].id || 
                 fetchedComment.text !== comments[index].text;
        });
        
        if (hasChanges) {
          setComments(fetchedComments);
        }
      }
      
      lastPollTimeRef.current = Date.now();
    } catch (err) {
      console.error('Error polling for comments:', err);
      setError('Failed to fetch new comments');
    } finally {
      setIsLoading(false);
    }
  };

  // Manual refresh function for immediate updates
  const refreshComments = () => {
    fetchComments();
  };

  // Setup polling
  useEffect(() => {
    if (!isActive) return;
    
    // Initial fetch on mount or when becoming active
    fetchComments();
    
    // Set up polling interval
    const intervalId = setInterval(fetchComments, pollingInterval);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [itemId, isActive, pollingInterval]);

  // Update comments if initialComments change
  useEffect(() => {
    if (initialComments && initialComments.length > 0) {
      setComments(initialComments);
    }
  }, [initialComments]);

  return {
    comments,
    isLoading,
    error,
    refreshComments,
    lastPolled: lastPollTimeRef.current
  };
};
