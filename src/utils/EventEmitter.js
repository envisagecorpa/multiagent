/**
 * EventEmitter - Publish-Subscribe Pattern Implementation
 * 
 * Serves as the communication backbone for the photo album application,
 * enabling loose coupling between components, services, and the main app.
 * 
 * Core Purpose:
 * - Decoupled Communication: Components emit events without knowing listeners
 * - Service Integration: Services notify app of state changes via events
 * - Component Coordination: Components react to app changes without direct dependencies
 * 
 * Benefits:
 * - Modularity: No direct references needed between components
 * - Flexibility: Easy to add new listeners without modifying existing code
 * - Maintainability: Changes in one component don't affect others
 * - Testability: Components can be tested in isolation
 * - Error Isolation: Built-in error handling prevents cascading failures
 * 
 * Usage Examples:
 * - Service events: photoService.on('photoUploaded', handler)
 * - Global events: eventBus.emit('showError', message)
 * - Component updates: this.emit('photoUpdated', photo)
 */
export class EventEmitter {
  constructor() {
    this.events = {};
  }

  /**
   * Register an event listener for a specific event
   * @param {string} event - The event name to listen for
   * @param {function} listener - The callback function to execute when event is emitted
   * @returns {EventEmitter} Returns this for method chaining
   * 
   * Example: emitter.on('userLogin', (user) => console.log('User logged in:', user))
   */
  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  /**
   * Emit an event to all registered listeners
   * @param {string} event - The event name to emit
   * @param {...any} args - Arguments to pass to the event listeners
   * @returns {EventEmitter} Returns this for method chaining
   * 
   * Features built-in error handling to prevent one listener's error from affecting others
   * Example: emitter.emit('photoUploaded', photoData, metadata)
   */
  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(listener => {
        try {
          listener.apply(this, args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
    return this;
  }

  /**
   * Remove a specific event listener for an event
   * @param {string} event - The event name
   * @param {function} listenerToRemove - The specific listener function to remove
   * @returns {EventEmitter} Returns this for method chaining
   * 
   * Example: emitter.off('userLogin', myLoginHandler)
   */
  off(event, listenerToRemove) {
    if (!this.events[event]) return this;
    
    this.events[event] = this.events[event].filter(
      listener => listener !== listenerToRemove
    );
    return this;
  }

  /**
   * Register a one-time event listener that automatically removes itself after first execution
   * @param {string} event - The event name to listen for
   * @param {function} listener - The callback function to execute once
   * @returns {EventEmitter} Returns this for method chaining
   * 
   * Useful for initialization events or one-time operations
   * Example: emitter.once('appReady', () => console.log('App initialized'))
   */
  once(event, listener) {
    const onceListener = (...args) => {
      this.off(event, onceListener);
      listener.apply(this, args);
    };
    return this.on(event, onceListener);
  }

  /**
   * Remove all listeners for a specific event, or all listeners for all events
   * @param {string} [event] - Optional event name. If not provided, removes all listeners for all events
   * @returns {EventEmitter} Returns this for method chaining
   * 
   * Examples: 
   * - emitter.removeAllListeners('userLogin') // Remove all userLogin listeners
   * - emitter.removeAllListeners() // Remove ALL listeners for ALL events
   */
  removeAllListeners(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
    return this;
  }
}
