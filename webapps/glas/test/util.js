// Source: https://stackoverflow.com/a/43855794/5799810
// Helper function returns a promise that resolves after all other promise mocks,
// even if they are chained like Promise.resolve().then(...)
// Technically: this is designed to resolve on the next macrotask
function tick() {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  })
}

export {tick};
