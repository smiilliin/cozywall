import * as PIXI from "pixi.js";
import { SimplexNoise } from "ts-perlin-simplex";

const app = new PIXI.Application({
  background: "#000000",
  resizeTo: window,
});

document.body.appendChild(app.view as HTMLCanvasElement);

app.stage.eventMode = "static";
app.stage.hitArea = app.screen;

const view = new PIXI.Container();

app.stage.addChild(view);

class Ball extends PIXI.Graphics {
  velocity: number;
  realY: number;
  constructor() {
    super();
    this.beginFill(0x222222);
    this.drawCircle(0, 0, 8);
    this.endFill();
    this.velocity = 0;
    this.realY = 0;
  }
  tick(ms: number) {
    this.velocity += (1.63 * ms) / 1000;
    this.realY += this.velocity * (ms / 1000);

    if (this.realY > (app.screen.height - 8 - 50) / 100) {
      this.realY = (app.screen.height - 8 - 50) / 100;
      this.velocity = 0;
    }
    if (this.realY < 8 / 100) {
      this.realY = 8 / 100;
      this.velocity = Math.abs(this.velocity);
    }
    this.y = this.realY * 100;
  }
}

const audio = document.getElementById("audio") as HTMLAudioElement;
const durationText = document.getElementById(
  "durationText"
) as HTMLParagraphElement;
const range = document.getElementById("range") as HTMLInputElement;
const audioFileInput = document.getElementById("file") as HTMLInputElement;
const playButton = document.getElementById("play") as HTMLInputElement;
const stopButton = document.getElementById("stop") as HTMLInputElement;
playButton.onclick = () => {
  playButton.className = "material-symbols-outlined hidden";
  stopButton.className = "material-symbols-outlined";
  audio.play();
};
stopButton.onclick = () => {
  playButton.className = "material-symbols-outlined";
  stopButton.className = "material-symbols-outlined hidden";
  audio.pause();
};
const currentMusicP = document.getElementById(
  "currentMusic"
) as HTMLInputElement;
let currentAudioURL: string | null = null;

let repeat = false;
const repeatButton = document.getElementById("repeat") as HTMLSpanElement;

repeatButton.onclick = () => {
  repeat = !repeat;
  if (repeat) {
    repeatButton.className = "material-symbols-outlined enabled";
    audio.loop = true;
  } else {
    repeatButton.className = "material-symbols-outlined disabled";
    audio.loop = false;
  }
};
let analyser: AnalyserNode | null = null;
let audioCtx: AudioContext | null = null;
let frequencyData: Uint8Array;

audioFileInput.onchange = () => {
  const files = audioFileInput?.files;
  const audioFile = files?.item(0);
  if (!audioFile) return;
  const audioURL = URL.createObjectURL(audioFile);

  if (currentAudioURL) {
    URL.revokeObjectURL(currentAudioURL);
    currentAudioURL = null;
  }
  if (!analyser) {
    audioCtx = new window.AudioContext();
    analyser = audioCtx.createAnalyser();

    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    frequencyData = new Uint8Array(bufferLength);

    const source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
  }

  currentAudioURL = audioURL;
  currentMusicP.textContent = audioFile.name;
  audio.src = audioURL;
  audio.play();
  playButton.className = "material-symbols-outlined hidden";
  stopButton.className = "material-symbols-outlined";
  range.className = "";
};
const getDurationText = (duration: number) => {
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration / 60) % 60);
  const seconds = Math.floor(duration % 60);

  return `${hours > 0 ? hours + ":" : ""}${
    hours > 0 ? ("00" + minutes).slice(-2) : minutes
  }:${("00" + seconds).slice(-2)}`;
};
audio.onloadeddata = () => {
  range.max = String(Math.floor(audio.duration));
  range.value = "0";
  durationText.textContent = `${getDurationText(0)} / ${getDurationText(
    Math.floor(audio.duration)
  )}`;
  durationText.className = "";
};

audio.onended = () => {
  if (!repeat && currentAudioURL) {
    URL.revokeObjectURL(currentAudioURL);
    currentAudioURL = null;
  }
  playButton.className = "material-symbols-outlined";
  stopButton.className = "material-symbols-outlined hidden";
};
audio.ontimeupdate = () => {
  range.value = String(Math.floor(audio.currentTime));
  durationText.textContent = `${getDurationText(
    Math.floor(audio.currentTime)
  )} / ${getDurationText(Math.floor(audio.duration))}`;
};
range.oninput = () => {
  audio.currentTime = Number(range.value);
  audio.play();
};

const simplex = new SimplexNoise();
const noise = new PIXI.Graphics();
let noiseX = 0;
let noiseY = 0;

view.addChild(noise);
const balls: Ball[] = [];

const updateBalls = () => {
  balls.forEach((ball) => app.stage.removeChild(ball));
  balls.splice(0);
  for (let i = 0; i < app.screen.width / 20 - 2; i++) {
    const ball = new Ball();
    ball.x = 20 + i * 20;
    ball.y = app.screen.height - 8 - 50;
    ball.realY = ball.y / 100;
    balls.push(ball);
    app.stage.addChild(ball);
  }
};
updateBalls();
window.onresize = () => {
  updateBalls();
};

let lastMs = Date.now();
app.ticker.add(() => {
  if (analyser) {
    analyser.getByteFrequencyData(frequencyData);
    for (let i = 0; i < Math.min(frequencyData.length, balls.length); i++) {
      const newY =
        app.screen.height / 100 -
        frequencyData[i] / (31000 / app.screen.height);
      balls[i].velocity = newY - balls[i].realY;
    }
  }
  const currentMs = Date.now();
  balls.forEach((ball) => ball.tick(currentMs - lastMs));

  noise.clear();
  for (let y = 0; y < app.screen.height / 16; y++) {
    for (let x = 0; x < app.screen.width / 16; x++) {
      const z = (simplex.noise((x + noiseX) / 32, (y + noiseY) / 32) + 1) / 16;
      noise.beginFill(new PIXI.Color([z, z, z]));
      noise.drawRect(x * 16, y * 16, 16, 16);
      noise.endFill();
    }
  }
  noiseX += 0.25;
  noiseY += 0.25;
  lastMs = currentMs;
});
