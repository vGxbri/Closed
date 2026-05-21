import { useState, useCallback, useRef, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { bucketListService } from '../services/bucketList.service';
import {
  BucketListItem,
  BucketListCategory,
  CreateBucketListItemInput,
} from '../types/database';

export function useBucketList(groupId: string) {
  const [items, setItems] = useState<BucketListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<BucketListCategory | null>(null);
  const isFirstLoadRef = useRef(true);

  // ─── Fetch items ────────────────────────────
  const fetchItems = useCallback(async () => {
    if (!groupId) return;
    try {
      if (isFirstLoadRef.current) {
        setIsLoading(true);
      }
      const data = await bucketListService.getItems(groupId);
      setItems(data);
      isFirstLoadRef.current = false;
    } catch (e) {
      console.error('Error loading bucket list items:', e);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  // ─── Focus effect + realtime ────────────────
  useFocusEffect(
    useCallback(() => {
      fetchItems();

      // Subscribe to realtime changes
      const subscription = supabase
        .channel(`bucket-list-realtime:${groupId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bucket_list_items',
            filter: `group_id=eq.${groupId}`,
          },
          () => {
            fetchItems();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }, [fetchItems, groupId])
  );

  // ─── Derived data ──────────────────────────
  const filteredItems = useMemo(() => {
    if (!activeCategory) return items;
    return items.filter((item) => item.category === activeCategory);
  }, [items, activeCategory]);

  const pendingItems = useMemo(
    () => filteredItems.filter((item) => !item.is_completed),
    [filteredItems]
  );

  const completedItems = useMemo(
    () => filteredItems.filter((item) => item.is_completed),
    [filteredItems]
  );

  // Counts use unfiltered items for accurate totals
  const pendingCount = useMemo(
    () => items.filter((item) => !item.is_completed).length,
    [items]
  );

  const completedCount = useMemo(
    () => items.filter((item) => item.is_completed).length,
    [items]
  );

  // ─── Actions ───────────────────────────────
  const addItem = useCallback(
    async (input: CreateBucketListItemInput): Promise<BucketListItem> => {
      const newItem = await bucketListService.createItem(input);
      setItems((prev) => [newItem, ...prev]);
      return newItem;
    },
    []
  );

  const toggleItem = useCallback(
    async (itemId: string, currentlyCompleted: boolean): Promise<void> => {
      // Optimistic update
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                is_completed: !currentlyCompleted,
                completed_at: !currentlyCompleted
                  ? new Date().toISOString()
                  : null,
              }
            : item
        )
      );

      try {
        await bucketListService.toggleComplete(itemId, !currentlyCompleted);
      } catch (e) {
        // Revert optimistic update
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  is_completed: currentlyCompleted,
                  completed_at: currentlyCompleted
                    ? item.completed_at
                    : null,
                }
              : item
          )
        );
        throw e;
      }
    },
    []
  );

  const deleteItem = useCallback(
    async (itemId: string): Promise<void> => {
      const deletedItem = items.find((i) => i.id === itemId);
      // Optimistic removal
      setItems((prev) => prev.filter((item) => item.id !== itemId));

      try {
        await bucketListService.deleteItem(itemId);
      } catch (e) {
        // Revert on error
        if (deletedItem) {
          setItems((prev) => [...prev, deletedItem]);
        }
        throw e;
      }
    },
    [items]
  );

  return {
    items: filteredItems,
    pendingItems,
    completedItems,
    isLoading,
    pendingCount,
    completedCount,
    activeCategory,
    setActiveCategory,
    fetchItems,
    addItem,
    toggleItem,
    deleteItem,
  };
}
