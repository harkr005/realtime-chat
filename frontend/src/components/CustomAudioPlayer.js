import React, { useState, useRef, useEffect } from 'react';

const CustomAudioPlayer = ({ src }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [speed, setSpeed] = useState(1);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => {
            setProgress((audio.currentTime / audio.duration) * 100);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
        };

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlay = () => {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const changeSpeed = () => {
        let newSpeed = 1;
        if (speed === 1) newSpeed = 1.5;
        else if (speed === 1.5) newSpeed = 2;
        else newSpeed = 1;

        audioRef.current.playbackRate = newSpeed;
        setSpeed(newSpeed);
    };

    return (
        <div className="custom-audio-player">
            <audio ref={audioRef} src={src} />

            <button className="play-btn" onClick={togglePlay}>
                {isPlaying ? '⏸' : '▶'}
            </button>

            <div className="progress-container">
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>

            <button className="speed-btn" onClick={changeSpeed}>
                {speed}x
            </button>

            <style jsx>{`
        .custom-audio-player {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(0, 0, 0, 0.2);
          padding: 8px 12px;
          border-radius: 20px;
          width: 220px;
          border: 1px solid var(--glass-border);
        }

        .play-btn, .speed-btn {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: 0.2s;
        }
        .play-btn:hover, .speed-btn:hover {
          color: var(--primary);
        }

        .play-btn { font-size: 1.2rem; min-width: 25px; }
        .speed-btn { 
          font-size: 0.75rem; 
          background: rgba(255,255,255,0.1); 
          padding: 2px 6px; 
          border-radius: 10px;
          min-width: 35px;
        }

        .progress-container {
          flex: 1;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
          position: relative;
        }
        
        .progress-bar {
          height: 100%;
          background: var(--primary);
          transition: width 0.1s linear;
        }
      `}</style>
        </div>
    );
};

export default CustomAudioPlayer;
