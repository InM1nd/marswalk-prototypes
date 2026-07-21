// Input intent is decoupled from physics: this only records "jump requested",
// the game loop consumes it once per physical tick and applies the force.
// touchstart (not touchend/click) cuts the ~100-300ms perceived input lag on
// touch devices.
export class InputController {
  private jumpRequested = false;
  private target: HTMLElement;
  private handlePointer = () => this.handleJump();
  private handleKey = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      this.handleJump();
    }
  };

  constructor(target: HTMLElement) {
    this.target = target;
    target.addEventListener('pointerdown', this.handlePointer);
    window.addEventListener('keydown', this.handleKey);
  }

  private handleJump = () => {
    this.jumpRequested = true;
  };

  consumeJump(): boolean {
    if (!this.jumpRequested) return false;
    this.jumpRequested = false;
    return true;
  }

  destroy(): void {
    this.target.removeEventListener('pointerdown', this.handlePointer);
    window.removeEventListener('keydown', this.handleKey);
  }
}
