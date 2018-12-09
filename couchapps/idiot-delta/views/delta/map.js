function (doc) {
  function emitDifferences(path, desiredConfig, reportedConfig) {
    // we assume that desiredConfig is always defined
    var desiredType = typeof desiredConfig;
    var reportedType = typeof reportedConfig;

    if (reportedType === 'undefined') {
      return [[path, desired]];
    }
    if (desiredType !== reportedType) {
      throw Error("types differ at path " + path + ": desired " + desiredType + " reported " + reportedType);
    }

    if (desiredType === 'number' 
      || desiredType === 'string') {
      if (desiredConfig === reportedConfig) {
        return []; // no differences
      }
      else {
        return [[path, desiredConfig]];
      }
    }

    if (desiredType !== 'object') {
      throw Error("expected desired " + desiredConfig + " to be of type object, got " + desiredType + " instead");
    }

    var desired, reported;
    var differences = [];
    
    if (isArray(desiredConfig)) {
      for (i = 0; i < desiredConfig.length; ++i) {
        desired = desiredConfig[i];
        reported = reportedConfig[i];
        differences = differences.concat(emitDifferences(path.concat(i), desired, reported));
      }

      return differences;
    }

    // both desiredConfig and reportedConfig (assumed) are objects 
    for (key in desiredConfig) {
      desired = desiredConfig[key];
      reported = reportedConfig[key];
      differences = differences.concat(emitDifferences(path.concat(key), desired, reported));
    }

    return differences;
  }

  var reportedConfig = doc.reported.state.config;
  var desiredConfig = doc.desired.config;

  var differences = emitDifferences([], desiredConfig, reportedConfig);

  emit([doc.thing, doc.timestamp], differences);
  return differences;
}
