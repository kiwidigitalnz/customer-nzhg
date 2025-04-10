
import { useState, useEffect, useRef, useCallback } from 'react';
import { getCommentsFromPodio, CommentItem } from '../services/podio/podioComments';
import { format } from 'date-fns';

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
      console.log(`Initializing seen comments with ${initialComments.length} initial comments`);
      const initialIds = new Set(initialComments.map(comment => comment.id));
      seenCommentsRef.current = initialIds;
    }
  }, []);

  // Reset state when itemId changes
  useEffect(() => {
    if (itemId !== lastItemIdRef.current) {
      console.log(`Item ID changed from ${lastItemIdRef.current} to ${itemId}, resetting comment state`);
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
      console.warn('Cannot fetch comments: No item ID provided');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching comments for item ID: ${itemId}`);
      const fetchedComments = await getCommentsFromPodio(itemId);
      
      console.log(`Received ${fetchedComments.length} comments from Podio for item ID ${itemId}`);
      
      // Check if we have new comments by comparing with what we've seen before
      const newComments = fetchedComments.filter(comment => !seenCommentsRef.current.has(comment.id));
      
      if (newComments.length > 0) {
        console.log(`Found ${newComments.length} new comments for item ID ${itemId}`);
        
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
        console.log('Updating comments list with new data for item ID ' + itemId);
        // Update comments without causing a flicker
        setComments(fetchedComments);
      }
      
      lastPollTimeRef.current = Date.now();
    } catch (err) {
      console.error(`Error polling for comments for item ID ${itemId}:`, err);
      setError('Failed to fetch comments from Podio');
    } finally {
      setIsLoading(false);
    }
  }, [itemId, isActive, comments]);

  // Manual refresh function for immediate updates and mark all as seen
  const refreshComments = useCallback(() => {
    console.log(`Manual refresh of comments triggered for item ID ${itemId}`);
    fetchComments();
    // Mark all as seen when manually refreshed
    markAllAsSeen();
  }, [fetchComments, itemId]);

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
        console.log(`Marking all comments as seen for item ID ${itemId}`);
        comments.forEach(comment => {
          seenCommentsRef.current.add(comment.id);
        });
        setNewCommentsCount(0);
        setNewCommentIds(new Set());
      }, 5000);
    }
  }, [isActive, itemId, comments]);

  // Setup polling or fetch comments once when component becomes active
  useEffect(() => {
    if (!isActive || !itemId) {
      console.log(`Comments tab is inactive or no item ID (${itemId}), clearing polling interval`);
      // Clear interval if component becomes inactive
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      hasViewedTabRef.current = false;
      return;
    }
    
    console.log(`Comments tab became active for item ID: ${itemId}, fetching comments`);
    // Initial fetch when tab becomes active
    fetchComments();
    
    // Set up polling interval only if automatic polling is enabled
    if (enableAutomaticPolling) {
      console.log(`Setting up automatic polling every ${pollingInterval}ms for item ID ${itemId}`);
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
      console.log(`Initial comments updated with ${initialComments.length} comments for item ID ${itemId}`);
      setComments(initialComments);
      
      // Update seen comments with initial comments
      initialComments.forEach(comment => {
        seenCommentsRef.current.add(comment.id);
      });
    }
  }, [initialComments, itemId]);

  // Mark comments as seen when the tab becomes active
  useEffect(() => {
    if (isActive) {
      console.log(`Tab became active for item ID ${itemId}, marking comments as seen`);
      markAllAsSeen();
    }
  }, [isActive, itemId, markAllAsSeen]);

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
