/**
 * Manages the paths (file locations) of the game assets.
 */
'use strict';

const ROOT_PATH = (process.env.NODE_ENV==="development")
    ? "/src"
    : "/pikachu-soccer/src";

export const ASSETS_PATH = {
  SPRITE_SHEET: ROOT_PATH + '/assets/images/sprite_sheet.json',
  TEXTURES: {},
  SPRITE_SHEET_2P: ROOT_PATH + '/assets/images/sprite_sheet_2P.json',
  TEXTURES_2P:{},
  SOUNDS: {},
};

const TEXTURES = ASSETS_PATH.TEXTURES;
TEXTURES.PIKACHU = (i, j) => `pikachu/pikachu_${i}_${j}.png`;
TEXTURES.BALL = (s) => `ball/ball_${s}.png`;
TEXTURES.NUMBER = (n) => `number/number_${n}.png`;

TEXTURES.SKY_BLUE = 'objects/sky_blue.png';
TEXTURES.MOUNTAIN = 'objects/mountain.png';
TEXTURES.GROUND_RED = 'objects/ground_red.png';
TEXTURES.GROUND_LINE = 'objects/ground_line.png';
TEXTURES.GROUND_LINE_LEFT_MOST = 'objects/ground_line_leftmost.png';
TEXTURES.GROUND_LINE_RIGHT_MOST = 'objects/ground_line_rightmost.png';
TEXTURES.GROUND_YELLOW = 'objects/ground_yellow.png';
TEXTURES.NET_PILLAR_TOP = 'objects/net_pillar_top.png';
TEXTURES.NET_PILLAR = 'objects/net_pillar.png';
TEXTURES.SHADOW = 'objects/shadow.png';
TEXTURES.BALL_HYPER = 'ball/ball_hyper.png';
TEXTURES.BALL_TRAIL = 'ball/ball_trail.png';
TEXTURES.BALL_PUNCH = 'ball/ball_punch.png';
TEXTURES.CLOUD = 'objects/cloud.png';
TEXTURES.WAVE = 'objects/wave.png';
TEXTURES.GOALPOST = 'objects/goalpost.png';
TEXTURES.GOALPOST_2P='objects/goalpost_2P.png';
TEXTURES.NET_PILLAR_ROTATE="objects/net_pillar_rotate.png";
TEXTURES.SACHISOFT = 'messages/common/sachisoft.png';
TEXTURES.READY = 'messages/common/ready.png';
TEXTURES.DEUCE = 'messages/common/deuce.png';
TEXTURES.GAME_END = 'messages/common/game_end.png';

TEXTURES.MARK = 'messages/ko/mark.png';
TEXTURES.POKEMON = 'messages/ko/pokemon.png';
TEXTURES.PIKACHU_VOLLEYBALL = 'messages/ko/pikachu_volleyball.png';
TEXTURES.FIGHT = 'messages/ko/fight.png';
TEXTURES.WITH_COMPUTER = 'messages/ko/with_computer.png';
TEXTURES.WITH_FRIEND = 'messages/ko/with_friend.png';
TEXTURES.GAME_START = 'messages/ko/game_start.png';

TEXTURES.SITTING_PIKACHU = 'sitting_pikachu.png';


const TEXTURES_2P = ASSETS_PATH.TEXTURES_2P;
TEXTURES_2P.PIKACHU = (i, j) => `pikachu/pikachu_${i}_${j}.png`;
TEXTURES_2P.BALL = (s) => `ball/ball_${s}.png`;
TEXTURES_2P.NUMBER = (n) => `number/number_${n}.png`;

TEXTURES_2P.SKY_BLUE = 'objects/sky_blue.png';
TEXTURES_2P.MOUNTAIN = 'objects/mountain.png';
TEXTURES_2P.GROUND_RED = 'objects/ground_red.png';
TEXTURES_2P.GROUND_LINE = 'objects/ground_line.png';
TEXTURES_2P.GROUND_LINE_LEFT_MOST = 'objects/ground_line_leftmost.png';
TEXTURES_2P.GROUND_LINE_RIGHT_MOST = 'objects/ground_line_rightmost.png';
TEXTURES_2P.GROUND_YELLOW = 'objects/ground_yellow.png';
TEXTURES_2P.NET_PILLAR_TOP = 'objects/net_pillar_top.png';
TEXTURES_2P.NET_PILLAR = 'objects/net_pillar.png';
TEXTURES_2P.SHADOW = 'objects/shadow.png';
TEXTURES_2P.BALL_HYPER = 'ball/ball_hyper.png';
TEXTURES_2P.BALL_TRAIL = 'ball/ball_trail.png';
TEXTURES_2P.BALL_PUNCH = 'ball/ball_punch.png';
TEXTURES_2P.CLOUD = 'objects/cloud.png';
TEXTURES_2P.WAVE = 'objects/wave.png';

TEXTURES_2P.SACHISOFT = 'messages/common/sachisoft.png';
TEXTURES_2P.READY = 'messages/common/ready.png';
TEXTURES_2P.GAME_END = 'messages/common/game_end.png';

TEXTURES_2P.MARK = 'messages/ja/mark.png';
TEXTURES_2P.POKEMON = 'messages/ja/pokemon.png';
TEXTURES_2P.PIKACHU_VOLLEYBALL = 'messages/ja/pikachu_volleyball.png';
TEXTURES_2P.FIGHT = 'messages/ja/fight.png';
TEXTURES_2P.WITH_COMPUTER = 'messages/ja/with_computer.png';
TEXTURES_2P.WITH_FRIEND = 'messages/ja/with_friend.png';
TEXTURES_2P.GAME_START = 'messages/ja/game_start.png';

TEXTURES_2P.SITTING_PIKACHU = 'sitting_pikachu.png';

const SOUNDS = ASSETS_PATH.SOUNDS;
SOUNDS.BGM = ROOT_PATH + '/assets/sounds/bgm.mp3';
SOUNDS.PIPIKACHU = ROOT_PATH + '/assets/sounds/WAVE140_1.wav';
SOUNDS.PIKA = ROOT_PATH + '/assets/sounds/WAVE141_1.wav';
SOUNDS.CHU = ROOT_PATH + '/assets/sounds/WAVE142_1.wav';
SOUNDS.PI = ROOT_PATH + '/assets/sounds/WAVE143_1.wav';
SOUNDS.PIKACHU = ROOT_PATH + '/assets/sounds/WAVE144_1.wav';
SOUNDS.POWERHIT = ROOT_PATH + '/assets/sounds/WAVE145_1.wav';
SOUNDS.BALLTOUCHESGROUND = ROOT_PATH + '/assets/sounds/WAVE146_1.wav';
