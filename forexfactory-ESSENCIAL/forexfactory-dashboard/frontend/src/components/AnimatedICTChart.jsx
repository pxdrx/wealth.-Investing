import React, { useEffect, useRef } from 'react';

const AnimatedICTChart = ({ concept, language = 'pt' }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Desenha grid de fundo
      drawGrid(ctx, width, height);
      
      // Desenha animação específica do conceito
      switch(concept) {
        case 'fvg':
          animateFVG(ctx, width, height, frame);
          break;
        case 'orderblock':
          animateOrderBlock(ctx, width, height, frame);
          break;
        case 'killzone':
          animateKillZone(ctx, width, height, frame);
          break;
        case 'po3':
          animatePowerOfThree(ctx, width, height, frame);
          break;
        case 'silverbullet':
          animateSilverBullet(ctx, width, height, frame);
          break;
        case 'mss':
          animateMarketStructure(ctx, width, height, frame);
          break;
        case 'liquidity':
          animateLiquiditySweep(ctx, width, height, frame);
          break;
        case 'breakerblock':
          animateBreakerBlock(ctx, width, height, frame);
          break;
        case 'nwog':
          animateNWOG(ctx, width, height, frame);
          break;
        case 'ote':
          animateOTE(ctx, width, height, frame);
          break;
        case 'displacement':
          animateDisplacement(ctx, width, height, frame);
          break;
        case 'imbalance':
          animateImbalance(ctx, width, height, frame);
          break;
        default:
          animateFVG(ctx, width, height, frame);
      }
      
      frame++;
      if (frame > 400) frame = 0; // Reset após 400 frames (animação mais lenta)
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [concept]);

  // Grid de fundo
  const drawGrid = (ctx, width, height) => {
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1;
    
    // Linhas verticais
    for (let i = 0; i < 10; i++) {
      const x = (width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Linhas horizontais
    for (let i = 0; i < 6; i++) {
      const y = (height / 6) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  // Função auxiliar para desenhar candle
  const drawCandle = (ctx, x, open, close, high, low, width, color) => {
    const bodyTop = Math.min(open, close);
    const bodyHeight = Math.abs(close - open);
    
    // Wick (pavio)
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + width / 2, high);
    ctx.lineTo(x + width / 2, low);
    ctx.stroke();
    
    // Body (corpo)
    ctx.fillStyle = color;
    ctx.fillRect(x, bodyTop, width, bodyHeight || 2);
  };

  // Animação Fair Value Gap
  const animateFVG = (ctx, width, height, frame) => {
    const centerY = height / 2;
    const candleWidth = 35; // Aumentado de 20 para 35
    const spacing = 45; // Aumentado de 30 para 45
    const startX = 80;
    
    // Desenha 5 candles com proporções maiores
    const candles = [
      { open: centerY + 30, close: centerY + 15, high: centerY + 38, low: centerY + 8, color: '#ef4444' },
      { open: centerY + 15, close: centerY, high: centerY + 23, low: centerY - 8, color: '#ef4444' },
      // GAP AQUI
      { open: centerY - 45, close: centerY - 60, high: centerY - 38, low: centerY - 68, color: '#10b981' },
      { open: centerY - 60, close: centerY - 75, high: centerY - 53, low: centerY - 83, color: '#10b981' },
      { open: centerY - 75, close: centerY - 90, high: centerY - 68, low: centerY - 98, color: '#10b981' },
    ];
    
    // Animação mais lenta - cada candle aparece a cada 40 frames
    candles.forEach((candle, i) => {
      if (i === 2) return; // Pula o candle do gap
      const x = startX + (i < 2 ? i : i - 1) * (candleWidth + spacing);
      if (frame > i * 40) { // Mudado de 20 para 40
        drawCandle(ctx, x, candle.open, candle.close, candle.high, candle.low, candleWidth, candle.color);
      }
    });
    
    // Destaca o GAP após os candles aparecerem - com pausa maior
    if (frame > 200) { // Mudado de 100 para 200
      const gapTop = centerY - 8;
      const gapBottom = centerY - 38;
      const alpha = Math.min(1, (frame - 200) / 60); // Fade in mais lento
      
      ctx.fillStyle = `rgba(147, 51, 234, ${alpha * 0.3})`;
      ctx.fillRect(startX, gapTop, (candleWidth + spacing) * 4, gapBottom - gapTop);
      
      // Setas indicando o gap
      if (frame > 260) { // Mudado de 130 para 260
        ctx.strokeStyle = '#9333ea';
        ctx.lineWidth = 3; // Linha mais grossa
        ctx.setLineDash([5, 5]);
        
        ctx.beginPath();
        ctx.moveTo(startX - 30, gapTop);
        ctx.lineTo(startX - 30, gapBottom);
        ctx.stroke();
        
        // Texto maior
        ctx.setLineDash([]);
        ctx.fillStyle = '#9333ea';
        ctx.font = 'bold 18px Arial'; // Aumentado de 14 para 18
        ctx.fillText('FVG', startX - 65, (gapTop + gapBottom) / 2);
      }
    }
    
    // Animação de preço retornando - mais lenta e com pausa
    if (frame > 300) { // Mudado de 150 para 300
      const progress = Math.min(1, (frame - 300) / 100); // Dobrou a duração
      const returnY = centerY - 98 + (centerY - 23 - (centerY - 98)) * progress;
      
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 4; // Linha mais grossa
      ctx.beginPath();
      ctx.moveTo(startX + (candleWidth + spacing) * 3.5, centerY - 98);
      ctx.lineTo(startX + (candleWidth + spacing) * 4.8, returnY);
      ctx.stroke();
      
      // Círculo maior na ponta
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(startX + (candleWidth + spacing) * 4.8, returnY, 7, 0, Math.PI * 2); // Aumentado de 5 para 7
      ctx.fill();
    }
  };

  // Animação Order Block
  const animateOrderBlock = (ctx, width, height, frame) => {
    const centerY = height / 2;
    const candleWidth = 35; // Aumentado
    const spacing = 40; // Aumentado
    const startX = 60;
    
    // Estrutura: varios candles bearish, último bullish (OB), depois impulso bullish
    const candles = [
      { open: centerY - 30, close: centerY - 15, color: '#10b981' },
      { open: centerY - 15, close: centerY, color: '#10b981' },
      { open: centerY, close: centerY + 15, color: '#ef4444' },
      { open: centerY + 15, close: centerY + 23, color: '#ef4444' },
      { open: centerY + 23, close: centerY + 8, color: '#10b981' }, // ORDER BLOCK
      { open: centerY + 8, close: centerY - 45, color: '#10b981' }, // Impulso
      { open: centerY - 45, close: centerY - 75, color: '#10b981' },
      { open: centerY - 75, close: centerY - 105, color: '#10b981' },
    ];
    
    // Animação mais lenta - cada candle a cada 40 frames
    candles.forEach((candle, i) => {
      const x = startX + i * (candleWidth + spacing);
      if (frame > i * 40) { // Mudado de 20 para 40
        const high = candle.open > candle.close ? candle.open + 8 : candle.close + 8;
        const low = candle.open < candle.close ? candle.open - 8 : candle.close - 8;
        drawCandle(ctx, x, candle.open, candle.close, high, low, candleWidth, candle.color);
      }
    });
    
    // Destaca Order Block (candle 4) - mais tarde
    if (frame > 240) { // Mudado de 120 para 240
      const obX = startX + 4 * (candleWidth + spacing);
      const alpha = Math.min(1, (frame - 240) / 60); // Fade mais lento
      
      ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
      ctx.lineWidth = 4; // Linha mais grossa
      ctx.strokeRect(obX - 8, centerY + 8, candleWidth + 16, 23 - 8);
      
      ctx.fillStyle = `rgba(59, 130, 246, ${alpha * 0.2})`;
      ctx.fillRect(obX - 8, centerY + 8, candleWidth + 16, 23 - 8);
      
      // Label maior
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 16px Arial'; // Aumentado de 12 para 16
      ctx.fillText('ORDER BLOCK', obX - 15, centerY + 40);
    }
  };

  // Animação Kill Zone
  const animateKillZone = (ctx, width, height, frame) => {
    const centerY = height / 2;
    
    // Desenha relógio 24h maior
    const clockRadius = 100; // Aumentado de 80
    const clockX = width / 2;
    const clockY = centerY;
    
    // Círculo do relógio
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 4; // Mais grosso
    ctx.beginPath();
    ctx.arc(clockX, clockY, clockRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Marcações de horas
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 - Math.PI / 2;
      const x1 = clockX + Math.cos(angle) * (clockRadius - 12);
      const y1 = clockY + Math.sin(angle) * (clockRadius - 12);
      const x2 = clockX + Math.cos(angle) * clockRadius;
      const y2 = clockY + Math.sin(angle) * clockRadius;
      
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 2; // Linhas mais grossas
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    
    // Kill Zones destacadas - animação mais lenta
    const zones = [
      { start: 2, end: 5, name: 'London', color: '#3b82f6' },
      { start: 7, end: 10, name: 'NY', color: '#8b5cf6' },
      { start: 20, end: 24, name: 'Asian', color: '#10b981' },
    ];
    
    zones.forEach((zone, zoneIdx) => {
      if (frame > zoneIdx * 120) { // Mudado de 60 para 120
        const startAngle = (zone.start / 24) * Math.PI * 2 - Math.PI / 2;
        const endAngle = (zone.end / 24) * Math.PI * 2 - Math.PI / 2;
        const alpha = Math.min(1, (frame - zoneIdx * 120) / 60); // Fade mais lento
        
        ctx.fillStyle = `${zone.color}33`;
        ctx.beginPath();
        ctx.moveTo(clockX, clockY);
        ctx.arc(clockX, clockY, clockRadius, startAngle, endAngle);
        ctx.closePath();
        ctx.fill();
        
        // Label maior
        const labelAngle = (startAngle + endAngle) / 2;
        const labelX = clockX + Math.cos(labelAngle) * (clockRadius + 40);
        const labelY = clockY + Math.sin(labelAngle) * (clockRadius + 40);
        
        ctx.fillStyle = zone.color;
        ctx.font = 'bold 16px Arial'; // Aumentado de 12 para 16
        ctx.textAlign = 'center';
        ctx.fillText(zone.name, labelX, labelY);
      }
    });
  };

  // Animação Power of Three
  const animatePowerOfThree = (ctx, width, height, frame) => {
    const centerY = height / 2;
    const sectionWidth = width / 4;
    
    // Fase 1: Accumulation (range) - aparece devagar
    if (frame > 0) {
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 3; // Linha mais grossa
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(sectionWidth * 0.5, centerY - 40, sectionWidth * 0.8, 80);
      ctx.setLineDash([]);
      
      ctx.fillStyle = '#6b7280';
      ctx.font = 'bold 16px Arial'; // Texto maior
      ctx.fillText('1. Accumulation', sectionWidth * 0.55, centerY - 55);
      
      // Price ranging - movimento mais lento
      const rangeProgress = (frame % 120) / 120; // Mudado de 60 para 120
      const rangeY = centerY - 25 + Math.sin(rangeProgress * Math.PI * 4) * 20;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(sectionWidth * 0.9, rangeY, 7, 0, Math.PI * 2); // Círculo maior
      ctx.fill();
    }
    
    // Fase 2: Manipulation (false breakout) - mais tarde e devagar
    if (frame > 120) { // Mudado de 60 para 120
      const manipProgress = Math.min(1, (frame - 120) / 80); // Mudado de 40 para 80
      
      // Seta para cima (fake breakout)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4; // Linha mais grossa
      ctx.beginPath();
      ctx.moveTo(sectionWidth * 1.3, centerY);
      ctx.lineTo(sectionWidth * 1.5, centerY - 65 * manipProgress); // Movimento maior
      ctx.stroke();
      
      // Seta voltando
      if (manipProgress > 0.5) {
        const returnProgress = (manipProgress - 0.5) * 2;
        ctx.strokeStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(sectionWidth * 1.5, centerY - 65);
        ctx.lineTo(sectionWidth * 1.7, centerY - 65 + 40 * returnProgress);
        ctx.stroke();
      }
      
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('2. Manipulation', sectionWidth * 1.25, centerY - 75);
    }
    
    // Fase 3: Distribution (real move) - ainda mais tarde
    if (frame > 240) { // Mudado de 120 para 240
      const distProgress = Math.min(1, (frame - 240) / 120); // Mudado de 60 para 120
      
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4; // Linha mais grossa
      ctx.beginPath();
      ctx.moveTo(sectionWidth * 2.2, centerY - 25);
      ctx.lineTo(sectionWidth * 2.8, centerY + 65 * distProgress); // Movimento maior
      ctx.stroke();
      
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('3. Distribution', sectionWidth * 2.25, centerY - 40);
    }
  };

  // Animação Silver Bullet
  const animateSilverBullet = (ctx, width, height, frame) => {
    const centerY = height / 2;
    
    // Desenha timeline
    const timelineY = height - 50;
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 3; // Linha mais grossa
    ctx.beginPath();
    ctx.moveTo(50, timelineY);
    ctx.lineTo(width - 50, timelineY);
    ctx.stroke();
    
    // Horas - texto maior
    const hours = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '24:00'];
    hours.forEach((hour, i) => {
      const x = 50 + (width - 100) * (i / 8);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px Arial'; // Aumentado de 10 para 12
      ctx.textAlign = 'center';
      ctx.fillText(hour, x, timelineY + 25);
    });
    
    // Destaca Silver Bullet zones - animação mais lenta
    const zones = [
      { start: 3, end: 4, name: 'London SB', color: '#3b82f6' },
      { start: 10, end: 11, name: 'NY SB', color: '#8b5cf6' },
    ];
    
    zones.forEach((zone, idx) => {
      if (frame > idx * 120) { // Mudado de 60 para 120
        const alpha = Math.min(1, (frame - idx * 120) / 60); // Fade mais lento
        const startX = 50 + (width - 100) * (zone.start / 24);
        const endX = 50 + (width - 100) * (zone.end / 24);
        
        // Highlight zone
        ctx.fillStyle = `${zone.color}33`;
        ctx.fillRect(startX, 50, endX - startX, height - 120);
        
        // Label maior
        ctx.fillStyle = zone.color;
        ctx.font = 'bold 18px Arial'; // Aumentado de 14 para 18
        ctx.textAlign = 'center';
        ctx.fillText(zone.name, (startX + endX) / 2, 35);
        
        // "High Probability" indicator - mais tarde
        if (frame > idx * 120 + 80) { // Mudado de 40 para 80
          ctx.fillStyle = zone.color;
          ctx.font = '14px Arial'; // Aumentado de 12 para 14
          ctx.fillText('⭐ High Probability', (startX + endX) / 2, centerY);
        }
      }
    });
  };

  // Animação Market Structure
  const animateMarketStructure = (ctx, width, height, frame) => {
    const centerY = height / 2;
    
    // Estrutura de alta (Higher Highs, Higher Lows) - espaçamento maior
    const uptrend = [
      { x: 60, y: centerY + 50 },
      { x: 150, y: centerY + 25 },
      { x: 240, y: centerY },
      { x: 330, y: centerY - 25 },
    ];
    
    // Desenha linha de tendência - mais devagar
    if (frame > 40) { // Mudado de 20 para 40
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3; // Linha mais grossa
      ctx.beginPath();
      for (let i = 0; i < uptrend.length && i * 60 < frame; i++) { // Mudado de 30 para 60
        if (i === 0) {
          ctx.moveTo(uptrend[i].x, uptrend[i].y);
        } else {
          ctx.lineTo(uptrend[i].x, uptrend[i].y);
        }
      }
      ctx.stroke();
      
      // Pontos maiores
      for (let i = 0; i < uptrend.length && i * 60 < frame; i++) {
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(uptrend[i].x, uptrend[i].y, 7, 0, Math.PI * 2); // Aumentado de 5 para 7
        ctx.fill();
      }
    }
    
    // MSS - quebra da estrutura - muito mais tarde
    if (frame > 240) { // Mudado de 120 para 240
      const mssProgress = Math.min(1, (frame - 240) / 120); // Mudado de 60 para 120
      
      // Linha quebrando a baixo
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4; // Linha mais grossa
      ctx.beginPath();
      ctx.moveTo(330, centerY - 25);
      ctx.lineTo(420, centerY - 25 + 100 * mssProgress); // Movimento maior
      ctx.stroke();
      
      // Label MSS maior
      if (mssProgress > 0.5) {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 20px Arial'; // Aumentado de 16 para 20
        ctx.fillText('MSS ⚠️', 350, centerY + 90);
        
        // Linha horizontal indicando break - mais grossa
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(60, centerY + 25);
        ctx.lineTo(440, centerY + 25);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  };

  // Animação Liquidity Sweep
  const animateLiquiditySweep = (ctx, width, height, frame) => {
    const centerY = height / 2;
    
    // Desenha igual highs (liquidez) - círculos maiores
    const highs = [
      { x: 100, y: centerY - 50 },
      { x: 220, y: centerY - 52 },
      { x: 340, y: centerY - 51 },
    ];
    
    highs.forEach((high, i) => {
      if (frame > i * 40) { // Mudado de 20 para 40
        // Linha de high - mais grossa
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(high.x - 30, high.y);
        ctx.lineTo(high.x + 30, high.y);
        ctx.stroke();
        
        // Círculo maior
        ctx.fillStyle = '#6b7280';
        ctx.beginPath();
        ctx.arc(high.x, high.y, 6, 0, Math.PI * 2); // Aumentado de 4 para 6
        ctx.fill();
      }
    });
    
    // Linha de liquidez - mais tarde
    if (frame > 120) { // Mudado de 60 para 120
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3; // Mais grossa
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(70, centerY - 51);
      ctx.lineTo(370, centerY - 51);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('💧 Buyside Liquidity', 380, centerY - 47);
    }
    
    // Sweep - preço sobe acima - ainda mais tarde
    if (frame > 200) { // Mudado de 100 para 200
      const sweepProgress = Math.min(1, (frame - 200) / 80); // Mudado de 40 para 80
      const sweepY = centerY - 51 - 40 * sweepProgress; // Movimento maior
      
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 5; // Linha bem grossa
      ctx.beginPath();
      ctx.moveTo(340, centerY);
      ctx.lineTo(400, sweepY);
      ctx.stroke();
      
      // Reversal
      if (sweepProgress > 0.7) {
        const reversalProgress = (sweepProgress - 0.7) / 0.3;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 5; // Linha bem grossa
        ctx.beginPath();
        ctx.moveTo(400, sweepY);
        ctx.lineTo(460, sweepY + 65 * reversalProgress); // Movimento maior
        ctx.stroke();
        
        if (reversalProgress > 0.5) {
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 18px Arial'; // Aumentado de 14 para 18
          ctx.fillText('✓ Sweep & Reversal', 370, centerY + 75);
        }
      }
    }
  };

  // Outras animações simplificadas
  const animateBreakerBlock = (ctx, width, height, frame) => {
    animateOrderBlock(ctx, width, height, frame); // Similar ao OB mas com quebra
  };

  const animateNWOG = (ctx, width, height, frame) => {
    const centerY = height / 2;
    
    // Friday close - linha mais grossa
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3; // Aumentado
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(100, centerY);
    ctx.lineTo(400, centerY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 16px Arial'; // Aumentado de 12 para 16
    ctx.fillText('Friday Close', 420, centerY + 5);
    
    // Sunday open (gap) - mais tarde
    if (frame > 120) { // Mudado de 60 para 120
      const gapSize = 45; // Aumentado de 30 para 45
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 3; // Aumentado
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(100, centerY - gapSize);
      ctx.lineTo(400, centerY - gapSize);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = '#8b5cf6';
      ctx.font = 'bold 16px Arial'; // Aumentado
      ctx.fillText('Sunday Open', 420, centerY - gapSize + 5);
      
      // Highlight gap
      ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
      ctx.fillRect(100, centerY - gapSize, 300, gapSize);
      
      ctx.fillStyle = '#8b5cf6';
      ctx.font = 'bold 20px Arial'; // Aumentado de 14 para 20
      ctx.fillText('NWOG', 30, centerY - gapSize / 2);
    }
  };

  const animateOTE = (ctx, width, height, frame) => {
    const centerY = height / 2;
    
    // Desenha Fibonacci - linhas mais grossas
    const fibLevels = [
      { level: 0, y: centerY + 100, label: '0%' },
      { level: 0.382, y: centerY + 62, label: '38.2%' },
      { level: 0.5, y: centerY + 38, label: '50%' },
      { level: 0.618, y: centerY + 13, label: '61.8%' },
      { level: 0.705, y: centerY - 6, label: '70.5% OTE', highlight: true },
      { level: 0.786, y: centerY - 25, label: '78.6%' },
      { level: 1, y: centerY - 100, label: '100%' },
    ];
    
    fibLevels.forEach((fib, i) => {
      if (frame > i * 30) { // Mudado de 15 para 30
        ctx.strokeStyle = fib.highlight ? '#8b5cf6' : '#374151';
        ctx.lineWidth = fib.highlight ? 3 : 2; // Linhas mais grossas
        ctx.setLineDash(fib.highlight ? [] : [5, 5]);
        ctx.beginPath();
        ctx.moveTo(100, fib.y);
        ctx.lineTo(500, fib.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = fib.highlight ? '#8b5cf6' : '#6b7280';
        ctx.font = fib.highlight ? 'bold 16px Arial' : '12px Arial'; // Texto maior
        ctx.fillText(fib.label, 510, fib.y + 5);
        
        // Highlight OTE zone - mais tarde
        if (fib.highlight && frame > 240) { // Mudado de 120 para 240
          ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
          ctx.fillRect(100, centerY - 25, 400, 32); // Zona maior
        }
      }
    });
  };

  const animateDisplacement = (ctx, width, height, frame) => {
    const centerY = height / 2;
    
    // Movimento normal - linha mais grossa
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 3; // Aumentado de 2 para 3
    ctx.beginPath();
    ctx.moveTo(50, centerY + 30);
    ctx.lineTo(180, centerY + 15);
    ctx.lineTo(310, centerY + 23);
    ctx.stroke();
    
    // DISPLACEMENT - movimento rápido - muito mais tarde
    if (frame > 120) { // Mudado de 60 para 120
      const dispProgress = Math.min(1, (frame - 120) / 60); // Mudado de 30 para 60
      
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 6; // Aumentado de 4 para 6
      ctx.beginPath();
      ctx.moveTo(310, centerY + 23);
      ctx.lineTo(310 + 180 * dispProgress, centerY + 23 - 100 * dispProgress); // Movimento maior
      ctx.stroke();
      
      if (dispProgress > 0.5) {
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 20px Arial'; // Aumentado de 16 para 20
        ctx.fillText('⚡ DISPLACEMENT', 360, centerY - 60);
      }
    }
  };

  const animateImbalance = (ctx, width, height, frame) => {
    animateFVG(ctx, width, height, frame); // Similar ao FVG
  };

  return (
    <div className="relative bg-gray-950 rounded-lg p-4 border border-gray-800">
      <canvas
        ref={canvasRef}
        width={600}
        height={300}
        className="w-full h-auto"
        style={{ maxHeight: '300px' }}
      />
      <div className="absolute bottom-6 right-6 text-gray-500 text-xs">
        ↻ Loop automático
      </div>
    </div>
  );
};

export default AnimatedICTChart;