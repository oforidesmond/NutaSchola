type ProgressEvent = "start" | "done";
type Listener = (event: ProgressEvent) => void;

const listeners = new Set<Listener>();

export function startNavigationProgress() {
  for (const listener of listeners) {
    listener("start");
  }
}

export function doneNavigationProgress() {
  for (const listener of listeners) {
    listener("done");
  }
}

export function subscribeNavigationProgress(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
