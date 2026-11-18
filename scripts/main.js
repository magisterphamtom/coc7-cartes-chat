/**
 * CoC7 – Cartes de chat thématiques
 * Habille les messages du chat (et les cartes de jets CoC7) d'un thème :
 * « Années 20 » ou « Par-delà les Montagnes Hallucinées ».
 * Seul le CSS change : aucune donnée, aucune carte n'est modifiée.
 */

const ID = 'coc7-cartes-chat';
const THEMES = ['annees20', 'newyork', 'montagnes', 'ny2026', 'antarctique2026'];

function effectiveTheme () {
  let forced = '';
  let mine = 'annees20';
  try { forced = game.settings.get(ID, 'forceTheme'); } catch (err) { /* pas encore enregistré */ }
  try { mine = game.settings.get(ID, 'theme'); } catch (err) { /* idem */ }
  const theme = forced || mine;
  return THEMES.includes(theme) ? theme : null;
}

function applyTheme () {
  const theme = effectiveTheme();
  const body = document.body;
  for (const t of THEMES) body.classList.toggle(`c7cc-${t}`, t === theme);
  body.classList.toggle('c7cc-on', !!theme);
  if (game.ready) syncModules(theme);
}

/* -------------------------------------------- */
/*  Même thème dans le HUD de combat et TAH     */
/* -------------------------------------------- */

/** Thème du chat → skin de Combat Cthulhu HUD et style de Token Action HUD. */
const LINKED = {
  annees20: { cthud: 'noir20', tah: 'annees20' },
  newyork: { cthud: 'newyork', tah: 'newyork20' },
  montagnes: { cthud: 'montagnes', tah: 'montagnes' },
  ny2026: { cthud: 'ny2026', tah: 'ny2026' },
  antarctique2026: { cthud: 'antarctique2026', tah: 'antarctique2026' }
};

function settingExists (key) {
  return game.settings.settings.has(key);
}

async function setIfDifferent (namespace, key, value) {
  if (!settingExists(`${namespace}.${key}`)) return false;
  try {
    if (game.settings.get(namespace, key) !== value) await game.settings.set(namespace, key, value);
    return true;
  } catch (err) {
    console.error(`${ID} | Impossible de régler ${namespace}.${key}`, err);
    return false;
  }
}

async function syncModules (theme) {
  let enabled = true;
  try { enabled = game.settings.get(ID, 'syncModules'); } catch (err) { /* pas encore enregistré */ }
  const link = LINKED[theme];
  if (!enabled || !link) return;

  // Combat Cthulhu HUD (les thèmes New York et Montagnes demandent la version 0.4.0 ou plus)
  if (game.modules.get('combatcthud')?.active) {
    const choices = game.settings.settings.get('combatcthud.skin')?.choices ?? {};
    if (link.cthud in choices) await setIfDifferent('combatcthud', 'skin', link.cthud);
  }

  // Token Action HUD (thèmes fournis par le module tah-annees-20 ; ses réglages arrivent tard)
  if (game.modules.get('tah-annees-20')?.active && game.modules.get('token-action-hud-core')?.active) {
    const apply = () => setIfDifferent('token-action-hud-core', 'style', link.tah);
    if (settingExists('token-action-hud-core.style')) await apply();
    else Hooks.once('tahAnnees20Ready', apply);
  }
}

Hooks.once('init', () => {
  game.settings.register(ID, 'theme', {
    name: 'C7CC.Settings.Theme.Name',
    hint: 'C7CC.Settings.Theme.Hint',
    scope: 'client',
    config: true,
    type: String,
    choices: {
      none: 'C7CC.Themes.none',
      annees20: 'C7CC.Themes.annees20',
      newyork: 'C7CC.Themes.newyork',
      montagnes: 'C7CC.Themes.montagnes',
      ny2026: 'C7CC.Themes.ny2026',
      antarctique2026: 'C7CC.Themes.antarctique2026'
    },
    default: 'annees20',
    onChange: applyTheme
  });

  game.settings.register(ID, 'forceTheme', {
    name: 'C7CC.Settings.Force.Name',
    hint: 'C7CC.Settings.Force.Hint',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      '': 'C7CC.Settings.Force.Free',
      none: 'C7CC.Themes.none',
      annees20: 'C7CC.Themes.annees20',
      newyork: 'C7CC.Themes.newyork',
      montagnes: 'C7CC.Themes.montagnes',
      ny2026: 'C7CC.Themes.ny2026',
      antarctique2026: 'C7CC.Themes.antarctique2026'
    },
    default: '',
    onChange: applyTheme
  });

  game.settings.register(ID, 'syncModules', {
    name: 'C7CC.Settings.Sync.Name',
    hint: 'C7CC.Settings.Sync.Hint',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
    onChange: applyTheme
  });

  game.settings.register(ID, 'rattrapageVisible', {
    name: 'C7CC.Settings.Rattrapage.Name',
    hint: 'C7CC.Settings.Rattrapage.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  applyTheme();
});

Hooks.once('ready', applyTheme);

/* -------------------------------------------- */
/*  Initiale du personnage (pastille du thème   */
/*  New York 2026, façon ligne de métro)        */
/* -------------------------------------------- */

Hooks.on('renderChatMessageHTML', (message, html) => {
  try {
    const sender = html?.querySelector?.('.message-sender');
    if (!sender) return;
    const name = (sender.textContent || '').trim().replace(/^["'«\s]+/, '');
    sender.dataset.initial = (name[0] || '?').toUpperCase();
  } catch (err) { /* purement décoratif */ }
});

/* -------------------------------------------- */
/*  Pousser le jet / Dépenser la Chance :        */
/*  boutons toujours visibles sous le résultat   */
/*  (CoC7 les range dans le détail des dés, qui  */
/*  est replié) + compteur de Chance.            */
/* -------------------------------------------- */

Hooks.on('renderChatMessageHTML', (message, html) => {
  try {
    if (!game.settings.get(ID, 'rattrapageVisible')) return;
    if (typeof message.flags?.CoC7?.load?.as === 'undefined') return;
    html.querySelectorAll('.dice-roll').forEach((roll) => {
      const bloc = roll.querySelector('.dice-tooltip .owner-and-keeper-block.coc7-card-buttons');
      if (!bloc) return;
      const boutons = [...bloc.querySelectorAll('button[data-action="push"], button[data-action="luck"]')];
      if (!boutons.length) return;

      // Seuls le Gardien et le propriétaire du personnage voient ces boutons (CoC7 retire le bloc chez les autres)
      let acteur = null;
      try { acteur = bloc.dataset.actorUuid ? fromUuidSync(bloc.dataset.actorUuid) : null; } catch { acteur = null; }
      acteur = acteur?.actor ?? acteur;
      if (!game.user.isGM && !acteur?.isOwner) return;

      const zone = document.createElement('div');
      zone.className = 'c7cc-rattrapage coc7-card-buttons';
      zone.dataset.actorUuid = bloc.dataset.actorUuid ?? '';

      const chance = Number(acteur?.system?.attribs?.luck?.value);
      const avecChance = boutons.some((b) => b.dataset.action === 'luck') && Number.isFinite(chance);
      if (avecChance) {
        const info = document.createElement('div');
        info.className = 'c7cc-chance-info';
        info.innerHTML = `<i class="fa-solid fa-clover"></i> ${game.i18n.format('C7CC.Rattrapage.Chance', { n: chance })}`;
        zone.append(info);
      }

      for (const b of boutons) {
        if (b.dataset.action === 'luck' && avecChance) {
          const cout = parseInt(b.dataset.luckSpend, 10);
          if (Number.isFinite(cout)) {
            const reste = document.createElement('span');
            reste.className = 'c7cc-reste';
            reste.textContent = ` ${game.i18n.format('C7CC.Rattrapage.Reste', { n: chance - cout })}`;
            b.append(reste);
          }
        }
        if (b.dataset.action === 'push') {
          // CoC7 replie le détail des dés avant de pousser : on lui laisse un élément « déplié » à replier
          b.addEventListener('click', () => {
            const li = b.closest('li.chat-message');
            if (li && !li.querySelector('.expanded')) {
              const leurre = document.createElement('span');
              leurre.className = 'expanded c7cc-leurre';
              leurre.hidden = true;
              li.append(leurre);
            }
          }, { capture: true });
        }
        zone.append(b); // on déplace le bouton (ses écouteurs suivent)
      }
      roll.after(zone);
    });
  } catch (err) {
    console.warn('coc7-cartes-chat | boutons Pousser / Chance', err);
  }
});
