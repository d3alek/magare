function(newDoc, oldDoc, userCtx, secObj) { 
  var admin = userCtx.roles.indexOf('_admin') !== -1;

  if (!userCtx.name) {
    throw({forbidden: 'Anonymous not allowed to edit documents.'});
  }

  if (!newDoc.author || newDoc.author !== userCtx.name) {
    throw({forbidden: 'Document author must be user.'});
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
