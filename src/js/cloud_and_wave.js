/**
 * This module takes charge of the physical motion of clouds (on the sky) and wave (on the bottom of game screen) in the game.
 * It is also a Model in MVC pattern and also rendered by "view.js".
 *
 * It is gained by reverse engineering the original game.
 * The address of the original function is in the comment.
 * ex) FUN_00404770 means the function at the address 00404770 in the machine code.
 */
 'use strict';
 import { rand } from './rand.js';

const VIEWPORT_WIDTH = 768 //match with VIEWPORT_WIDTH in view.js
const VIEWPORT_HEIGHT = 432 //match with VIEWPORT_HEIGHT in view.js

 /**
  * Class represents a cloud
  */
 export class Cloud {
     constructor() {
         this.topLeftPointX = -68 + (rand() % (VIEWPORT_WIDTH + 68));
         this.topLeftPointY = rand() % (VIEWPORT_HEIGHT - 200);
         this.topLeftPointXVelocity = 1 + (rand() % 2);
         this.sizeDiffTurnNumber = rand() % 11;
     }
 
     get sizeDiff() {
        // this same as return [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0][this.sizeDiffTurnNumber]
        return 5 - Math.abs(this.sizeDiffTurnNumber - 5);
     }
 
     get spriteTopLeftPointX() {
         return this.topLeftPointX - this.sizeDiff;
     }
 
     get spriteTopLeftPointY() {
         return this.topLeftPointY - this.sizeDiff;
     }
 
     get spriteWidth() {
         return 48 + 2 * this.sizeDiff;
     }
 
     get spriteHeight() {
         return 24 + 2 * this.sizeDiff;
     }
 }
 
 /**
  * Class representing wave
  */
 export class Wave {
   constructor() {
       this.verticalCoord = 0;
       this.verticalCoordVelocity = 2;
       this.yCoords = [];
       for (let i = 0; i < VIEWPORT_WIDTH / 16; i++) {
           this.yCoords.push(VIEWPORT_HEIGHT + 24);
       }
   }
 }
 
 /**
  * FUN_00404770
  * Move clouds and wave
  * @param {Cloud[]} cloudArray
  * @param {Wave} wave
  */
 export function cloudAndWaveEngine(cloudArray, wave) {
   for (let i = 0; i < 16; i++) {
       cloudArray[i].topLeftPointX += cloudArray[i].topLeftPointXVelocity;
       if (cloudArray[i].topLeftPointX > VIEWPORT_WIDTH) {
           cloudArray[i].topLeftPointX = -68;
           cloudArray[i].topLeftPointY = rand() % (VIEWPORT_HEIGHT - 200);
           cloudArray[i].topLeftPointXVelocity = 1 + (rand() % 2);
       }
       cloudArray[i].sizeDiffTurnNumber =
       (cloudArray[i].sizeDiffTurnNumber + 1) % 11;
   }
 
   wave.verticalCoord += wave.verticalCoordVelocity;
   if (wave.verticalCoord > 32) {
     wave.verticalCoord = 32;
     wave.verticalCoordVelocity = -1;
   } else if (wave.verticalCoord < 0 && wave.verticalCoordVelocity < 0) {
     wave.verticalCoordVelocity = 2;
     wave.verticalCoord = -(rand() % 40);
   }

     for (let i = 0; i < VIEWPORT_WIDTH / 16; i++) {
         wave.yCoords[i] = VIEWPORT_HEIGHT + 24 - wave.verticalCoord + (rand() % 3);
     }
 }
 