var FancyFriday = (function() {
  var FOCUS_CHECK_INTERVAL = 10;
  var SECONDS_PER_PLAY = 5;
  var SECONDS_PER_ENDING = 2;
  var SANDBOX_PERMISSIONS = [
    'allow-same-origin',
    'allow-scripts',
    'allow-pointer-lock',
  ];

  var FancyFriday = {};
  var CustomEvent = function CustomEvent(type, params) {
    params = params || {bubbles: false, cancelable: false};
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent(type, params.bubbles, params.cancelable,
                          params.detail);
    return event;
  };

  FancyFriday.Microgame = function Microgame(url, options) {
    options = options || {};

    var microgame = document.createElement('div');
    var timeBar = document.createElement('div');
    var time = document.createElement('div');
    var iframe = document.createElement('iframe');
    var secondsPerPlay = options.secondsPerPlay || SECONDS_PER_PLAY;
    var secondsPerEnding = options.secondsPerEnding || SECONDS_PER_ENDING;
    var outOfTimeTimeout;

    if (typeof(options.sandbox) == 'undefined')
      options.sandbox = SANDBOX_PERMISSIONS;

    if (Array.isArray(options.sandbox))
      options.sandbox = options.sandbox.join(' ');

    if (typeof(options.sandbox) == 'string')
      iframe.sandbox = options.sandbox;

    iframe.src = url + (url.indexOf('?') == -1 ? '?' : '&') +
                 'playTime=' + secondsPerPlay +
                 '&endingTime=' + secondsPerEnding +
                 '&cacheBust=' + Date.now();
    microgame.classList.add('microgame');
    microgame.classList.add('loading');
    timeBar.classList.add('time-bar');
    timeBar.appendChild(time);
    time.classList.add('time');
    microgame.appendChild(timeBar);
    microgame.appendChild(iframe);

    microgame.MICROGAME_LOADING = 0;
    microgame.MICROGAME_READY = 1;
    microgame.MICROGAME_PLAYING = 2;
    microgame.MICROGAME_ENDING = 3;
    microgame.MICROGAME_ENDED = 4;

    microgame.microgameState = microgame.MICROGAME_LOADING;
    microgame.score = 0;

    microgame.handleMessage = function(data) {
      if (data == 'win') data = {type: 'end', score: 1};
      data = typeof(data) == 'string' ? {type: data} : data;

      if (!data) return;
      if (data.score >= 0 && data.score <= 1) microgame.score = data.score;

      if (data.type == "end")
        microgame.dispatchEvent(new CustomEvent("microgameending"));
    };

    microgame.send = function(message) {
      if (typeof(message) == "string") message = {type: message};
      iframe.contentWindow.postMessage(message, "*");
    };

    microgame.play = function() {
      if (microgame.microgameState != microgame.MICROGAME_READY) return;

      microgame.microgameState = microgame.MICROGAME_PLAYING;
      microgame.classList.remove("loading");

      var focusCheckInterval = setInterval(function() {
        iframe.contentWindow.focus();
        if (document.activeElement !== iframe) return;
        clearInterval(focusCheckInterval);
        time.style.transition = "width " + secondsPerPlay + "s";
        time.style.width = "0%";
        outOfTimeTimeout = setTimeout(function() {
          microgame.dispatchEvent(new CustomEvent("microgameending"));
          microgame.send("outoftime");
        }, secondsPerPlay * 1000);
        microgame.send({
          type: "play",
          playTime: secondsPerPlay,
          endingTime: secondsPerEnding
        });
      }, FOCUS_CHECK_INTERVAL);
    };

    iframe.addEventListener("load", function() {
      if (microgame.microgameState != microgame.MICROGAME_LOADING) return;

      microgame.microgameState = microgame.MICROGAME_READY;
      microgame.dispatchEvent(new CustomEvent("microgameready"));
    });

    microgame.addEventListener("microgameending", function(e) {
      if (microgame.microgameState != microgame.MICROGAME_PLAYING) return;

      microgame.microgameState = microgame.MICROGAME_ENDING;
      var curtain = document.createElement('div');
      curtain.classList.add('invisible-curtain');
      microgame.appendChild(curtain);
      clearTimeout(outOfTimeTimeout);
      timeBar.classList.add('ending');
      setTimeout(function() {
        microgame.microgameState = microgame.MICROGAME_ENDED;
        microgame.dispatchEvent(new CustomEvent("microgameended"));
      }, secondsPerEnding * 1000);
    });

    return microgame;
  }

  window.addEventListener("message", function(e) {
    var microgames = document.querySelectorAll(".microgame > iframe");

    for (var i = 0; i < microgames.length; i++)
      if (e.source === microgames[i].contentWindow)
        microgames[i].parentNode.handleMessage(e.data);
  }, false);

  return FancyFriday;
})();
