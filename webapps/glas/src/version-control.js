import crypto from 'crypto';

function toBlob(doc) {
  return new Blob([JSON.stringify(doc)], {type : 'application/json'});
}

//function getPreviousRevision(revisions) {
//  if (revisions.start == 1) {
//    return 'rev-0';
//  }
//  return 'rev-' + (revisions.start - 1) + '-' + revisions.ids[1];
//};
//
//function checkVersionized(doc) {
//  var previousRevision = getPreviousRevision(doc._revisions);
//  return typeof doc._attachments[previousRevision] !== 'undefined';
//}

function filterContent(doc) {
  var filtered = Object.assign({}, doc);
  delete filtered._id;
  delete filtered._rev;
  delete filtered._revisions;
  delete filtered._attachments;
  delete filtered.revisions;
  return filtered;
}

function versionized(doc) {
  const filtered = filterContent(doc);

  var revision = 'rev-' + (doc._rev || '0');
  doc._attachments = doc._attachments || {};
  doc._attachments[revision] = {
    content_type: 'application/json',
    data: toBlob(filtered)
  };

  return doc;
};

function versionControl(db) {
  db.__oldDocs = {};
  db.__get = db.get;
  db.get = (key, options) => {
    options = options || {};
    options.revs = true;
    return db.__get(key, options).then( (doc) => {
      db.__oldDocs[doc._id] = doc;
      return doc;
    });
  }

  db.__allDocs = db.allDocs;
  db.allDocs = (options) => {
    return db.__allDocs(options).then( (result) => {
      result.rows = result.rows.map( row => {
        db.__oldDocs[row.id] = row.doc;
        return row;
      });
      return result;
    });
  }

  db.__put = db.put;
  db.put = (newDoc) => {
    return new Promise((resolve, reject) => {
      var oldDoc = db.__oldDocs[newDoc._id];
      if (!oldDoc) {
        resolve(versionized(newDoc));
        return;
      }

      newDoc._attachments = newDoc._attachments || {};
      for (var attachment in oldDoc._attachments) { 
        newDoc._attachments[attachment] = oldDoc._attachments[attachment]; 
      }

      resolve(versionized(newDoc));
    }).then( (doc) => db.__put(doc));
  }

  return db;
}

async function blobAsText(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("loadend", function() {
      resolve(reader.result);
    });
    reader.addEventListener("onerror", function() {
      reject(reader.error);
    });
    reader.readAsText(blob);
  });
}

export { versionControl, filterContent, blobAsText };
