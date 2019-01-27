function quote(s) {
  return "\"" + s + "\"";
}

//TODO test as part of idiot-history tests
function historyViewQuery(thing, from, to) {
  var start_key = [quote(thing), from.year(), from.month(), from.date(), from.hour(), from.minute()]
  var end_key = [quote(thing), to.year(), to.month(), to.date(), to.hour(), to.minute()]
  return '/idiot/_design/idiot-history/_view/history?start_key=[' + start_key + ']&end_key=['+ end_key + ']'
}

function getConfig(id) {
  var config = displayables_config[id];

  if (!config) {
    config = {
      type: 'number',
      graph: true,
      alias: id,
      color: id
    }
  }

  return config;
}
