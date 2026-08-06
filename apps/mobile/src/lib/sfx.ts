/**
 * 퀴즈 효과음 — 정답/오답.
 *
 * ⚠️ 소리는 부가 기능이다. 여기서 나는 어떤 오류도 삼킨다. 오디오 초기화·디코딩이
 *    실패했다고 문제 풀이가 막히거나 화면에 오류가 뜨면 안 된다(조용히 넘어간다).
 *
 * 재생할 때마다 파일을 읽지 않는다. 디코딩한 AudioBuffer를 한 번만 만들어 두고,
 * 재생 시에는 가벼운 source 노드만 새로 만들어 붙인다(짧은 효과음의 표준 방식).
 */
import { AppState } from 'react-native';
import type { AudioBuffer, AudioContext, GainNode } from 'react-native-audio-api';

import { isSfxEnabled } from '../store/sfx';

const SOURCES = {
  correct: require('../assets/sfx-correct.mp3'),
  wrong: require('../assets/sfx-wrong.mp3'),
} as const;

export type SfxName = keyof typeof SOURCES;

/**
 * 효과음 볼륨(0~1).
 * ⚠️ 원본을 그대로(1.0) 내보내면 정답음이 튄다. 이어폰으로 들으면 특히 크다.
 *    파일을 다시 만들지 않고 게인으로만 낮춘다 — 나중에 조절하기도 쉽다.
 */
const SFX_VOLUME = 0.72;

let context: AudioContext | null = null;
let gain: GainNode | null = null;
const buffers = new Map<SfxName, AudioBuffer>();
const loading = new Map<SfxName, Promise<void>>();
/** 디코딩 실패 횟수. 계속 실패하는 기기에서 매 문항마다 재시도하지 않도록 상한을 둔다. */
const failures = new Map<SfxName, number>();
const MAX_DECODE_ATTEMPTS = 3;

/**
 * ⚠️ 라이브러리를 여기서 `require`로 늦게 불러온다. 최상단 import로 두면 안 된다 —
 *    react-native-audio-api는 모듈 로드 시점에 `new AudioAPIModule()`을 실행하고,
 *    네이티브 모듈이 없으면 **거기서 던진다**(리빌드 없이 Metro만 새로고침한 경우 등).
 *    이 화면들은 정적 import라, 그러면 소리가 안 나는 정도가 아니라 앱이 아예 안 뜬다.
 */
function getContext(): AudioContext | null {
  if (context) { return context; }
  try {
    const { AudioContext: Ctor } = require('react-native-audio-api');
    context = new Ctor();
  } catch {
    context = null;
  }
  return context;
}

/**
 * 볼륨 조절용 게인 노드. 컨텍스트당 하나만 만들어 destination에 물려 두고,
 * 재생할 때마다 source를 여기에 연결한다(source → gain → 스피커).
 */
function getGain(ctx: AudioContext): GainNode | null {
  if (gain) { return gain; }
  try {
    const node = ctx.createGain();
    node.gain.value = SFX_VOLUME;
    node.connect(ctx.destination);
    gain = node;
  } catch {
    gain = null; // 게인을 못 만들면 원음 그대로 — 소리가 안 나는 것보단 낫다.
  }
  return gain;
}

function load(name: SfxName): Promise<void> {
  const existing = loading.get(name);
  if (existing) { return existing; }
  if ((failures.get(name) ?? 0) >= MAX_DECODE_ATTEMPTS) { return Promise.resolve(); }

  const task = (async () => {
    const ctx = getContext();
    if (!ctx) {
      // 컨텍스트 생성 실패 — 캐시를 지워야 다음에 다시 시도한다.
      // (안 지우면 resolve된 promise가 남아 이번 실행 내내 소리가 영구히 죽는다)
      failures.set(name, (failures.get(name) ?? 0) + 1);
      loading.delete(name);
      return;
    }
    try {
      buffers.set(name, await ctx.decodeAudioData(SOURCES[name]));
      failures.delete(name);
    } catch {
      // 디코딩 실패 — 몇 번까지만 다시 시도한다. 계속 실패하는 기기에서
      // 문항마다 파일 읽기·디코딩을 반복하면 조용히 자원만 태운다.
      failures.set(name, (failures.get(name) ?? 0) + 1);
      loading.delete(name);
    }
  })();

  loading.set(name, task);
  return task;
}

/**
 * 앱이 백그라운드로 가면 오디오 스트림을 놓는다.
 *
 * ⚠️ 이 라이브러리는 컨텍스트를 만드는 즉시 저지연 출력 스트림을 열고, 스스로 멈추지
 *    않는다. 안 놓아주면 퀴즈를 한 번 풀고 나간 뒤에도 프로세스가 사는 내내 스트림을
 *    잡고 있다(배터리·오디오 경로 점유). 재생 시 suspended면 알아서 resume한다.
 */
AppState.addEventListener('change', (state) => {
  if (state === 'active' || !context) { return; }
  try { context.suspend(); } catch { /* 이미 닫혔거나 지원 안 하면 무시 */ }
});

/**
 * 첫 정답에서 소리가 안 나지 않게 미리 읽어둔다. 화면 진입 시 한 번 호출.
 * 꺼져 있으면 오디오를 아예 안 건드린다(디코딩·컨텍스트 생성 비용도 안 낸다).
 */
export function preloadSfx(): void {
  if (!isSfxEnabled()) { return; }
  load('correct');
  load('wrong');
}

/** 효과음 재생. 아직 준비 안 됐으면 이번 판은 조용히 넘기고 뒤에서 읽어둔다. */
export function playSfx(name: SfxName): void {
  // 매번 확인한다 — 설정에서 끈 걸 즉시 반영하려고(화면 재진입 없이).
  if (!isSfxEnabled()) { return; }

  const ctx = getContext();
  if (!ctx) { return; }

  const buffer = buffers.get(name);
  if (!buffer) {
    load(name);
    return;
  }

  try {
    if (ctx.state === 'suspended') { ctx.resume(); }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(getGain(ctx) ?? ctx.destination);
    source.start(ctx.currentTime);
  } catch {
    // 재생 실패는 무시 — 정답 판정·화면 전환에 영향을 주지 않는다.
  }
}
