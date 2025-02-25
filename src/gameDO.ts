import { DurableObject } from "cloudflare:workers";
import { Bindings } from ".";
import { type Connection, Server, type WSMessage } from "partyserver";

type incomingMessage = {
  type:
    | "join"
    | "move"
    | "leave"
    | "playerCount"
    | "start"
    | "end"
    | "score"
    | "updateObstacles"
    | "playerDetails";
  from: "player" | "admin";
  data?: any;
};

type Player = {
  id: string;
  name: string | null;
  score: number;
  color: string;
};

export class WebsocketServer extends Server {
  players: Player[] = [];
  obstacles: any[] = [];
  solution: string[] = [];
  displaySentence: string | null = null;
  obstacleInterval: ReturnType<typeof setInterval> | null = null;
  sentences: string[] = [
    "The quick brown fox jumps over the lazy dog",
    "The five boxing wizards jump quickly",
    "Pack my box with five dozen liquor jugs",
    "How razorback-jumping frogs can level six piqued gymnasts",
    "Cozy lummox gives smart squid who asks for job pen",
    "The jay, pig, fox, zebra, and my wolves quack",
    "Sympathizing would fix Quaker objectives",
    "Jackdaws love my big sphinx of quartz",
  ];
  admin: Connection | null = null;

  onConnect(connection: Connection) {
    // Check if the connection is already present in the array
    if (this.players.find((player) => player.id === connection.id)) {
      return;
    }
    this.players.push({
      id: connection.id,
      name: null,
      score: 0,
      color: this.generateColor(),
    });
  }

  async onMessage(connection: Connection, message: WSMessage) {
    const incoming: incomingMessage = JSON.parse(message as string);

    // Filter and get the array of other ids
    const otherIds = this.players
      .filter((p) => p.id !== connection.id)
      .map((p) => p.id);

    const allPlayerIds = this.players.map((p) => p.id);

    if (incoming.from === "admin") {
      switch (incoming.type) {
        case "join":
          this.players = this.players.filter(
            (player) => player.id !== connection.id
          );
          this.broadcast(
            JSON.stringify({
              type: "playerCount",
              from: "admin",
              data: { players: this.players },
            })
          );
          console.log("Admin joined");
          this.admin = connection;
          break;
        case "start":
          this.obstacles = await this.initializeObstacles();
          this.broadcast(
            JSON.stringify({
              type: "updateObstacles",
              from: "admin",
              data: {
                obstacles: this.obstacles,
              },
            })
          );
          console.log("Admin started the game");
          break;
        case "end":
          this.broadcast(
            JSON.stringify({
              type: "end",
              from: "admin",
              data: {},
            })
          );
          break;
        case "score":
          this.broadcast(
            JSON.stringify({
              type: "score",
              from: "admin",
              data: {},
            })
          );
          break;
      }
    } else if (incoming.from === "player") {
      switch (incoming.type) {
        case "join":
          // Find the player from the players array and update their name
          let incomingPlayer = this.players.find(
            (player) => player.id === connection.id
          );

          if (incomingPlayer && incoming.data.name) {
            incomingPlayer.name = incoming.data.name;
          }

          // send the player data to the admin screen
          this.broadcast(
            JSON.stringify({
              type: "playerCount",
              from: "admin",
              data: { players: this.players },
            })
          );
          // send the player data (color) to the player
          this.broadcast(
            JSON.stringify({
              from: "admin",
              type: "playerUpdates",
              data: {
                player: incomingPlayer,
              },
            }),
            otherIds
          );
          console.log("Player joined", incomingPlayer, this.name);
          break;
        case "move":
          // console.log("Player moved", incoming.data);
          const data = incoming.data;
          this.broadcast(
            JSON.stringify({
              type: "move",
              from: "admin",
              data: data,
            }),
            allPlayerIds
          );
          break;
        case "leave":
          console.log("Player left", incoming.data);
          break;
      }
    } else {
      console.log("Unknown message", incoming);
    }
  }

  onClose(
    connection: Connection,
    code: number,
    reason: string,
    wasClean: boolean
  ): void | Promise<void> {
    this.players = this.players.filter((p) => p.id !== connection.id);
    this.broadcast(
      JSON.stringify({
        type: "playerCount",
        from: "admin",
        data: { players: this.players },
      })
    );
  }

  // Get a random sentence from the list
  async getCurrentSentence() {
    return this.sentences[Math.floor(Math.random() * this.sentences.length)];
  }

  async initializeObstacles(): Promise<
    | Array<{
        word: string;
        x: number;
        y: number;
        dx: number;
        dy: number;
        index: number;
        color: string;
      }>
    | []
  > {
    const currentSentence = await this.getCurrentSentence();
    if (!currentSentence) {
      this.stopObstacleMovement();
      return [];
    }
    const words = currentSentence.split(" ");
    this.solution = Array(words.length).fill(null);
    this.obstacles = words.map((word, index) => ({
      word,
      x: Math.random() * (800 - 100), // Adjusted to ensure obstacles spawn within bounds
      y: Math.random() * (600 - 30), // Adjusted to ensure obstacles spawn within bounds
      dx: (Math.random() - 0.5) * 4,
      dy: (Math.random() - 0.5) * 4,
      index,
      color: `hsl(${Math.random() * 360}, 70%, 70%)`,
    }));

    // console.log("Obstacles initialized", this.obstacles);
    this.startObstacleMovement();
    return this.obstacles;
  }

  startObstacleMovement() {
    if (this.obstacleInterval) {
      clearInterval(this.obstacleInterval);
    }
    this.obstacleInterval = setInterval(() => {
      this.updateObstacles();
    }, 100); // Update every 100ms
  }

  stopObstacleMovement() {
    if (this.obstacleInterval) {
      clearInterval(this.obstacleInterval);
      this.obstacleInterval = null;
    }
  }

  updateObstacles() {
    this.obstacles.forEach((obstacle) => {
      obstacle.x += obstacle.dx;
      obstacle.y += obstacle.dy;

      // Bounce off walls
      if (obstacle.x < 0 || obstacle.x > 800 - 100) obstacle.dx *= -1;
      if (obstacle.y < 0 || obstacle.y > 600 - 30) obstacle.dy *= -1;
    });
    return this.obstacles;
  }

  async handleCollisions(phoneId: string, x: number, y: number) {
    this.obstacles = this.obstacles.filter((obstacle) => {
      const distX = Math.abs(x - obstacle.x - 50);
      const distY = Math.abs(y - obstacle.y - 15);

      if (distX > 70 || distY > 35) {
        return true; // Keep obstacle if no collision
      }

      if (
        distX <= 50 ||
        distY <= 15 ||
        (distX - 50) ** 2 + (distY - 15) ** 2 <= 400
      ) {
        this.solution[obstacle.index] = obstacle.word;
        // this.updatePlayerScore(phoneId, obstacle.word);
        this.sendPointsEarned(phoneId, obstacle.word.length);
        return false; // Remove obstacle on collision
      }
      return true;
    });

    if (this.obstacles.length === 0) {
      // await this.completeCurrentSentence();
      await this.initializeObstacles();
    }
  }

  // not required
  sendPointsEarned(phoneId: string, points: number): void {
    // const phoneSocket = this.phones.get(phoneId);
    // if (phoneSocket) {
    //   phoneSocket.send(
    //     JSON.stringify({
    //       event: "points_earned",
    //       points,
    //     })
    //   );
    // }
  }

  // Generate unique random colors
  generateColor(): string {
    const usedColors = new Set(this.players.map((player) => player.color));
    const goldenRatio = 0.618033988749895;
    let hue = Math.random();

    // Keep generating new colors until we find an unused one
    let attempts = 0;
    while (attempts < 100) {
      hue = (hue + goldenRatio) % 1;
      const color = `hsl(${Math.floor(hue * 360)}, 70%, 60%)`;
      if (!usedColors.has(color)) {
        return color;
      }
      attempts++;
    }

    // Fallback color in case we somehow run out of unique colors
    return `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;
  }
}
