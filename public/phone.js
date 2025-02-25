export default class PhoneMovementDisplay {
  constructor(canvasId, icon = "📱", color = "#ff5722", size = 50) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      //console.error(`[PhoneMovementDisplay] Canvas with ID '${canvasId}' not found.`);
      return;
    }
    this.context = this.canvas.getContext('2d');
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    this.target = { x: this.width / 2, y: this.height / 2 }; // Final position
    this.current = { x: this.width / 2, y: this.height / 2 }; // Smooth position
    this.radius = 20; // Circle radius
    this.stretchFactor = 0.2; // How much the circle stretches

    this.icon = icon; // Emoji or text for the phone
    this.color = color; // Background color for the phone representation
    this.size = size; // New size parameter

    // console.log(`[PhoneMovementDisplay] Created for canvas: ${canvasId}, color: ${color}, icon: ${icon}`);

    window.addEventListener('resize', () => {
      this.width = this.canvas.width;
      this.height = this.canvas.height;
      //console.log('[PhoneMovementDisplay] Canvas resized.');
    });

    this.initAnimationLoop();
  }

  updateTargetPosition(x, y) {
    this.target.x = x;
    this.target.y = y;
    //console.log(`[PhoneMovementDisplay] Target updated to: x=${x}, y=${y}`);
  }

  customizeAppearance({ icon, color, radius, stretchFactor }) {
    if (icon) this.icon = icon;
    if (color) this.color = color;
    if (radius) this.radius = radius;
    if (stretchFactor) this.stretchFactor = stretchFactor;
  }

  draw() {
    const dx = this.target.x - this.current.x;
    const dy = this.target.y - this.current.y;

    // Smooth interpolation
    this.current.x += dx * 0.1;
    this.current.y += dy * 0.1;

    // Stretching effect
    const stretchX = 1 + (Math.abs(dx) / this.width) * this.stretchFactor;
    const stretchY = 1 + (Math.abs(dy) / this.height) * this.stretchFactor;

    // Draw the stretched circle as a background
    this.context.save();
    this.context.translate(this.current.x, this.current.y);
    this.context.scale(stretchX, stretchY);
    this.context.beginPath();
    // Make circle radius match the phone size
    const circleRadius = this.size / 1.5;
    this.context.arc(0, 0, circleRadius, 0, Math.PI * 2);
    this.context.fillStyle = this.color;
    this.context.fill();
    this.context.strokeStyle = this.color;
    this.context.lineWidth = 2;
    this.context.stroke();
    this.context.restore();

    // Draw the phone icon centered in the circle
    this.context.save();
    this.context.translate(this.current.x, this.current.y);
    this.context.font = `${this.size}px Arial`;
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
    this.context.fillStyle = "#ffffff"; // White color for the emoji
    this.context.fillText(this.icon, 0, 0); // Center position (0,0) since we're translated
    this.context.restore();
  }

  initAnimationLoop() {
    const animate = () => {
      this.draw();
      requestAnimationFrame(animate);
    };
    console.log("[PhoneMovementDisplay] Animation loop started.");
    animate();
  }
}