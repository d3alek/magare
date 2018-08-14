function(newDoc, oldDoc, userCtx, secObj) { 
  var admin = userCtx.roles.indexOf('_admin') !== -1;
  var userName = userCtx.name;

  if (admin) {
    return;
  }

  if (!userName) {
    throw({forbidden: 'Anonymous not allowed to vote.'});
  }
  
  function arraySubtraction(a1, a2, transform) {
    if (transform === undefined) {
      transform = function(v) { return v; };
    }
    var transformedA2 = a2.map(function(v) { return transform(v) });
    var result = a1.filter(function(value) {
      return -1 === transformedA2.indexOf(transform(value));
    });

    if (a1.length > a2.length && result.length !== a1.length - a2.length) {
      throw({forbidden: 'Multiple same array entries not allowed'});
    }
    return result;
  }

  function validateVotes(oldDoc, newDoc, userName) {
    if (!(newDoc && newDoc.votes)) {
      return;
    }
    var oldDocVotesFor = ((oldDoc && oldDoc.votes) || []).for || [];
    var newDocVotesFor = newDoc.votes.for || [];
    var newVotesFor = arraySubtraction(newDocVotesFor, oldDocVotesFor);
    var removedVotesFor = arraySubtraction(oldDocVotesFor, newDocVotesFor);

    var oldDocVotesAgainst = ((oldDoc && oldDoc.votes) || []).against || [];
    var newDocVotesAgainst = newDoc.votes.against || [];

    var newVotesAgainst = arraySubtraction(newDocVotesAgainst, oldDocVotesAgainst);
    var removedVotesAgainst = arraySubtraction(oldDocVotesAgainst, newDocVotesAgainst);

    var newVotes = newVotesFor.concat(newVotesAgainst);
    var removedVotes = removedVotesFor.concat(removedVotesAgainst);

    if (newVotes.length > 0 && removedVotes.length > 0) {
      throw({forbidden: 'Cannot both remove and add vote in one change'});
    }

    if (newVotes.length > 0) {
      if (newVotes.length > 1) {
        throw({forbidden: 'Only one vote per change is allowed'});
      }
      if (newVotes[0] !== userName) {
        throw({forbidden: 'User must be the new voter'});
      }
      if (newVotesFor.length > 0) {
        if (oldDocVotesAgainst.indexOf(userName) !== -1) {
          throw({forbidden: 'User already voted'});
        }
      }
      else {
        if (oldDocVotesFor.indexOf(userName) !== -1) {
          throw({forbidden: 'User already voted'});
        }
      }
    }

    if (removedVotes.length > 0) {
      if (removedVotes.length > 1) {
        throw({forbidden: 'Only one removed vote per change is allowed'});
      }
      if (removedVotes[0] !== userName) {
        throw({forbidden: 'User can only remove own votes'});
      }
    }
  }

  function validateComments(oldDoc, newDoc, userName) {
    if (!(newDoc && newDoc.comments)) {
      return;
    }
    var oldDocComments = (oldDoc && oldDoc.comments) || [];
    var newDocComments = newDoc.comments || [];
    var newComments = arraySubtraction(newDocComments, oldDocComments, toJSON);
    var removedComments = arraySubtraction(oldDocComments, newDocComments, toJSON);

    if (newComments.length > 0) {
      if (newComments.length > 1) {
        throw({forbidden: 'Only one new comment per change is allowed'});
      }
      if (newComments[0] === null) {
        throw({forbidden: 'New comment cannot be null'});
      }
      if (newComments[0].author !== userName) {
        throw({forbidden: 'User must be the new commenter'});
      }
    }

    if (removedComments.length > 0) {
      if (removedComments.length > 1) {
        throw({forbidden: 'Only one removed comment per change is allowed'});
      }
      if (removedComments[0].author !== userName) {
        throw({forbidden: 'User can only remove own comments'});
      }
    }
  }

  validateVotes(oldDoc, newDoc, userCtx.name);
  validateComments(oldDoc, newDoc, userCtx.name);
}
