/**
 * Core Events - My Connect AI v2.0
 * Global event bus for event-driven communication
 */

class EventBusClass {
    constructor() {
        this.events = {};
        this.debug = false;
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        
        if (this.debug) {
            console.log(`[EventBus] Subscribed to: ${event}`);
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (!this.events[event]) return;
        
        if (this.debug) {
            console.log(`[EventBus] Emitting: ${event}`, data);
        }
        
        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`[EventBus] Error in event handler for "${event}":`, error);
            }
        });
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Event callback to remove
     */
    off(event, callback) {
        if (!this.events[event]) return;
        
        this.events[event] = this.events[event].filter(cb => cb !== callback);
        
        // Clean up empty arrays
        if (this.events[event].length === 0) {
            delete this.events[event];
        }
    }

    /**
     * Subscribe to an event that fires only once
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    once(event, callback) {
        const onceWrapper = (data) => {
            callback(data);
            this.off(event, onceWrapper);
        };
        this.on(event, onceWrapper);
    }

    /**
     * Remove all listeners for an event
     * @param {string} event - Event name
     */
    removeAllListeners(event) {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
    }

    /**
     * Enable/disable debug mode
     * @param {boolean} enabled - Debug state
     */
    setDebug(enabled) {
        this.debug = enabled;
    }
}

// Create and export singleton instance
export const EventBus = new EventBusClass();

// Export for global access if needed
window.EventBus = EventBus;
