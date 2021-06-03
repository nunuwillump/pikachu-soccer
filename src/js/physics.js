﻿/**
 * The Model part in the MVC pattern
 *
 * It is the core module which acts as a physics engine.
 * This physics engine calculates the movements of the ball and the players (Pikachus).
 *
 * It is gained by reverse engineering the original game.
 * The address of each function in the original machine code is specified at the comment above each function.
 * ex) FUN_00403dd0 means the original function at the address 00403dd0.
 *
 *
 * ** Some useful infos below **
 *
 *  Ground width: 768 = 0x1B0
 *  Ground height: 432 = 0x130
 *
 *  X position coordinate: [0, 768], right-direction increasing
 *  Y position coordinate: [0, 432], down-direction increasing
 *
 *  Ball radius: 16 = 0x10
 *  Ball diameter: 40 = 0x28
 *
 *  Player half-width: 32 = 0x20
 *  Player half-height: 32 = 0x20
 *  Player width: 64 = 0x40
 *  Player height: 64 = 0x40
 *
 */
 'use strict';
 import { rand } from './rand.js';
 
 /** @constant @type {number} ground width */
 const GROUND_WIDTH = 768; // match with VIEWPORT_WIDTH in view.js
 const VIEWPORT_HEIGHT = 432; // match with VIEWPORT_HEIGHT in view.js
 /** @constant @type {number} ground half-width, it is also the net pillar x coordinate */
 const GROUND_HALF_WIDTH = GROUND_WIDTH / 2;
 /** @constant @type {number} player (Pikachu) length: width = height = 64 */
 const PLAYER_LENGTH = 64;
 /** @constant @type {number} player half length */
 const PLAYER_HALF_LENGTH_X = 16;
 const PLAYER_HALF_LENGTH_Y = 24;
 
 const PLAYER_HALF_LENGTH = PLAYER_LENGTH / 2;
 /** @constant @type {number} player's y coordinate when they are touching ground */
 const PLAYER_TOUCHING_GROUND_Y_COORD = VIEWPORT_HEIGHT - 68;
 /** @constant @type {number} ball's radius */
 const BALL_RADIUS = 16;
 /** @constant @type {number} ball's y coordinate when it is touching ground */
 const BALL_TOUCHING_GROUND_Y_COORD = VIEWPORT_HEIGHT - 64;
 /** @constant @type {number} net pillar's half width (this value is on this physics engine only, not on the sprite pixel size) */
 const NET_PILLAR_HALF_WIDTH = 25;
 /** @constant @type {number} net pillar top's top side y coordinate */
 const NET_PILLAR_TOP_TOP_Y_COORD = 176;
 /** @constant @type {number} net pillar top's bottom side y coordinate (this value is on this physics engine only) */
 const NET_PILLAR_TOP_BOTTOM_Y_COORD = 192;
 
 /** @constant @type {number} goal post top's y coordinate */
 const GOAL_TOP_Y_COORD = VIEWPORT_HEIGHT - 168;
 /** @constant @type {number} half of goal post top's thickness */
 const GOAL_TOP_HALF_HEIGHT = 4;
 /** @constant @type {number} goal post top's width (extruding distance from the wall = world border) */
 const GOAL_TOP_WIDTH = 64;
 
 /**
  * It's for to limit the looping number of the infinite loops.
  * This constant is not in the original machine code. (The original machine code does not limit the looping number.)
  *
  * In the original ball x coord range setting (ball x coord in [20, 432]), the infinite loops in
  * {@link caculate_expected_landing_point_x_for} function and {@link expectedLandingPointXWhenPowerHit} function seems to be always terminated soon.
  * But if the ball x coord range is edited, for example, to [20, 432 - 20] for left-right symmetry,
  * it is observed that the infinite loop in {@link expectedLandingPointXWhenPowerHit} does not terminate.
  * So for safety, this infinite loop limit is included for the infinite loops mentioned above.
  * @constant @type {number}
  */
 const INFINITE_LOOP_LIMIT = 1000;
 
 /**
  * Class representing a pack of physical objects i.e. players and ball
  * whose physical values are calculated and set by {@link physicsEngine} function
  */
 export class PikaPhysics {
   /**
    * Create a physics pack
    * @param {boolean} isPlayer1Computer Is player on the left (player 1) controlled by computer?
    * @param {boolean} isPlayer2Computer Is player on the right (player 2) controlled by computer?
    */
   constructor(isPlayer1Computer, isPlayer2Computer) {
     this.player1 = new Player(false, isPlayer1Computer);
     this.player2 = new Player(true, isPlayer2Computer);
     this.ball = new Ball(false);
   }
 
   /**
    * run {@link physicsEngine} function with this physics object and user input
    *
    * @param {PikaUserInput[]} userInputArray userInputArray[0]: PikaUserInput object for player 1, userInputArray[1]: PikaUserInput object for player 2
    * @return {number} Is ball touching ground?
    */
   runEngineForNextFrame(userInputArray) {
     const playerTouchingBall = physicsEngine(
       this.player1,
       this.player2,
       this.ball,
       userInputArray
     );
     return playerTouchingBall;
   }
 }
 
 /**
  * Class (or precisely, Interface) representing user input (from keyboard or joystick, whatever)
  */
 export class PikaUserInput {
   constructor() {
     /** @type {number} 0: no horizontal-direction input, -1: left-direction input, 1: right-direction input */
     this.xDirection = 0;
     /** @type {number} 0: no vertical-direction input, -1: up-direction input, 1: down-direction input */
     this.yDirection = 0;
     /** @type {number} 0: auto-repeated or no power hit input, 1: not auto-repeated power hit input */
     this.powerHit = 0;
     this.powerKeyDown = false;
   }
 }
 
 /**
  * Class representing a player
  *
  * Player 1 property address: 00411F28 -> +28 -> +10 -> +C -> ...
  * Player 2 property address: 00411F28 -> +28 -> +10 -> +10 -> ...
  * The "..." part is written on the line comment at the right side of each property.
  * e.g. address to player1.isPlayer: 00411F28 -> +28 -> +10 -> +C -> +A0
  * e.g. address to player2.isComputer: 00411F28 -> +28 -> +10 -> +10 -> +A4
  *
  * For initial values: refer FUN_000403a90 && FUN_00401f40
  */
 class Player {
   /**
    * create a player
    * @param {boolean} isPlayer2 Is this player on the right side?
    * @param {boolean} isComputer Is this player controlled by computer?
    */
   constructor(isPlayer2, isComputer) {
     /** @type {boolean} Is this player on the right side? */
     this.isPlayer2 = isPlayer2; // 0xA0
     /** @type {boolean} Is controlled by computer? */
     this.isComputer = isComputer; // 0xA4
     this.initializeForNewRound();
 
     /** @type {number} -1: left, 0: no diving, 1: right */
     this.divingDirection = 0; // 0xB4
     /** @type {number} */
     this.lyingDownDurationLeft = -1; // 0xB8
     /** @type {boolean} */
     this.isWinner = false; // 0xD0
     /** @type {boolean} */
     this.gameEnded = false; // 0xD4
 
     /**
      * It flips randomly to 0 or 1 by the {@link letComputerDecideUserInput} function (FUN_00402360)
      * when ball is hanging around on the other player's side.
      * If it is 0, computer player stands by around the middle point of their side.
      * If it is 1, computer player stands by adjecent to the net.
      * @type {number} 0 or 1
      */
     this.computerWhereToStandBy = 0; // 0xDC
 
     /**
      * This property is not in the player pointers of the original source code.
      * But for sound effect (especially for stereo sound),
      * it is convinient way to give sound property to a Player.
      * The original name is stereo sound.
      * @type {Object.<string, boolean>}
      */
     this.sound = {
       pipikachu: false,
       pika: false,
       chu: false,
     };
   }
 
   /**
    * initialize for new round
    */
   initializeForNewRound(isPlayer2Serve) {
     /** @type {number} x coord */
     this.x = 36; // 0xA8 // initialized to 36 (player1) or 396 (player2)
     if (this.isPlayer2) {
       this.x = GROUND_WIDTH - 36;
     }
     /** @type {number} y coord */
     this.y = PLAYER_TOUCHING_GROUND_Y_COORD; // 0xAC   // initialized to 244
     /** @type {number} y direction velocity */
     this.yVelocity = 0; // 0xB0  // initialized to 0
     /** @type {boolean} */
     this.isCollisionWithBallHappened = false; // 0xBC   // initizlized to 0 i.e false
 
     /**
      * Player's state
      * 0: normal, 1: jumping, 2: jumping_and_power_hitting, 3: diving
      * 4: lying_down_after_diving
      * 5: win!, 6: lost..
      * 7: falling
      * @type {number} 0, 1, 2, 3, 4, 5, 6 or 7
      */
     this.state = 0; // 0xC0   // initialized to 0
     /** @type {number} */
     this.frameNumber = 0; // 0xC4   // initialized to 0
     /** @type {number} */
     this.normalStatusArmSwingDirection = 1; // 0xC8  // initialized to 1
     /** @type {number} */
     this.delayBeforeNextFrame = 0; // 0xCC  // initizlized to 0
     this.holding = false;
     this.holdingFrame = -128;
 
     /*
     if(this.isPlayer2 && isPlayer2Serve) {
       this.holding = true;
     }
     if(!this.isPlayer2 && !isPlayer2Serve) {
       this.holding = true;
     }
     */
 
     this.powerHitOnGround = -1;
 
     /**
      * This value is initialized to (_rand() % 5) before the start of every round.
      * The greater the number, the bolder the computer player.
      *
      * If computer has higher boldness,
      * judges more the ball is haing around the other player's side,
      * has greater distance to the expected landing point of the ball,
      * jumps more,
      * dives less.
      * See the source code of the {@link letComputerDecideUserInput} function (FUN_00402360).
      *
      * @type {number} 0, 1, 2, 3 or 4
      */
     this.computerBoldness = rand() % 5; // 0xD8  // initialized to (_rand() % 5)
   }
 }
 
 /**
  * Class representing a ball
  *
  * Ball property address: 00411F28 -> +28 -> +10 -> +14 -> ...
  * The "..." part is written on the line comment at the right side of each property.
  * e.g. address to ball.fineRotation: 00411F28 -> +28 -> +10 -> +14 -> +48
  *
  * For initial Values: refer FUN_000403a90 && FUN_00402d60
  */
 class Ball {
   /**
    * Create a ball
    * @param {boolean} isPlayer2Serve Will player 2 serve on this new round?
    */
   constructor(isPlayer2Serve) {
     this.initializeForNewRound(isPlayer2Serve);
     /** @type {number} x coord of expected lang point */
     this.expectedLandingPointX = 0; // 0x40
     /**
      * ball rotation frame number selector
      * During the period where it continues to be 5, hyper ball glitch occur.
      * @type {number} 0, 1, 2, 3, 4 or 5
      * */
     this.rotation = 0; // 0x44
     /** @type {number} */
     this.fineRotation = 0; // 0x48
     /** @type {number} x coord for punch effect */
     this.punchEffectX = 0; // 0x50
     /** @type {number} y coord for punch effect */
     this.punchEffectY = 0; // 0x54
 
     /**
      * Following previous values are for trailing effect for power hit
      * @type {number}
      */
     this.previousX = 0; // 0x58
     this.previousPreviousX = 0; // 0x5c
     this.previousY = 0; // 0x60
     this.previousPreviousY = 0; // 0x64
 
     this.thrower = 0;
 
     /**
      * this property is not in the ball pointer of the original source code.
      * But for sound effect (especially for stereo sound),
      * it is convinient way to give sound property to a Ball.
      * The original name is stereo sound.
      */
     this.sound = {
       powerHit: false,
       ballTouchesGround: false,
     };
   }
 
   /**
    * Initialize for new round
    * @param {boolean} isPlayer2Serve will player on the right side serve on this new round?
    */
   initializeForNewRound(isPlayer2Serve) {
       /** @type {number} x coord */
       this.x = GROUND_WIDTH / 2; // 0x30    // initialized to the middle of the ground
       /** @type {number} y coord */
       this.y = VIEWPORT_HEIGHT - 168; // 0x34   // initialized to 168 blocks above the bottom of the screen
       /** @type {number} x direction velocity */
       this.xVelocity = 0; // 0x38  // initialized to 0
       /** @type {number} y directin velicity */
       this.yVelocity = 0; // 0x3C  // initialized to 1
       /** @type {number} punch effect radius */
       this.punchEffectRadius = 0; // 0x4c // initialized to 0
       /** @type {boolean} is power hit */
       this.isPowerHit = true; // 0x68  // initialized to 0 i.e. false
   }
 }
 
 /**
  * FUN_00403dd0
  * This is the Pikachu Volleyball physics engine!
  * This physics engine calculates and set the physics values for the next frame.
  *
  * @param {Player} player1 player on the left side
  * @param {Player} player2 player on the right side
  * @param {Ball} ball ball
  * @param {PikaUserInput[]} userInputArray userInputArray[0]: user input for player 1, userInputArray[1]: user input for player 2
  * @return {boolean} Is ball tounching ground?
  */
 function physicsEngine(player1, player2, ball, userInputArray) {
   const isBallTouchingGround = processCollisionBetweenBallAndWorldAndSetBallPosition(
     ball
   );
 
   if(isBallTouchingGround) {
     ball.thrower = 0;
   }
 
   let player;
   let theOtherPlayer;
   for (let i = 0; i < 2; i++) {
     if (i === 0) {
       player = player1;
       theOtherPlayer = player2;
     } else {
       player = player2;
       theOtherPlayer = player1;
     }
 
     // FUN_00402d90 ommited
     // FUN_00402810 ommited
     // this javascript code is refactored not to need above two function except for
     // a part of FUN_00402d90:
     // FUN_00402d90 include FUN_004031b0(caculate_expected_landing_point_x_for)
     caculate_expected_landing_point_x_for(ball); // calculate expected_X;
 
     processPlayerMovementAndSetPlayerPosition(
       player,
       userInputArray[i],
       theOtherPlayer,
       ball
     );
 
     // FUN_00402830 ommited
     // FUN_00406020 ommited
     // tow function ommited above maybe participates in graphic drawing for a player
   }
 
   for (let i = 0; i < 2; i++) {
     if (i === 0) {
       player = player1;
       theOtherPlayer = player2;
     } else {
       player = player2;
       theOtherPlayer = player1;
     }
 
     // FUN_00402810 ommited: this javascript code is refactored not to need this function
 
     const is_happend = isCollisionBetweenBallAndPlayerHappened(
       ball,
       player.x,
       player.y,
       player.isPlayer2,
       player.state
     );
     if (is_happend === true) {
       if (player.isCollisionWithBallHappened === false) {
         if(player.isComputer && !theOtherPlayer.holding && (ball.thrower !== 2 - i || rand() % 3 > 0)) {
           ball.thrower = 0;
           ball.isPowerHit = true;
           player.holding = true;
         } else {
           /*if (player.state === 2) {
             if(ball.thrower === 2 - i && player.delayBeforeNextFrame <= 5) {
               ball.sound.ballTouchesGround = true;
             } else if (!theOtherPlayer.holding) {
               ball.thrower = 0;
               ball.isPowerHit = true;
               player.holding = true;
             }
           } else {*/
             processCollisionBetweenBallAndPlayer(
               ball,
               player.x,
               userInputArray[i],
               player.state,
               player.isPlayer2
             );
             if(ball.thrower === 2 - i) {
               ball.sound.ballTouchesGround = true;
             }
           //}
         }
         player.isCollisionWithBallHappened = true;
       }
     } else {
       player.isCollisionWithBallHappened = false;
     }
 
     if(player.holding && i === 0) {
         ball.x = player.x + 20;
         ball.y = player.y;
         ball.xVelocity = 5;
         ball.yVelocity = 0;
         ball.isPowerHit = true;
     }
     if(player.holding && i === 1) {
         ball.x = player.x - 20;
         ball.y = player.y;
         ball.xVelocity = -5;
         ball.yVelocity = 0;
         ball.isPowerHit = true;
     }
   }
 
   if (isCollisionBetweenPlayers(player1, player2)) {
       processCollisionBetweenPlayers(player1, player2)
   }
   // FUN_00403040
   // FUN_00406020
   // tow function ommited above maybe participates in graphic drawing for a ball
 
   return isInGoalRange(ball);
 }
 
 /**
  * Function for checking whether the ball is inside the goal or not
  * @param { Ball } ball ball
  */
 function isInGoalRange(ball) {
     if (ball.y > GOAL_TOP_Y_COORD) {
         if (ball.x > GROUND_WIDTH - GOAL_TOP_WIDTH + BALL_RADIUS) {
             return 2;
         } else if (ball.x < GOAL_TOP_WIDTH - BALL_RADIUS) {
             return 1;
         } else {
             return 0;
         }
     } else {
         return 0;
     }
 }
 
 /**
  * Function for checking whether the players have collided or not
  * @param { Player } player1 player on the left side
  * @param { Player } player2 player on the right side
  */
 function isCollisionBetweenPlayers(player1, player2) {
     return (Math.abs((player1.x + 8) - (player2.x - 8)) < (2 * PLAYER_HALF_LENGTH_X) && Math.abs(player1.y - player2.y) < (2 * PLAYER_HALF_LENGTH_Y));
 }
 
 /**
  * Function for processing how to deal with player collisions
  * @param { Player } player1 player on the left side
  * @param { Player } player2 player on the right side
  */
 function processCollisionBetweenPlayers(player1, player2) {
     if (2 * Math.abs((player1.x + 8) - (player2.x - 8)) + 1 > Math.abs(player1.y - player2.y)) {
         let playerLeft;
         let playerRight;
         const avgX = Math.floor((player1.x + player2.x) / 2);
         if ((player1.x + 8) < (player2.x - 8) + 1) {
             playerLeft = player1;
             playerRight = player2;
         } else {
             playerLeft = player2;
             playerRight = player1;
         }
         playerLeft.x = avgX - PLAYER_HALF_LENGTH_X + (playerLeft.isPlayer2 ? 8 : -8);
         playerRight.x = avgX + PLAYER_HALF_LENGTH_X + (playerRight.isPlayer2 ? 8 : -8);
         if (playerLeft.x < PLAYER_HALF_LENGTH) {
             playerLeft.x = PLAYER_HALF_LENGTH;
             playerRight.x = PLAYER_HALF_LENGTH + 2 * PLAYER_HALF_LENGTH_X + 2 * (playerRight.isPlayer2 ? 8 : -8);
             player1.xVelocity = 0;
             player2.xVelocity = 0;
         } else if (playerRight.x > GROUND_WIDTH - PLAYER_HALF_LENGTH) {
             playerLeft.x = GROUND_WIDTH - PLAYER_HALF_LENGTH - 2 * PLAYER_HALF_LENGTH_X + 2 * (playerLeft.isPlayer2 ? 8 : -8);
             playerRight.x = GROUND_WIDTH - PLAYER_HALF_LENGTH;
             player1.xVelocity = 0;
             player2.xVelocity = 0;
         } else if (Math.abs(playerLeft.y - GOAL_TOP_Y_COORD) < (PLAYER_HALF_LENGTH_Y + GOAL_TOP_HALF_HEIGHT) && playerLeft.x < (GOAL_TOP_WIDTH + PLAYER_HALF_LENGTH_X)) {
             playerLeft.x = GOAL_TOP_WIDTH + PLAYER_HALF_LENGTH_X;
             playerRight.x = GOAL_TOP_WIDTH + 3 * PLAYER_HALF_LENGTH_X + 2 * (playerRight.isPlayer2 ? 8 : -8);
             player1.xVelocity = 0;
             player2.xVelocity = 0;
         } else if (Math.abs(playerRight.y - GOAL_TOP_Y_COORD) < (PLAYER_HALF_LENGTH_Y + GOAL_TOP_HALF_HEIGHT) && playerRight.x > (GROUND_WIDTH - GOAL_TOP_WIDTH - PLAYER_HALF_LENGTH_X)) {
             playerLeft.x = GROUND_WIDTH - GOAL_TOP_WIDTH - 3 * PLAYER_HALF_LENGTH_X + 2 * (playerLeft.isPlayer2 ? 8 : -8);
             playerRight.x = GROUND_WIDTH - GOAL_TOP_WIDTH - PLAYER_HALF_LENGTH_X;
             player1.xVelocity = 0;
             player2.xVelocity = 0;
         }
     } else {
         let playerTop;
         let playerBottom;
         const avgY = Math.floor((player1.y + player2.y) / 2);
         if (player1.y < player2.y + 1) {
             playerTop = player1;
             playerBottom = player2;
         } else {
             playerTop = player2;
             playerBottom = player1;
         }
         playerTop.y = avgY - PLAYER_HALF_LENGTH_Y;
         playerBottom.y = avgY + PLAYER_HALF_LENGTH_Y;
         if (playerTop.state === 3 || playerTop.state === 7) {
             playerTop.state = 1;
         }
         if (playerTop.y < PLAYER_HALF_LENGTH_Y) {
             playerTop.y = PLAYER_HALF_LENGTH_Y;
             playerBottom.y = 3 * PLAYER_HALF_LENGTH_Y;
             player1.yVelocity = 0;
             player2.yVelocity = 0;
         } else if (playerBottom.y > PLAYER_TOUCHING_GROUND_Y_COORD) {
             playerTop.y = PLAYER_TOUCHING_GROUND_Y_COORD - 2 * PLAYER_HALF_LENGTH_Y;
             playerBottom.y = PLAYER_TOUCHING_GROUND_Y_COORD;
             player1.yVelocity = 0;
             player2.yVelocity = 0;
         } else if (
             (playerTop.x < (GOAL_TOP_WIDTH + PLAYER_HALF_LENGTH_X) || playerTop.x > (GROUND_WIDTH - GOAL_TOP_WIDTH - PLAYER_HALF_LENGTH_X))
             && playerTop.y > (GOAL_TOP_Y_COORD) && playerTop.y < (GOAL_TOP_Y_COORD + GOAL_TOP_HALF_HEIGHT + PLAYER_HALF_LENGTH_Y)
         ) {
             playerTop.y = GOAL_TOP_Y_COORD + GOAL_TOP_HALF_HEIGHT + PLAYER_HALF_LENGTH_Y;
             playerBottom.y = GOAL_TOP_Y_COORD + GOAL_TOP_HALF_HEIGHT + 3 * PLAYER_HALF_LENGTH_Y;
             player1.yVelocity = 0;
             player2.yVelocity = 0;
         } else if (
             (playerBottom.x < (GOAL_TOP_WIDTH + PLAYER_HALF_LENGTH_X) || playerBottom.x > (GROUND_WIDTH - GOAL_TOP_WIDTH - PLAYER_HALF_LENGTH_X))
             && playerBottom.y < (GOAL_TOP_Y_COORD) && playerBottom.y > (GOAL_TOP_Y_COORD - GOAL_TOP_HALF_HEIGHT - PLAYER_HALF_LENGTH_Y)
         ) {
             playerTop.y = GOAL_TOP_Y_COORD - GOAL_TOP_HALF_HEIGHT - 3 * PLAYER_HALF_LENGTH_Y;
             playerBottom.y = GOAL_TOP_Y_COORD - GOAL_TOP_HALF_HEIGHT - PLAYER_HALF_LENGTH_Y;
             player1.yVelocity = 0;
             player2.yVelocity = 0;
         }
     }
 }
 
 /**
  * FUN_00403070
  * Is collision between ball and player happend?
  * @param {Ball} ball
  * @param {Player["x"]} playerX player.x
  * @param {Player["y"]} playerY player.y
  * @return {boolean}
  */
 function isCollisionBetweenBallAndPlayerHappened(ball, playerX, playerY, isPlayer2, playerState) {
   if (playerState == 3 || playerState == 4 || playerState == 7) {
     playerY = playerY + 16
 
     let diffX = Math.abs(playerX - ball.x)
     let diffY = Math.abs(playerY - ball.y)
 
     if (diffX > PLAYER_HALF_LENGTH_Y + BALL_RADIUS) { return false; }
     if (diffY > PLAYER_HALF_LENGTH_X + BALL_RADIUS) { return false; }
 
     if (diffX <= PLAYER_HALF_LENGTH_Y) { return true; }
     if (diffY <= PLAYER_HALF_LENGTH_X) { return true; }
 
     return (diffX - PLAYER_HALF_LENGTH_Y) ** 2 + (diffY - PLAYER_HALF_LENGTH_X) ** 2 <= (BALL_RADIUS) ** 2;
 
   } else{
 
     playerX = isPlayer2 ? playerX - 12 : playerX + 12
     playerY = playerY + 4
 
     let diffX = Math.abs(playerX - ball.x)
     let diffY = Math.abs(playerY - ball.y)
 
     if (diffX > PLAYER_HALF_LENGTH_X + BALL_RADIUS) { return false; }
     if (diffY > PLAYER_HALF_LENGTH_Y + BALL_RADIUS) { return false; }
 
     if (diffX <= PLAYER_HALF_LENGTH_X) { return true; }
     if (diffY <= PLAYER_HALF_LENGTH_Y) { return true; }
 
     return (diffX - PLAYER_HALF_LENGTH_X) ** 2 + (diffY - PLAYER_HALF_LENGTH_Y) ** 2 <= (BALL_RADIUS) ** 2;
   }
 }
 
 /**
  * FUN_00402dc0
  * Process collision between ball and world and set ball position
  * @param {Ball} ball
  * @return {boolean} Is ball touching ground?
  */
 function processCollisionBetweenBallAndWorldAndSetBallPosition(ball) {
   // This is not part of this function in the original assembly code.
   // In the original assembly code, it is processed in other function (FUN_00402ee0)
   // But it is proper to process here.
   ball.previousPreviousX = ball.previousX;
   ball.previousPreviousY = ball.previousY;
   ball.previousX = ball.x;
   ball.previousY = ball.y;
 
   let futureFineRotation = ball.fineRotation + ball.xVelocity / 2;
   // If futureFineRotation === 50, it skips next if statement finely.
   // Then ball.fineRoation = 50, and then ball.rotation = 5 (which designates hyperball sprite!).
   // In this way, hyper ball glitch occur!
   // If this happen at the end of round,
   // since ball.xVeloicy is 0-initailized at each start of round,
   // hyper ball sprite is rendered continuously until a collision happens.
   if (futureFineRotation < 0) {
     futureFineRotation += 50;
   } else if (futureFineRotation > 50) {
     futureFineRotation += -50;
   }
   ball.fineRotation = futureFineRotation;
   ball.rotation = (ball.fineRotation / 10) >> 0; // integer division
 
   const futureBallX = ball.x + ball.xVelocity;
   /*
     If the center of ball would get out of left world bound or right world bound, bounce back.
     
     In this if statement, when considering left-right symmetry,
     "futureBallX > GROUND_WIDTH" should be changed to "futureBallX > (GROUND_WIDTH - BALL_RADIUS)",
     or "futureBallX < BALL_RADIUS" should be changed to "futureBallX < 0".
     Maybe the former one is more proper when seeing Pikachu player's x-direction boundary.
     Is this a mistake of the author of the original game?
     Or, was it set to this value to resolve inifite loop problem? (See comments on the constant INFINITE_LOOP_LIMIT.)
     If apply (futureBallX > (GROUND_WIDTH - BALL_RADIUS)), and if the maximum number of loop is not limited,
     it is observed that inifinite loop in the function expectedLandingPointXWhenPowerHit does not terminate.
   */
   if (futureBallX < BALL_RADIUS || futureBallX > GROUND_WIDTH - BALL_RADIUS) {
     ball.xVelocity = -ball.xVelocity * 0.6;
   }
 
   let futureBallY = ball.y + ball.yVelocity;
   // if the center of ball would get out of upper world bound
   if (futureBallY < 0) {
     ball.yVelocity = 1;
   }
 
   // If ball touches net
   /*if (
     Math.abs(ball.x - GROUND_HALF_WIDTH) < NET_PILLAR_HALF_WIDTH &&
     ball.y > NET_PILLAR_TOP_TOP_Y_COORD
   ) {
     if (ball.y <= NET_PILLAR_TOP_BOTTOM_Y_COORD) {
       if (ball.yVelocity > 0) {
         ball.yVelocity = -ball.yVelocity;
       }
     } else {
       if (ball.x < GROUND_HALF_WIDTH) {
         ball.xVelocity = -Math.abs(ball.xVelocity);
       } else {
         ball.xVelocity = Math.abs(ball.xVelocity);
       }
     }
   }*/
 
   futureBallY = ball.y + ball.yVelocity;
   // if ball would touch ground
   if (futureBallY > BALL_TOUCHING_GROUND_Y_COORD) {
       // FUN_00408470 omitted
       // the function omitted above receives 100 * (ball.x - 216),
       // i.e. horizontal displacement from net maybe for stereo sound?
       // code function (ballpointer + 0x28 + 0x10)? omitted
       // the omitted two functions maybe do a part of sound playback role.
       ball.sound.ballTouchesGround = true;
 
       ball.yVelocity = - 0.8 * ball.yVelocity;
       ball.xVelocity = 0.875 * ball.xVelocity;
       ball.punchEffectX = ball.x;
       ball.y = BALL_TOUCHING_GROUND_Y_COORD;
       ball.punchEffectRadius = BALL_RADIUS;
       ball.punchEffectY = BALL_TOUCHING_GROUND_Y_COORD + BALL_RADIUS;
       ball.isPowerHit = true;
       return true;
   }
 
   // if ball touches goal top
   if (Math.abs(futureBallY - GOAL_TOP_Y_COORD) < GOAL_TOP_HALF_HEIGHT + BALL_RADIUS) {
       if (futureBallX < (GOAL_TOP_WIDTH + Math.abs(futureBallY - GOAL_TOP_Y_COORD) - GOAL_TOP_HALF_HEIGHT) || futureBallX > (GROUND_WIDTH - GOAL_TOP_WIDTH - Math.abs(futureBallY - GOAL_TOP_Y_COORD) + GOAL_TOP_HALF_HEIGHT)) {
           if (futureBallY < GOAL_TOP_Y_COORD) {
               ball.yVelocity = - 0.6 * Math.abs(ball.yVelocity);
               futureBallY = GOAL_TOP_Y_COORD - GOAL_TOP_HALF_HEIGHT - BALL_RADIUS;
               ball.punchEffectX = ball.x;
               ball.punchEffectY = GOAL_TOP_Y_COORD - GOAL_TOP_HALF_HEIGHT;
           } else {
               ball.yVelocity = 0.6 * Math.abs(ball.yVelocity);
               futureBallY = GOAL_TOP_Y_COORD + GOAL_TOP_HALF_HEIGHT + BALL_RADIUS;
               ball.punchEffectX = ball.x;
               ball.punchEffectY = GOAL_TOP_Y_COORD + GOAL_TOP_HALF_HEIGHT;
           }
       } else {
           if (futureBallX < GOAL_TOP_WIDTH + BALL_RADIUS) {
               ball.xVelocity = 0.8 * Math.abs(ball.xVelocity); + 0.2 * ball.xVelocity;
           } else if (ball.x > GROUND_WIDTH - GOAL_TOP_WIDTH - BALL_RADIUS) {
               ball.xVelocity = - 0.8 * Math.abs(ball.xVelocity) + 0.2 * ball.xVelocity;
           }
       }
   }
 
   ball.y = futureBallY;
   ball.x = ball.x + ball.xVelocity;
   ball.yVelocity += 1;
 
   return false;
 
 }
 
 /**
  * FUN_00401fc0
  * Process player movement according to user input and set player position
  * @param {Player} player
  * @param {PikaUserInput} userInput
  * @param {Player} theOtherPlayer
  * @param {Ball} ball
  */
 function processPlayerMovementAndSetPlayerPosition(
   player,
   userInput,
   theOtherPlayer,
   ball
 ) {
   if (player.isComputer === true) {
     letComputerDecideUserInput(player, ball, theOtherPlayer, userInput);
   }
 
   if (player.holding) {
     if (player.holdingFrame === -128) {
       player.holdingFrame = 1;
     } else if (player.holdingFrame <= 0) {
         player.holding = false;
         ball.isPowerHit = true;
         ball.xVelocity = (player.isPlayer2 ? -12 : 12);
         ball.yVelocity = - 5
     } else {
       player.holdingFrame -= 1;
     }
   } else {
     player.holdingFrame = -128;
   }
 
   if (player.powerHitOnGround > 0) {
     player.powerHitOnGround -= 1;
   }
 
   // if player is lying down.. don't move
   if (player.state === 4) {
     player.lyingDownDurationLeft += -1;
     if (player.lyingDownDurationLeft < -1) {
       player.state = 0;
     }
     return;
   }
 
   // process x-direction movement
   let playerVelocityX = 0;
   if (player.state < 5 || player.state === 7) {
     if (player.state < 3) {
       playerVelocityX = userInput.xDirection * 10;
     } else {
       // player.state === 3 i.e. player is diving..
       playerVelocityX = player.divingDirection * 11;
     }
   }
 
   const futurePlayerX = player.x + playerVelocityX;
   player.x = futurePlayerX;
 
   // process player's x-direction world boundary
   if (futurePlayerX < PLAYER_HALF_LENGTH) {
       player.x = PLAYER_HALF_LENGTH;
   } else if (futurePlayerX > GROUND_WIDTH - PLAYER_HALF_LENGTH) {
       player.x = GROUND_WIDTH - PLAYER_HALF_LENGTH;
   }
 
   // jump
   if (
       player.state < 3 &&
       userInput.yDirection === -1 && // up-direction input
       player.yVelocity === 0 &&
       (player.y === PLAYER_TOUCHING_GROUND_Y_COORD || player.y === (GOAL_TOP_Y_COORD - GOAL_TOP_HALF_HEIGHT - PLAYER_HALF_LENGTH_Y)) // player is touching on the ground
   ) {
     player.yVelocity = -16;
     player.state = 1;
     player.frameNumber = 0;
     player.powerHitOnGround = -1;
     // maybe-stereo-sound function FUN_00408470 (0x90) ommited:
     // refer a detailed comment above about this function
     // maybe-sound code function (playerpointer + 0x90 + 0x10)? ommited
     player.sound.chu = true;
   }
 
   // fall
   if (
     player.state < 3 &&
     userInput.yDirection === 1 &&
     player.y !== PLAYER_TOUCHING_GROUND_Y_COORD && player.y !== (GOAL_TOP_Y_COORD - GOAL_TOP_HALF_HEIGHT - PLAYER_HALF_LENGTH_Y)
   ) {
     player.yVelocity = 12;
     player.state = 7;
     player.frameNumber = 0;
     player.divingDirection = userInput.xDirection;
     //player.divingDirection = player.isPlayer2 ? -1 : 1;
     player.sound.chu = true;
   }
 
   // gravity
   const futurePlayerY = player.y + player.yVelocity;
   player.y = futurePlayerY;
   // contact with ground
   if (futurePlayerY < PLAYER_HALF_LENGTH_Y) {
     player.yVelocity = 0
     player.y = PLAYER_HALF_LENGTH_Y
   } else if (futurePlayerY < PLAYER_TOUCHING_GROUND_Y_COORD) {
       player.yVelocity += 1;
   } else if (futurePlayerY > PLAYER_TOUCHING_GROUND_Y_COORD || (futurePlayerY == PLAYER_TOUCHING_GROUND_Y_COORD && player.powerHitOnGround == 0)) {
     // if player is landing..
     player.yVelocity = 0;
     player.y = PLAYER_TOUCHING_GROUND_Y_COORD;
     player.frameNumber = 0;
     player.powerHitOnGround = -1;
     if (player.state === 3 || player.state === 7) {
       // if player is diving..
       player.state = 4;
       player.frameNumber = 0;
       player.divingDirection = player.isPlayer2 ? -1 : 1;
       player.lyingDownDurationLeft = 3;
     } else {
       player.state = 0;
     }
   }
 
   // interaction with goal top
   if (Math.abs(player.y - GOAL_TOP_Y_COORD) < GOAL_TOP_HALF_HEIGHT + PLAYER_HALF_LENGTH_Y) {
       if (player.x + (player.isPlayer2 ? -8 : 8) < (GOAL_TOP_WIDTH + 0.5 * Math.abs(player.y - GOAL_TOP_Y_COORD) - 0.5 * GOAL_TOP_HALF_HEIGHT) || player.x + (player.isPlayer2 ? -8 : 8) > (GROUND_WIDTH - GOAL_TOP_WIDTH - 0.5 * Math.abs(player.y - GOAL_TOP_Y_COORD) + 0.5 * GOAL_TOP_HALF_HEIGHT)) {
           if (player.y < GOAL_TOP_Y_COORD) {
               player.yVelocity = 0.4 * player.yVelocity - 0.4 * Math.abs(player.yVelocity);
               player.y = GOAL_TOP_Y_COORD - PLAYER_HALF_LENGTH_Y - GOAL_TOP_HALF_HEIGHT;
               player.powerHitOnGround = -1;
               if (player.state === 3 || player.state === 7) {
                   player.state = 4;
                   player.lyingDownDurationLeft = 3;
               } else if (player.state === 5 || player.state === 6) {
                   player.state = player.state;
               } else {
                   player.state = 0;
               }
           } else {
               player.yVelocity = 0.4 * player.yVelocity + 0.6 * Math.abs(player.yVelocity);
               player.y = GOAL_TOP_Y_COORD + PLAYER_HALF_LENGTH_Y + GOAL_TOP_HALF_HEIGHT;
           }
       } else {
           player.xVelocity = 0;
           if (player.x < GOAL_TOP_WIDTH + PLAYER_HALF_LENGTH_X - (player.isPlayer2 ? -8 : 8)) {
               player.x = GOAL_TOP_WIDTH + PLAYER_HALF_LENGTH_X - (player.isPlayer2 ? -8 : 8);
           } else if (player.x > GROUND_WIDTH - GOAL_TOP_WIDTH - PLAYER_HALF_LENGTH_X - (player.isPlayer2 ? -8 : 8)) {
               player.x = GROUND_WIDTH - GOAL_TOP_WIDTH - PLAYER_HALF_LENGTH_X - (player.isPlayer2 ? -8 : 8);
           }
       }
   }
  
   if (userInput.powerHit === 1) {
     if (player.state === 1 || (player.state === 0 && userInput.xDirection === 0)) {
       // if player is jumping..
       // then player do power hit!
       player.delayBeforeNextFrame = 8;
       if (player.state === 0) {
         player.powerHitOnGround = 8;
       }
       player.frameNumber = 0;
       player.state = 2;
       // maybe-sound function (playerpointer + 0x90 + 0x18)? ommited
       // maybe-stereo-sound function FUN_00408470 (0x90) ommited:
       // refer a detailed comment above about this function
       // maybe-sound function (playerpointer + 0x90 + 0x14)? ommited
       player.sound.pika = true;
     } /*else if (player.state === 0 && userInput.xDirection !== 0) {
       // then player do diving!
       player.state = 3;
       player.frameNumber = 0;
       player.divingDirection = userInput.xDirection;
       player.yVelocity = -5;
       // maybe-stereo-sound function FUN_00408470 (0x90) ommited:
       // refer a detailed comment above about this function
       // maybe-sound code function (playerpointer + 0x90 + 0x10)? ommited
       player.sound.chu = true;
     }*/
   }
 
   /*if(player.state === -1) {
     //console.log(userInput.powerKeyDown);
     if(userInput.powerKeyDown === false) {
       player.state = 2;
       player.frameNumber = 0;
       ball.thrower = player.isPlayer2 ? 2 : 1;
       processCollisionBetweenBallAndPlayer(
         ball,
         player.x,
         userInput,
         player.state
       );
     }
   }*/
 
   /* Throwing code for volleyball / dodgeball; not used in soccer
   if (player.holding) {
     if (userInput.powerHit) {
       let st = player.state;
       player.state = 2;
       player.frameNumber = 0;
       ball.thrower = player.isPlayer2 ? 2 : 1;
       processCollisionBetweenBallAndPlayer(
         ball,
         player.x,
         userInput,
         player.state,
         player.isPlayer2
       );
       player.holding = false;
       player.state = st;
       player.frameNumber = 0;
     }
   }
   */
 
   if (player.state === 1) {
     player.frameNumber = (player.frameNumber + 1) % 3;
   } else if (player.state === 2) {
     if (player.delayBeforeNextFrame < 1) {
       player.frameNumber += 1;
       if (player.frameNumber > 4) {
         player.frameNumber = 0;
         player.state = 1;
       }
     } else {
       player.delayBeforeNextFrame -= 1;
     }
   } else if (player.state === 0) {
     player.delayBeforeNextFrame += 1;
     if (player.delayBeforeNextFrame > 3) {
       player.delayBeforeNextFrame = 0;
       const futureFrameNumber =
         player.frameNumber + player.normalStatusArmSwingDirection;
       if (futureFrameNumber < 0 || futureFrameNumber > 4) {
         player.normalStatusArmSwingDirection = -player.normalStatusArmSwingDirection;
       }
       player.frameNumber =
         player.frameNumber + player.normalStatusArmSwingDirection;
     }
   }
 
   if (player.gameEnded === true) {
     if (player.state === 0) {
       if (player.isWinner === true) {
         player.state = 5;
         // maybe-stereo-sound function FUN_00408470 (0x90) ommited:
         // refer a detailed comment above about this function
         // maybe-sound code function (0x98 + 0x10) ommited
         player.sound.pipikachu = true;
       } else {
         player.state = 6;
       }
       player.delayBeforeNextFrame = 0;
       player.frameNumber = 0;
     }
     processGameEndFrameFor(player);
   }
     
 }
 
 /**
  * FUN_004025e0
  * Process game end frame (for winner and loser motions) for the given player
  * @param {Player} player
  */
 function processGameEndFrameFor(player) {
   if (player.gameEnded === true && player.frameNumber < 4) {
     player.delayBeforeNextFrame += 1;
     if (player.delayBeforeNextFrame > 4) {
       player.delayBeforeNextFrame = 0;
       player.frameNumber += 1;
     }
   }
 
 }
 
 /**
  * FUN_004030a0
  * Process collision between ball and player.
  * This function only sets velocity of ball and expected landing point x of ball.
  * This function does not set position of ball.
  * The ball position is set by {@link processCollisionBetweenBallAndWorldAndSetBallPosition} function
  *
  * @param {Ball} ball
  * @param {Player["x"]} playerX
  * @param {PikaUserInput} userInput
  * @param {Player["state"]} playerState
  */
 function processCollisionBetweenBallAndPlayer(
   ball,
   playerX,
   userInput,
   playerState,
   isPlayer2
 ) {
   // playerX is maybe pika's x position
   // if collision occur,
   // greater the x position difference between pika and ball,
   // greater the x velocity of the ball.
   if (ball.x < playerX) {
     // Since javascript division is float division by default
     // I use "Math.floor" to do integer division
     ball.xVelocity = -Math.floor(Math.abs(ball.x - playerX) / 4);
   } else if (ball.x > playerX) {
     ball.xVelocity = Math.floor(Math.abs(ball.x - playerX) / 4);
   }
 
   // If ball velocity x is 0, randomly choose one of -1, 0, 1.
   if (ball.xVelocity === 0) {
     ball.xVelocity = (rand() % 3) - 1;
   }
 
   const ballAbsYVelocity = Math.abs(ball.yVelocity);
   ball.yVelocity = -ballAbsYVelocity;
 
   if (ballAbsYVelocity < 15) {
     ball.yVelocity = -15;
   }
 
   // player is jumping and power hitting
   if (playerState === 2) {
     if (!isPlayer2) {
       ball.xVelocity = 20; //(Math.abs(userInput.xDirection) + 1) * 10;
     } else {
       ball.xVelocity = -20; //-(Math.abs(userInput.xDirection) + 1) * 10;
     }
     ball.punchEffectX = ball.x;
     ball.punchEffectY = ball.y;
 
     ball.yVelocity = 0; //Math.abs(ball.yVelocity) * userInput.yDirection * 2;
     ball.punchEffectRadius = BALL_RADIUS;
     // maybe-stereo-sound function FUN_00408470 (0x90) ommited:
     // refer a detailed comment above about this function
     // maybe-soundcode function (ballpointer + 0x24 + 0x10) ommited:
     ball.sound.powerHit = true;
 
     ball.isPowerHit = true;
   } else {
     ball.isPowerHit = true;
   }
 
   caculate_expected_landing_point_x_for(ball);
     
 }
 
 /**
  * FUN_004031b0
  * Calculate x coordinate of expected landing point of the ball
  * @param {Ball} ball
  */
 function caculate_expected_landing_point_x_for(ball) {
   const copyBall = {
     x: ball.x,
     y: ball.y,
     xVelocity: ball.xVelocity,
     yVelocity: ball.yVelocity,
   };
   let loopCounter = 0;
   while (true) {
     loopCounter++;
 
     const futureCopyBallX = copyBall.xVelocity + copyBall.x;
     if (futureCopyBallX < BALL_RADIUS || futureCopyBallX > GROUND_WIDTH) {
       copyBall.xVelocity = -copyBall.xVelocity;
     }
     if (copyBall.y + copyBall.yVelocity < 0) {
       copyBall.yVelocity = 1;
     }
 
     // If copy ball touches net
     if (
       Math.abs(copyBall.x - GROUND_HALF_WIDTH) < NET_PILLAR_HALF_WIDTH &&
       copyBall.y > NET_PILLAR_TOP_TOP_Y_COORD
     ) {
       // It maybe should be <= NET_PILLAR_TOP_BOTTOM_Y_COORD as in FUN_00402dc0, is it the original game author's mistake?
       if (copyBall.y < NET_PILLAR_TOP_BOTTOM_Y_COORD) {
         if (copyBall.yVelocity > 0) {
           copyBall.yVelocity = -copyBall.yVelocity;
         }
       } else {
         if (copyBall.x < GROUND_HALF_WIDTH) {
           copyBall.xVelocity = -Math.abs(copyBall.xVelocity);
         } else {
           copyBall.xVelocity = Math.abs(copyBall.xVelocity);
         }
       }
     }
 
     copyBall.y = copyBall.y + copyBall.yVelocity;
     // if copyBall would touch ground
     if (
       copyBall.y > BALL_TOUCHING_GROUND_Y_COORD ||
       loopCounter >= INFINITE_LOOP_LIMIT
     ) {
       break;
     }
     copyBall.x = copyBall.x + copyBall.xVelocity;
     copyBall.yVelocity += 1;
   }
   ball.expectedLandingPointX = copyBall.x;
 
 }
 
 /**
  * FUN_00402360
  * Computer controls its player by this function.
  * Computer decides the user input for the player it controls,
  * according to the game situation it figures out
  * by the given parameters (player, ball and theOtherplayer),
  * and reflects these to the given user input object.
  *
  * @param {Player} player The player whom computer contorls
  * @param {Ball} ball ball
  * @param {Player} theOtherPlayer The other player
  * @param {PikaUserInput} userInput user input of the player whom computer controls
  */
 function letComputerDecideUserInput(player, ball, theOtherPlayer, userInput) {
   userInput.xDirection = 0;
   userInput.yDirection = 0;
   userInput.powerHit = 0;
 
   let virtualExpectedLandingPointX = ball.expectedLandingPointX;
   if (
     Math.abs(ball.x - player.x) > 100 &&
     Math.abs(ball.xVelocity) < player.computerBoldness + 5
   ) {
     const leftBoundary = Number(player.isPlayer2) * GROUND_HALF_WIDTH;
     if (
       (ball.expectedLandingPointX <= leftBoundary ||
         ball.expectedLandingPointX >=
           Number(player.isPlayer2) * GROUND_WIDTH + GROUND_HALF_WIDTH) &&
       player.computerWhereToStandBy === 0
     ) {
       // If conditions above met, the computer estimates the proper location to stay as the middle point of their side
       virtualExpectedLandingPointX = leftBoundary + GROUND_HALF_WIDTH / 2;
     }
   }
 
   if (
     Math.abs(virtualExpectedLandingPointX - player.x) >
     player.computerBoldness + 8
   ) {
     if (player.x < virtualExpectedLandingPointX) {
       userInput.xDirection = 1;
     } else {
       userInput.xDirection = -1;
     }
   } else if (rand() % 20 === 0) {
     player.computerWhereToStandBy = rand() % 2;
   }
 
   if (player.state === 0) {
     if (
       Math.abs(ball.xVelocity) < player.computerBoldness + 3 &&
       Math.abs(ball.x - player.x) < PLAYER_HALF_LENGTH &&
       ball.y > -36 &&
       ball.y < 10 * player.computerBoldness + 84 &&
       ball.yVelocity > 0
     ) {
       userInput.yDirection = -1;
     }
 
     /*const leftBoundary = Number(player.isPlayer2) * GROUND_HALF_WIDTH;
     const rightBoundary = (Number(player.isPlayer2) + 1) * GROUND_HALF_WIDTH;
     if (
       ball.expectedLandingPointX > leftBoundary &&
       ball.expectedLandingPointX < rightBoundary &&
       Math.abs(ball.x - player.x) >
         player.computerBoldness * 5 + PLAYER_LENGTH &&
       ball.x > leftBoundary &&
       ball.x < rightBoundary &&
       ball.y > 174
     ) {
       // If conditions above met, the computer decides to dive!
       userInput.powerHit = 1;
       if (player.x < ball.x) {
         userInput.xDirection = 1;
       } else {
         userInput.xDirection = -1;
       }
     }*/
   } else if (player.state === 1 || player.state === 2) {
     if (Math.abs(ball.x - player.x) > 8) {
       if (player.x < ball.x) {
         userInput.xDirection = -1;
       } else {
         userInput.xDirection = 1;
       }
     }
   }
   if (player.holding) {
     userInput.yDirection = -1;
     /*const willInputPowerHit = decideWhetherInputPowerHit(
       player,
       ball,
       theOtherPlayer,
       userInput
     );*/
     if (player.y < PLAYER_TOUCHING_GROUND_Y_COORD - 100 && rand() % 10 === 0) {
       userInput.powerHit = 1;
       userInput.xDirection = player.isPlayer2 ? -1 : 1;
       userInput.yDirection = rand() % 2 - 1;
     }
   }
     
 }
 
 /**
  * FUN_00402630
  * This function is called by {@link letComputerDecideUserInput},
  * and also sets x and y direction user input so that it participate in
  * the decision of the direction of power hit.
  * @param {Player} player the player whom computer controls
  * @param {Ball} ball ball
  * @param {Player} theOtherPlayer The other player
  * @param {PikaUserInput} userInput user input for the player whom computer controls
  * @return {boolean} Will input power hit?
  */
 function decideWhetherInputPowerHit(player, ball, theOtherPlayer, userInput) {
   if (rand() % 2 === 0) {
     for (let xDirection = 1; xDirection > -1; xDirection--) {
       for (let yDirection = -1; yDirection < 2; yDirection++) {
         const expectedLandingPointX = expectedLandingPointXWhenPowerHit(
           xDirection,
           yDirection,
           ball
         );
         if (
           (expectedLandingPointX <=
             Number(player.isPlayer2) * GROUND_HALF_WIDTH ||
             expectedLandingPointX >=
               Number(player.isPlayer2) * GROUND_WIDTH + GROUND_HALF_WIDTH) &&
           Math.abs(expectedLandingPointX - theOtherPlayer.x) > PLAYER_LENGTH
         ) {
           userInput.xDirection = xDirection;
           userInput.yDirection = yDirection;
           return true;
         }
       }
     }
   } else {
     for (let xDirection = 1; xDirection > -1; xDirection--) {
       for (let yDirection = 1; yDirection > -2; yDirection--) {
         const expectedLandingPointX = expectedLandingPointXWhenPowerHit(
           xDirection,
           yDirection,
           ball
         );
         if (
           (expectedLandingPointX <=
             Number(player.isPlayer2) * GROUND_HALF_WIDTH ||
             expectedLandingPointX >=
               Number(player.isPlayer2) * GROUND_WIDTH + GROUND_HALF_WIDTH) &&
           Math.abs(expectedLandingPointX - theOtherPlayer.x) > PLAYER_LENGTH
         ) {
           userInput.xDirection = xDirection;
           userInput.yDirection = yDirection;
           return true;
         }
       }
     }
   }
   return false;
     
 }
 
 /**
  * FUN_00402870
  * This function is called by {@link decideWhetherInputPowerHit},
  * and calculates the expected x coordinate of the landing point of the ball
  * when power hit
  * @param {PikaUserInput["xDirection"]} userInputXDirection
  * @param {PikaUserInput["yDirection"]} userInputYDirection
  * @param {Ball} ball
  * @return {number} x coord of expected landing point when power hit the ball
  */
 function expectedLandingPointXWhenPowerHit(
   userInputXDirection,
   userInputYDirection,
   ball
 ) {
   const copyBall = {
     x: ball.x,
     y: ball.y,
     xVelocity: ball.xVelocity,
     yVelocity: ball.yVelocity,
   };
   if (copyBall.x < GROUND_HALF_WIDTH) {
     copyBall.xVelocity = (Math.abs(userInputXDirection) + 1) * 10;
   } else {
     copyBall.xVelocity = -(Math.abs(userInputXDirection) + 1) * 10;
   }
   copyBall.yVelocity = Math.abs(copyBall.yVelocity) * userInputYDirection * 2;
 
   let loopCounter = 0;
   while (true) {
     loopCounter++;
 
     const futureCopyBallX = copyBall.x + copyBall.xVelocity;
     if (futureCopyBallX < BALL_RADIUS || futureCopyBallX > GROUND_WIDTH) {
       copyBall.xVelocity = -copyBall.xVelocity;
     }
     if (copyBall.y + copyBall.yVelocity < 0) {
       copyBall.yVelocity = 1;
     }
     if (
       Math.abs(copyBall.x - GROUND_HALF_WIDTH) < NET_PILLAR_HALF_WIDTH &&
       copyBall.y > NET_PILLAR_TOP_TOP_Y_COORD
     ) {
       /*
         The code below maybe is intended to make computer do mistakes.
         The player controlled by computer occasionally power hit ball that is bounced back by the net pillar,
         since code below do not anticipate the bounce back.
       */
       if (copyBall.yVelocity > 0) {
         copyBall.yVelocity = -copyBall.yVelocity;
       }
       /*
       An alternative code for making the computer not do those mistakes is as below.
 
       if (copyBall.y <= NET_PILLAR_TOP_BOTTOM_Y_COORD) {
         if (copyBall.yVelocity > 0) {
           copyBall.yVelocity = -copyBall.yVelocity;
         }
       } else {
         if (copyBall.x < GROUND_HALF_WIDTH) {
           copyBall.xVelocity = -Math.abs(copyBall.xVelocity);
         } else {
           copyBall.xVelocity = Math.abs(copyBall.xVelocity);
         }
       }
       */
     }
     copyBall.y = copyBall.y + copyBall.yVelocity;
     if (
       copyBall.y > BALL_TOUCHING_GROUND_Y_COORD ||
       loopCounter >= INFINITE_LOOP_LIMIT
     ) {
       return copyBall.x;
     }
     copyBall.x = copyBall.x + copyBall.xVelocity;
     copyBall.yVelocity += 1;
   }
     
 }