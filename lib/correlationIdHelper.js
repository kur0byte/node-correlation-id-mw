const { AsyncLocalStorage } = require("node:async_hooks");
const { randomUUID } = require("node:crypto");

const asyncLocalStorage = new AsyncLocalStorage();

const correlator = {
  withId: configureArgs(withId),
  bindId: configureArgs(bindId),
  getId,
  setId,
  isUUID,
};

function withId(id, work) {
  return asyncLocalStorage.run({ id }, () => work());
}

function bindId(id, work) {
  return (...args) => asyncLocalStorage.run({ id }, () => work(...args));
}

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

function isFunction(object) {
  return typeof object === "function";
}

function isUUID(id) {
  const uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i
  return uuidRegex.test(id);
}

function getId() {
  const store = asyncLocalStorage.getStore();
  return store && store.id;
}

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