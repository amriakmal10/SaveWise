
import "react-native-get-random-values";
import { Buffer } from "buffer";

// @ts-ignore
if (typeof global.Buffer === "undefined") {
  // @ts-ignore
  global.Buffer = Buffer;
}


import "@exodus/patch-broken-hermes-typed-arrays";

// Minimal Event/EventTarget shims — Hermes (RN's JS engine) doesn't
// implement these browser globals, but some of Stellar SDK's dependency
// chain expects them to exist even if we never actually use streaming.
// @ts-ignore
if (typeof global.Event === "undefined") {
  // @ts-ignore
  global.Event = class Event {
    type: string;
    constructor(type: string) {
      this.type = type;
    }
  };
}

// @ts-ignore
if (typeof global.EventTarget === "undefined") {
  // @ts-ignore
  global.EventTarget = class EventTarget {
    private listeners: Record<string, Array<(...args: any[]) => void>> = {};
    addEventListener(type: string, callback: (...args: any[]) => void) {
      if (!this.listeners[type]) this.listeners[type] = [];
      this.listeners[type].push(callback);
    }
    removeEventListener(type: string, callback: (...args: any[]) => void) {
      if (!this.listeners[type]) return;
      this.listeners[type] = this.listeners[type].filter((cb) => cb !== callback);
    }
    dispatchEvent(event: { type: string }) {
      (this.listeners[event.type] || []).forEach((cb) => cb(event));
      return true;
    }
  };
}