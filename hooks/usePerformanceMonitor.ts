import { useEffect, useRef, useCallback } from 'react';
import { InteractionManager, Platform } from 'react-native';

/**
 * Enhanced hook to monitor and log performance metrics with better insights
 */
export const usePerformanceMonitor = (componentName: string, enabled: boolean = __DEV__) => {
  const mountTimeRef = useRef<number>(Date.now());
  const renderTimeRef = useRef<number>(0);
  const renderCountRef = useRef<number>(0);
  
  useEffect(() => {
    if (!enabled) return;
    
    const mountTime = mountTimeRef.current;
    const mountDuration = Date.now() - mountTime;
    
    console.log(`[Performance] ${componentName} mounted in ${mountDuration}ms`);
    
    // Schedule work for when the JS thread is idle
    InteractionManager.runAfterInteractions(() => {
      const interactionTime = Date.now() - mountTime;
      console.log(`[Performance] ${componentName} interactions ready in ${interactionTime}ms`);
    });
    
    return () => {
      if (!enabled) return;
      
      const unmountTime = Date.now();
      const lifetimeDuration = unmountTime - mountTime;
      console.log(`[Performance] ${componentName} unmounted after ${lifetimeDuration}ms (${renderCountRef.current} renders)`);
    };
  }, [componentName, enabled]);
  
  // Function to mark render start
  const markRenderStart = () => {
    if (!enabled) return;
    renderTimeRef.current = Date.now();
    renderCountRef.current++;
  };
  
  // Function to mark render end and log duration
  const markRenderEnd = (operation?: string) => {
    if (!enabled || renderTimeRef.current === 0) return;
    
    const renderDuration = Date.now() - renderTimeRef.current;
    const operationName = operation ? ` (${operation})` : '';
    
    // Only log slow renders to reduce noise
    if (renderDuration > 16) { // 16ms = 60fps threshold
      console.log(`[Performance] ${componentName}${operationName} rendered in ${renderDuration}ms (render #${renderCountRef.current})`);
    }
    
    renderTimeRef.current = 0;
  };
  
  // Function to measure component re-renders
  const logRerender = (reason?: string) => {
    if (!enabled) return;
    
    const reasonText = reason ? ` - ${reason}` : '';
    console.log(`[Performance] ${componentName} re-rendered${reasonText} (render #${renderCountRef.current})`);
  };
  
  return {
    markRenderStart,
    markRenderEnd,
    logRerender,
    renderCount: renderCountRef.current,
  };
};

/**
 * Enhanced utility to measure execution time of a function with better insights
 */
export function measureExecutionTime<T extends (...args: any[]) => any>(
  fn: T,
  name: string,
  threshold: number = 10 // Only log if execution takes longer than threshold
): (...args: Parameters<T>) => ReturnType<T> {
  if (!__DEV__) return fn;
  
  return (...args: Parameters<T>): ReturnType<T> => {
    const start = performance.now();
    const result = fn(...args);
    
    // Handle promises
    if (result instanceof Promise) {
      return result.finally(() => {
        const end = performance.now();
        const duration = end - start;
        if (duration > threshold) {
          console.log(`[Performance] ${name} executed in ${duration.toFixed(2)}ms (async)`);
        }
      }) as ReturnType<T>;
    }
    
    const end = performance.now();
    const duration = end - start;
    if (duration > threshold) {
      console.log(`[Performance] ${name} executed in ${duration.toFixed(2)}ms`);
    }
    return result;
  };
}

/**
 * Hook to monitor FlatList performance
 */
export const useFlatListPerformance = (listName: string, enabled: boolean = __DEV__) => {
  const scrollStartTime = useRef<number>(0);
  const lastScrollY = useRef<number>(0);
  
  const onScrollBeginDrag = useCallback(() => {
    if (!enabled) return;
    scrollStartTime.current = performance.now();
  }, [enabled]);
  
  const onScrollEndDrag = useCallback(() => {
    if (!enabled || scrollStartTime.current === 0) return;
    
    const scrollDuration = performance.now() - scrollStartTime.current;
    if (scrollDuration > 100) { // Only log slow scrolls
      console.log(`[Performance] ${listName} scroll took ${scrollDuration.toFixed(2)}ms`);
    }
    scrollStartTime.current = 0;
  }, [enabled, listName]);
  
  const onScroll = useCallback((event: any) => {
    if (!enabled) return;
    
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollDelta = Math.abs(currentScrollY - lastScrollY.current);
    
    // Log if there's a large scroll jump (potential performance issue)
    if (scrollDelta > 1000) {
      console.log(`[Performance] ${listName} large scroll jump: ${scrollDelta}px`);
    }
    
    lastScrollY.current = currentScrollY;
  }, [enabled, listName]);
  
  return {
    onScrollBeginDrag,
    onScrollEndDrag,
    onScroll,
  };
};