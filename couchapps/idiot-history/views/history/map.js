function (doc) {
  if (!('senses' in doc)) {
    return;
  }
  var senses = doc.senses;
  var write = doc.write;
  var d = new Date(doc.timestamp);
  var thing = doc.thing;
  emit([thing, d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()], {senses: senses, write: write});
}
