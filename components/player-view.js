const React = require('react');
const ReactTooltip = require('react-tooltip');
const cn = require('classnames');

const ytCtrl = require('../client-lib/yt-ctrl.js');
const sendMetricsEvent = require('../client-lib/send-metrics-event.js');
const sendToAddon = require('../client-lib/send-to-addon.js');
const GeneralControls = require('./general-controls.js');

function formatTime(seconds) {
  const now = new Date(seconds * 1000);
  const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000));
  return utc.toLocaleTimeString('en-US', {hour12: false})
    .replace(/^00:/, '') // Strip leading "00:" if hours is empty.
    .replace(/^0/, '');  // Strip leading "0" in minutes, if any.
}

module.exports = React.createClass({
  getInitialState: function() {
    return {showVolume: false, hovered: false};
  },
  step: function() {
    const currentTime = this.isYt ? ytCtrl.getTime() : this.refs.video.currentTime;

    window.AppData = Object.assign(window.AppData, {
      currentTime: `${formatTime(currentTime)} / ${formatTime(window.AppData.duration)}`,
      progress: currentTime / window.AppData.duration
    });

    // TODO: the "-1" is a hack to force YouTube embeds to do what we
    // want. #184
    if (currentTime >= window.AppData.duration - 1) {
      window.AppData = Object.assign(window.AppData, {
        playing: false,
        playedCount: (window.AppData.playedCount + 1)
      });

      sendMetricsEvent('player_view', 'video_ended');
    }

    if (window.AppData.playing) requestAnimationFrame(this.step);
  },
  onLoaded: function() {
    sendMetricsEvent('player_view', 'video_loaded');
    const duration = this.isYt ? ytCtrl.getDuration() : this.refs.video.duration;

    // set initial volume
    this.setVolume({
      target: {
        value: this.props.volume
      }
    });

    window.AppData = Object.assign(window.AppData, {
      loaded: true,
      duration: duration
    });

    requestAnimationFrame(this.step);
  },
  componentWillMount: function() {
    this.isYt = !!~this.props.domain.indexOf('youtube.com');
  },
  componentDidMount: function() {
    if (this.isYt) {
      const PLAYING = window.YT.PlayerState.PLAYING;
      const PAUSED = window.YT.PlayerState.PAUSED;

      ytCtrl.init('video', {
        onReady: this.onLoaded,
        onStateChange: (ev) => {
          if (ev.data === PLAYING && !this.props.playing) this.play();
          else if (ev.data === PAUSED && this.props.playing) this.pause();
        },
        onError: (err) => {
          const url = `https://youtube.com/watch?v=${this.props.id}`;
          window.AppData.error = `There was an error loading your video from ${url}`;
          console.error('Error: ytCtrl: ', err); // eslint-disable-line no-console
        }
      });
    } else {
      this.refs.video.addEventListener('canplay', this.onLoaded);
      this.refs.video.addEventListener('durationchange', this.onLoaded);
    }
  },
  play: function() {
    if (this.hasExited() && !this.isYt) {
      if (!this.isYt) {
        return this.replay();
      } else {
        sendMetricsEvent('player_view', 'replay');
      }
    }
    sendMetricsEvent('player_view', 'play');
    if (this.isYt) {
      ytCtrl.play();
    } else {
      this.refs.video.play();
    }
    window.AppData.playing = true;
    requestAnimationFrame(this.step);
  },
  pause: function() {
    sendMetricsEvent('player_view', 'pause');
    if (this.isYt) {
      ytCtrl.pause();
    } else {
      this.refs.video.pause();
    }

    window.AppData.playing = false;
  },
  mute: function() {
    sendMetricsEvent('player_view', 'mute');

    if (this.isYt) {
      ytCtrl.mute();
    } else {
      this.refs.video.muted = true;
    }

    window.AppData = Object.assign(window.AppData, {muted: true});
  },
  unmute: function() {
    sendMetricsEvent('player_view', 'unmute');

    if (this.isYt) {
      ytCtrl.unmute();
      ytCtrl.setVolume(window.AppData.volume * 100);
    } else {
      this.refs.video.muted = false;
    }

    window.AppData = Object.assign(window.AppData, {muted: false});
  },
  setVolume: function(ev) {
    const muted = (ev.target.value === 0);

    if (this.isYt) {
      ytCtrl.setVolume(parseFloat(ev.target.value) * 100);
    } else {
      this.refs.video.volume = ev.target.value;
    }

    window.AppData = Object.assign(window.AppData, {
      muted: muted,
      volume: ev.target.value
    });
  },
  setTime: function(ev) {
    const x = ev.pageX - ev.target.offsetLeft;
    const clickedValue = x * ev.target.max / ev.target.offsetWidth;

    if (this.isYt) {
      ytCtrl.setTime(window.AppData.duration * clickedValue);
    } else {
      this.refs.video.currentTime = window.AppData.duration * clickedValue;
    }
  },
  replay: function() {
    sendMetricsEvent('player_view', 'replay');
    this.refs.video.currentTime = 0;
    this.step(); // step once to set currentTime of window.AppData and progress
    this.play();
  },
  close: function() {
    sendMetricsEvent('player_view', 'close');
    sendToAddon({action: 'close'});
  },
  enterControls: function() {
    this.setState({showVolume: true});
  },
  leaveControls: function() {
    this.setState({showVolume: false});
  },
  enterPlayer: function() {
    this.setState({hovered: true});
  },
  leavePlayer: function() {
    this.setState({hovered: false});
  },
  hasExited: function() {
    if (!this.refs.video || !window.AppData.loaded) return false;
    const currentTime = this.isYt ? ytCtrl.getTime() : this.refs.video.currentTime;
    return (!this.props.playing && (currentTime >= this.props.duration - 1)); // TODO: the "-1" is a hack to force YouTube embeds to do what we want. #184
  },
  handleVideoClick: function(ev) {
    if (!ev.target.classList.contains('video-wrapper')) return;
    if (this.props.playing) this.pause();
    else this.play();
  },
  render: function() {
    const noop = () => false;
    const videoEl = this.isYt ?
          (<iframe id={'video'} ref={'video'} src={this.props.src} onContextMenu={noop} />) :
          (<video id={'video'} ref={'video'} src={this.props.src} autoplay={false} onContextMenu={noop} />);

    return (
        <div className={'video-wrapper'} onMouseEnter={this.enterPlayer}
             onMouseLeave={this.leavePlayer} onClick={this.handleVideoClick}>
          <div className={cn('controls', {hidden: !this.state.hovered, minimized: this.props.minimized})}
               onMouseEnter={this.enterControls} onMouseLeave={this.leaveControls}>
            <div className='left'>
              <ReactTooltip place='bottom' effect='solid' />

              <a onClick={this.play} data-tip='Play'
                 className={cn('play', {hidden: this.props.playing})} />
              <a onClick={this.pause} data-tip='Pause'
                 className={cn('pause', {hidden: !this.props.playing})} />
              <a onClick={this.mute} data-tip='Mute'
                 className={cn('mute', {hidden: this.props.muted})} />
              <a onClick={this.unmute} data-tip='Unmute'
                 className={cn('unmute', {hidden: !this.props.muted})} />
              <input type='range' className={cn('volume', {hidden: !this.state.showVolume})}
                     min='0' max='1' step='.01' value={this.props.muted ? 0 : this.props.volume}
                     onChange={this.setVolume}/>
            </div>

            <GeneralControls {...this.props} isYt={this.isYt} />
          </div>

          <div className={cn('exited', {hidden: !this.hasExited()})}>
            <div className='row'>
              <button className='exit-replay' onClick={this.replay}></button>
              <button className='exit-close' onClick={this.close}></button>
            </div>
          </div>

          <div className={cn('progress', {hidden: !this.state.hovered || this.props.minimized})}>
            <span className={'domain'}>{this.props.domain}</span>
            <div className={'time'}>{this.props.currentTime}</div>
            <progress className={'video-progress'} onClick={this.setTime}
                      value={this.props.progress + ''}  />
          </div>

          {videoEl}
        </div>
    );
  }
});
