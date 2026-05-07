// ===== Game state =====
// 単一の state オブジェクトでラン全体を管理。
// シリアライズ可能（localStorage 保存に向く）に保つ。

import { STARTER_DECK, drawHand } from './cards.js';
import { generateBoard, BOARD_LENGTH } from './board.js';

export const state = {
  screen: 'title',          // 'title' | 'game' | 'gameover' | 'win'
  hp: 10,
  maxHp: 10,
  coins: 0,
  position: 0,              // 盤上の現在マス index
  lap: 0,
  targetLaps: 2,
  deck: [],                 // 山札（次に引くカード id 配列）
  hand: [],                 // 手札（カード id 配列）
  discard: [],              // 捨て札
  handLimit: 3,
  board: [],                // [{ type, ... }]
  busy: false,              // アニメーション/解決中フラグ
};

export function startNewRun() {
  state.screen = 'game';
  state.hp = state.maxHp = 10;
  state.coins = 0;
  state.position = 0;
  state.lap = 0;
  state.targetLaps = 2;
  state.deck = [...STARTER_DECK];
  state.hand = [];
  state.discard = [];
  state.busy = false;
  state.board = generateBoard(BOARD_LENGTH);
  drawHand(state);
}
