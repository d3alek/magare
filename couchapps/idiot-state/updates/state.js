function(doc, req) {
  if (!doc) {
    log('No matching document,  refusing report');
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

  function updatedDoc() {
    if (!('reported' in doc)) {
      doc.reported = {};
    }
    doc.reported.state = body
    doc.reported.timestamp = timestamp
    return doc
  }

  function isEmpty(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }

    return true;
  }

  function getDifferences(desiredConfig, reportedConfig) {

    var desiredType = typeof desiredConfig;
    var reportedType = typeof reportedConfig;

    if (desiredType === 'undefined') {
      return false;
    }
    if (reportedType === 'undefined') {
      return desiredConfig;
    }
    if (desiredType !== reportedType) {
      log("types differ between " + JSON.stringify(desiredConfig) + " and " + JSON.stringify(reportedConfig) + ": desired " + desiredType + " reported " + reportedType);
      return false;
    }

    if (desiredType === 'number' 
      || desiredType === 'string') {
      if (desiredConfig === reportedConfig) {
        return false; // no differences
      }
      else {
        return desiredConfig;
      }
    }

    if (desiredType !== 'object') {
      throw Error("expected desired " + desiredConfig + " to be of type object, got " + desiredType + " instead");
    }

    var desired, reported;
    var differences;
    
    if (isArray(desiredConfig)) {
      for (i = 0; i < desiredConfig.length; ++i) {
        desired = desiredConfig[i];
        reported = reportedConfig[i];
        // if anything in the array differs, put the whole new array in delta
        differences = getDifferences(desired, reported);
        if (differences !== false) {
          return desiredConfig;
        }
      }

      return false;
    }

    var differences;
    var differencesObject = {};
    for (var key in desiredConfig) {
      desired = desiredConfig[key];
      reported = reportedConfig[key];
      differences = getDifferences(desired, reported);
      if (differences !== false) {
        differencesObject[key] = differences;
      }
    }
    
    if (!isEmpty(differencesObject)) {
      return differencesObject;
    }

    return false;
  }

  function buildResponse() {
    var unix_seconds = Date.now() / 1000 | 0;
    var desiredConfig = 'desired' in doc && doc.desired && doc.desired.config;
    var differences = {};
    if (desiredConfig) {
      differences = getDifferences(desiredConfig, body.config)
    }

    if (!differences) {
      differences = {};
    }
    
    return String(unix_seconds) + '\n' + JSON.stringify(differences); 
  }

  return [updatedDoc(), buildResponse()]
}
