function(newDoc, oldDoc, userCtx, secObj) { 
  if (userCtx.roles.indexOf('_admin') !== -1) {
    return;
  }
  if (typeof newDoc === 'undefined' || newDoc === null || newDoc['_deleted'] === true) {
    throw({forbidden: 'Not allowed to delete documents.'});
  }
  if (typeof oldDoc === 'undefined' || oldDoc === null) {
    return;
  }

  var oldDocAttachments = oldDoc._attachments || {};
  var newDocAttachments = newDoc._attachments || {};

  if (Object.keys(oldDocAttachments).length >= Object.keys(newDocAttachments).length) {
    throw({forbidden: 'Not allowed.'});
  }

  function intersection(o1, o2) {
    return Object.keys(o1).filter({}.hasOwnProperty.bind(o2));
  }
  var commonAttachments = intersection(oldDocAttachments, newDocAttachments);
  var oldCommonAttachments = commonAttachments.map(function(k) { return oldDocAttachments[k] });
  var newCommonAttachments = commonAttachments.map(function(k) { return newDocAttachments[k] });

  if (toJSON(oldCommonAttachments) !== toJSON(newCommonAttachments)) {
    throw({forbidden: 'Not allowed to modify attachments.'});
  }
}
