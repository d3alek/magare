function(doc, req) {
  var startsWith = function(str, word) { return str.lastIndexOf(word, 0) === 0; };
  var versionFunction = function(k) { return startsWith(k, 'v-') };
  function base64Encode(text){
    if (/([^\u0000-\u00ff])/.test(text)){
        throw new Error('Cant base64 encode non-ASCII characters.');
    } 

    var digits = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
        i = 0,
        cur, prev, byteNum,
        result=[];      

    while(i < text.length){

        cur = text.charCodeAt(i);
        byteNum = i % 3;

        switch(byteNum){
            case 0:
                result.push(digits.charAt(cur >> 2));
                break;

            case 1:
                result.push(digits.charAt((prev & 3) << 4 | (cur >> 4)));
                break;

            case 2:
                result.push(digits.charAt((prev & 0x0f) << 2 | (cur >> 6)));
                result.push(digits.charAt(cur & 0x3f));
                break;
        }

        prev = cur;
        i++;
    }

    if (byteNum == 0){
        result.push(digits.charAt((prev & 3) << 4));
        result.push('==');
    } else if (byteNum == 1){
        result.push(digits.charAt((prev & 0x0f) << 2));
        result.push('=');
    }
    return result.join('');
  };
  var versionized = function(doc) {
    var shorterDoc = JSON.parse(JSON.stringify(doc));
    delete shorterDoc._id;
    delete shorterDoc._rev;
    delete shorterDoc._revisions;
    delete shorterDoc._attachments;

    var revision = 'rev-' + (doc._rev || '0');
    doc._attachments = doc._attachments || {};
    doc._attachments[revision] = {
      content_type: 'application/json',
      data: base64Encode(toJSON(shorterDoc))
    };

    return doc;
  };

  var newDoc;
  try {
    newDoc = JSON.parse(req.body);
  }
  catch(error) {
    return [null, {
      'code': 400,
      'json': {
        'error': 'missed',
        'reason': 'No valid JSON in request body.'
      }
    }];
  }
  if (!doc) {
      if ('_id' in newDoc && newDoc['_id']){
          return [versionized(newDoc), 'Created new document.'];
      };
      return [null, {
        'code': 400,
        'json': {
          'error': 'missed',
          'reason': 'Missing _id field.'
        }
      }];
  };
  var previousRevision = getPreviousRevision(doc._revisions);
  if (typeof doc._attachments[previousRevision] === 'undefined') {
    return [versionized(doc), {
      'code': 400,
      'json': {
        'error': 'missed',
        'reason': 'Version control integrity recovered. Please retry.'
      }
    }];
  }
  
  newDoc['_id'] = doc['_id'];
  newDoc['_attachments'] = newDoc['_attachments'] || {};
  for (var attachment in doc['_attachments']) { newDoc['_attachments'][attachment] = doc['_attachments'][attachment]; }
  newDoc['_rev'] = doc['_rev'];

  return [versionized(newDoc), 'Updated document.'];
}
