function (doc) {
  if (!('senses' in doc)) {
    return;
  }
  var reportedSenses = doc.senses;
  var timestamp = doc.timestamp;
  var thing = doc.thing;
  emit([thing, timestamp], reportedSenses);
}
