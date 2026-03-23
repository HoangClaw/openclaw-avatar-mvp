import Lipsync from "./lipsync";
import VISEMES from "./visemes";

let instance: Lipsync | null = null;

export const lipsyncManager = {
  get instance() {
    if (typeof window === "undefined") return null;
    if (!instance) {
      instance = new Lipsync();
    }
    return instance;
  },
  connectAudio(audio: HTMLMediaElement) {
    this.instance?.connectAudio(audio);
  },
  startSimulated() {
    this.instance?.startSimulated();
  },
  stopSimulated() {
    this.instance?.stopSimulated();
  },
  processAudio() {
    this.instance?.processAudio();
  },
  get viseme() {
    return this.instance?.viseme || VISEMES.sil;
  },
  get state() {
    return this.instance?.state || "silence";
  },
};
