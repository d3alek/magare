function (doc) {
  var reportedSenses = doc.reported.state.senses;
  var timestamp = doc.reported.timestamp_utc;
  var thing = doc.thing;
  emit([thing, timestamp], reportedSenses);
}
