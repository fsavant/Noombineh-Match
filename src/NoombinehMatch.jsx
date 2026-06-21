import React, { useState, useEffect } from 'react';

const NoombinehMatch = () => {
  const BOARD_LAYOUTS = {
    square: { rows: 6, cols: 6, name: 'Square Board' }
  };

  const COOKIES = {
    chocolate: {
      name: 'Chocolate',
      shape: 'square',
      color: '#5C3D2E',
      accent: '#8B5A3C',
      icon: '🍫'
    },
    caramel: {
      name: 'Caramel',
      shape: 'circle',
      color: '#C9A876',
      accent: '#E6B857',
      icon: '🟤'
    },
    jamRed: {
      name: 'Red Jam',
      shape: 'circle',
      color: '#D1454A',
      accent: '#E74C3C',
      icon: '🔴'
    },
    jamGreen: {
      name: 'Green Jam',
      shape: 'triangle',
      color: '#2ECC71',
      accent: '#27AE60',
      icon: '🟢'
    },
    golden: {
      name: 'Golden Honey',
      shape: 'star',
      color: '#FFD700',
      accent: '#FFC700',
      icon: '⭐'
    }
  };

  const boardLayout = 'square';
  const [grid, setGrid] = useState([]);
  const [selectedCookie, setSelectedCookie] = useState(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(30);
  const [gameOver, setGameOver] = useState(false);
  const [animatingCells, setAnimatingCells] = useState(new Set());
  const [droppingCells, setDroppingCells] = useState(new Set());
  const [fillingCells, setFillingCells] = useState(new Set());
  const [matchMessage, setMatchMessage] = useState('');
  const [messageKey, setMessageKey] = useState(0);
  const [swappingCells, setSwappingCells] = useState(new Map());
  const [confettiCookies, setConfettiCookies] = useState([]);
  const [sprinkles, setSprinkles] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [showRankings, setShowRankings] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [pendingScore, setPendingScore] = useState(0);

  // Load rankings on mount
  useEffect(() => {
    loadRankings();
  }, []);

  const safeStorageGet = async (key) => {
    try {
      if (typeof window !== 'undefined' && window.storage && window.storage.get) {
        const result = await window.storage.get(key, true);
        return result && result.value ? result.value : null;
      }
    } catch (e) {}
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch (e) {}
    return null;
  };

  const safeStorageSet = async (key, value) => {
    try {
      if (typeof window !== 'undefined' && window.storage && window.storage.set) {
        await window.storage.set(key, value, true);
        return;
      }
    } catch (e) {}
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch (e) {}
  };

  const loadRankings = async () => {
    try {
      const value = await safeStorageGet('noombineh_rankings');
      if (value) {
        setRankings(JSON.parse(value));
      }
    } catch (error) {
      setRankings([]);
    }
  };

  const saveRanking = async (name, finalScore) => {
    try {
      const newRanking = { name, score: finalScore, date: new Date().toLocaleDateString() };
      const updatedRankings = [...rankings, newRanking]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10); // Keep top 10
      
      await safeStorageSet('noombineh_rankings', JSON.stringify(updatedRankings));
      setRankings(updatedRankings);
    } catch (error) {
      console.error('Error saving ranking:', error);
    }
  };

  const handleSaveScore = () => {
    if (playerName.trim()) {
      saveRanking(playerName.trim(), pendingScore);
      setPlayerName('');
      setShowNameInput(false);
      setShowRankings(true);
      rainSprinkles();
    }
  };

  const openSaveScore = () => {
    setPendingScore(score);
    setShowNameInput(true);
  };

  const handleShuffle = () => {
    if (gameOver) return;
    // Shuffle current grid's cookies into new random positions
    shuffleBoard(grid);
  };

  // Burst random colorful cookies into the background on match
  const burstConfetti = (count) => {
    const cookieTypes = Object.keys(COOKIES);
    const burstId = Date.now();
    const newConfetti = [];
    const num = Math.min(12 + count * 4, 36);
    const decorTypes = ['stripes', 'star', 'dots', 'none'];
    const biteCorners = ['top-left', 'top-right', 'none', 'none'];
    for (let i = 0; i < num; i++) {
      newConfetti.push({
        id: `${burstId}-${i}`,
        type: cookieTypes[Math.floor(Math.random() * cookieTypes.length)],
        left: Math.random() * 100,
        size: 20 + Math.random() * 25,
        duration: 2.5 + Math.random() * 2,
        delay: Math.random() * 0.4,
        rotate: Math.random() * 360,
        drift: (Math.random() - 0.5) * 60,
        decor: decorTypes[Math.floor(Math.random() * decorTypes.length)],
        bite: biteCorners[Math.floor(Math.random() * biteCorners.length)]
      });
    }
    setConfettiCookies(prev => [...prev, ...newConfetti]);
    // Remove this burst after animation completes
    setTimeout(() => {
      setConfettiCookies(prev => prev.filter(c => !c.id.startsWith(`${burstId}-`)));
    }, 5000);
  };

  // Compute the center (%) of a set of matched cells on the board area
  const getMatchCenter = (matched) => {
    if (!matched || matched.size === 0) return { x: 50, y: 50 };
    let sumR = 0, sumC = 0, n = 0;
    matched.forEach(cell => {
      const [r, c] = cell.split('-').map(Number);
      sumR += r; sumC += c; n++;
    });
    const rows = grid.length || 6;
    const cols = (grid[0] && grid[0].length) || 6;
    // Convert grid cell to approximate screen % (board sits roughly center, 8%-92% area)
    const avgC = sumC / n;
    const avgR = sumR / n;
    const x = 12 + (avgC / (cols - 1)) * 76;
    const y = 28 + (avgR / (rows - 1)) * 50;
    return { x, y };
  };

  // Burst sprinkles + coconut powder, exploding from the match position
  const burstSprinkles = (center) => {
    const cx = center ? center.x : 50;
    const cy = center ? center.y : 50;
    const burstId = Date.now() + Math.floor(Math.random() * 1000);
    const sprinkleColors = ['#FF4757', '#FFA502', '#FFD32A', '#2ED573', '#1E90FF', '#A55EEA', '#FF6B9D', '#FFFFFF'];
    const items = [];
    // Colorful sprinkles (2x = 120), explode from match position
    for (let i = 0; i < 120; i++) {
      const angle = Math.random() * 360;
      const dist = 60 + Math.random() * 280;
      items.push({
        id: `${burstId}-s-${i}`,
        kind: 'sprinkle',
        color: sprinkleColors[Math.floor(Math.random() * sprinkleColors.length)],
        startX: cx,
        startY: cy,
        dx: Math.cos(angle * Math.PI / 180) * dist,
        dy: Math.sin(angle * Math.PI / 180) * dist + 120,
        rotate: Math.random() * 720 - 360,
        len: 8 + Math.random() * 8,
        thick: 3 + Math.random() * 2,
        duration: 1.6 + Math.random() * 1.2,
        delay: Math.random() * 0.2
      });
    }
    // Coconut powder (100) bursting from match position
    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * 360;
      const dist = 30 + Math.random() * 180;
      items.push({
        id: `${burstId}-c-${i}`,
        kind: 'coconut',
        startX: cx,
        startY: cy,
        dx: Math.cos(angle * Math.PI / 180) * dist,
        dy: Math.sin(angle * Math.PI / 180) * dist + 130,
        size: 2 + Math.random() * 3,
        duration: 2 + Math.random() * 1.3,
        delay: Math.random() * 0.3
      });
    }
    setSprinkles(prev => [...prev, ...items]);
    setTimeout(() => {
      setSprinkles(prev => prev.filter(s => !s.id.startsWith(`${burstId}-`)));
    }, 4000);
  };

  // Burst coconut + cocoa powder mix from match position (for 4-matches)
  const burstPowderMix = (center) => {
    const cx = center ? center.x : 50;
    const cy = center ? center.y : 50;
    const burstId = Date.now() + Math.floor(Math.random() * 1000);
    const items = [];
    for (let i = 0; i < 90; i++) {
      const angle = Math.random() * 360;
      const dist = 25 + Math.random() * 170;
      const isCocoa = Math.random() < 0.5;
      items.push({
        id: `${burstId}-p-${i}`,
        kind: 'coconut',
        powderColor: isCocoa ? '#6B4423' : '#FFFFFF',
        startX: cx,
        startY: cy,
        dx: Math.cos(angle * Math.PI / 180) * dist,
        dy: Math.sin(angle * Math.PI / 180) * dist + 120,
        size: 2 + Math.random() * 3.5,
        duration: 2 + Math.random() * 1.3,
        delay: Math.random() * 0.3
      });
    }
    setSprinkles(prev => [...prev, ...items]);
    setTimeout(() => {
      setSprinkles(prev => prev.filter(s => !s.id.startsWith(`${burstId}-`)));
    }, 4000);
  };

  // Rain sprinkles + coconut from the top of the screen (game end / rank saved)
  const rainSprinkles = () => {
    const burstId = Date.now() + Math.floor(Math.random() * 1000);
    const sprinkleColors = ['#FF4757', '#FFA502', '#FFD32A', '#2ED573', '#1E90FF', '#A55EEA', '#FF6B9D', '#FFFFFF'];
    const items = [];
    for (let i = 0; i < 100; i++) {
      items.push({
        id: `${burstId}-r-${i}`,
        kind: 'sprinkle',
        color: sprinkleColors[Math.floor(Math.random() * sprinkleColors.length)],
        startX: Math.random() * 100,
        startY: -10 - Math.random() * 20,
        dx: (Math.random() - 0.5) * 80,
        dy: 120 + Math.random() * 40,
        rotate: Math.random() * 720 - 360,
        len: 8 + Math.random() * 8,
        thick: 3 + Math.random() * 2,
        duration: 2.5 + Math.random() * 2,
        delay: Math.random() * 1.5
      });
    }
    for (let i = 0; i < 80; i++) {
      items.push({
        id: `${burstId}-rc-${i}`,
        kind: 'coconut',
        startX: Math.random() * 100,
        startY: -8 - Math.random() * 15,
        dx: (Math.random() - 0.5) * 40,
        dy: 120 + Math.random() * 40,
        size: 2 + Math.random() * 3,
        duration: 3 + Math.random() * 2,
        delay: Math.random() * 1.8
      });
    }
    setSprinkles(prev => [...prev, ...items]);
    setTimeout(() => {
      setSprinkles(prev => prev.filter(s => !s.id.startsWith(`${burstId}-`)));
    }, 6000);
  };

  useEffect(() => {
    initializeGrid();
  }, [boardLayout]);

  // Clear encouraging message after it finishes (2 seconds)
  useEffect(() => {
    if (matchMessage) {
      const timer = setTimeout(() => {
        setMatchMessage('');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [messageKey, matchMessage]);

  const initializeGrid = async () => {
    // Build a clean 6x6 grid with no initial matches
    const buildGrid = () => {
      const g = [];
      for (let i = 0; i < 6; i++) {
        const row = [];
        for (let j = 0; j < 6; j++) {
          row.push(getRandomCookie());
        }
        g.push(row);
      }
      return g;
    };

    const hasAnyMatch = (g) => {
      // Horizontal
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 4; j++) {
          if (g[i][j] === g[i][j + 1] && g[i][j] === g[i][j + 2]) return true;
        }
      }
      // Vertical
      for (let j = 0; j < 6; j++) {
        for (let i = 0; i < 4; i++) {
          if (g[i][j] === g[i + 1][j] && g[i][j] === g[i + 2][j]) return true;
        }
      }
      return false;
    };

    // Regenerate until we get a 6x6 grid with no immediate matches
    let newGrid = buildGrid();
    let attempts = 0;
    while (hasAnyMatch(newGrid) && attempts < 100) {
      newGrid = buildGrid();
      attempts++;
    }

    setGrid(newGrid);
    setScore(0);
    setMoves(30);
    setGameOver(false);
    setSelectedCookie(null);
  };

  const getRandomCookie = () => {
    const cookieKeys = Object.keys(COOKIES);
    return cookieKeys[Math.floor(Math.random() * cookieKeys.length)];
  };

  const isValidCell = (row, col) => {
    if (!grid[row] || grid[row][col] === null) return false;
    return true;
  };

  const CookieShape = ({ type, isSelected, isFalling, isMatching }) => {
    const cookie = COOKIES[type];
    const size = '88%';

    const sharedStyle = {
      cursor: 'pointer',
      transition: isMatching ? 'opacity 0.4s ease, transform 0.4s ease' : 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
      filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.3))',
      transform: isSelected ? 'scale(1.2) rotate(5deg)' : isFalling ? 'scale(1)' : 'scale(1)',
      animation: isFalling ? 'none' : 'none'
    };

    if (cookie.shape === 'square') {
      return (
        <div
          style={{
            ...sharedStyle,
            width: size,
            height: size,
            background: `linear-gradient(135deg, ${cookie.color}, ${cookie.accent})`,
            borderRadius: '12px',
            boxShadow: `
              inset -3px -3px 8px rgba(0,0,0,0.3),
              inset 2px 2px 5px rgba(255,255,255,0.2),
              ${isSelected ? '0 0 0 4px #FF6B9D' : ''}
            `,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ position: 'absolute' }}>
            <rect x="15" y="15" width="70" height="70" fill="none" stroke={cookie.accent} strokeWidth="2" opacity="0.4" rx="5" />
            <ellipse cx="30" cy="30" rx="10" ry="13" fill="white" opacity="0.12" />
            
            {/* Diagonal cream icing stripes */}
            <defs>
              <clipPath id="chocClip">
                <rect x="12" y="12" width="76" height="76" rx="10" />
              </clipPath>
            </defs>
            <g clipPath="url(#chocClip)" stroke="#FFF3D6" strokeWidth="4" strokeLinecap="round" opacity="0.85">
              <line x1="-5" y1="30" x2="60" y2="-35" />
              <line x1="10" y1="60" x2="90" y2="-20" />
              <line x1="30" y1="90" x2="110" y2="10" />
              <line x1="55" y1="105" x2="120" y2="40" />
            </g>
            
            {/* White flower icing */}
            <g transform="translate(50, 50)">
              {/* 5 petals */}
              <ellipse cx="0" cy="-13" rx="7" ry="11" fill="#FFFFFF" opacity="0.95" />
              <ellipse cx="12" cy="-4" rx="7" ry="11" fill="#FFFFFF" opacity="0.95" transform="rotate(72)" />
              <ellipse cx="7" cy="11" rx="7" ry="11" fill="#FFFFFF" opacity="0.95" transform="rotate(144)" />
              <ellipse cx="-7" cy="11" rx="7" ry="11" fill="#FFFFFF" opacity="0.95" transform="rotate(216)" />
              <ellipse cx="-12" cy="-4" rx="7" ry="11" fill="#FFFFFF" opacity="0.95" transform="rotate(288)" />
              {/* Flower center */}
              <circle cx="0" cy="0" r="6" fill="#FFD684" />
              <circle cx="0" cy="0" r="3" fill="#FFC107" opacity="0.8" />
            </g>
          </svg>
        </div>
      );
    }

    if (cookie.shape === 'circle') {
      return (
        <div
          style={{
            ...sharedStyle,
            width: size,
            height: size,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 35%, ${cookie.accent}, ${cookie.color})`,
            boxShadow: `
              0 8px 16px rgba(0,0,0,0.35),
              inset -3px -3px 8px rgba(0,0,0,0.25),
              inset 2px 2px 6px rgba(255,255,255,0.15),
              ${isSelected ? '0 0 0 4px #FF6B9D' : ''}
            `,
            position: 'relative'
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ position: 'absolute' }}>
            <circle cx="35" cy="35" r="20" fill="white" opacity="0.25" />
            <circle cx="50" cy="50" r="8" fill="none" stroke={cookie.accent} strokeWidth="1" opacity="0.3" />
            {cookie.name === 'Red Jam' && (
              <>
                {/* Small brown star with yellow stripes in center */}
                <defs>
                  <pattern id="yellowStripes" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                    <rect width="6" height="6" fill="#6B4423" />
                    <rect width="3" height="6" fill="#FFD54F" />
                  </pattern>
                </defs>
                <polygon
                  points="50,32 54,44 67,44 56,52 60,65 50,57 40,65 44,52 33,44 46,44"
                  fill="url(#yellowStripes)"
                  stroke="#5C3D1E"
                  strokeWidth="1.5"
                />
              </>
            )}
            {cookie.name === 'Caramel' && (
              <>
                {/* Brown drizzle stripes - clipped to circle */}
                <defs>
                  <clipPath id="caramelClip">
                    <circle cx="50" cy="50" r="48" />
                  </clipPath>
                </defs>
                <g clipPath="url(#caramelClip)" stroke="#6B4423" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.75">
                  <line x1="-10" y1="25" x2="110" y2="15" />
                  <line x1="-10" y1="45" x2="110" y2="38" />
                  <line x1="-10" y1="65" x2="110" y2="58" />
                  <line x1="-10" y1="85" x2="110" y2="78" />
                </g>
              </>
            )}
          </svg>
        </div>
      );
    }

    if (cookie.shape === 'triangle') {
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          style={{
            ...sharedStyle,
            filter: `drop-shadow(0 6px 12px rgba(0,0,0,0.3)) ${isSelected ? 'drop-shadow(0 0 8px #FF6B9D)' : ''}`
          }}
        >
          {/* Triangle */}
          <defs>
            <linearGradient id="triGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: cookie.accent, stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: cookie.color, stopOpacity: 1 }} />
            </linearGradient>
            <filter id="triShadow">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
            </filter>
          </defs>
          
          <polygon points="50,10 90,90 10,90" fill="url(#triGrad)" />
          
          {/* Blue icing border */}
          <polygon points="50,10 90,90 10,90" fill="none" stroke="#3498DB" strokeWidth="5" strokeLinejoin="round" opacity="0.9" />
          <polygon points="50,10 90,90 10,90" fill="none" stroke="#5DADE2" strokeWidth="2" strokeLinejoin="round" opacity="0.7" />
          
          {/* Details */}
          <circle cx="50" cy="35" r="4" fill="white" opacity="0.25" />
          <polygon points="38,72 50,54 62,72" fill="none" stroke="#27AE60" strokeWidth="1.5" opacity="0.3" />
        </svg>
      );
    }

    if (cookie.shape === 'star') {
      const starPoints = (cx, cy, arms, outerRadius, innerRadius) => {
        const points = [];
        for (let i = 0; i < arms * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / arms;
          points.push([(cx + radius * Math.cos(angle)), (cy + radius * Math.sin(angle))]);
        }
        return points.map(p => p.join(',')).join(' ');
      };

      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          style={{
            ...sharedStyle,
            filter: `drop-shadow(0 6px 12px rgba(0,0,0,0.3)) ${isSelected ? 'drop-shadow(0 0 8px #FF6B9D)' : ''}`
          }}
        >
          <defs>
            <radialGradient id="starGrad" cx="40%" cy="40%">
              <stop offset="0%" style={{ stopColor: cookie.accent, stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: cookie.color, stopOpacity: 1 }} />
            </radialGradient>
          </defs>
          
          <polygon points={starPoints(50, 50, 5, 40, 20)} fill="url(#starGrad)" />
          <polygon points={starPoints(50, 50, 5, 40, 20)} fill="none" stroke={cookie.accent} strokeWidth="1.5" opacity="0.3" />
          
          {/* Shine */}
          <ellipse cx="40" cy="35" rx="15" ry="20" fill="white" opacity="0.2" />
          <circle cx="50" cy="50" r="3" fill={cookie.accent} opacity="0.4" />
          
          {/* Red jam dot on the left arm */}
          <circle cx="16" cy="62" r="6" fill="#D1454A" />
          <circle cx="16" cy="62" r="6" fill="#E74C3C" opacity="0.7" />
          <circle cx="14" cy="60" r="2" fill="#FF7B6B" opacity="0.6" />
        </svg>
      );
    }
  };

  const handleCookieClick = (row, col) => {
    if (gameOver || moves === 0 || !isValidCell(row, col)) return;

    if (!selectedCookie) {
      setSelectedCookie({ row, col });
    } else {
      const { row: selectedRow, col: selectedCol } = selectedCookie;
      
      if (selectedRow === row && selectedCol === col) {
        setSelectedCookie(null);
      } else if (
        Math.abs(selectedRow - row) + Math.abs(selectedCol - col) === 1 &&
        isValidCell(row, col)
      ) {
        swapCookies(selectedRow, selectedCol, row, col);
      }
    }
  };

  // Check if a grid has any matches
  const gridHasMatch = (g) => {
    const rows = g.length;
    const cols = g[0].length;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols - 2; j++) {
        if (g[i][j] && g[i][j] === g[i][j + 1] && g[i][j] === g[i][j + 2]) return true;
      }
    }
    for (let j = 0; j < cols; j++) {
      for (let i = 0; i < rows - 2; i++) {
        if (g[i][j] && g[i][j] === g[i + 1][j] && g[i][j] === g[i + 2][j]) return true;
      }
    }
    return false;
  };

  const swapCookies = (r1, c1, r2, c2) => {
    const newGrid = grid.map(row => [...row]);
    [newGrid[r1][c1], newGrid[r2][c2]] = [newGrid[r2][c2], newGrid[r1][c1]];
    
    // Check if this swap creates a match
    const createsMatch = gridHasMatch(newGrid);
    
    // Determine swap direction
    const swapMap = new Map();
    if (r1 === r2) {
      // Horizontal swap
      if (c1 < c2) {
        swapMap.set(`${r1}-${c1}`, 'slideRight');
        swapMap.set(`${r2}-${c2}`, 'slideLeft');
      } else {
        swapMap.set(`${r1}-${c1}`, 'slideLeft');
        swapMap.set(`${r2}-${c2}`, 'slideRight');
      }
    } else {
      // Vertical swap
      if (r1 < r2) {
        swapMap.set(`${r1}-${c1}`, 'slideDown');
        swapMap.set(`${r2}-${c2}`, 'slideUp');
      } else {
        swapMap.set(`${r1}-${c1}`, 'slideUp');
        swapMap.set(`${r2}-${c2}`, 'slideDown');
      }
    }
    
    setSwappingCells(swapMap);
    setSelectedCookie(null);
    
    if (createsMatch) {
      // Valid move - swap and consume a move
      setGrid(newGrid);
      setMoves(moves - 1);
      
      setTimeout(() => {
        setSwappingCells(new Map());
        checkMatches(newGrid);
      }, 350);
    } else {
      // Invalid move - show swap animation, then swap back
      setGrid(newGrid);
      setMatchMessage('Dambaneh?!🤔');
      setMessageKey(prev => prev + 1);
      
      setTimeout(() => {
        // Swap back to original positions
        const revertGrid = grid.map(row => [...row]);
        setGrid(revertGrid);
        setSwappingCells(new Map());
      }, 350);
    }
  };

  const checkMatches = (currentGrid) => {
    let newGrid = currentGrid.map(row => [...row]);
    let matched = new Set();

    // Check horizontal matches
    for (let i = 0; i < newGrid.length; i++) {
      for (let j = 0; j < newGrid[i].length - 2; j++) {
        if (
          newGrid[i][j] &&
          newGrid[i][j + 1] &&
          newGrid[i][j] === newGrid[i][j + 1] &&
          newGrid[i][j] === newGrid[i][j + 2]
        ) {
          matched.add(`${i}-${j}`);
          matched.add(`${i}-${j + 1}`);
          matched.add(`${i}-${j + 2}`);
        }
      }
    }

    // Check vertical matches
    for (let j = 0; j < newGrid[0].length; j++) {
      for (let i = 0; i < newGrid.length - 2; i++) {
        if (
          newGrid[i][j] &&
          newGrid[i + 1][j] &&
          newGrid[i][j] === newGrid[i + 1][j] &&
          newGrid[i][j] === newGrid[i + 2][j]
        ) {
          matched.add(`${i}-${j}`);
          matched.add(`${i + 1}-${j}`);
          matched.add(`${i + 2}-${j}`);
        }
      }
    }

    if (matched.size > 0) {
      // Burst random cookies into the background
      burstConfetti(matched.size);

      // Compute where the match happened
      const center = getMatchCenter(matched);

      // Show message based on match size
      if (matched.size >= 5) {
        setMatchMessage('Soombinganzandoo!😎');
        burstSprinkles(center);
      } else if (matched.size >= 4) {
        setMatchMessage('Noombingadazoo!');
        burstPowderMix(center);
      } else {
        const messages = ['Noombadeh!', 'Soombadeh!'];
        setMatchMessage(messages[Math.floor(Math.random() * messages.length)]);
      }
      setMessageKey(prev => prev + 1);

      setAnimatingCells(matched);
      setTimeout(() => {
        removeMatches(newGrid, matched);
      }, 300);
    } else if (moves === 1) {
      setGameOver(true);
      rainSprinkles();
    } else {
      // No matches found - check if any moves are possible
      if (!hasPossibleMoves(newGrid)) {
        // No possible moves - shuffle the board
        setTimeout(() => {
          shuffleBoard(newGrid);
        }, 300);
      }
    }
  };

  // Check if there are any possible moves (swaps that create matches)
  const hasPossibleMoves = (currentGrid) => {
    const rows = currentGrid.length;
    const cols = currentGrid[0].length;

    const wouldMatch = (g) => {
      // Check horizontal
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols - 2; j++) {
          if (g[i][j] && g[i][j] === g[i][j + 1] && g[i][j] === g[i][j + 2]) {
            return true;
          }
        }
      }
      // Check vertical
      for (let j = 0; j < cols; j++) {
        for (let i = 0; i < rows - 2; i++) {
          if (g[i][j] && g[i][j] === g[i + 1][j] && g[i][j] === g[i + 2][j]) {
            return true;
          }
        }
      }
      return false;
    };

    // Try every possible swap
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        // Swap right
        if (j < cols - 1) {
          const test = currentGrid.map(r => [...r]);
          [test[i][j], test[i][j + 1]] = [test[i][j + 1], test[i][j]];
          if (wouldMatch(test)) return true;
        }
        // Swap down
        if (i < rows - 1) {
          const test = currentGrid.map(r => [...r]);
          [test[i][j], test[i + 1][j]] = [test[i + 1][j], test[i][j]];
          if (wouldMatch(test)) return true;
        }
      }
    }
    return false;
  };

  // Shuffle the board randomly until there are possible moves but no immediate matches
  const shuffleBoard = (currentGrid) => {
    setMatchMessage('Shuffle! 🔀');
    setMessageKey(prev => prev + 1);

    let shuffled;
    let attempts = 0;
    
    do {
      // Collect all cookies
      const cookies = [];
      for (let i = 0; i < currentGrid.length; i++) {
        for (let j = 0; j < currentGrid[i].length; j++) {
          if (currentGrid[i][j] !== null) {
            cookies.push(currentGrid[i][j]);
          }
        }
      }
      
      // Shuffle using Fisher-Yates
      for (let k = cookies.length - 1; k > 0; k--) {
        const r = Math.floor(Math.random() * (k + 1));
        [cookies[k], cookies[r]] = [cookies[r], cookies[k]];
      }
      
      // Rebuild grid
      shuffled = [];
      let idx = 0;
      for (let i = 0; i < currentGrid.length; i++) {
        const row = [];
        for (let j = 0; j < currentGrid[i].length; j++) {
          if (currentGrid[i][j] !== null) {
            row.push(cookies[idx++]);
          } else {
            row.push(null);
          }
        }
        shuffled.push(row);
      }
      
      attempts++;
    } while (
      attempts < 50 &&
      (!hasPossibleMoves(shuffled) || hasImmediateMatch(shuffled))
    );

    // Animate all cells as filling
    const allCells = new Set();
    for (let i = 0; i < shuffled.length; i++) {
      for (let j = 0; j < shuffled[i].length; j++) {
        if (shuffled[i][j] !== null) {
          allCells.add(`${i}-${j}`);
        }
      }
    }
    
    setFillingCells(allCells);
    setGrid(shuffled);
    
    setTimeout(() => {
      setFillingCells(new Set());
    }, 800);
  };

  // Check for immediate matches (to avoid auto-matching after shuffle)
  const hasImmediateMatch = (g) => {
    const rows = g.length;
    const cols = g[0].length;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols - 2; j++) {
        if (g[i][j] && g[i][j] === g[i][j + 1] && g[i][j] === g[i][j + 2]) return true;
      }
    }
    for (let j = 0; j < cols; j++) {
      for (let i = 0; i < rows - 2; i++) {
        if (g[i][j] && g[i][j] === g[i + 1][j] && g[i][j] === g[i + 2][j]) return true;
      }
    }
    return false;
  };

  const removeMatches = (currentGrid, matched) => {
    let newGrid = currentGrid.map(row => [...row]);
    
    matched.forEach(cell => {
      const [row, col] = cell.split('-').map(Number);
      newGrid[row][col] = null;
    });

    // Find cells that will drop
    let droppingSet = new Set();
    
    // Drop cookies
    for (let j = 0; j < newGrid[0].length; j++) {
      for (let i = newGrid.length - 1; i >= 0; i--) {
        if (newGrid[i] && newGrid[i][j] === null) {
          for (let k = i - 1; k >= 0; k--) {
            if (newGrid[k] && newGrid[k][j] !== null) {
              newGrid[i][j] = newGrid[k][j];
              newGrid[k][j] = null;
              droppingSet.add(`${i}-${j}`);
              break;
            }
          }
        }
      }
    }

    setDroppingCells(droppingSet);

    // Fill empty cells with animation delay
    let fillingSet = new Set();
    for (let i = 0; i < newGrid.length; i++) {
      for (let j = 0; j < newGrid[i].length; j++) {
        if (newGrid[i][j] === null && !(!isValidCell(i, j))) {
          newGrid[i][j] = getRandomCookie();
          fillingSet.add(`${i}-${j}`);
        }
      }
    }

    setFillingCells(fillingSet);
    setAnimatingCells(new Set());
    setScore(score + matched.size * 30);
    setGrid(newGrid);
    
    setTimeout(() => {
      setDroppingCells(new Set());
      setFillingCells(new Set());
      checkMatches(newGrid);
    }, 800);
  };

  const layout = BOARD_LAYOUTS[boardLayout];

  // Decorated background cookie (with random icing + optional bite)
  const BgCookie = ({ type, size, decor, bite, opacity }) => {
    const grad = type === 'jamRed' ? ['#E74C3C', '#D1454A']
      : type === 'jamGreen' ? ['#2ECC71', '#27AE60']
      : type === 'golden' ? ['#FFD700', '#FFC700']
      : type === 'caramel' ? ['#E6B857', '#C9A876']
      : ['#8B5A3C', '#5C3D2E'];
    const isSquare = type === 'chocolate';
    const biteR = size * 0.28;
    const bitePos = bite === 'top-left' ? { cx: 0, cy: 0 }
      : bite === 'top-right' ? { cx: size, cy: 0 }
      : bite === 'bottom-left' ? { cx: 0, cy: size }
      : bite === 'bottom-right' ? { cx: size, cy: size }
      : null;
    const clipId = `bg-${Math.random().toString(36).slice(2, 8)}`;

    return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ opacity: opacity != null ? opacity : 1 }}>
        <defs>
          <radialGradient id={clipId + 'g'} cx="35%" cy="35%">
            <stop offset="0%" stopColor={grad[0]} />
            <stop offset="100%" stopColor={grad[1]} />
          </radialGradient>
          <clipPath id={clipId + 'c'}>
            {isSquare
              ? <rect x="8" y="8" width="84" height="84" rx="14" />
              : <circle cx="50" cy="50" r="46" />}
          </clipPath>
          {bitePos && (
            <mask id={clipId + 'm'}>
              <rect x="0" y="0" width="100" height="100" fill="white" />
              <circle cx={bitePos.cx} cy={bitePos.cy} r={biteR} fill="black" />
            </mask>
          )}
        </defs>
        <g mask={bitePos ? `url(#${clipId + 'm'})` : undefined}>
          {isSquare
            ? <rect x="8" y="8" width="84" height="84" rx="14" fill={`url(#${clipId}g)`} />
            : <circle cx="50" cy="50" r="46" fill={`url(#${clipId}g)`} />}
          <g clipPath={`url(#${clipId}c)`}>
            {decor === 'stripes' && (
              <g stroke="#FFF3D6" strokeWidth="5" strokeLinecap="round" opacity="0.85">
                <line x1="-10" y1="35" x2="70" y2="-45" />
                <line x1="10" y1="70" x2="100" y2="-20" />
                <line x1="35" y1="100" x2="115" y2="20" />
              </g>
            )}
            {decor === 'star' && (
              <polygon points="50,30 56,46 73,46 59,56 64,72 50,62 36,72 41,56 27,46 44,46" fill="#FFF3D6" opacity="0.9" stroke="#C49A6C" strokeWidth="1" />
            )}
            {decor === 'dots' && (
              <g fill="#FFF3D6" opacity="0.85">
                <circle cx="35" cy="40" r="5" />
                <circle cx="62" cy="38" r="4" />
                <circle cx="45" cy="62" r="5" />
                <circle cx="68" cy="63" r="4" />
              </g>
            )}
          </g>
          {/* shine */}
          <ellipse cx="36" cy="34" rx="12" ry="15" fill="white" opacity="0.18" />
        </g>
        {bitePos && (
          <circle cx={bitePos.cx} cy={bitePos.cy} r={biteR} fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1" mask={`url(#${clipId}m)`} />
        )}
      </svg>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #2D1810 0%, #4A2818 50%, #3D2014 100%)',
      padding: '10px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background cookies and chocolate chunks */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        zIndex: 0,
        pointerEvents: 'none'
      }}>
        {/* Large dark chocolate cookies in background */}
        {[
          { top: '5%', left: '8%', size: 120, rotate: 15 },
          { top: '15%', right: '5%', size: 100, rotate: -20 },
          { top: '45%', left: '3%', size: 90, rotate: 30 },
          { bottom: '10%', right: '8%', size: 130, rotate: -15 },
          { bottom: '25%', left: '10%', size: 80, rotate: 25 },
          { top: '60%', right: '12%', size: 110, rotate: -10 }
        ].map((cookie, idx) => (
          <svg
            key={idx}
            width={cookie.size}
            height={cookie.size}
            viewBox="0 0 100 100"
            style={{
              position: 'absolute',
              top: cookie.top,
              left: cookie.left,
              right: cookie.right,
              bottom: cookie.bottom,
              transform: `rotate(${cookie.rotate}deg)`,
              opacity: 0.25,
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))'
            }}
          >
            {/* Dark chocolate cookie base */}
            <circle cx="50" cy="50" r="45" fill="#3D2817" />
            <circle cx="50" cy="50" r="45" fill="url(#bgCookieGrad)" />
            {/* Chocolate chunks */}
            <rect x="30" y="28" width="10" height="10" rx="2" fill="#1A0F08" transform="rotate(15 35 33)" />
            <rect x="58" y="35" width="9" height="9" rx="2" fill="#1A0F08" transform="rotate(-20 62 39)" />
            <rect x="40" y="55" width="11" height="11" rx="2" fill="#1A0F08" transform="rotate(25 45 60)" />
            <rect x="62" y="60" width="8" height="8" rx="2" fill="#1A0F08" transform="rotate(-10 66 64)" />
            <rect x="25" y="48" width="9" height="9" rx="2" fill="#1A0F08" transform="rotate(30 29 52)" />
            <circle cx="50" cy="40" r="3" fill="#1A0F08" />
            <circle cx="35" cy="70" r="2.5" fill="#1A0F08" />
            <defs>
              <radialGradient id="bgCookieGrad" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#5C3D2E" />
                <stop offset="100%" stopColor="#2D1810" />
              </radialGradient>
            </defs>
          </svg>
        ))}
        
        {/* Floating chocolate chunks */}
        {[
          { top: '25%', left: '25%', size: 25, rotate: 20 },
          { top: '35%', right: '20%', size: 20, rotate: -30 },
          { bottom: '35%', left: '30%', size: 22, rotate: 45 },
          { top: '70%', left: '20%', size: 18, rotate: -15 },
          { bottom: '45%', right: '25%', size: 24, rotate: 10 }
        ].map((chunk, idx) => (
          <div
            key={`chunk-${idx}`}
            style={{
              position: 'absolute',
              top: chunk.top,
              left: chunk.left,
              right: chunk.right,
              bottom: chunk.bottom,
              width: chunk.size,
              height: chunk.size,
              background: 'linear-gradient(135deg, #2D1810, #1A0F08)',
              borderRadius: '4px',
              transform: `rotate(${chunk.rotate}deg)`,
              opacity: 0.3,
              boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.4)'
            }}
          />
        ))}
        
        {/* Falling honey drops */}
        {[
          { left: '15%', delay: 0, duration: 4 },
          { left: '35%', delay: 1.5, duration: 5 },
          { left: '55%', delay: 0.8, duration: 4.5 },
          { left: '75%', delay: 2.2, duration: 3.8 },
          { left: '90%', delay: 1.2, duration: 5.2 },
          { left: '25%', delay: 3, duration: 4.2 },
          { left: '65%', delay: 2.5, duration: 4.8 },
          { left: '45%', delay: 3.5, duration: 4 }
        ].map((drop, idx) => (
          <div
            key={`honey-${idx}`}
            style={{
              position: 'absolute',
              left: drop.left,
              top: '-30px',
              width: '14px',
              height: '20px',
              animation: `honeyFall ${drop.duration}s ease-in ${drop.delay}s infinite`
            }}
          >
            {/* Honey drop shape */}
            <svg width="14" height="20" viewBox="0 0 14 20">
              <path
                d="M 7 0 Q 7 8 3 13 Q 0 17 7 20 Q 14 17 11 13 Q 7 8 7 0"
                fill="url(#honeyGrad)"
                opacity="0.8"
              />
              <ellipse cx="5" cy="14" rx="2" ry="3" fill="#FFF" opacity="0.4" />
              <defs>
                <linearGradient id="honeyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFB938" />
                  <stop offset="100%" stopColor="#DBA800" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        ))}
        
        {/* Always-falling colorful cookies */}
        {[
          { left: '10%', delay: 0, duration: 7, type: 'jamRed', size: 28, decor: 'stripes' },
          { left: '28%', delay: 2.5, duration: 8, type: 'golden', size: 24, decor: 'star' },
          { left: '48%', delay: 1.2, duration: 6.5, type: 'jamGreen', size: 30, decor: 'dots' },
          { left: '68%', delay: 3.5, duration: 7.5, type: 'caramel', size: 26, decor: 'stripes' },
          { left: '85%', delay: 0.8, duration: 8.5, type: 'chocolate', size: 22, decor: 'star' },
          { left: '38%', delay: 4.5, duration: 7, type: 'jamRed', size: 25, decor: 'dots' },
          { left: '78%', delay: 5, duration: 6.8, type: 'golden', size: 27, decor: 'stripes' },
          { left: '18%', delay: 3, duration: 8, type: 'jamGreen', size: 23, decor: 'star' }
        ].map((c, idx) => (
          <div
            key={`fallcookie-${idx}`}
            style={{
              position: 'absolute',
              left: c.left,
              top: '-40px',
              width: c.size + 'px',
              height: c.size + 'px',
              animation: `cookieFallBg ${c.duration}s linear ${c.delay}s infinite`
            }}
          >
            <BgCookie type={c.type} size={c.size} decor={c.decor} bite="none" opacity={0.4} />
          </div>
        ))}
        
        {/* Confetti cookies burst on match */}
        {confettiCookies.map((c) => (
          <div
            key={c.id}
            style={{
              position: 'absolute',
              left: c.left + '%',
              top: '-50px',
              width: c.size + 'px',
              height: c.size + 'px',
              animation: `confettiFall ${c.duration}s ease-in ${c.delay}s forwards`,
              ['--drift']: c.drift + 'px',
              ['--rot']: c.rotate + 'deg'
            }}
          >
            <BgCookie type={c.type} size={c.size} decor={c.decor} bite={c.bite} opacity={0.8} />
          </div>
        ))}
      </div>
      
      <style>{`
        @keyframes honeyFall {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(100vh) scale(0.8);
            opacity: 0;
          }
        }
        
        @keyframes cookieFallBg {
          0% {
            transform: translateY(-10vh) rotate(0deg);
          }
          100% {
            transform: translateY(110vh) rotate(360deg);
          }
        }
        
        @keyframes confettiFall {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 0.9;
          }
          100% {
            transform: translateY(105vh) translateX(var(--drift, 0px)) rotate(var(--rot, 360deg));
            opacity: 0;
          }
        }
        
        @keyframes sprinkleFly {
          0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translate(var(--dx, 0px), var(--dy, 0px)) rotate(var(--rot, 360deg));
            opacity: 0;
          }
        }
        
        @keyframes coconutFall {
          0% {
            transform: translate(0, 0);
            opacity: 0;
          }
          15% {
            opacity: 0.95;
          }
          85% {
            opacity: 0.95;
          }
          100% {
            transform: translate(var(--cdx, 0px), var(--cdy, 0px));
            opacity: 0;
          }
        }
      `}</style>
      <style>{`
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          padding: 0;
        }
        
        @keyframes slideLeft {
          from {
            transform: translateX(65px);
            opacity: 0.7;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideRight {
          from {
            transform: translateX(-65px);
            opacity: 0.7;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideUp {
          from {
            transform: translateY(65px);
            opacity: 0.7;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-60px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes popMessage {
          0% {
            opacity: 0;
            transform: scale(0.3) translateY(-30px);
          }
          10% {
            opacity: 1;
            transform: scale(1.1);
          }
          90% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.8) translateY(30px);
          }
        }
        
        @keyframes centerPop {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.3);
          }
          12% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.15);
          }
          22% {
            transform: translate(-50%, -50%) scale(1);
          }
          80% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.3);
          }
        }
        
        @keyframes cookieFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        
        .cookie-cell {
          perspective: 1000px;
        }
        
        .cookie-float {
          animation: cookieFloat var(--float-duration, 3s) ease-in-out var(--float-delay, 0s) infinite;
        }
        
        .match-message {
          animation: popMessage 1s ease-out forwards;
        }
      `}</style>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Centered encouraging message overlay */}
        {matchMessage && (
          <div
            key={messageKey}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 50,
              pointerEvents: 'none',
              width: '90%',
              maxWidth: '90vw',
              fontSize: matchMessage.length > 13 ? '1.7em' : matchMessage.length > 9 ? '2.2em' : '2.8em',
              fontWeight: '900',
              fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
              textAlign: 'center',
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              lineHeight: '1.1',
              color: matchMessage.includes('Dambaneh') ? '#E74C3C' : matchMessage.includes('Shuffle') ? '#E67E22' : matchMessage.includes('Soombinganzandoo') ? '#9B59B6' : matchMessage === 'Noombingadazoo!' ? '#E74C3C' : matchMessage === 'Noombadeh!' ? '#3498DB' : '#2ECC71',
              textShadow: `
                -2px -2px 0 #FFF,
                2px -2px 0 #FFF,
                -2px 2px 0 #FFF,
                2px 2px 0 #FFF,
                4px 4px 0px rgba(0,0,0,0.35),
                6px 6px 14px rgba(0,0,0,0.5)
              `,
              letterSpacing: '2px',
              animation: 'centerPop 2s ease-out forwards'
            }}
          >
            {matchMessage}
          </div>
        )}

        {/* Sprinkles + coconut powder overlay (over the cookies) */}
        {sprinkles.length > 0 && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 60,
            pointerEvents: 'none',
            overflow: 'hidden'
          }}>
            {sprinkles.map((s) => (
              s.kind === 'sprinkle' ? (
                <div
                  key={s.id}
                  style={{
                    position: 'absolute',
                    left: s.startX + '%',
                    top: s.startY + '%',
                    width: s.len + 'px',
                    height: s.thick + 'px',
                    borderRadius: s.thick + 'px',
                    background: s.color,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                    animation: `sprinkleFly ${s.duration}s ease-out ${s.delay}s forwards`,
                    ['--dx']: s.dx + 'px',
                    ['--dy']: s.dy + 'px',
                    ['--rot']: s.rotate + 'deg'
                  }}
                />
              ) : (
                <div
                  key={s.id}
                  style={{
                    position: 'absolute',
                    left: s.startX + '%',
                    top: s.startY + '%',
                    width: s.size + 'px',
                    height: s.size + 'px',
                    borderRadius: '50%',
                    background: s.powderColor || '#FFFFFF',
                    opacity: 0.9,
                    boxShadow: s.powderColor === '#6B4423' ? '0 0 2px rgba(107,68,35,0.6)' : '0 0 2px rgba(255,255,255,0.8)',
                    animation: `coconutFall ${s.duration}s linear ${s.delay}s forwards`,
                    ['--cdx']: s.dx + 'px',
                    ['--cdy']: s.dy + 'px'
                  }}
                />
              )
            ))}
          </div>
        )}

        {/* Header */}
        <div style={{
          background: 'transparent',
          padding: '12px 8px 4px',
          textAlign: 'center',
          flex: '0 0 auto'
        }}>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '2em',
            fontWeight: '900',
            fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
            color: '#FFF3D6',
            letterSpacing: '1px',
            textShadow: `
              -2px -2px 0 #5C3D2E,
              2px -2px 0 #5C3D2E,
              -2px 2px 0 #5C3D2E,
              2px 2px 0 #5C3D2E,
              0 -2px 0 #5C3D2E,
              0 2px 0 #5C3D2E,
              -2px 0 0 #5C3D2E,
              2px 0 0 #5C3D2E,
              4px 4px 8px rgba(0,0,0,0.5)
            `
          }}>
            🍪 Noombineh!
          </h1>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '6px',
            marginTop: '4px',
            padding: '8px',
            background: 'rgba(255, 243, 214, 0.92)',
            borderRadius: '12px',
            border: '2px solid rgba(92, 61, 46, 0.3)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <div>
              <p style={{ color: '#8B6F47', fontSize: '0.6em', margin: '0 0 0px 0', textTransform: 'uppercase', fontWeight: '700' }}>Score</p>
              <p style={{ color: '#5C4033', fontSize: '1.1em', fontWeight: 'bold', margin: 0 }}>
                {score}
              </p>
            </div>
            <div>
              <p style={{ color: '#8B6F47', fontSize: '0.6em', margin: '0 0 0px 0', textTransform: 'uppercase', fontWeight: '700' }}>Moves</p>
              <p style={{ color: moves > 10 ? '#5C4033' : '#E74C3C', fontSize: '1.1em', fontWeight: 'bold', margin: 0 }}>
                {moves}
              </p>
            </div>
          </div>
        </div>

        {/* Game Board */}
        <div style={{
          background: 'transparent',
          padding: '12px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flex: '1 1 auto',
          minHeight: '0',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1
        }}>
          <style>{`
            @keyframes drop {
              from {
                opacity: 0;
                transform: translateY(-80px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            
            @keyframes bounce {
              0%, 100% {
                transform: scale(1);
              }
              50% {
                transform: scale(1.05);
              }
            }
            
            @keyframes popOut {
              0% {
                opacity: 1;
                transform: scale(1);
              }
              50% {
                transform: scale(1.2);
              }
              100% {
                opacity: 0;
                transform: scale(0);
              }
            }
            
            .dropping-cookie {
              animation: drop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }
            
            .filling-cookie {
              animation: drop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }
            
            .matching-cookie {
              animation: popOut 0.5s ease forwards;
            }
            
            .bouncing-cookie {
              animation: bounce 0.3s ease-in-out;
            }
          `}</style>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(6, 1fr)`,
            gridTemplateRows: `repeat(6, 1fr)`,
            placeItems: 'stretch',
            gap: '2.5%',
            padding: '4%',
            background: 'linear-gradient(135deg, #FFF9F0 0%, #FFF5E6 100%)',
            borderRadius: '20px',
            border: '10px solid #FF9D5C',
            position: 'relative',
            outline: '3px dashed rgba(255, 157, 92, 0.5)',
            outlineOffset: '-14px',
            boxShadow: `
              inset 0 4px 12px rgba(0,0,0,0.08),
              0 0 0 3px #FFD684,
              0 15px 40px rgba(0,0,0,0.4)
            `,
            width: 'auto',
            height: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            aspectRatio: '1 / 1',
            boxSizing: 'border-box',
            margin: '0 auto'
          }}
          >

            {grid.map((row, i) =>
              row.map((cookie, j) => {
                const cellKey = `${i}-${j}`;
                const isMatching = animatingCells.has(cellKey);
                const isDropping = droppingCells.has(cellKey);
                const isFilling = fillingCells.has(cellKey);
                
                return (
                  <div
                    key={cellKey}
                    className="cookie-cell"
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: isMatching ? 0 : 1,
                      transition: isMatching 
                        ? 'opacity 0.5s ease' 
                        : isDropping || isFilling
                        ? 'none'
                        : 'opacity 0.2s ease',
                      cursor: cookie ? 'pointer' : 'default',
                      position: 'relative',
                      animation: swappingCells.has(cellKey) ? `${swappingCells.get(cellKey)} 0.3s ease-in-out forwards` : 'none'
                    }}
                    onClick={() => handleCookieClick(i, j)}
                  >
                    {cookie && isValidCell(i, j) && (
                      <div
                        className={(!isDropping && !isFilling && !isMatching && !swappingCells.has(cellKey)) ? 'cookie-float' : ''}
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          '--float-duration': `${2.2 + ((i * 5 + j) % 7) * 0.35}s`,
                          '--float-delay': `${((i * 7 + j * 3) % 11) * 0.28}s`,
                          animation: isDropping 
                            ? `drop ${0.6 + Math.random() * 0.2}s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`
                            : isFilling
                            ? `drop ${0.8 + Math.random() * 0.2}s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`
                            : undefined
                        }}
                      >
                        <CookieShape
                          type={cookie}
                          isSelected={selectedCookie?.row === i && selectedCookie?.col === j}
                          isFalling={isDropping || isFilling}
                          isMatching={isMatching}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          background: 'white',
          borderRadius: '15px 15px 0 0',
          padding: '5px 5px 5px',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.2)',
          flex: '0 0 auto',
          position: 'relative',
          zIndex: 100
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '3px'
          }}>
            <button
              onClick={initializeGrid}
              style={{
                padding: '5px 4px',
                background: 'linear-gradient(135deg, #FF9D5C 0%, #FF8C42 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '0.6em',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(255, 157, 92, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
              }}
            >
              🔄 New Game
            </button>
            
            <button
              onClick={handleShuffle}
              style={{
                padding: '5px 4px',
                background: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '0.6em',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(46, 204, 113, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
              }}
            >
              🔀 Shuffle
            </button>
            
            <button
              onClick={openSaveScore}
              style={{
                padding: '5px 4px',
                background: 'linear-gradient(135deg, #3498DB 0%, #2980B9 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '0.6em',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(52, 152, 219, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
              }}
            >
              💾 Save Score
            </button>
            
            <button
              onClick={() => setShowRankings(true)}
              style={{
                padding: '5px 4px',
                background: 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '0.6em',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(155, 89, 182, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
              }}
            >
              🏆 Ranking
            </button>
          </div>

          {gameOver && moves === 0 && (
            <div style={{
              padding: '4px 6px',
              background: 'linear-gradient(135deg, #FFE4A3 0%, #FFD684 100%)',
              borderRadius: '6px',
              borderLeft: '2px solid #DBA800',
              textAlign: 'center',
              marginTop: '4px'
            }}>
              <p style={{
                color: '#5C4033',
                fontSize: '0.7em',
                fontWeight: '600',
                margin: '0 0 1px 0'
              }}>
                🎉 Game Over!
              </p>
              <p style={{
                color: '#8B6F47',
                margin: 0,
                fontSize: '0.65em'
              }}>
                Score: <strong>{score}</strong>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Name Input Modal */}
      {showNameInput && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '25px',
            maxWidth: '320px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{
              color: '#5C4033',
              fontSize: '1.4em',
              margin: '0 0 5px 0',
              fontFamily: '"Comic Sans MS", cursive'
            }}>
              🏆 New Record!
            </h2>
            <p style={{
              color: '#8B6F47',
              fontSize: '0.95em',
              margin: '0 0 15px 0'
            }}>
              Score: <strong style={{ color: '#FF9D5C', fontSize: '1.3em' }}>{pendingScore}</strong>
            </p>
            <p style={{
              color: '#8B6F47',
              fontSize: '0.85em',
              margin: '0 0 12px 0'
            }}>
              Enter your name:
            </p>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveScore()}
              placeholder="Your name..."
              maxLength={15}
              autoFocus
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1em',
                border: '2px solid #FF9D5C',
                borderRadius: '10px',
                marginBottom: '15px',
                textAlign: 'center',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px'
            }}>
              <button
                onClick={() => {
                  setShowNameInput(false);
                  setPlayerName('');
                }}
                style={{
                  padding: '12px',
                  background: '#E0E0E0',
                  color: '#666',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.9em',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScore}
                style={{
                  padding: '12px',
                  background: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.9em',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rankings Modal */}
      {showRankings && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '25px',
            maxWidth: '380px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{
              color: '#5C4033',
              fontSize: '1.5em',
              margin: '0 0 20px 0',
              textAlign: 'center',
              fontFamily: '"Comic Sans MS", cursive'
            }}>
              🏆 Top Rankings
            </h2>
            
            {rankings.length === 0 ? (
              <p style={{
                color: '#8B6F47',
                textAlign: 'center',
                padding: '30px 0',
                fontSize: '0.95em'
              }}>
                No records yet!<br />Be the first champion! 🍪
              </p>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                {rankings.map((rank, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 12px',
                      marginBottom: '6px',
                      background: idx === 0 ? 'linear-gradient(135deg, #FFE4A3 0%, #FFD684 100%)' 
                        : idx === 1 ? 'linear-gradient(135deg, #E8E8E8 0%, #D0D0D0 100%)'
                        : idx === 2 ? 'linear-gradient(135deg, #F0C896 0%, #E0B080 100%)'
                        : '#F9F7F4',
                      borderRadius: '10px',
                      gap: '10px'
                    }}
                  >
                    <span style={{
                      fontSize: '1.3em',
                      fontWeight: 'bold',
                      minWidth: '35px',
                      textAlign: 'center'
                    }}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        color: '#5C4033',
                        fontWeight: '700',
                        margin: '0 0 2px 0',
                        fontSize: '0.95em'
                      }}>
                        {rank.name}
                      </p>
                      <p style={{
                        color: '#8B6F47',
                        margin: 0,
                        fontSize: '0.7em'
                      }}>
                        {rank.date}
                      </p>
                    </div>
                    <span style={{
                      color: '#FF9D5C',
                      fontWeight: '800',
                      fontSize: '1.1em'
                    }}>
                      {rank.score}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            <button
              onClick={() => setShowRankings(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #FF9D5C 0%, #FF8C42 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.95em',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoombinehMatch;