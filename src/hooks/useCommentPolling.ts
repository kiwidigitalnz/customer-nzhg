
import { useState, useEffect, useRef, useCallback } from 'react';
import { getCommentsFromPodio, CommentItem } from '../services/podio/podioComments';

/**
 * Custom hook that handles comments from Podio with manual refresh
 * @param itemId The ID of the item to get comments for
 * @param initialComments Initial comments to start with
 * @param isActive Whether the comments tab is active
 * @param enableAutomaticPolling Whether to enable automatic polling (default: false)
 * @param pollingInterval How often to poll for new comments if automatic polling is enabled (in ms)
 */
export const useCommentPolling = (
  itemId: number,
  initialComments: CommentItem[] = [],
  isActive: boolean = true,
  enableAutomaticPolling: boolean = false,
  pollingInterval: number = 15000
) => {
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCommentsCount, setNewCommentsCount] = useState(0);
  const [newCommentIds, setNewCommentIds] = useState<Set<number>>(new Set());
  const lastPollTimeRef = useRef<number>(Date.now());
  const pollingIntervalRef = useRef<number | null>(null);
  const seenCommentsRef = useRef<Set<number>>(new Set());
  const newCommentsTimeoutRef = useRef<number | null>(null);
  const hasViewedTabRef = useRef<boolean>(false);
  const lastItemIdRef = useRef<number>(itemId);
  
  // Initialize seen comments with initial comments
  useEffect(() => {
    if (initialComments && initialComments.length > 0) {
      const initialIds = new Set(initialComments.map(comment => comment.id));
      seenCommentsRef.current = initialIds;
    }
  }, []);

  // Reset state when itemId changes
  useEffect(() => {
    if (itemId !== lastItemIdRef.current) {
      lastItemIdRef.current = itemId;
      setComments([]);
      setNewCommentsCount(0);
      setNewCommentIds(new Set());
      seenCommentsRef.current = new Set();
      hasViewedTabRef.current = false;
    }
  }, [itemId]);

  // Function to fetch comments
  const fetchComments = useCallback(async () => {
    if (!itemId) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const fetchedComments = await getCommentsFromPodio(itemId);
      
      // Check if we have new comments by comparing with what we've seen before
      const newComments = fetchedComments.filter(comment => !seenCommentsRef.current.has(comment.id));
      
      if (newComments.length > 0) {
        setNewCommentsCount(prevCount => {
          // Only add to count if the tab is not currently active or has not been viewed yet
          return isActive && hasViewedTabRef.current ? 0 : newComments.length;
        });
        
        // Track which comments are new for highlighting
        setNewCommentIds(new Set(newComments.map(comment => comment.id)));
      }
      
      // Check if we need to update the comments list
      if (fetchedComments.length !== comments.length || 
          fetchedComments.some((comment, index) => 
            index >= comments.length || 
            comment.id !== comments[index].id || 
            comment.text !== comments[index].text
          )) {
        // Update comments without causing a flicker
        setComments(fetchedComments);
      }
      
      lastPollTimeRef.current = Date.now();
    } catch (err) {
      setError('Failed to fetch comments from Podio');
    } finally {
      setIsLoading(false);
    }
  }, [itemId, isActive, comments]);

  // Manual refresh function for immediate updates and mark all as seen
  const refreshComments = useCallback(() => {
    fetchComments();
    // Mark all as seen when manually refreshed
    markAllAsSeen();
  }, [fetchComments]);

  // Mark comments as seen
  const markAllAsSeen = useCallback(() => {
    // Clear any existing timeout
    if (newCommentsTimeoutRef.current) {
      window.clearTimeout(newCommentsTimeoutRef.current);
    }
    
    // If the tab is currently active, mark all comments as seen after 5 seconds
    if (isActive) {
      hasViewedTabRef.current = true;
      
      // Set a timeout to clear new comments after 5 seconds
      newCommentsTimeoutRef.current = window.setTimeout(() => {
        comments.forEach(comment => {
          seenCommentsRef.current.add(comment.id);
        });
        setNewCommentsCount(0);
        setNewCommentIds(new Set());
      }, 5000);
    }
  }, [isActive, comments]);

  // Setup polling or fetch comments once when component becomes active
  useEffect(() => {
    if (!isActive || !itemId) {
      // Clear interval if component becomes inactive
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      hasViewedTabRef.current = false;
      return;
    }
    
    // Initial fetch when tab becomes active
    fetchComments();
    
    // Set up polling interval only if automatic polling is enabled
    if (enableAutomaticPolling) {
      pollingIntervalRef.current = window.setInterval(fetchComments, pollingInterval);
    }
    
    // Mark comments as seen when tab is active
    if (isActive) {
      markAllAsSeen();
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      if (newCommentsTimeoutRef.current) {
        window.clearTimeout(newCommentsTimeoutRef.current);
        newCommentsTimeoutRef.current = null;
      }
    };
  }, [itemId, isActive, enableAutomaticPolling, pollingInterval, fetchComments, markAllAsSeen]);

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
  }, [isActive, markAllAsSeen]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (newCommentsTimeoutRef.current) {
        window.clearTimeout(newCommentsTimeoutRef.current);
      }
    };
  }, []);

  return {
    comments,
    isLoading,
    error,
    refreshComments,
    lastPolled: lastPollTimeRef.current,
    newCommentsCount,
    newCommentIds,
    markAllAsSeen
  };
};
