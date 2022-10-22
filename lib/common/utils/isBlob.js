function isBlob() {
  return false;
  // return typeof (Blob) !== 'undefined' && blob instanceof Blob;
}
exports.isBlob = isBlob;
