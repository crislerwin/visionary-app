"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "liked-products";

function getLikedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveLikedSet(set: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
}

export function useLikedProducts() {
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLikedSet(getLikedSet());
  }, []);

  const isLiked = useCallback((productId: string) => likedSet.has(productId), [likedSet]);

  const toggleLike = useCallback((productId: string): boolean => {
    const current = getLikedSet();
    const willBeLiked = !current.has(productId);
    if (willBeLiked) {
      current.add(productId);
    } else {
      current.delete(productId);
    }
    saveLikedSet(current);
    setLikedSet(new Set(current));
    return willBeLiked;
  }, []);

  return { isLiked, toggleLike };
}
