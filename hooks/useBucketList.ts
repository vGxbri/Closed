/**
 * Hook de bucket list
 * Metas del grupo con filtros y suscripción realtime a Supabase.
 */

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

  const fetchItems = useCallback(async () => {
    if (!groupId) return;
    try {
      if (isFirstLoadRef.current) {
        setIsLoading(true);
      }
      const data = await bucketListService.getItems(groupId);
      setItems(data);
      isFirstLoadRef.current = false;
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      fetchItems();

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

  const pendingCount = useMemo(
    () => items.filter((item) => !item.is_completed).length,
    [items]
  );

  const completedCount = useMemo(
    () => items.filter((item) => item.is_completed).length,
    [items]
  );

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
      setItems((prev) => prev.filter((item) => item.id !== itemId));

      try {
        await bucketListService.deleteItem(itemId);
      } catch (e) {
        if (deletedItem) {
          setItems((prev) => [...prev, deletedItem]);
        }
        throw e;
      }
    },
    [items]
  );

  return {
    allItems: items,
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
