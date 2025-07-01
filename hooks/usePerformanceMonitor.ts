import { useEffect, useRef } from 'react';
import { InteractionManager, Platform } from 'react-native';

/**
 * Hook to monitor and log performance metrics
 * 
 * @param componentName Name of the component being monitored
 * @param enabled Whether monitoring is enabled
 */
export const usePerformanceMonitor = (componentName: string, enabled: boolean = __DEV__) => {
  const mountTimeRef = useRef<number>(Date.now());
  const renderTimeRef = useRef<number>(0);
  
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
      console.log(`[Performance] ${componentName} unmounted after ${lifetimeDuration}ms`);
    };
  }, [componentName, enabled]);
  
  // Function to mark render start
  const markRenderStart = () => {
    if (!enabled) return;
    renderTimeRef.current = Date.now();
  };
  
  // Function to mark render end and log duration
  const markRenderEnd = (operation?: string) => {
    if (!enabled || renderTimeRef.current === 0) return;
    
    const renderDuration = Date.now() - renderTimeRef.current;
    const operationName = operation ? ` (${operation})` : '';
    
    console.log(`[Performance] ${componentName}${operationName} rendered in ${renderDuration}ms`);
    renderTimeRef.current = 0;
  };
  
  return {
    markRenderStart,
    markRenderEnd,
  };
};

/**
 * Utility to measure execution time of a function
 * 
 * @param fn Function to measure
 * @param name Name of the function for logging
 * @returns The original function wrapped with timing logic
 */
export function measureExecutionTime<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): (...args: Parameters<T>) => ReturnType<T> {
  if (!__DEV__) return fn;
  
  return (...args: Parameters<T>): ReturnType<T> => {
    const start = Date.now();
    const result = fn(...args);
    
    // Handle promises
    if (result instanceof Promise) {
      return result.finally(() => {
        const end = Date.now();
        console.log(`[Performance] ${name} executed in ${end - start}ms (async)`);
      }) as ReturnType<T>;
    }
    
    const end = Date.now();
    console.log(`[Performance] ${name} executed in ${end - start}ms`);
    return result;
  };
}