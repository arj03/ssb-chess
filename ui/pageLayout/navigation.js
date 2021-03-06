const m = require('mithril');
const PubSub = require('pubsub-js');
const SettingsDialog = require('../settings/settings-dialog');

module.exports = (gameCtrl, settings) => {

  const gamesInProgress = {
    name: "Games",
    link: "/my_games",
    count: 0,
    countHoverText: () => `You have ${gamesInProgress.count} games in progress.`
  };
  const gamesMyMove = {
    name: "My Move",
    link: "/games_my_move",
    count: 0,
    countUpdateFn: gameCtrl.getGamesWhereMyMove,
    countHoverText: () => `${gamesMyMove.count} games awaiting your move.`
  };
  const invitations = {
    name: 'Invitations',
    link: "/invitations",
    count: 0,
    countUpdateFn: gameCtrl.pendingChallengesReceived,
    countHoverText: () => `${invitations.count} pending invitations received.`
  };
  const observable = {
    name: 'Observe',
    link: "/observable",
    count: 0,
    countUpdateFn: gameCtrl.getFriendsObservableGames,
    countOnHoverOnly: true,
    countHoverText: () => `${observable.count} observable games.`
  };

  var navItems = [gamesInProgress, gamesMyMove, invitations, observable];

  function renderNavItem(navItem) {
    return m('span', {
      class: 'ssb-chess-nav-item'
    }, m("a[href=" + navItem.link + "]", {
        oncreate: m.route.link,
        title: navItem.countHoverText()
      },

      [m('span', navItem.name),
        m('span', {
          style: (navItem.countOnHoverOnly || navItem.count === 0) ? 'display: none' : '',
          class: 'ssb-chess-nav-count'
        }, `(${navItem.count})`)
      ]));
  }

  var closeSettingsDialog = () => {
    var dialogElementId = 'ssb-chess-settings-dialog';
    var element = document.getElementById(dialogElementId);

    if (element) {
      element.parentNode.removeChild(element);
    }
  }

  var showSettings = () => {

    var element = document.getElementById('ssb-chess-settings-dialog');

    if (!element) {
      var container = document.createElement('div');
      container.id = 'ssb-chess-settings-dialog';

      var settingsDialog = SettingsDialog(settings, closeSettingsDialog);

      document.body.appendChild(container);
      m.render(container, m(settingsDialog));
    }

  }

  function renderNavigation() {
    return m('div', [
      navItems.map(renderNavItem),
      m('a', {id: 'ssb-chess-settings-nav-item', href: "#", onclick: showSettings}, 'SETTINGS')
    ]);
  }

  function updateCounts() {
    var countPromises = navItems.map(item => item.countUpdateFn ? item.countUpdateFn().then(arr => arr.length) : Promise.resolve(0));

    Promise.all(countPromises).then(counts => {

      counts.forEach((count, idx) => {
        if (count !== navItems[idx].count) {
          navItems[idx].count = count;
          m.redraw();
        }
      });
    });
  }

  return {
    view: () => {
      return renderNavigation();
    },
    oncreate: () => {
      // TODO: use observables
      updateCounts();
      var fiveSeconds = 5000;
      setInterval(updateCounts, fiveSeconds);
    },
    onremove: () => {
      Pubsub.unsubscribe(this.gameUpdatesListener);
    }
  }
}
