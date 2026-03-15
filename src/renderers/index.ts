// Placeholder for canvas renderers
// Will contain specialized rendering functions for different game elements

export interface Renderer {
  render(ctx: CanvasRenderingContext2D): void;
}
