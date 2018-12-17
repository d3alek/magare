function (doc) {
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
      throw Error("types differ between " + JSON.stringify(desiredConfig) + " and " + JSON.stringify(reportedConfig) + ": desired " + desiredType + " reported " + reportedType);
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
        if (differences) {
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
      if (differences) {
        differencesObject[key] = differences;
      }
    }
    
    if (!isEmpty(differencesObject)) {
      return differencesObject;
    }

    return false;
  }

  if (!('reported' in doc)) {
    return;
  }

  var reportedConfig = doc.reported.state.config;
  var reportedTimestamp = doc.reported.timestamp;
  var desiredConfig = doc.desired;

  var differences = getDifferences(desiredConfig, reportedConfig);

  if (differences) {
    emit([doc.thing, reportedTimestamp], differences);
  }
}
