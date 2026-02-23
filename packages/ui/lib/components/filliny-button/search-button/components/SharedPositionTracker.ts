import { getScrollableAncestors } from '../overlayUtils';

type PositionCallback = () => void;

interface TrackedEntry {
  callback: PositionCallback;
  labelElement: HTMLElement | null;
}

/**
 * Shared position tracking system that replaces per-button observers.
 *
 * Instead of each FieldFillButton creating its own ResizeObserver,
 * MutationObserver, and scroll listeners (50 buttons = 100+ observers),
 * this singleton uses:
 * - 1 ResizeObserver (observes all tracked elements + labels)
 * - 1 MutationObserver (observes all tracked elements for style/class changes)
 * - 1 window scroll + resize listener
 * - Deduped scrollable ancestor listeners
 *
 * Observers are lazily created on first `track()` call to avoid
 * `ResizeObserver is not defined` errors during SSR/build.
 */
class SharedPositionTracker {
  private static instance: SharedPositionTracker | null = null;

  private resizeObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private trackedElements: Map<HTMLElement, TrackedEntry> = new Map();
  // Map from scrollable ancestor -> set of tracked elements that descend from it
  private scrollableAncestors: Map<HTMLElement, Set<HTMLElement>> = new Map();
  private windowListenersAttached = false;
  private rafPending = false;

  static getInstance(): SharedPositionTracker {
    if (!SharedPositionTracker.instance) {
      SharedPositionTracker.instance = new SharedPositionTracker();
    }
    return SharedPositionTracker.instance;
  }

  /** Lazily create observers on first use (safe for SSR/build) */
  private ensureObservers(): void {
    if (this.resizeObserver) return;

    this.resizeObserver = new ResizeObserver(() => {
      this.schedulePositionUpdate();
    });

    this.mutationObserver = new MutationObserver(() => {
      this.schedulePositionUpdate();
    });
  }

  track(element: HTMLElement, callback: PositionCallback, labelElement: HTMLElement | null): void {
    this.ensureObservers();

    if (this.trackedElements.has(element)) {
      // Update callback and label if already tracked
      const entry = this.trackedElements.get(element)!;
      entry.callback = callback;

      // If label changed, update observation
      if (entry.labelElement !== labelElement) {
        if (entry.labelElement) {
          this.resizeObserver!.unobserve(entry.labelElement);
        }
        entry.labelElement = labelElement;
        if (labelElement?.isConnected) {
          this.resizeObserver!.observe(labelElement);
        }
      }
      return;
    }

    this.trackedElements.set(element, { callback, labelElement });

    // Observe element for resize
    this.resizeObserver!.observe(element);

    // Observe label for resize if present
    if (labelElement?.isConnected) {
      this.resizeObserver!.observe(labelElement);
    }

    // Observe element for attribute mutations
    this.mutationObserver!.observe(element, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    // Register scrollable ancestors
    this.registerScrollableAncestors(element);

    // Attach window listeners if this is the first tracked element
    if (!this.windowListenersAttached) {
      this.attachWindowListeners();
    }
  }

  untrack(element: HTMLElement): void {
    const entry = this.trackedElements.get(element);
    if (!entry) return;

    this.trackedElements.delete(element);

    // Unobserve element from ResizeObserver
    this.resizeObserver?.unobserve(element);

    // Unobserve label if present
    if (entry.labelElement) {
      // Only unobserve if no other tracked element shares this label
      const labelStillNeeded = Array.from(this.trackedElements.values()).some(
        e => e.labelElement === entry.labelElement,
      );
      if (!labelStillNeeded) {
        this.resizeObserver?.unobserve(entry.labelElement);
      }
    }

    // Clean up scrollable ancestor registrations
    this.unregisterScrollableAncestors(element);

    // If no more tracked elements, remove window listeners
    if (this.trackedElements.size === 0) {
      this.detachWindowListeners();
    }
  }

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.resizeObserver = null;
    this.mutationObserver = null;
    this.detachWindowListeners();
    this.trackedElements.clear();
    this.scrollableAncestors.clear();
    SharedPositionTracker.instance = null;
  }

  private registerScrollableAncestors(element: HTMLElement): void {
    const ancestors = getScrollableAncestors(element);
    for (const ancestor of ancestors) {
      if (!this.scrollableAncestors.has(ancestor)) {
        this.scrollableAncestors.set(ancestor, new Set());
        ancestor.addEventListener('scroll', this.handleScroll, { passive: true });
      }
      this.scrollableAncestors.get(ancestor)!.add(element);
    }
  }

  private unregisterScrollableAncestors(element: HTMLElement): void {
    for (const [ancestor, elements] of this.scrollableAncestors) {
      elements.delete(element);
      if (elements.size === 0) {
        ancestor.removeEventListener('scroll', this.handleScroll);
        this.scrollableAncestors.delete(ancestor);
      }
    }
  }

  private attachWindowListeners(): void {
    if (this.windowListenersAttached) return;
    window.addEventListener('resize', this.handleScroll);
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    this.windowListenersAttached = true;
  }

  private detachWindowListeners(): void {
    if (!this.windowListenersAttached) return;
    window.removeEventListener('resize', this.handleScroll);
    window.removeEventListener('scroll', this.handleScroll);
    this.windowListenersAttached = false;
  }

  private handleScroll = (): void => {
    this.schedulePositionUpdate();
  };

  private schedulePositionUpdate(): void {
    if (this.rafPending) return;
    this.rafPending = true;
    requestAnimationFrame(() => {
      this.rafPending = false;
      for (const entry of this.trackedElements.values()) {
        entry.callback();
      }
    });
  }
}

/** Lazy getter: instance is created on first access, not at module load time. */
const getSharedPositionTracker = (): SharedPositionTracker => SharedPositionTracker.getInstance();

export { getSharedPositionTracker };
export type { PositionCallback };
