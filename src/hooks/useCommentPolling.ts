
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
  const [newCommentsCount, setNewCommentsCount] = useState(0);
  const lastPollTimeRef = useRef<number>(Date.now());
  const pollingIntervalRef = useRef<number | null>(null);
  const seenCommentsRef = useRef<Set<number>>(new Set());
  
  // Initialize seen comments with initial comments
  useEffect(() => {
    if (initialComments && initialComments.length > 0) {
      const initialIds = new Set(initialComments.map(comment => comment.id));
      seenCommentsRef.current = initialIds;
    }
  }, []);

  // Function to fetch comments
  const fetchComments = async () => {
    if (!itemId || !isActive) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const fetchedComments = await getCommentsFromPodio(itemId);
      
      // Check if we have new comments by comparing with what we've seen before
      const newComments = fetchedComments.filter(comment => !seenCommentsRef.current.has(comment.id));
      
      if (newComments.length > 0) {
        setNewCommentsCount(newComments.length);
      }
      
      // Check if we need to update the comments list
      if (fetchedComments.length !== comments.length || 
          fetchedComments.some((comment, index) => 
            index >= comments.length || 
            comment.id !== comments[index].id || 
            comment.text !== comments[index].text
          )) {
        // Update comments without causing a flicker
        setComments(prevComments => {
          // Preserve references to existing comments where possible to minimize re-renders
          const updatedComments = [...fetchedComments];
          return updatedComments;
        });
      }
      
      lastPollTimeRef.current = Date.now();
    } catch (err) {
      console.error('Error polling for comments:', err);
      setError('Failed to fetch comments from Podio');
    } finally {
      setIsLoading(false);
    }
  };

  // Manual refresh function for immediate updates and mark all as seen
  const refreshComments = () => {
    fetchComments();
    // Mark all as seen when manually refreshed
    comments.forEach(comment => {
      seenCommentsRef.current.add(comment.id);
    });
    setNewCommentsCount(0);
  };

  // Mark comments as seen
  const markAllAsSeen = () => {
    comments.forEach(comment => {
      seenCommentsRef.current.add(comment.id);
    });
    setNewCommentsCount(0);
  };

  // Setup polling when component becomes active
  useEffect(() => {
    if (!isActive) {
      // Clear interval if component becomes inactive
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }
    
    // Initial fetch on mount or when becoming active
    fetchComments();
    
    // Set up polling interval
    pollingIntervalRef.current = window.setInterval(fetchComments, pollingInterval);
    
    // Mark comments as seen when tab is active
    if (isActive) {
      markAllAsSeen();
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [itemId, isActive, pollingInterval]);

  // Update comments if initialComments change
  useEffect(() => {
    if (initialComments && initialComments.length > 0) {
      setComments(initialComments);
      
      // Update seen comments with initial comments
      initialComments.forEach(comment => {
        seenCommentsRef.current.add(comment.id);
      });
    }
  }, [initialComments]);

  // Mark comments as seen when the tab becomes active
  useEffect(() => {
    if (isActive) {
      markAllAsSeen();
    }
  }, [isActive]);

  return {
    comments,
    isLoading,
    error,
    refreshComments,
    lastPolled: lastPollTimeRef.current,
    newCommentsCount,
    markAllAsSeen
  };
};
