/**
 * Manages event listeners relevant to the UI (menu bar, buttons, etc.) of the web page
 */
'use strict';
/** @typedef {import('./pikavolley.js').PikachuVolleyball} PikachuVolleyball */
/** @typedef {import('pixi.js-legacy').Ticker} Ticker */

/**
 * Enum for "game paused by what?".
 * The greater the number, the higher the precedence.
 *
 * @readonly
 * @enum {number}
 */
const PauseResumePrecedence = {
  pauseBtn: 3,
  messageBox: 2,
  dropdown: 1,
  notPaused: 0,
};

/**
 * Manages pausing and resuming of the game
 */
const pauseResumeManager = {
  /** @type {number} PauseResumePrecedence enum */
  _precedence: PauseResumePrecedence.notPaused,
  /**
   * Pause game
   * @param {PikachuVolleyball} pikaVolley
   * @param {number} precedence PauseResumePrecedence enum
   */
  pause: function (pikaVolley, precedence) {
    // @ts-ignore
    if (precedence > this._precedence) {
      pikaVolley.paused = true;
      this._precedence = precedence;
    }
  },
  /**
   * Resume game
   * @param {PikachuVolleyball} pikaVolley
   * @param {number} precedence PauseResumePrecedence enum
   */
  resume: function (pikaVolley, precedence) {
    if (precedence === this._precedence) {
      pikaVolley.paused = false;
      this._precedence = PauseResumePrecedence.notPaused;
    }
  },
};

/**
 * Set up the user interface: menu bar, buttons, dropdowns, submenus, etc.
 * @param {PikachuVolleyball} pikaVolley
 * @param {Ticker} ticker
 */
export function setUpUI(pikaVolley, ticker) {
  setUpBtns(pikaVolley, ticker);
  setUpToShowDropdownsAndSubmenus(pikaVolley);

  // hide or show menubar if the user presses the "esc" key
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Escape') {
      const menuBar = document.getElementById('menu-bar');
      if (menuBar.classList.contains('hidden')) {
        menuBar.classList.remove('hidden');
      } else {
        menuBar.classList.add('hidden');
      }
      event.preventDefault();
    }
  });
}

/**
 * Attach event listeners to the buttons
 * @param {PikachuVolleyball} pikaVolley
 * @param {Ticker} ticker
 */
function setUpBtns(pikaVolley, ticker) {
  const gameDropdownBtn = document.getElementById('game-dropdown-btn');
  const optionsDropdownBtn = document.getElementById('options-dropdown-btn');

  const pauseBtn = document.getElementById('pause-btn');
  pauseBtn.addEventListener('click', () => {
    if (pauseBtn.classList.contains('selected')) {
      pauseBtn.classList.remove('selected');
      pauseResumeManager.resume(pikaVolley, PauseResumePrecedence.pauseBtn);
    } else {
      pauseBtn.classList.add('selected');
      pauseResumeManager.pause(pikaVolley, PauseResumePrecedence.pauseBtn);
    }
  });

  const restartBtn = document.getElementById('restart-btn');
  restartBtn.addEventListener('click', () => {
    if (pauseBtn.classList.contains('selected')) {
      pauseBtn.classList.remove('selected');
      pauseResumeManager.resume(pikaVolley, PauseResumePrecedence.pauseBtn);
    }
    pikaVolley.restart();
  });

  const bgmOnBtn = document.getElementById('bgm-on-btn');
  const bgmOffBtn = document.getElementById('bgm-off-btn');
  bgmOnBtn.addEventListener('click', () => {
    bgmOffBtn.classList.remove('selected');
    bgmOnBtn.classList.add('selected');
    pikaVolley.audio.turnBGMVolume(true);
  });
  bgmOffBtn.addEventListener('click', () => {
    bgmOnBtn.classList.remove('selected');
    bgmOffBtn.classList.add('selected');
    pikaVolley.audio.turnBGMVolume(false);
  });

  const stereoBtn = document.getElementById('stereo-btn');
  const monoBtn = document.getElementById('mono-btn');
  const sfxOffBtn = document.getElementById('sfx-off-btn');
  stereoBtn.addEventListener('click', () => {
    monoBtn.classList.remove('selected');
    sfxOffBtn.classList.remove('selected');
    stereoBtn.classList.add('selected');
    pikaVolley.audio.turnSFXVolume(true);
    pikaVolley.isStereoSound = true;
  });
  monoBtn.addEventListener('click', () => {
    sfxOffBtn.classList.remove('selected');
    stereoBtn.classList.remove('selected');
    monoBtn.classList.add('selected');
    pikaVolley.audio.turnSFXVolume(true);
    pikaVolley.isStereoSound = false;
  });
  sfxOffBtn.addEventListener('click', () => {
    stereoBtn.classList.remove('selected');
    monoBtn.classList.remove('selected');
    sfxOffBtn.classList.add('selected');
    pikaVolley.audio.turnSFXVolume(false);
  });

  // Game speed:
  //   slow: 24 FPS
  //   medium: 30 FPS
  //   fast: 36 FPS
  const slowSpeedBtn = document.getElementById('slow-speed-btn');
  const mediumSpeedBtn = document.getElementById('medium-speed-btn');
  const fastSpeedBtn = document.getElementById('fast-speed-btn');
  slowSpeedBtn.addEventListener('click', () => {
    mediumSpeedBtn.classList.remove('selected');
    fastSpeedBtn.classList.remove('selected');
    slowSpeedBtn.classList.add('selected');

    pikaVolley.normalFPS = 24;
    ticker.maxFPS = pikaVolley.normalFPS;
  });
  mediumSpeedBtn.addEventListener('click', () => {
    fastSpeedBtn.classList.remove('selected');
    slowSpeedBtn.classList.remove('selected');
    mediumSpeedBtn.classList.add('selected');

    pikaVolley.normalFPS = 30;
    ticker.maxFPS = pikaVolley.normalFPS;
  });
  fastSpeedBtn.addEventListener('click', () => {
    slowSpeedBtn.classList.remove('selected');
    mediumSpeedBtn.classList.remove('selected');
    fastSpeedBtn.classList.add('selected');

    pikaVolley.normalFPS = 36;
    ticker.maxFPS = pikaVolley.normalFPS;
  });

  const winningScore5Btn = document.getElementById('winning-score-5-btn');
  const winningScore10Btn = document.getElementById('winning-score-10-btn');
  const winningScore15Btn = document.getElementById('winning-score-15-btn');
  const noticeBox1 = document.getElementById('notice-box-1');
  const noticeOKBtn1 = document.getElementById('notice-ok-btn-1');
  const winningScoreInNoticeBox1 = document.getElementById(
    'winning-score-in-notice-box-1'
  );
  function isWinningScoreAlreadyReached(winningScore) {
    const isGamePlaying =
      pikaVolley.state === pikaVolley.round ||
      pikaVolley.state === pikaVolley.afterEndOfRound ||
      pikaVolley.state === pikaVolley.beforeStartOfNextRound;
    if (
      isGamePlaying &&
      (pikaVolley.scores[0] >= winningScore ||
        pikaVolley.scores[1] >= winningScore)
    ) {
      return true;
    }
    return false;
  }
  const noticeBox2 = document.getElementById('notice-box-2');
  const noticeOKBtn2 = document.getElementById('notice-ok-btn-2');
  winningScore5Btn.addEventListener('click', () => {
    if (winningScore5Btn.classList.contains('selected')) {
      return;
    }
    if (pikaVolley.isPracticeMode === true) {
      noticeBox2.classList.remove('hidden');
      // @ts-ignore
      gameDropdownBtn.disabled = true;
      // @ts-ignore
      optionsDropdownBtn.disabled = true;
      // @ts-ignore
      aboutBtn.disabled = true;
      pauseResumeManager.pause(pikaVolley, PauseResumePrecedence.messageBox);
      return;
    }
    if (isWinningScoreAlreadyReached(5)) {
      winningScoreInNoticeBox1.textContent = '5';
      noticeBox1.classList.remove('hidden');
      // @ts-ignore
      gameDropdownBtn.disabled = true;
      // @ts-ignore
      optionsDropdownBtn.disabled = true;
      // @ts-ignore
      aboutBtn.disabled = true;
      pauseResumeManager.pause(pikaVolley, PauseResumePrecedence.messageBox);
      return;
    }
    winningScore10Btn.classList.remove('selected');
    winningScore15Btn.classList.remove('selected');
    winningScore5Btn.classList.add('selected');
    pikaVolley.winningScore = 5;
  });
  winningScore10Btn.addEventListener('click', () => {
    if (winningScore10Btn.classList.contains('selected')) {
      return;
    }
    if (pikaVolley.isPracticeMode === true) {
      noticeBox2.classList.remove('hidden');
      // @ts-ignore
      gameDropdownBtn.disabled = true;
      // @ts-ignore
      optionsDropdownBtn.disabled = true;
      // @ts-ignore
      aboutBtn.disabled = true;
      pauseResumeManager.pause(pikaVolley, PauseResumePrecedence.messageBox);
      return;
    }
    if (isWinningScoreAlreadyReached(10)) {
      winningScoreInNoticeBox1.textContent = '10';
      noticeBox1.classList.remove('hidden');
      // @ts-ignore
      gameDropdownBtn.disabled = true;
      // @ts-ignore
      optionsDropdownBtn.disabled = true;
      // @ts-ignore
      aboutBtn.disabled = true;
      pauseResumeManager.pause(pikaVolley, PauseResumePrecedence.messageBox);
      return;
    }
    winningScore15Btn.classList.remove('selected');
    winningScore5Btn.classList.remove('selected');
    winningScore10Btn.classList.add('selected');
    pikaVolley.winningScore = 10;
  });
  winningScore15Btn.addEventListener('click', () => {
    if (winningScore15Btn.classList.contains('selected')) {
      return;
    }
    if (pikaVolley.isPracticeMode === true) {
      noticeBox2.classList.remove('hidden');
      // @ts-ignore
      gameDropdownBtn.disabled = true;
      // @ts-ignore
      optionsDropdownBtn.disabled = true;
      // @ts-ignore
      aboutBtn.disabled = true;
      pauseResumeManager.pause(pikaVolley, PauseResumePrecedence.messageBox);
      return;
    }
    if (isWinningScoreAlreadyReached(15)) {
      winningScoreInNoticeBox1.textContent = '15';
      noticeBox1.classList.remove('hidden');
      // @ts-ignore
      gameDropdownBtn.disabled = true;
      // @ts-ignore
      optionsDropdownBtn.disabled = true;
      // @ts-ignore
      aboutBtn.disabled = true;
      pauseResumeManager.pause(pikaVolley, PauseResumePrecedence.messageBox);
      return;
    }
    winningScore5Btn.classList.remove('selected');
    winningScore10Btn.classList.remove('selected');
    winningScore15Btn.classList.add('selected');
    pikaVolley.winningScore = 15;
  });
  noticeOKBtn1.addEventListener('click', () => {
    if (!noticeBox1.classList.contains('hidden')) {
      noticeBox1.classList.add('hidden');
      // @ts-ignore
      gameDropdownBtn.disabled = false;
      // @ts-ignore
      optionsDropdownBtn.disabled = false;
      // @ts-ignore
      aboutBtn.disabled = false;
      pauseResumeManager.resume(pikaVolley, PauseResumePrecedence.messageBox);
    }
  });
  noticeOKBtn2.addEventListener('click', () => {
    if (!noticeBox2.classList.contains('hidden')) {
      noticeBox2.classList.add('hidden');
      // @ts-ignore
      gameDropdownBtn.disabled = false;
      // @ts-ignore
      optionsDropdownBtn.disabled = false;
      // @ts-ignore
      aboutBtn.disabled = false;
      pauseResumeManager.resume(pikaVolley, PauseResumePrecedence.messageBox);
    }
  });

  const practiceModeOnBtn = document.getElementById('practice-mode-on-btn');
  const practiceModeOffBtn = document.getElementById('practice-mode-off-btn');
  practiceModeOnBtn.addEventListener('click', () => {
    practiceModeOffBtn.classList.remove('selected');
    practiceModeOnBtn.classList.add('selected');
    pikaVolley.isPracticeMode = true;
  });
  practiceModeOffBtn.addEventListener('click', () => {
    practiceModeOnBtn.classList.remove('selected');
    practiceModeOffBtn.classList.add('selected');
    pikaVolley.isPracticeMode = false;
  });

  const deuceOnBtn = document.getElementById('deuce-on-btn');
  const deuceOffBtn = document.getElementById('deuce-off-btn');
  deuceOnBtn.addEventListener('click', () => {
    deuceOffBtn.classList.remove('selected');
    deuceOnBtn.classList.add('selected');
    pikaVolley.isDeuce = true;
  });
  deuceOffBtn.addEventListener('click', () => {
    deuceOnBtn.classList.remove('selected');
    deuceOffBtn.classList.add('selected');
    pikaVolley.isDeuce = false;
  });

  /*const aboutBox = document.getElementById('about-box');
  const closeAboutBtn = document.getElementById('close-about-btn');
  aboutBtn.addEventListener('click', () => {
    if (aboutBox.classList.contains('hidden')) {
      aboutBox.classList.remove('hidden');
      // @ts-ignore
      gameDropdownBtn.disabled = true;
      // @ts-ignore
      optionsDropdownBtn.disabled = true;
      pauseResumeManager.pause(pikaVolley, PauseResumePrecedence.messageBox);
    } else {
      aboutBox.classList.add('hidden');
      // @ts-ignore
      gameDropdownBtn.disabled = false;
      // @ts-ignore
      optionsDropdownBtn.disabled = false;
      pauseResumeManager.resume(pikaVolley, PauseResumePrecedence.messageBox);
    }
  });
  closeAboutBtn.addEventListener('click', () => {
    if (!aboutBox.classList.contains('hidden')) {
      aboutBox.classList.add('hidden');
      // @ts-ignore
      gameDropdownBtn.disabled = false;
      // @ts-ignore
      optionsDropdownBtn.disabled = false;
      pauseResumeManager.resume(pikaVolley, PauseResumePrecedence.messageBox);
    }
  });*/
}

/**
 * Attach event listeners to show dropdowns and submenus properly
 * @param {PikachuVolleyball} pikaVolley
 */
function setUpToShowDropdownsAndSubmenus(pikaVolley) {
  // hide dropdowns and submenus if the user clicks outside of these
  window.addEventListener('click', (event) => {
    // @ts-ignore
    if (!event.target.matches('.dropdown-btn, .submenu-btn')) {
      hideSubmenus();
      hideDropdownsExcept('');
      pauseResumeManager.resume(pikaVolley, PauseResumePrecedence.dropdown);
    }
  });

  // set up to show dropdowns
  document.getElementById('game-dropdown-btn').addEventListener('click', () => {
    toggleDropdown('game-dropdown', pikaVolley);
  });
  document
    .getElementById('options-dropdown-btn')
    .addEventListener('click', () => {
      toggleDropdown('options-dropdown', pikaVolley);
    });

  // set up to show submenus on mouseover event
  document
    .getElementById('bgm-submenu-btn')
    .addEventListener('mouseover', () => {
      showSubmenu('bgm-submenu-btn', 'bgm-submenu');
    });
  document
    .getElementById('sfx-submenu-btn')
    .addEventListener('mouseover', () => {
      showSubmenu('sfx-submenu-btn', 'sfx-submenu');
    });
  document
    .getElementById('speed-submenu-btn')
    .addEventListener('mouseover', () => {
      showSubmenu('speed-submenu-btn', 'speed-submenu');
    });
  document
    .getElementById('winning-score-submenu-btn')
    .addEventListener('mouseover', () => {
      showSubmenu('winning-score-submenu-btn', 'winning-score-submenu');
    });
  document
    .getElementById('practice-mode-submenu-btn')
    .addEventListener('mouseover', () => {
      showSubmenu('practice-mode-submenu-btn', 'practice-mode-submenu');
    });
  document
    .getElementById('deuce-submenu-btn')
    .addEventListener('mouseover', () => {
      showSubmenu('deuce-submenu-btn', 'deuce-submenu');
    });

  // set up to show submenus on click event
  // (it is for touch device equipped with physical keyboard)
  document.getElementById('bgm-submenu-btn').addEventListener('click', () => {
    showSubmenu('bgm-submenu-btn', 'bgm-submenu');
  });
  document.getElementById('sfx-submenu-btn').addEventListener('click', () => {
    showSubmenu('sfx-submenu-btn', 'sfx-submenu');
  });
  document.getElementById('speed-submenu-btn').addEventListener('click', () => {
    showSubmenu('speed-submenu-btn', 'speed-submenu');
  });
  document
    .getElementById('winning-score-submenu-btn')
    .addEventListener('click', () => {
      showSubmenu('winning-score-submenu-btn', 'winning-score-submenu');
    });
  document
    .getElementById('practice-mode-submenu-btn')
    .addEventListener('click', () => {
      showSubmenu('practice-mode-submenu-btn', 'practice-mode-submenu');
    });
  document
    .getElementById('deuce-submenu-btn')
    .addEventListener('click', () => {
      showSubmenu('deuce-submenu-btn', 'deuce-submenu');
    });
}

/**
 * Toggle (show or hide) the dropdown menu
 * @param {string} dropdownID html element id of the dropdown to toggle
 * @param {PikachuVolleyball} pikaVolley
 */
function toggleDropdown(dropdownID, pikaVolley) {
  hideSubmenus();
  hideDropdownsExcept(dropdownID);
  const willShow = document.getElementById(dropdownID).classList.toggle('show');
  if (willShow) {
    pauseResumeManager.pause(pikaVolley, PauseResumePrecedence.dropdown);
  } else {
    pauseResumeManager.resume(pikaVolley, PauseResumePrecedence.dropdown);
  }
}

/**
 * Show the submenu
 * @param {string} submenuBtnID html element id of the submenu button whose submenu to show
 * @param {string} subMenuID html element id of the submenu to show
 */
function showSubmenu(submenuBtnID, subMenuID) {
  hideSubmenus();
  document.getElementById(submenuBtnID).classList.add('open');
  document.getElementById(subMenuID).classList.add('show');
}

/**
 * Hide all other dropdowns except the dropdown
 * @param {string} dropdownID html element id of the dropdown
 */
function hideDropdownsExcept(dropdownID) {
  const dropdowns = document.getElementsByClassName('dropdown');
  for (let i = 0; i < dropdowns.length; i++) {
    if (dropdowns[i].id !== dropdownID) {
      dropdowns[i].classList.remove('show');
    }
  }
}

/**
 * Hide all submenus
 */
function hideSubmenus() {
  const submenus = document.getElementsByClassName('submenu');
  for (let i = 0; i < submenus.length; i++) {
    submenus[i].classList.remove('show');
  }
  const submenuBtns = document.getElementsByClassName('submenu-btn');
  for (let i = 0; i < submenuBtns.length; i++) {
    submenuBtns[i].classList.remove('open');
  }
}
