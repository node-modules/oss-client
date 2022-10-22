function omit(originalObject, keysToOmit) {
  const cloneObject = Object.assign({}, originalObject);
  for (const path of keysToOmit) {
    delete cloneObject[path];
  }
  return cloneObject;
}

exports.omit = omit;
