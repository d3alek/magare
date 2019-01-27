//function safariDateText(date_text) {
//    return date_text.replace(/-/g,"/");
//}
//
//function dateFromUTCText(utc_text) {
//    var wrong_date = new Date(safariDateText(utc_text));
//    return new Date(wrong_date.getTime() - wrong_date.getTimezoneOffset() * 60000);
//}

function dateFromEpochSeconds(epochSeconds) {
  return new Date(epochSeconds*1000);
}

function fillStatus(doc) {
  status_span = document.getElementById('status');
  status_since_span = document.getElementsByClassName('status-since')[0];
  status_class = 'error';
  status_text = 'грешка';
  status_since = 'неизвестно';

  var reported = doc.reported;

  if (reported['timestamp']) {
    enchanted_utc = new Date(reported['timestamp']);
    enchanted_millis = enchanted_utc.getTime(); // enchanted utc time in millis
    now_millis = new Date().getTime(); // current utc time in millis 

    if (now_millis - enchanted_millis > 5000*60) {
      status_class = 'down';
      status_text = 'неизвестно';
      status_since = enchanted_utc.toLocaleString();
    }
    else {
      if (reported['state'] && reported['state']['b']) {
          status_class = 'up';
          status_text = 'живо';
          boot_utc = dateFromEpochSeconds(reported['state']['b']);
          status_since = boot_utc.toLocaleString();
      }
    }
  }

  status_span.setAttribute("class", status_class);
  status_span.innerText = status_text.substr(1);
  status_since_span.textContent = status_since;
}
