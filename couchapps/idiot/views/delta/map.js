function (doc) {
  function emitDifferences(path, desiredConfig, reportedConfig) {
    // we assume that desiredConfig is always defined
    var desiredType = typeof desiredConfig;
    var reportedType = typeof reportedConfig;

    if (reportedType === 'undefined') {
      emit(path, desired);
      return;
    }
    if (desiredType !== reportedType) {
      throw "types differ at path " + path + ": desired " + desiredType + " reported " + reportedType;
      return; 
    }

    if (desiredType === 'number' 
      || desiredType === 'string') {
      if (desiredConfig === reportedConfig) {
        return; // no differences
      }
      else {
        emit(path, desiredConfig);
        return;
      }
    }

    if (desiredType !== 'object') {
      throw "expected desired " + desiredConfig + " to be of type object, got " + desiredType + " instead";
      return;
    }

    var desired, reported;

    if (isArray(desiredConfig)) {
      for (i = 0; i < desiredConfig.length; ++i) {
        desired = desiredConfig[i];
        reported = reportedConfig[i];
        emitDifferences(path.concat(i), desired, reported);
      }

      return;
    }

    // both desiredConfig and reportedConfig (assumed) are objects 
    for (key in desiredConfig) {
      desired = desiredConfig[key];
      reported = reportedConfig[key];
      emitDifferences(path.concat(key), desired, reported);
    }
  }

  var reportedConfig = doc.reported.state.config;
  var desiredConfig = doc.desired.config;
  emitDifferences([], desiredConfig, reportedConfig);
}
