import React, { useRef, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import './App.css';
import deathSound from './assets/BK-72 - A bit shitty G (Reverse Bass).m4a'; // Import the sound file
import backgroundMusic from './assets/combined_audio_no_loops.wav'; //./assets/A Journey Awaits.mp3+./assets/Lightyeartraxx - Night Runner (Chiptune Edit).wav
import creepyMusicBackground from './assets/goo.wav';
import creepyMusic from './assets/creepy1.wav';
import StartVid from './assets/StartscreenGamePlay.mp4';
import jumpSound from './assets/jumpSound.m4a'
import WOmusic from './assets/WOtheme.m4a';
import Leaderboardmusic from './assets/ChiptuneAdventure.mp3';
import GameOverMusic from './assets/A Journey Awaits.mp3'


// Main App component
const App = () => {
  const canvasRef = useRef(null);
  const startVidRef = useRef(null); // Ref for the vid
  const [loading, setLoading] = useState(true); // State to handle loading

  // Use useEffect to set the playback speed to 0.9 when the component mounts
  useEffect(() => {
    if (startVidRef.current) {
      startVidRef.current.playbackRate = 0.9; // Set the playback speed to 0.9x
    }
  }, []);

  const StartMenu = ({ onStart }) => {
    return (
      <div className="start-menu-container">
        {/* Video element using StartVid as the source */}
        <video
          ref={startVidRef}  // This connects the ref to the video element
          className="start-video"
          src={StartVid}  // This sets the video source to the imported file
          autoPlay
          muted={isMuted}  // This is controlled by your mute toggle
          // loop
          playsInline  // Prevents fullscreen on iOS
          disablePictureInPicture  // Prevents picture-in-picture mode
          controls={false}  // Remove video controls
        />
        <div>
      <Helmet>
        <title>Cübernate</title>
      </Helmet>
      </div>
        <h1 className="start-menu-title">Cübernate</h1>
        <button className="start-button" onClick={onStart}>Single Player</button>
        {/* Mute Toggle */}
        <div className="mute-container">
          <label className="mute-label">Mute</label>
          <label className="switch">
            <input type="checkbox" checked={isMuted} onChange={toggleMute} />
            <span className="slider"></span>
          </label>
        </div>
        {/* Tilt Control Toggle */}
        <div className="tilt-container">
          <label className="tilt-label">Tilt Controls</label>
          <label className="switch">
            <input
              type="checkbox"
              checked={isTiltEnabled} // Controlled by React state
              onChange={requestPermission} // Calls the function when the checkbox is toggled
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>
    );
  };

  // Presets 
  const [player, setPlayer] = useState({
    x: 400, // Centered player horizontally on the canvas
    y: 370,
    width: 30,
    height: 30,
    velocityX: 0,
    velocityY: 0,
  });

  const [airTime, setAirTime] = useState(0);
  const [jumpCount, setjumpCount] = useState(0);
  const [isWallJumping, setIsWallJumping] = useState(false);
  const [wallDirection, setWallDirection] = useState(null); // 'left' or 'right'
  const [gameOver, setGameOver] = useState(false); // Track if the game is over
  const [score, setScore] = useState(0); // Add a state variable for score
  const [leaderboard, setLeaderboard] = useState([]); // Leaderboard to store scores
  const [playerName, setPlayerName] = useState(''); // Player name state
  const [nameSubmitted, setNameSubmitted] = useState(false); // Track if the name was submitted
  const [gameStarted, setGameStarted] = useState(false);
  const [hasKeyPressed, setHasKeyPressed] = useState(false); // Track if any key has been pressed
  const [hasButtonPressed, setHasButtonPressed] = useState(false); // Track if any key has been pressed
  const [hasGammaPressed, setHasGammaPressed] = useState(false); // Track if any key has been pressed
  const [isBOActive, setIsBOActive] = useState(false); // For Blackout
  const [isWOActive, setIsWOActive] = useState(false); // For Whiteout
  // Message state and tracking if messages have been shown
  const [currentText, setCurrentText] = useState(''); // Holds the current message to display
  const [firstMessageShown, setFirstMessageShown] = useState(false); // Tracks if the first message has been shown
  const [secondMessageShown, setSecondMessageShown] = useState(false); // Tracks if the second message has been shown
  const [BOMessageShown, setBOMessageShown] = useState(false);
  const [WOMessageShown, setWOMessageShown] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // State to handle mute/unmute
  const [isTiltEnabled, setIsTiltEnabled] = useState(false);
  const [isNight, setisNight] = useState(false); // State to handle night

  // Audio Manager Class to Handle Loading and Playing Audio
  class AudioManager {
    constructor(audioContext) {
      this.audioContext = audioContext;
      this.buffers = {};
    }

    async loadAudio(url) {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer;
    }

    async play(url, loop = false, volume = 1) {
      // Check if buffer is already loaded
      if (!this.buffers[url]) {
        this.buffers[url] = await this.loadAudio(url);
      }
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = this.buffers[url];
      source.loop = loop;
      gainNode.gain.value = volume;

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      source.start();
      return { source, gainNode };
    }

    stop(source) {
      if (source) {
        source.stop();
      }
    }
  }

  const audioContextRef = useRef(null);
  const [audioManager, setAudioManager] = useState(null);
  const [musicSources, setMusicSources] = useState({});

  // Initialize AudioContext and AudioManager
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    setAudioManager(new AudioManager(audioContextRef.current));
  }, []);

  const stopAllAudio = () => {
    // Iterate over all the audio sources in musicSources
    Object.keys(musicSources).forEach((key) => {
      const source = musicSources[key];
      if (source && typeof source.stop === 'function') {
        // If the source exists and has a stop function, stop the audio
        source.stop();
      }
    });

    // Reset the musicSources state to clear all references to stopped sources
    setMusicSources({});
  };

  // Function to play background music
  const playMusic = async () => {
    if (!isMuted && audioManager) {
      const { source } = await audioManager.play(backgroundMusic, true, 0.2); // Loop with volume
      setMusicSources((prevSources) => ({ ...prevSources, backgroundMusic: source }));
    }
  };

  // Function to stop background music
  const stopMusic = () => {
    if (musicSources.backgroundMusic) {
      audioManager.stop(musicSources.backgroundMusic);
      setMusicSources((prevSources) => ({ ...prevSources, backgroundMusic: null }));
    }
  };

  // Function to play leaderboard music
  const playLMusic = async () => {
    if (!isMuted && audioManager) {
      const { source } = await audioManager.play(Leaderboardmusic, true, 0.5); // Loop with volume
      setMusicSources((prevSources) => ({ ...prevSources, leaderboardMusic: source }));
    }
  };

  // Function to stop leaderboard music
  const stopLMusic = () => {
    if (musicSources.leaderboardMusic) {
      audioManager.stop(musicSources.leaderboardMusic);
      setMusicSources((prevSources) => ({ ...prevSources, leaderboardMusic: null }));
    }
  };

  // Function to play background music
  const playWOmusic = async () => {
    if (!isMuted && audioManager) {
      const { source } = await audioManager.play(WOmusic, true, 0.2); // Loop with volume
      setMusicSources((prevSources) => ({
        ...prevSources,
        WOmusic: source,
      }));
    }
  };

  // Function to stop background music
  const stopWOmusic = () => {
    if (musicSources.WOmusic) {
      audioManager.stop(musicSources.WOmusic);
      setMusicSources((prevSources) => ({ ...prevSources, WOmusic: null }));
    }
  };

  // Function to play background music
  const playGOmusic = async () => {
    if (!isMuted && audioManager) {
      const { source } = await audioManager.play(GameOverMusic, true, 0.2); // Loop with volume
      setMusicSources((prevSources) => ({ ...prevSources, GameOverMusic: source }));
    }
  };

  // Function to stop background music
  const stopGOmusic = () => {
    if (musicSources.GameOverMusic) {
      audioManager.stop(musicSources.GameOverMusic);
      setMusicSources((prevSources) => ({ ...prevSources, GameOverMusic: null }));
    }
  };


  const playCreepyMusic = async () => {
    if (!isMuted && audioManager) {
      // Play creepy music
      const { source: creepySource } = await audioManager.play(creepyMusic, true, 0.1); // Loop
      // Play background music
      const { source: creepyBgSource } = await audioManager.play(creepyMusicBackground, true, 0.15); // Loop

      // Store both sources in musicSources
      setMusicSources((prevSources) => ({
        ...prevSources,
        creepyMusic: creepySource,
        creepyBgMusic: creepyBgSource,
      }));
    }
  };

  // Function to stop leaderboard music (Doesnt work)
  const stopCreepyMusic = () => {
    if (musicSources.creepyMusic) {
      audioManager.stop(musicSources.creepyMusic);
      setMusicSources((prevSources) => ({ ...prevSources, creepyMusic: null }));
    }
    if (musicSources.creepyMusicBackground) {
      audioManager.stop(musicSources.creepyMusicBackground);
      setMusicSources((prevSources) => ({ ...prevSources, creepyMusicBackground: null }));
    }
  };

  // Function to play death sound
  const playDeathSound = async () => {
    if (!isMuted && audioManager) {
      await audioManager.play(deathSound, false); // Play once
    }
  };

  // Function to play jump sound
  const playJumpSound = async () => {
    if (!isMuted && audioManager) {
      await audioManager.play(jumpSound, false); // Play once
    }
  };


  // Function to toggle mute/unmute
  const toggleMute = () => {
    setIsMuted((prevState) => !prevState);
  };


  // Define requestPermission function outside of useEffect
  const requestPermission = async () => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation);
          setIsTiltEnabled(true); // Set tilt enabled when permission is granted
        }
      } catch (error) {
        console.error('Permission request denied:', error);
      }
    } else {
      // For non-iOS devices or when no permission is needed
      window.addEventListener('deviceorientation', handleOrientation);
      setIsTiltEnabled(false); // Set tilt enabled when permission is granted
    }
  };

  // useEffect to request permission and set up device orientation handling
  useEffect(() => {
    requestPermission(); // Call the function when the component mounts

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);


  // Reset jump count when the player lands
  const resetJump = () => {
    setjumpCount(0);
  };

  // Function to handle starting the game
  const handleStartGame = () => {
    setLoading(true);
    setGameStarted(true); // This sets the state to true, triggering the game view
    playMusic();
  };

  const handleRandomize = () => {
    // Randomize player's width and height
    const randomWidth = Math.floor(Math.random() * 50) + 20; // Random width between 15 and 65
    const randomHeight = Math.floor(Math.random() * 50) + 20; // Random height between 15 and 65

    // Reset player state to the starting position with random dimensions
    setPlayer({
      x: 400, // Reset to starting x position
      y: 320, // Reset to starting y position
      width: randomWidth, // Randomized width
      height: randomHeight, // Randomized height
      velocityX: 0,
      velocityY: 0,
    });
    
    // Reset other relevant states (same as handleRetry)
    setLoading(true);
    setAirTime(0); // Reset airtime
    setScore(0); // Reset score
    setGameOver(false); // Restart the game
    setNameSubmitted(false); // Reset name submission
    setPlayerName(''); // Reset player name input
    setIsBOActive(false); // Reset BO effect
    setIsWOActive(false); // Reset WO effect
    // Reset message-related states
    setFirstMessageShown(false);  // Corrected usage of the state setter function
    setSecondMessageShown(false); // Corrected usage of the state setter function
    setBOMessageShown(false); // Corrected usage of the state setter function
    setWOMessageShown(false); // Corrected usage of the state setter function
    setCurrentText(''); // Ensure no message is showing after reset
    setisNight(false);
    stopAllAudio();
    if (!isMuted) {
      playMusic();
    }

    // Reset starting platforms
    setRandomPlatforms([
      { x: -200, y: 0, width: 300, height: 40 }, // Static ground platform
      { x: 400, y: 400, width: 20, height: 40 }, // Another platform for jumping
      { x: -400, y: -200, width: 20, height: 40 }, // Another platform
    ]);

    setCavePlatforms([
      { x: 0, y: 150, width: 75, height: 40 }, // Static ground platform
      { x: 400, y: 400, width: 20, height: 40 }, // Another platform for jumping
      { x: -400, y: -200, width: 20, height: 40 } // Another platform
    ]);

    setCeilingPlatforms([
      { x: 0, y: 450, width: 75, height: 40 }, // Static ground platform
      { x: 400, y: 400, width: 20, height: 40 }, // Another platform for jumping
      { x: -400, y: -200, width: 20, height: 40 } // Another platform
    ]);

    setEnemyPlatforms([
      { x: 0, y: 100, width: 10, height: 10 }, // Static ground platform
      { x: 200, y: 600, width: 20, height: 40 }, // Another platform for jumping
      { x: -400, y: -400, width: 20, height: 40 } // Another platform
    ]);

    setBOPlatforms([
      { x: -50, y: -260, width: 40, height: 40 },
    ]);

    setWOPlatforms([
      { x: -200, y: -260, width: 40, height: 40 },
    ]);

  };

  // Function to reload the game (retry)
  const handleRetry = () => {
    // Reset player state to the starting position and velocity
    setPlayer({
      x: 400, // Reset to starting x position
      y: 370, // Reset to starting y position
      width: 30,
      height: 30,
      velocityX: 0,
      velocityY: 0,
    });

    // Reset starting platforms
    setRandomPlatforms([
      { x: -200, y: 0, width: 300, height: 40 }, // Static ground platform
      { x: 400, y: 400, width: 20, height: 40 }, // Another platform for jumping
      { x: -400, y: -200, width: 20, height: 40 } // Another platform
    ]);

    setCavePlatforms([
      { x: 0, y: 150, width: 75, height: 40 }, // Static ground platform
      { x: 400, y: 400, width: 20, height: 40 }, // Another platform for jumping
      { x: -400, y: -200, width: 20, height: 40 } // Another platform
    ]);

    setCeilingPlatforms([
      { x: 0, y: 450, width: 75, height: 40 }, // Static ground platform
      { x: 400, y: 400, width: 20, height: 40 }, // Another platform for jumping
      { x: -400, y: -200, width: 20, height: 40 } // Another platform
    ]);

    setEnemyPlatforms([
      { x: 0, y: 100, width: 10, height: 10 }, // Static ground platform
      { x: 200, y: 600, width: 20, height: 40 }, // Another platform for jumping
      { x: -400, y: -400, width: 20, height: 40 } // Another platform
    ]);

    setBOPlatforms([
      { x: -50, y: -260, width: 40, height: 40 },
    ]);

    setWOPlatforms([
      { x: -200, y: -260, width: 40, height: 40 },
    ]);



    // Reset other relevant states
    setLoading(true);
    setAirTime(0); // Reset airtime
    setScore(0); // Reset score
    setGameOver(false); // Restart the game
    setNameSubmitted(false); // Reset name submission
    setPlayerName(''); // Reset player name input
    // Reset the BO and WO effects
    setIsBOActive(false);
    setIsWOActive(false);
    // Reset message-related states
    setFirstMessageShown(false);  // Corrected usage of the state setter function
    setSecondMessageShown(false); // Corrected usage of the state setter function
    setBOMessageShown(false); // Corrected usage of the state setter function
    setWOMessageShown(false); // Corrected usage of the state setter function
    setCurrentText(''); // Ensure no message is showing after reset
    setisNight(false);
    stopAllAudio();
    if (!isMuted) {
      playMusic();
    }
  };

  const handleNight = () => {
    stopAllAudio();
    playCreepyMusic(); // Any music put here will stop from stopAllAudio but elsewhere it may not stop :(
  }

  // Spooky Typing 
  const showMessage = (message, typingDuration = 30000, erasingDuration = 3000, callback) => {
    setCurrentText(message); // Display the message

    // After the message is displayed for the typing duration, clear it and call the callback (if any)
    setTimeout(() => {
      setCurrentText(''); // Clear the message
      if (callback) {
        setTimeout(callback, erasingDuration); // Call the next step after erasing
      }
    }, typingDuration); // Ensure we wait for the full typing duration
  };

  // Effect to trigger messages based on score
  useEffect(() => {
    // First message logic
    if (score >= 133 && !firstMessageShown && !isWOActive) {
      showMessage("I...I thought I was alone in the dark...", 30000, 3000, () => {
        setFirstMessageShown(true);
      });
    }

    // Second message logic
    if (score >= 177 && !secondMessageShown && !isWOActive) {
      showMessage("I'm so hungry", 30000, 3000);
      setSecondMessageShown(true);
    }

    // BO message logic
    if (score >= 66 && !BOMessageShown && isBOActive && !isWOActive) {
      showMessage("I can see you", 30000, 3000);
      setBOMessageShown(true);
    }

    // Music Change At Night
    if (score > 103 && !isWOActive && !isNight) {
      setisNight(true);
      handleNight();
    }

    // WO message logic
    if (score >= 103 && !WOMessageShown && isWOActive && !isBOActive) {
      showMessage("I can smell your fear", 30000, 3000);
      setWOMessageShown(true);
    }
  }, [score, firstMessageShown, secondMessageShown, BOMessageShown, WOMessageShown]);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((response) => {
        if (!response.ok) {
          // If the response is not okay (e.g., 404, 500), throw an error
          throw new Error(`Error: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        setLeaderboard(data);
        setLoading(false); // Set loading to false when data is fetched
      })
      .catch((error) => {
        console.error('Error loading leaderboard:', error);
        setLoading(true); // Set loading to false in case of an error
      });
  }, []);

  // Save the updated leaderboard to the server
  const saveScoreToLeaderboard = () => {
    const newEntry = { name: playerName, score }; // Create a new entry with the player's name and score

    // Send only the new entry to the server
    fetch('/api/leaderboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newEntry), // Send just the new entry
    })
      .then(response => response.json())
      .then(data => {
        setLeaderboard(data); // Update local leaderboard after the server responds
        setLoading(false);
      })
      .catch(error => console.error('Error saving leaderboard:', error));

    // Reset playerName so it's not overwritten on new submissions
    setPlayerName('');
  };
  // Constants
  const jumpMax = 16;
  const speed = 0.5;
  const maxSpeed = 5;
  const jumpForce = -6;
  const wallJumpHorizontalForce = -6; // Horizontal push during a wall jump
  const initialGravity = 0.12;
  const maxGravity = 0.981;
  const lightRadius = 300; // Define how far the light reaches from the player

  const [randomPlatforms, setRandomPlatforms] = useState([
    { x: -200, y: 0, width: 300, height: 40 }, // Static ground platform
    { x: 400, y: 400, width: 20, height: 40 }, // Another platform for jumping
    { x: -400, y: -200, width: 20, height: 40 } // Another platform
  ]);

  const [BOPlatforms, setBOPlatforms] = useState([
    { x: -50, y: -260, width: 40, height: 40 } // Static ground platform
  ]);

  const [WOPlatforms, setWOPlatforms] = useState([
    { x: -200, y: -260, width: 40, height: 40 } // Static ground platform
  ]);


  const [enemyPlatforms, setEnemyPlatforms] = useState([]); // New state for enemy platforms

  const [cavePlatforms, setCavePlatforms] = useState([]); // Separate cave platforms

  // Add state for ceiling platforms
  const [ceilingPlatforms, setCeilingPlatforms] = useState([]); // Fix: Initialize ceiling platforms as an empty array

  // Track inputs
  const inputRef = useRef({
    right: false,
    left: false,
    jump: false,
  });

  const handleKeyDown = (e) => {
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      inputRef.current.right = true;
    } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      inputRef.current.left = true;
    } else if ((e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') && !inputRef.current.jump) {
      // Set jump to true only if it is currently false
      inputRef.current.jump = true;
    }
    // Detect 'R' key press and set air time to 300
    if (e.code === 'KeyR') {
      setAirTime(151); // Reset air time when 'R' is pressed
    }

    if (!hasKeyPressed) {
      // Check for left arrow, right arrow, or space bar
      if (inputRef.current.jump || inputRef.current.left || inputRef.current.right) {
        setHasKeyPressed(true); // Stop showing the message once one of these keys is pressed
      }
    }
  };

  const handleKeyUp = (e) => {
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      inputRef.current.right = false;
    } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      inputRef.current.left = false;
    } else if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
      // Ensure jump is set to false when the space bar is released
      inputRef.current.jump = false;
    }
  };

  // Add gyroscopic control for phone tilting
  const handleOrientation = (e) => {
    const gamma = e.gamma; // Left-right tilt in degrees (-90 to 90)

    if (gamma > 7) {
      // Tilt right (move right)
      inputRef.current.right = true;
      inputRef.current.left = false;
    } else if (gamma < -7) {
      // Tilt left (move left)
      inputRef.current.left = true;
      inputRef.current.right = false;
    } else {
      // No significant tilt, stop movement
      inputRef.current.left = false;
      inputRef.current.right = false;
    }
    if (!hasGammaPressed) {
      // Check for left arrow, right arrow, or space bar
      if (gamma > 7 || gamma < -7) {
        setHasGammaPressed(true); // Stop showing the message once one of these keys is pressed
      }
    }
  };

  const handleTouchStart = (e) => {
    // Prevent default behavior to avoid unwanted scroll or zoom actions
    e.preventDefault();

    // Move right on touch if tilt disabled
    if (!isTiltEnabled) {
    inputRef.current.right = true;
    }

    // Same logic as in handleMouseDown
    if (!inputRef.current.jump) {
      inputRef.current.jump = true; // Trigger jump on touch start
    }

    if (!hasButtonPressed && gameStarted) {
      const target = e.target;
      const isGameCanvas = target.classList.contains('game-canvas');

      if (isGameCanvas) {
        setHasButtonPressed(true); // Stop showing the message once a game-related click (touch) occurs
      }
    }
  };

  const handleTouchEnd = (e) => {
    // Prevent default behavior to avoid unwanted scroll or zoom actions
    //e.preventDefault();

    // Same logic as in handleMouseUp
    if (!isTiltEnabled) {
    inputRef.current.right = false;
    }
    inputRef.current.jump = false; // Release jump on touch end
  };

  // Function to determine if any part of a platform is within the light radius of the player
  const isWithinLightRadius = (platformX, platformY, platformWidth, platformHeight) => {
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    // Find the closest point on the platform to the player
    const closestX = Math.max(platformX, Math.min(playerCenterX, platformX + platformWidth));
    const closestY = Math.max(platformY, Math.min(playerCenterY, platformY + platformHeight));

    // Calculate the distance from the player to the closest point on the platform
    const distance = Math.sqrt(
      (closestX - playerCenterX) ** 2 +
      (closestY - playerCenterY) ** 2
    );

    // Return true if the platform is within the light radius
    return distance < lightRadius;
  };

  // Generate EnemyPlatforms
  const generateEnemyPlatforms = (playerX, existingEnemyPlatforms, canvasWidth, maxHeight) => {
    const threshold = playerX + canvasWidth * 2; // Generate new platforms when player moves far enough right
    const enemyLimit = 8; // Limit the number of enemy platforms to make them fewer

    // Only generate new platforms if there are fewer than the limit
    if (existingEnemyPlatforms.length < enemyLimit && playerX > (existingEnemyPlatforms[existingEnemyPlatforms.length - 1]?.x || 0)) {
      const newEnemyPlatforms = [];

      // Generate 1 to 10 enemy platforms
      const platformCount = Math.floor(Math.random() * 10 + 1); // This generates a random integer between 'min' and 'max', inclusive

      for (let i = 0; i < platformCount; i++) {
        const newPlatform = {
          x: playerX + canvasWidth / 2 + Math.random() * canvasWidth / 3, // Randomly positioned ahead of the player
          y: Math.random() * maxHeight, // Range from the top to the bottom of the screen
          width: 20 + Math.random() * 100, // Different shape: narrow to wider
          height: 20 + Math.random() * 100, // Different height: taller platforms
        };
        newEnemyPlatforms.push(newPlatform);
        setScore((prevScore) => prevScore + 1);
      }

      return [...existingEnemyPlatforms, ...newEnemyPlatforms];
    }

    // Remove platforms that are far off-screen (to the left)
    return existingEnemyPlatforms.filter((platform) => platform.x + platform.width > playerX - canvasWidth);
  };


  // Function to determine brightness level based on distance
  const getBrightnessLevel = (platformX, platformY, platformWidth, platformHeight) => {
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    // Find the closest point on the platform to the player
    const closestX = Math.max(platformX, Math.min(playerCenterX, platformX + platformWidth));
    const closestY = Math.max(platformY, Math.min(playerCenterY, platformY + platformHeight));

    // Calculate the distance from the player to the closest point on the platform
    const distance = Math.sqrt(
      (closestX - playerCenterX) ** 2 +
      (closestY - playerCenterY) ** 2
    );

    // Calculate brightness level based on the distance (closer = brighter)
    const brightness = Math.max(1 - distance / lightRadius, 0); // Range from 0 to 1
    const colorIntensity = Math.min(255, 255 * brightness); // Scale the intensity for RGB values
    return `rgb(${colorIntensity}, ${colorIntensity}, ${colorIntensity})`;
  };

  // Function to determine enemy brightness level for enemy platforms (black to red)
  const getEnemyBrightnessLevel = (platformX, platformY, platformWidth, platformHeight) => {
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    // Find the closest point on the platform to the player
    const closestX = Math.max(platformX, Math.min(playerCenterX, platformX + platformWidth));
    const closestY = Math.max(platformY, Math.min(playerCenterY, platformY + platformHeight));

    // Calculate the distance from the player to the closest point on the platform
    const distance = Math.sqrt(
      (closestX - playerCenterX) ** 2 +
      (closestY - playerCenterY) ** 2
    );

    // Calculate brightness level based on the distance (closer = brighter)
    const brightness = Math.max(1 - distance / lightRadius, 0); // Range from 0 to 1
    const redIntensity = Math.min(255, 255 * brightness); // Scale the red intensity for RGB values

    // Red color with varying intensity
    return `rgb(${redIntensity}, 0, 0)`; // Black to red gradient
  };

  // Function to calculate opacity for BO platforms (black to dark blue, more opaque farther away)
  const getBOOpacityLevel = (platformX, platformY, platformWidth, platformHeight) => {
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    // Find the closest point on the platform to the player
    const closestX = Math.max(platformX, Math.min(playerCenterX, platformX + platformWidth));
    const closestY = Math.max(platformY, Math.min(playerCenterY, platformY + platformHeight));

    // Calculate the distance from the player to the closest point on the platform
    const distance = Math.sqrt(
      (closestX - playerCenterX) ** 2 + (closestY - playerCenterY) ** 2
    );

    // Calculate brightness level based on the distance (closer = brighter)
    const brightness = Math.max(1 - distance / lightRadius, 0); // Range from 0 to 1
    const blueIntensity = Math.min(255, 255 * brightness); // Scale the red intensity for RGB values

    // Red color with varying intensity
    return `rgb(0,0, ${blueIntensity})`; // Black to blue gradient
  };

  // Function to calculate opacity for WO platforms (white to yellow, more opaque farther away)
  const getWOOpacityLevel = (platformX, platformY, platformWidth, platformHeight) => {
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    // Find the closest point on the platform to the player
    const closestX = Math.max(platformX, Math.min(playerCenterX, platformX + platformWidth));
    const closestY = Math.max(platformY, Math.min(playerCenterY, platformY + platformHeight));

    // Calculate the distance from the player to the closest point on the platform
    const distance = Math.sqrt(
      (closestX - playerCenterX) ** 2 + (closestY - playerCenterY) ** 2
    );

    // Calculate brightness level based on the distance (closer = brighter)
    const brightness = Math.max(1 - distance / lightRadius, 0); // Range from 0 to 1
    const greenIntensity = Math.min(255, 255 * brightness); // Scale the red intensity for RGB values

    // Red color with varying intensity
    return `rgb(0,${greenIntensity}, 0)`; // Black to green gradient
  };

  // Function to generate new ceiling platforms with smaller segments
  const generateCeiling = (playerX, existingCeiling, canvasWidth, cavePlatforms) => {
    const threshold = playerX + canvasWidth * 3;
    const highestStalactiteY = Math.min(...cavePlatforms.map(platform => platform.y));

    if (existingCeiling.length === 0 || existingCeiling[existingCeiling.length - 1].x + existingCeiling[existingCeiling.length - 1].width < threshold && playerX > existingCeiling[existingCeiling.length - 1].x) {
      const newCeilingSegments = [];
      const ceilingWidth = 200 + Math.random() * 1000; // Total width of the ceiling

      // Break ceiling into small segments
      const segmentCount = Math.floor(ceilingWidth / 50); // Number of smaller ceiling segments
      for (let i = 0; i < segmentCount; i++) {
        const newSegment = {
          x: playerX + i * 50 + canvasWidth / 3, // Small segments spaced horizontally
          y: highestStalactiteY - 300, // Place ceiling just above the highest stalactite
          width: 50, // Width of each ceiling segment
          height: 20 + Math.random() * 50, // Randomized height
        };
        newCeilingSegments.push(newSegment);
      }
      setScore((prevScore) => prevScore + 1); // Increment the score for each new platform
      return [...existingCeiling, ...newCeilingSegments];
    }

    // Remove ceiling platforms that are far off-screen (to the left)
    return existingCeiling.filter((platform) => platform.x + platform.width > playerX - canvasWidth);
  };


  // Function to generate new random platforms with many smaller segments
  const generateNewPlatforms = (playerX, existingPlatforms, canvasWidth) => {
    const lastPlatform = existingPlatforms[existingPlatforms.length - 1];
    const threshold = playerX + canvasWidth * 5; // Threshold to generate new platforms

    // Generate new smaller platforms only when moving to the right (playerX increasing)
    if (lastPlatform.x + lastPlatform.width < threshold && playerX > lastPlatform.x - 100) {
      const newPlatforms = [];
      const platformLength = 200 + Math.random() * 300; // Length of the entire platform

      // Divide the platform into smaller segments
      const segmentCount = Math.floor(platformLength / 100); // Number of segments
      for (let i = 0; i < segmentCount; i++) {
        const newSegment = {
          x: lastPlatform.x + i * 100 + canvasWidth / 3, // Small segments spaced out
          y: 50 + Math.random() * 600, // Random height
          width: 100, // Width of each segment
          height: 20 + Math.random() * 100, // Vary height slightly
        };
        newPlatforms.push(newSegment);
      }
      setScore((prevScore) => prevScore + 1); // Increment the score for each new platform
      return [...existingPlatforms, ...newPlatforms];
    }

    // Remove platforms that are far off-screen (to the left)
    return existingPlatforms.filter((platform) => platform.x + platform.width > playerX - canvasWidth);
  };
  // Function to generate cave platforms (stalactites and ground) with smaller segments
  const generateCavePlatforms = (playerX, existingPlatforms, canvasWidth) => {
    // Check if there are no platforms in the array
    if (existingPlatforms.length === 0) {
      const initialSegment = {
        x: playerX + 100,
        y: 400,
        width: 50, // Make the initial platform smaller
        height: 20,
      };
      return [initialSegment];
    }

    const lastPlatform = existingPlatforms[existingPlatforms.length - 1];
    const threshold = playerX + canvasWidth * 3;

    if (lastPlatform.x + lastPlatform.width < threshold && playerX > lastPlatform.x) {
      const newSegments = [];

      // Create smaller ground platforms
      const groundLength = 10 + Math.random() * 500; // Length of the ground section
      const groundSegmentCount = Math.floor(groundLength / 50); // Number of ground segments
      for (let i = 0; i < groundSegmentCount; i++) {
        const groundSegment = {
          x: lastPlatform.x + i * Math.random() * 600 + canvasWidth / 3,
          y: 1 + Math.random() * 400,
          width: 20,
          height: 10 + Math.random() * 50,
        };
        newSegments.push(groundSegment);
      }

      // Create smaller stalactites
      const stalactitesCount = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < stalactitesCount; i++) {
        const stalactiteSegment = {
          x: lastPlatform.x + Math.random() * 300 + canvasWidth / 3,
          y: Math.random() * 200,
          width: 20 + Math.random() * 30,
          height: 50 + Math.random() * 100,
        };
        newSegments.push(stalactiteSegment);
      }
      setScore((prevScore) => prevScore + 1); // Increment the score for each new platform
      return [...existingPlatforms, ...newSegments];
    }

    // Remove cave platforms that are far off-screen (to the left)
    return existingPlatforms.filter((platform) => platform.x + platform.width > playerX - canvasWidth);
  };


  useEffect(() => {
    // Only proceed if canvas exists
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!gameStarted) return; // Only run game logic if the game is started
    const context = canvas.getContext('2d');
    const maxHeight = 700;


    const update = () => {
      if (gameOver) return; // Stop updating if the game is over

      context.clearRect(0, 0, canvas.width, canvas.height);

      const playerCenterX = player.x + player.width / 2;
      const playerCenterY = player.y + player.height / 2;

      setPlayer((prevPlayer) => {
        let newX = prevPlayer.x;
        let newY = prevPlayer.y;
        let newVelocityX = prevPlayer.velocityX;
        let newVelocityY = prevPlayer.velocityY;

        // Apply gravity
        const currentGravity = Math.min(initialGravity + airTime * 0.04, maxGravity);
        newVelocityY += currentGravity;

        // Handle horizontal movement
        if (inputRef.current.right) {
          newVelocityX = Math.min(maxSpeed, newVelocityX + speed);
        } else if (inputRef.current.left) {
          newVelocityX = Math.max(-maxSpeed, newVelocityX - speed);
        } else {
          // Decelerate when no arrow key is pressed
          newVelocityX *= 0.6; // Simulate friction
        }

        // Handle jumping
        if (inputRef.current.jump && jumpCount <= jumpMax) {
          setjumpCount((jumpCount) => jumpCount + 1.5);
          newVelocityY = jumpForce;
          setAirTime(0);
          //playJumpSound();
        }

        // Wall jump logic
        if (isWallJumping && inputRef.current.jump) {
          if (wallDirection === 'left') {
            newVelocityX = wallJumpHorizontalForce; // Push to the right
          } else if (wallDirection === 'right') {
            newVelocityX = -wallJumpHorizontalForce; // Push to the left
          }
          newVelocityY = jumpForce; // Jump upwards
          setIsWallJumping(false); // Reset wall jump state
          setAirTime(0);
          //playJumpSound();
        }

        // Update position based on velocity
        newX += newVelocityX;
        newY += newVelocityY;

        // Stop game if airtime exceeds the threshold (Remember Everything is Done in Frames)
        if (airTime > 150) {
          handleGameOver();
          playDeathSound();
        }

        // Collision detection with platforms
        let isTouchingWall = false;
        let verticalCollision = false;
        let grounded = false;

        const allPlatforms = [...randomPlatforms, ...cavePlatforms, ...ceilingPlatforms, ...enemyPlatforms, ...BOPlatforms, ...WOPlatforms]; // Combine random, cave platforms, and ceiling for collision

        allPlatforms.forEach((platform) => {
          const playerBottom = newY + prevPlayer.height;
          const playerTop = newY;
          const playerRight = newX + prevPlayer.width;
          const playerLeft = newX;

          const platformBottom = platform.y + platform.height;
          const platformTop = platform.y;
          const platformRight = platform.x + platform.width;
          const platformLeft = platform.x;

          // Step 1: Handle vertical collisions
          if (playerRight > platformLeft && playerLeft < platformRight) {
            // Player is within the horizontal range of the platform

            if (playerBottom > platformTop && prevPlayer.y + prevPlayer.height <= platformTop) {
              // Player is landing on the platform
              newY = platformTop - prevPlayer.height;
              newVelocityY = 0;
              setAirTime(0); // Reset air time when landing
              grounded = true; // Player is grounded
              verticalCollision = true;
              resetJump();
            } else if (playerTop < platformBottom && prevPlayer.y >= platformBottom) {
              // Player hits the platform from below
              newY = platformBottom;
              newVelocityY = 0.05; // Small bounce to prevent sticking
              verticalCollision = true;
            }
          }

          // Step 2: Handle horizontal collisions
          if (playerBottom > platformTop && playerTop < platformBottom) {
            // Player is within the vertical range of the platform

            if (playerRight > platformLeft && prevPlayer.x + prevPlayer.width <= platformLeft) {
              // Player hits the platform from the left side
              newX = platformLeft - prevPlayer.width;
              newVelocityX = 0; // Stop horizontal movement
              setWallDirection('left');
              isTouchingWall = true; // Set touching wall state
            } else if (playerLeft < platformRight && prevPlayer.x >= platformRight) {
              // Player hits the platform from the right side
              newX = platformRight;
              newVelocityX = 0; // Stop horizontal movement
              setWallDirection('right');
              isTouchingWall = true; // Set touching wall state
            }
          }
          // Enemy platform collision detection
          if (enemyPlatforms.includes(platform)) {
            if (
              playerRight > platformLeft &&
              playerLeft < platformRight &&
              playerBottom > platformTop &&
              playerTop < platformBottom
            ) {
              // Player collided with an enemy platform, trigger game over
              playDeathSound(); // Play death sound on collision
              handleGameOver();
            }
          }
          // BO platform collision detection
          if (BOPlatforms.includes(platform)) {
            if (
              playerRight > platformLeft &&
              playerLeft < platformRight &&
              playerBottom > platformTop &&
              playerTop < platformBottom
            ) {
              if (!isBOActive) {
                stopMusic();
                stopWOmusic();
                //stopAllAudio();
                playCreepyMusic(); //This creepy music will not stop from stopAllAudio for some reason or stopCreepyMusic()
              }
              setIsBOActive(true); // Turn on BO effect
            }
          }

          // WO platform collision detection
          if (WOPlatforms.includes(platform)) {
            if (
              playerRight > platformLeft &&
              playerLeft < platformRight &&
              playerBottom > platformTop &&
              playerTop < platformBottom
            ) {
              if (!isWOActive) {
                stopMusic();
                stopCreepyMusic();
                //stopAllAudio();
                playWOmusic();
              }
              setIsWOActive(true); // Turn on WO effect
            }
          }
        });

        // Enable wall jumping if touching a wall and not grounded
        if (isTouchingWall && !grounded) {
          setIsWallJumping(true);
          resetJump();
        } else {
          setIsWallJumping(false);
        }

        // If the player is not grounded, increment airTime
        if (!grounded) {
          setAirTime((airTime) => airTime + 1);
        }

        return {
          ...prevPlayer,
          x: newX,
          y: newY,
          velocityX: newVelocityX,
          velocityY: newVelocityY,
        };
      });

      // Define the boundaries of the 1x1 square in the center of the window
      const squareWidth = 0;
      const squareHeight = 0;

      const cameraMinX = canvas.width / 2 - squareWidth / 2;
      const cameraMaxX = canvas.width / 2 + squareWidth / 2;
      const cameraMinY = canvas.height / 2 - squareHeight / 2;
      const cameraMaxY = canvas.height / 2 + squareHeight / 2;

      // Move the camera only if the player is outside the 1x1 square
      const cameraOffsetX =
        player.x < cameraMinX ? player.x - cameraMinX : player.x > cameraMaxX ? player.x - cameraMaxX : 0;
      const cameraOffsetY =
        player.y < cameraMinY ? player.y - cameraMinY : player.y > cameraMaxY ? player.y - cameraMaxY : 0;
        

      // Generate random platforms, cave platforms, and now ceiling
      setRandomPlatforms((prevPlatforms) => {
        return generateNewPlatforms(player.x, prevPlatforms, canvas.width);
      });

      setCavePlatforms((prevPlatforms) => {
        return generateCavePlatforms(player.x, prevPlatforms, canvas.width);
      });

      setCeilingPlatforms((prevCeiling) => {
        return generateCeiling(player.x, prevCeiling, canvas.width, cavePlatforms); // Fixed: Use ceilingPlatforms
      });

      // Generate enemy platforms
      setEnemyPlatforms((prevEnemyPlatforms) => {
        return generateEnemyPlatforms(player.x, prevEnemyPlatforms, canvas.width, maxHeight); // Call the new custom generation function
      });
      // Render blackout effect
      if (isBOActive) {
        context.fillStyle = 'black'; // Blackout color
        context.fillRect(0, 0, canvas.width, canvas.height); // Cover the entire canvas
      }

      // Render whiteout effect
      if (isWOActive) {
        context.fillStyle = 'white'; // Whiteout color
        context.fillRect(0, 0, canvas.width, canvas.height); // Cover the entire canvas
      }

      if (!isBOActive && !isWOActive) {
        if (score <= 30) {
          // Early phase - White to light blue
          let gradient = context.createLinearGradient(0, 0, 0, canvas.height);
          gradient.addColorStop(0, 'white');
          gradient.addColorStop(1, 'lightblue');
          context.fillStyle = gradient;
          context.fillRect(0, 0, canvas.width, canvas.height);
        } else if (score > 30 && score <= 40) {
          // Fading to deeper blue
          let gradient = context.createLinearGradient(0, 0, 0, canvas.height);
          gradient.addColorStop(0, 'lightblue');
          gradient.addColorStop(1, 'skyblue');
          context.fillStyle = gradient;
          context.fillRect(0, 0, canvas.width, canvas.height);
        } else if (score > 40 && score <= 50) {
          // Transitioning to a deep blue
          let gradient = context.createLinearGradient(0, 0, 0, canvas.height);
          gradient.addColorStop(0, 'deepskyblue');
          gradient.addColorStop(1, 'skyblue');
          context.fillStyle = gradient;
          context.fillRect(0, 0, canvas.width, canvas.height);
        } else if (score > 50 && score <= 60) {
          // Start of sunset - golden hour
          let gradient = context.createLinearGradient(0, 0, 0, canvas.height);
          gradient.addColorStop(0, 'deepskyblue');
          gradient.addColorStop(0.5, 'lightgoldenrodyellow');
          gradient.addColorStop(1, 'gold');
          context.fillStyle = gradient;
          context.fillRect(0, 0, canvas.width, canvas.height);
        } else if (score > 60 && score <= 70) {
          // Start of sunset - golden hour
          let gradient = context.createLinearGradient(0, 0, 0, canvas.height);
          gradient.addColorStop(0, 'royalblue');
          gradient.addColorStop(0.5, 'lightgoldenrodyellow');
          gradient.addColorStop(1, 'gold');
          context.fillStyle = gradient;
          context.fillRect(0, 0, canvas.width, canvas.height);
        } else if (score > 70 && score <= 80) {
          // Sunset intensifies with oranges
          let gradient = context.createLinearGradient(0, 0, 0, canvas.height);
          gradient.addColorStop(0, 'gold');
          gradient.addColorStop(0.5, 'orange');
          gradient.addColorStop(1, 'orangered');
          context.fillStyle = gradient;
          context.fillRect(0, 0, canvas.width, canvas.height);
        } else if (score >= 80 && score < 87) {
          // Deeper reds as the sun sets
          let gradient = context.createLinearGradient(0, 0, 0, canvas.height);
          gradient.addColorStop(0, 'darkblue');
          gradient.addColorStop(0.5, 'darkred');
          gradient.addColorStop(1, 'orangered');
          context.fillStyle = gradient;
          context.fillRect(0, 0, canvas.width, canvas.height);
        } else if (score > 87 && score <= 103) {
          // Twilight phase - fading to purple and dark blue
          let gradient = context.createLinearGradient(0, 0, 0, canvas.height);
          gradient.addColorStop(0, 'darkblue');
          gradient.addColorStop(0.5, 'darkblue');
          gradient.addColorStop(1, 'black');
          context.fillStyle = gradient;
          context.fillRect(0, 0, canvas.width, canvas.height);
        } else if (score > 103 && score <= 202) {
          // Night sky - raven black '#111111'
          context.fillStyle = '#111111';
          context.fillRect(0, 0, canvas.width, canvas.height);
        } else if (score > 202) {
          // Pitch Black'
          context.fillStyle = 'black'; // Blackout color
          context.fillRect(0, 0, canvas.width, canvas.height); // Cover the entire canvas
        }


        if (score == 87) {
          // Green Flash
          let gradient = context.createLinearGradient(0, 0, 0, canvas.height);
          gradient.addColorStop(0, 'white');
          gradient.addColorStop(0.5, 'palegreen');
          gradient.addColorStop(1, 'limegreen');
          context.fillStyle = gradient;
          context.fillRect(0, 0, canvas.width, canvas.height);
        }
      }

      // Draw Settings Platforms 
      BOPlatforms.forEach((BOPlatform) => {
        let platformColor = 'black'; // Default enemy platform color

        if (
          (inputRef.current.jump || airTime > 0) &&
          isWithinLightRadius(BOPlatform.x, BOPlatform.y, BOPlatform.width, BOPlatform.height)
        ) {
          platformColor = getBOOpacityLevel(BOPlatform.x, BOPlatform.y, BOPlatform.width, BOPlatform.height); // Use the yellow brightness function
        }

        context.fillStyle = platformColor;
        context.fillRect(
          BOPlatform.x - cameraOffsetX,
          BOPlatform.y - cameraOffsetY,
          BOPlatform.width,
          BOPlatform.height
        );
      });

      // Now start the WOPlatforms loop
      WOPlatforms.forEach((WOPlatform) => {
        let platformColor = 'black'; // Default enemy platform color

        if (
          (inputRef.current.jump || airTime > 0) &&
          isWithinLightRadius(WOPlatform.x, WOPlatform.y, WOPlatform.width, WOPlatform.height)
        ) {
          platformColor = getWOOpacityLevel(WOPlatform.x, WOPlatform.y, WOPlatform.width, WOPlatform.height); // Use the yellow brightness function
        }

        context.fillStyle = platformColor;
        context.fillRect(
          WOPlatform.x - cameraOffsetX,
          WOPlatform.y - cameraOffsetY,
          WOPlatform.width,
          WOPlatform.height
        );
      });

      // Draw enemy platforms relative to the camera
      enemyPlatforms.forEach((enemyPlatform) => {
        let platformColor = 'black'; // Default enemy platform color

        if (
          (inputRef.current.jump || airTime > 0) &&
          isWithinLightRadius(enemyPlatform.x, enemyPlatform.y, enemyPlatform.width, enemyPlatform.height)
        ) {
          platformColor = getEnemyBrightnessLevel(enemyPlatform.x, enemyPlatform.y, enemyPlatform.width, enemyPlatform.height); // Use the red-black brightness function
        }

        context.fillStyle = platformColor;
        context.fillRect(
          enemyPlatform.x - cameraOffsetX,
          enemyPlatform.y - cameraOffsetY,
          enemyPlatform.width,
          enemyPlatform.height
        );
      });

      // Draw random platforms relative to the camera
      randomPlatforms.forEach((randomPlatform) => {
        let platformColor = 'black'; // Default color for random platforms

        if ((inputRef.current.jump || airTime > 0) && isWithinLightRadius(randomPlatform.x, randomPlatform.y, randomPlatform.width, randomPlatform.height)) {
          platformColor = getBrightnessLevel(randomPlatform.x, randomPlatform.y, randomPlatform.width, randomPlatform.height); // Adjust platform color
        }

        context.fillStyle = platformColor;
        context.fillRect(randomPlatform.x - cameraOffsetX, randomPlatform.y - cameraOffsetY, randomPlatform.width, randomPlatform.height);
      });

      // Draw each individual cave element (stalactites or floor bits) independently with lighting
      cavePlatforms.forEach((element) => {
        let elementColor = 'black'; // Default color for cave elements

        // Check if the element is within the light radius and adjust its color
        if ((inputRef.current.jump || airTime > 0) && isWithinLightRadius(element.x, element.y, element.width, element.height)) {
          elementColor = getBrightnessLevel(element.x, element.y, element.width, element.height); // Adjust color based on distance
        }

        context.fillStyle = elementColor;
        context.fillRect(
          element.x - cameraOffsetX,
          element.y - cameraOffsetY,
          element.width,
          element.height
        );
      });

      // Draw ceiling platforms relative to the camera
      ceilingPlatforms.forEach((ceilingPlatform) => {
        let platformColor = 'black'; // Default color for ceiling platforms

        if ((inputRef.current.jump || airTime > 0) && isWithinLightRadius(ceilingPlatform.x, ceilingPlatform.y, ceilingPlatform.width, ceilingPlatform.height)) {
          platformColor = getBrightnessLevel(ceilingPlatform.x, ceilingPlatform.y, ceilingPlatform.width, ceilingPlatform.height); // Adjust platform color
        }

        context.fillStyle = platformColor;
        context.fillRect(ceilingPlatform.x - cameraOffsetX, ceilingPlatform.y - cameraOffsetY, ceilingPlatform.width, ceilingPlatform.height);
      });


      // Draw player relative to the camera's offset
      if (inputRef.current.jump || airTime > 0) {
        context.fillStyle = 'white'; // Player color when jumping and not colliding vertically
      } else {
        context.fillStyle = 'black'; // Player color when not in the specified jump state
      }
      context.fillRect(player.x - cameraOffsetX, player.y - cameraOffsetY, player.width, player.height);
    };

    const gameLoop = setInterval(update, 1000 / 60); // 60 FPS

    return () => clearInterval(gameLoop);
  }, [player, randomPlatforms, cavePlatforms, ceilingPlatforms, enemyPlatforms, airTime, isWallJumping, wallDirection, score, gameOver, gameStarted, BOPlatforms, WOPlatforms]);

  useEffect(() => {
    if (gameStarted) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      // Add touch support for mobile devices (replacing mouse)
      window.addEventListener('touchstart', handleTouchStart);
      window.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('deviceorientation', handleOrientation);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        // Remove touch support when not needed
        window.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('touchend', handleTouchEnd);
        window.addEventListener('deviceorientation', handleOrientation);
      };
    }
  }, [gameStarted]);

  const handleSubmitName = () => {
    // Check if the playerName contains only valid characters (letters and numbers) and is within the limit (e.g., 12 characters)
    const isValid = /^[a-zA-Z0-9]+$/.test(playerName) && playerName.length <= 12;  // This ensures only a-z, A-Z, 0-9 are allowed, and the name is max 12 characters

    if (isValid) {
      setNameSubmitted(true);
      saveScoreToLeaderboard(playerName); // Use the valid name
      stopAllAudio();
      playLMusic();
    } else if (playerName.length > 12) {
      alert('Please enter a name with a maximum of 12 characters.');
    } else {
      alert('Please enter a valid name with only letters and numbers.');
    }
  };
  const handleGameOver = () => {
    setGameOver(true);
    stopAllAudio();
    stopCreepyMusic();
    stopWOmusic();
  }

  return (
    gameStarted ? (
      gameOver ? (
        <div className="game-over-container">
          <h1 className="game-over-title">Game Over</h1>
          <h2 className="player-score">Your Score: {score}</h2>

          {/* Container for the buttons */}
          <div className="button-container">
            <button className="retry-button" onClick={handleRetry}>Try Again</button>
            <button className="randomize-button" onClick={handleRandomize}>Randomize</button>
          </div>

          {nameSubmitted ? (
            <>
              <h3 className="leaderboard-title">Global Leaderboard</h3>
              <ul className="leaderboard-list">
                {loading ? (
                 <p className="bouncing-text">
                {"Ranking  the  Player...".split(/(?=\S|\s)/).map((letter, index) => (
                  <span key={index} style={{ animationDelay: `${index * 0.3}s` }}>
                    {letter === " " ? "\u00A0" : letter} {/* Non-breaking space for spaces */}
                  </span>
                ))}
              </p>
                ) : (
                  <ul className="leaderboard-list">
                    {leaderboard.slice(0, 100).map((entry, index) => (
                      <li
                        key={index}
                        className={`leaderboard-item ${index === 0 ? 'top-player' :
                            index === 1 ? 'second-player' :
                              index === 2 ? 'third-player' : ''
                          }`}
                      >
                        {entry.name}: {entry.score}
                      </li>))}
                  </ul>
                )}
              </ul>
              {/* Mute Toggle */}
              {/*<div className="mute-container">
        <label className="mute-label">Mute</label>
        <label className="switch">
          <input type="checkbox" checked={isMuted} onChange={(e) => {
        e.stopPropagation(); // Prevents the event from triggering game events
        toggleMute();        // Mute toggle function
      }}
      />
          <span className="slider"></span>
        </label>
      </div>*/}
            </>
          ) : (
            <>
              <h3 className="enter-name-title">Submit your score to the leaderboard:</h3>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Your name"
                className="name-input"
                maxLength={12}  // This limits the input to 12 characters
              />
              <button className="submit-button" onClick={handleSubmitName}>Submit</button>
              {/* Tilt Control Toggle */}
              <div className="tilt-container">
                <label className="tilt-label">Tilt Controls</label>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={isTiltEnabled} // Controlled by React state
                    onChange={requestPermission} // Calls the function when the checkbox is toggled
                  />
                  <span className="slider"></span>
                </label>
              </div>
              {/* Mute Toggle */}
              <div className="mute-container">
                <label className="mute-label">Mute</label>
                <label className="switch">
                  <input type="checkbox" checked={isMuted} onChange={(e) => {
                    e.stopPropagation(); // Prevents the event from triggering game events
                    toggleMute();        // Mute toggle function
                  }}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="gameplay-container">
          {/* Show the flashing message if the left/right arrow keys or space bar have not been pressed */}
          {(!hasKeyPressed && !hasButtonPressed && !hasGammaPressed) && (
            <div className="flashing-message">
              {Array.from('Space WASD Tilt Tap or Arrows').map((char, index) => (
                <span key={index}>{char}</span>
              ))}
            </div>
          )}

          {/* Display the message with slow typing effect */}
          {currentText && (
            <div className="message-container">
              {currentText}
            </div>
          )}

          {/* Game content */}
          <div className="score-display">Score: {score}</div>
          {/* Mute Toggle */}
          {/*<div className="mute-container">
        <label className="mute-label">Mute</label>
        <label className="switch">
          <input type="checkbox" checked={isMuted} onChange={(e) => {
        e.stopPropagation(); // Prevents the event from triggering game events
        toggleMute();        // Mute toggle function
      }} />
          <span className="slider"></span>
        </label>
      </div> */}
          <canvas ref={canvasRef} width={1468} height={700} className="game-canvas" />
        </div>
      )
    ) : (
      <StartMenu onStart={handleStartGame} />
    )
  );


};


export default App;


