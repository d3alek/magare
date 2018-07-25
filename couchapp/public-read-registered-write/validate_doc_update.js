function(newDoc, oldDoc, userCtx, secObj) { 
  var admin = userCtx.roles.indexOf('_admin') !== -1;

  if (!userCtx.name) {
    throw({forbidden: 'Anonymous not allowed to edit documents.'});
  }

  if (typeof newDoc === 'undefined' || newDoc === null || newDoc['_deleted'] === true) {
    if (admin) {
      return;
    }
    throw({forbidden: 'Not allowed to delete documents.'});
  }

  if (typeof oldDoc === 'undefined' || oldDoc === null) {
    return;
  }

  if (!newDoc.author || newDoc.author !== userCtx.name) {
    throw({forbidden: 'Document author must be user.'});
  }

  var oldDocAttachments = oldDoc._attachments || {};
  var newDocAttachments = newDoc._attachments || {};

  if (Object.keys(oldDocAttachments).length >= Object.keys(newDocAttachments).length) {
    if (admin) {
      return;
    }
    throw({forbidden: 'Not allowed to remove attachments.'});
  }

  function objectIntersection(o1, o2) {
    return Object.keys(o1).filter({}.hasOwnProperty.bind(o2));
  }
  var commonAttachments = objectIntersection(oldDocAttachments, newDocAttachments);
  var oldCommonAttachments = commonAttachments.map(function(k) { return oldDocAttachments[k] });
  var newCommonAttachments = commonAttachments.map(function(k) { return newDocAttachments[k] });

  if (toJSON(oldCommonAttachments) !== toJSON(newCommonAttachments)) {
    throw({forbidden: 'Not allowed to modify attachments.'});
  }
  
  function arraySubtraction(a1, a2) {
    return a1.filter(function(value) {
      return -1 === a2.indexOf(value);
    });
  }

  var oldDocComments = oldDoc.comments || [];
  var newDocComments = newDoc.comments || [];
  var newComments = arraySubtraction(newDocComments, oldDocComments);

  for (var i; i < newComments.length; ++i) {
    if (newComments[i].author !== userCtx.name) {
      log(newComments[i].author);
      throw({forbidden: 'User must be comment author'});
    }
  }
}
