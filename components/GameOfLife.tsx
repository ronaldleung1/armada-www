// "use client"
// import React, { useEffect, useRef } from 'react';

// const GameOfLife: React.FC = () => {
//   const canvasRef = useRef<HTMLCanvasElement | null>(null);
//   const rows = 50;
//   const cols = 50;
//   const cellSize = 10;
//   const grid = Array.from({ length: rows }, () => Array(cols).fill(0));

//   const drawGrid = (ctx: CanvasRenderingContext2D) => {
//     ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
//     for (let r = 0; r < rows; r++) {
//       for (let c = 0; c < cols; c++) {
//         ctx.fillStyle = grid[r][c] ? 'black' : 'white';
//         ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
//         ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);
//       }
//     }
//   };

//   const updateGrid = () => {
//     const newGrid = grid.map(arr => [...arr]);
//     for (let r = 0; r < rows; r++) {
//       for (let c = 0; c < cols; c++) {
//         const neighbors = [
//           grid[(r - 1 + rows) % rows][(c - 1 + cols) % cols],
//           grid[(r - 1 + rows) % rows][c],
//           grid[(r - 1 + rows) % rows][(c + 1) % cols],
//           grid[r][(c - 1 + cols) % cols],
//           grid[r][(c + 1) % cols],
//           grid[(r + 1) % rows][(c - 1 + cols) % cols],
//           grid[(r + 1) % rows][c],
//           grid[(r + 1) % rows][(c + 1) % cols],
//         ].reduce((a, b) => a + b, 0);

//         if (grid[r][c] === 1 && (neighbors < 2 || neighbors > 3)) {
//           newGrid[r][c] = 0; // Cell dies
//         } else if (grid[r][c] === 0 && neighbors === 3) {
//           newGrid[r][c] = 1; // Cell becomes alive
//         }
//       }
//     }
//     grid.splice(0, grid.length, ...newGrid);
//   };

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;
//     const ctx = canvas.getContext('2d');
//     if (!ctx) return;

//     const interval = setInterval(() => {
//       updateGrid();
//       drawGrid(ctx);
//     }, 100);

//     return () => clearInterval(interval);
//   }, []);

//   return <canvas ref={canvasRef} width={cols * cellSize} height={rows * cellSize} />;
// };

// export default GameOfLife;