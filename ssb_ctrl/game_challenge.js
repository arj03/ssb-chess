const pull = require("pull-stream");

module.exports = (sbot, myIdent) => {

  const startingFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  function inviteToPlay(invitingPubKey, asWhite) {

    const post = {
      'type': 'ssb_chess_invite',
      'inviting': invitingPubKey,
      'myColor': asWhite? 'white' : 'black'
    }

    sbot.publish(post, function(err,msg) {
      console.log("Posting invite: " + console.dir(msg));
    });
  }

  function acceptChallenge(gameRootMessage) {
    const post = {
      'type': 'ssb_chess_invite_accept',
      'root': gameRootMessage
    }

    sbot.publish(post, function(err, msg) {
      console.log("Error while accepting game invite: " + console.dir(err));
      console.log("Accepting game invite: " + console.dir(msg));
    })
  }

  function pendingChallengesSent() {
    const myFeedSource = sbot.createHistoryStream({
      id: myIdent
    });

    const filterByChallengeSentThrough = pull.filter(msg => msg.value.content.type==="ssb_chess_invite");

    return new Promise( (resolve, reject) => {
      pull(myFeedSource, filterByChallengeSentThrough, pull.collect( (err, challengeMessages) => {
        if (err) {
          reject(err);
        } else {
          const acceptedChallenges = challengeMessages.map(challengeMessage =>
             getAcceptMessageIfExists(challengeMessage.key, challengeMessage.value.content.inviting));

          //console.dir(challengeMessages);

          const allChallenges = challengeMessages.map(challenge => challenge.key);

          Promise.all(acceptedChallenges).then(acceptedIds => {
            const unacceptedChallenges = diffArrays(allChallenges, acceptedIds.filter(i => i != null));

            resolve(unacceptedChallenges);
          });

        }
      }));

    });
  }

  function pendingChallengesReceived() {

  }

  function diffArrays(arr1, arr2) {
    return arr1.filter(function(i) {return arr2.indexOf(i) < 0;});
  };

  function getAcceptMessageIfExists(rootGameId, inviteSentTo) {
    return new Promise( (resolve, reject) => {
      const source = sbot.links({
        dest: rootGameId,
        values: true,
        keys: false
      });

      pull(source,
        pull.find(msg => msg.value.content.type === "ssb_chess_invite_accept" && msg.value.author === inviteSentTo, (err, result) => {
          if (err) {
            reject(err);
          } else {
            // Result is 'null' if no such message
            var id = result != null? result.value.content.root : null;
            resolve(id);
          }
        }));
    })
  }

  return {
    inviteToPlay: inviteToPlay,
    acceptChallenge: acceptChallenge,
    pendingChallengesSent: pendingChallengesSent,
    pendingChallengesReceived: pendingChallengesReceived
  }
}
