function(newDoc, oldDoc, userCtx, secObj) { 
  var admin = userCtx.roles.indexOf('_admin') !== -1;
  var userName = userCtx.name;

  if (!userName) {
    throw({forbidden: 'Anonymous not allowed to edit documents.'});
  }

  if (!newDoc.author || newDoc.author !== userName) {
    throw({forbidden: 'Document author must be user.'});
  }

  if (!newDoc.editors || newDoc.editors.indexOf(userName) == -1 || newDoc.editors.indexOf(null) !== -1) {
    throw({forbidden: 'User must be in document editors.'});
  }

  if (typeof oldDoc === 'undefined' || oldDoc === null) {
    return;
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
