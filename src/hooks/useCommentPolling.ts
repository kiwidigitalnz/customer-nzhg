
import { useState, useEffect, useRef } from 'react';
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
  
  // Initialize seen comments with initial comments
  useEffect(() => {
    if (initialComments && initialComments.length > 0) {
      console.log(`Initializing seen comments with ${initialComments.length} initial comments`);
      const initialIds = new Set(initialComments.map(comment => comment.id));
      seenCommentsRef.current = initialIds;
    }
  }, []);

  // Function to fetch comments
  const fetchComments = async () => {
    if (!itemId) {
      console.warn('Cannot fetch comments: No item ID provided');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching comments for item ID: ${itemId}`);
      const fetchedComments = await getCommentsFromPodio(itemId);
      
      console.log(`Received ${fetchedComments.length} comments from Podio`);
      
      // Check if we have new comments by comparing with what we've seen before
      const newComments = fetchedComments.filter(comment => !seenCommentsRef.current.has(comment.id));
      
      if (newComments.length > 0) {
        console.log(`Found ${newComments.length} new comments`);
        
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
        console.log('Updating comments list with new data');
        // Update comments without causing a flicker
        setComments(fetchedComments);
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
    console.log('Manual refresh of comments triggered');
    fetchComments();
    // Mark all as seen when manually refreshed
    markAllAsSeen();
  };

  // Mark comments as seen
  const markAllAsSeen = () => {
    // Clear any existing timeout
    if (newCommentsTimeoutRef.current) {
      window.clearTimeout(newCommentsTimeoutRef.current);
    }
    
    // If the tab is currently active, mark all comments as seen after 5 seconds
    if (isActive) {
      hasViewedTabRef.current = true;
      
      // Set a timeout to clear new comments after 5 seconds
      newCommentsTimeoutRef.current = window.setTimeout(() => {
        console.log('Marking all comments as seen');
        comments.forEach(comment => {
          seenCommentsRef.current.add(comment.id);
        });
        setNewCommentsCount(0);
        setNewCommentIds(new Set());
      }, 5000);
    }
  };

  // Setup polling or fetch comments once when component becomes active
  useEffect(() => {
    if (!isActive) {
      console.log('Comments tab is inactive, clearing polling interval');
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
      console.log(`Setting up automatic polling every ${pollingInterval}ms`);
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
  }, [itemId, isActive, enableAutomaticPolling, pollingInterval]);

  // Update comments if initialComments change
  useEffect(() => {
    if (initialComments && initialComments.length > 0) {
      console.log(`Initial comments updated with ${initialComments.length} comments`);
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
      console.log('Tab became active, marking comments as seen');
      markAllAsSeen();
    }
  }, [isActive]);

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
