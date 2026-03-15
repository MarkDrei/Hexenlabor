// src/renderers/things.ts
export function drawThings(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  img: HTMLImageElement,
  img2?: HTMLImageElement
) {
  if (!img.complete || img.naturalWidth === 0) return;

  const cx = width / 2;
  const cy = height / 2;

  // Split image logically:
  // Top row roughly 3 parts: House | Well | Big Bush
  // Bottom row roughly 4 parts: Grass patches | Cauldron | Spellbooks | Potions
  const w = img.width;
  const h = img.height;
  
  const houseSrc = { x: 0, y: 0, w: w * 0.33, h: h * 0.5 };
  const wellSrc = { x: w * 0.33, y: 0, w: w * 0.33, h: h * 0.5 };
  const bushSrc = { x: w * 0.66, y: 0, w: w * 0.33, h: h * 0.5 };
  
  const grassSrc = { x: 0, y: h * 0.5, w: w * 0.25, h: h * 0.5 };
  const cauldronSrc = { x: w * 0.25, y: h * 0.5, w: w * 0.25, h: h * 0.5 };
  const booksSrc = { x: w * 0.5, y: h * 0.5, w: w * 0.25, h: h * 0.5 };
  const shelfSrc = { x: w * 0.75, y: h * 0.5, w: w * 0.25, h: h * 0.5 };

  // Helper with correct scaling and centered placement given offset dx, dy
  const drawSprite = (sourceImg: HTMLImageElement, src: {x:number, y:number, w:number, h:number}, dx: number, dy: number, scale: number = 0.5) => {
    const sw = src.w * scale;
    const sh = src.h * scale;
    ctx.drawImage(
      sourceImg,
      src.x, src.y, src.w, src.h,
      cx + dx - sw / 2, cy + dy - sh, // anchor at bottom center
      sw, sh
    );
  };

  // Place objects using fixed relative offsets from center so resize handles smoothly 
  // Z-sort by drawing top-to-bottom

  // Back layer
  drawSprite(img, bushSrc, 150, -50, 0.4);
  drawSprite(img, bushSrc, -250, -20, 0.3); // flip or duplicate

  // Main structures
  drawSprite(img, houseSrc, -120, 20, 0.6);
  drawSprite(img, wellSrc, 120, 0, 0.5);

  // Grass details
  drawSprite(img, grassSrc, -200, 40, 0.4);
  drawSprite(img, grassSrc, 80, 20, 0.3);
  drawSprite(img, grassSrc, 180, 60, 0.5);

  // Items
  drawSprite(img, cauldronSrc, -20, 80, 0.4);
  drawSprite(img, booksSrc, 70, 70, 0.3);
  drawSprite(img, shelfSrc, 150, 90, 0.35);

  if (img2 && img2.complete && img2.naturalWidth > 0) {
    const w2 = img2.width;
    const h2 = img2.height;

    // Row 1
    const book2Src = { x: 0, y: 0, w: w2 * 0.25, h: h2 * 0.33 };
    const scrollSrc = { x: w2 * 0.25, y: 0, w: w2 * 0.25, h: h2 * 0.33 };
    const basketSrc = { x: w2 * 0.5, y: 0, w: w2 * 0.2, h: h2 * 0.33 };
    const staffSrc = { x: w2 * 0.7, y: 0, w: w2 * 0.3, h: h2 * 0.33 };

    // Row 2
    const redShroomSrc = { x: 0, y: h2 * 0.33, w: w2 * 0.16, h: h2 * 0.33 };
    const blueShroomSrc = { x: w2 * 0.16, y: h2 * 0.33, w: w2 * 0.17, h: h2 * 0.33 };
    const greenPotSrc = { x: w2 * 0.33, y: h2 * 0.33, w: w2 * 0.17, h: h2 * 0.33 };
    const bluePotSrc = { x: w2 * 0.5, y: h2 * 0.33, w: w2 * 0.16, h: h2 * 0.33 };
    const redPotSrc = { x: w2 * 0.66, y: h2 * 0.33, w: w2 * 0.1, h: h2 * 0.33 };
    const lanternSrc = { x: w2 * 0.76, y: h2 * 0.33, w: w2 * 0.14, h: h2 * 0.33 };
    const keySrc = { x: w2 * 0.9, y: h2 * 0.33, w: w2 * 0.1, h: h2 * 0.33 };

    // Row 3
    const starsSrc = { x: 0, y: h2 * 0.66, w: w2 * 0.16, h: h2 * 0.33 };
    const compassSrc = { x: w2 * 0.16, y: h2 * 0.66, w: w2 * 0.17, h: h2 * 0.33 };
    const chestSrc = { x: w2 * 0.33, y: h2 * 0.66, w: w2 * 0.17, h: h2 * 0.33 };
    const fernSrc = { x: w2 * 0.5, y: h2 * 0.66, w: w2 * 0.16, h: h2 * 0.33 };
    const crystalsSrc = { x: w2 * 0.66, y: h2 * 0.66, w: w2 * 0.17, h: h2 * 0.33 };
    const crystalBallSrc = { x: w2 * 0.83, y: h2 * 0.66, w: w2 * 0.17, h: h2 * 0.33 };

    const things2 = [
      book2Src, scrollSrc, basketSrc, staffSrc,
      redShroomSrc, blueShroomSrc, greenPotSrc, bluePotSrc, redPotSrc, lanternSrc, keySrc,
      starsSrc, compassSrc, chestSrc, fernSrc, crystalsSrc, crystalBallSrc
    ];

    let row = 0;
    let col = 0;
    things2.forEach((src, i) => {
      // Draw arbitrarily to side/bottom
      drawSprite(img2, src, -300 + col * 120, 200 + row * 80, 0.4);
      col++;
      if (col > 5) {
        col = 0;
        row++;
      }
    });
  }
}
