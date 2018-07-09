function(doc, req) {
  var events;
  try {
    events = JSON.parse(req.body);
  } catch(error) {
    return [null, {
      'code': 400,
      'json': {
        'error': 'missed',
        'reason': 'No valid JSON in request body.'
      }
    }];
  }

  var eventsLength = events.length, i, j, e, valuesLength;
  var newData = {}, key, previous;
  for (i = 0; i < eventsLength; ++i) {
    e = events[i];
    valuesLength = e.values.length;
    for (j = 0; j < valuesLength; ++j) {
      key = e.plugin + "/" + e.plugin_instance + "/" + e.type + "/" + e.type_instance + "/" + (e.dsnames ? e.dsnames[j] : '');
      previous = newData[key];
      if (!previous) {
        previous = [];
      }
      previous.push(e.time+'-'+e.values[j]);
      newData[key] = previous;
    }
  }

  if (!doc) {
    newData._id = req.path[req.path.length-1];
    return [ newData, 'New document for ' + newData._id ];
  }

  var field, values;
  for (field in newData) {
    values = doc[field];
    if (!values) {
      values = [];
    }
    doc[field] = newData[field].concat(values);
  }

  return [ doc, 'Updated doc for ' + doc._id];
}
