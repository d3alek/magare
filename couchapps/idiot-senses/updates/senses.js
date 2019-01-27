function(doc, req) {
  var userName = req.userCtx.name;

  if (!userName) {
    return [null, 'KO'];
  }

  if (!doc) {
    log('No matching document, refusing senses');
    return [null, 'KO'];
  }

  var body;
  try {
    body = JSON.parse(req.body);
  }
  catch(e) {
    log('Error: Could not parse JSON from body: ' + body);
    return [null, 'KO'];
  }

  var timestamp = new Date().toISOString();

  function newDoc(sensesWrite) {
    return {
      _id: 'sensesWrite/' + doc._id + '$' + timestamp,
      author: userName,
      thing: doc._id,
      timestamp: timestamp,
      senses: sensesWrite.senses,
      write: sensesWrite.write
    }
  }

  return [newDoc(body), "OK"]
}
