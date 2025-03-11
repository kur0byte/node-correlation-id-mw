/**
 * @fileoverview Helper module for managing correlation IDs across async contexts
 * @module correlationIdHelper
 */
const { AsyncLocalStorage } = require("node:async_hooks");
const { randomUUID } = require("node:crypto");

/**
 * AsyncLocalStorage instance to maintain correlation ID context
 * @type {AsyncLocalStorage}
 * @private
 */
const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Core correlator object with methods to manage correlation IDs
 * @namespace
 */
const correlator = {
  withId: configureArgs(withId),
  bindId: configureArgs(bindId),
  getId,
  setId,
  isUUID,
};

/**
 * Executes a function within a correlation context
 * 
 * @private
 * @param {string} id - The correlation ID to use
 * @param {Function} work - The function to execute within the correlation context
 * @returns {*} The result of the executed function
 */
function withId(id, work) {
  return asyncLocalStorage.run({ id }, () => work());
}

/**
 * Binds a function to be executed later within a correlation context
 * 
 * @private
 * @param {string} id - The correlation ID to use
 * @param {Function} work - The function to bind to the correlation context
 * @returns {Function} A function that, when called, executes the work function within the correlation context
 */
function bindId(id, work) {
  return (...args) => asyncLocalStorage.run({ id }, () => work(...args));
}

/**
 * Configures argument handling for withId and bindId functions
 * 
 * @private
 * @param {Function} func - The function to configure
 * @returns {Function} A function with argument handling
 */
function configureArgs(func) {
  return (id, work) => {
    if (!work && isFunction(id)) {
      work = id;
      id = randomUUID();
    }

    if (!work) throw new Error("Missing work parameter");

    return func(id, work);
  };
}

/**
 * Checks if an object is a function
 * 
 * @private
 * @param {*} object - The object to check
 * @returns {boolean} True if the object is a function, false otherwise
 */
function isFunction(object) {
  return typeof object === "function";
}

/**
 * Validates if a string is a valid UUID
 * 
 * @param {string} id - The string to check
 * @returns {boolean} True if the string is a valid UUID, false otherwise
 * @example
 * // Returns true
 * isUUID('123e4567-e89b-12d3-a456-426614174000');
 * 
 * // Returns false
 * isUUID('not-a-uuid');
 */
function isUUID(id) {
  const uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i
  return uuidRegex.test(id);
}

/**
 * Gets the current correlation ID from the async context
 * 
 * @returns {string|undefined} The current correlation ID, or undefined if not in a correlation context
 * @example
 * // Within a correlation context
 * correlator.withId('123e4567-e89b-12d3-a456-426614174000', () => {
 *   const id = correlator.getId(); // Returns '123e4567-e89b-12d3-a456-426614174000'
 * });
 */
function getId() {
  const store = asyncLocalStorage.getStore();
  return store && store.id;
}

/**
 * Sets the correlation ID in the current async context
 * 
 * @param {string} id - The correlation ID to set
 * @throws {Error} If not called within a correlation context
 * @example
 * correlator.withId('123e4567-e89b-12d3-a456-426614174000', () => {
 *   correlator.setId('new-id-456');
 *   console.log(correlator.getId()); // Outputs: 'new-id-456'
 * });
 */
function setId(id) {
  const store = asyncLocalStorage.getStore();
  if (!store) {
    throw new Error(
      "Missing correlation scope. \nUse bindId or withId to create a correlation scope."
    );
  }
  store.id = id;
}

module.exports = { correlator };