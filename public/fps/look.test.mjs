import test from 'node:test';
import assert from 'node:assert/strict';
import {rotateLook,keyboardLook,LookGesture,PITCH_LIMIT} from './look.mjs';
test('mouse look turns horizontally and permits looking almost straight down',()=>{const r={x:0,y:Math.PI};rotateLook(r,200,500);assert.ok(r.y>Math.PI);assert.equal(r.x,1.25);rotateLook(r,0,1000);assert.equal(r.x,PITCH_LIMIT);rotateLook(r,0,-10000);assert.equal(r.x,-PITCH_LIMIT);});
test('arrow keys rotate independently of translation controls',()=>{const r={x:0,y:0};keyboardLook(r,new Set(['ArrowRight','ArrowDown','KeyW']),1);assert.equal(r.y,1.75);assert.equal(r.x,1.4);});
test('drag look cannot accidentally throw ammunition on release',()=>{const g=new LookGesture();g.begin(10,10,0,0);assert.deepEqual(g.move(80,40),{dx:70,dy:30});assert.equal(g.shouldHoldFire(1000),false);assert.equal(g.end(),false);});
test('unlocked single click fires; right click and cancelled gesture do not',()=>{const g=new LookGesture();g.begin(10,10);assert.equal(g.end(),true);g.begin(10,10,2);assert.equal(g.end(),false);g.begin(10,10);g.clear();assert.equal(g.end(),false);});
test('holding stationary starts continuous fire once delay expires',()=>{const g=new LookGesture();g.begin(10,10,0,100);assert.equal(g.shouldHoldFire(200),false);assert.equal(g.shouldHoldFire(330),true);assert.equal(g.end(),false);});

import {ATTACK_KEYS,SPRINT_KEY,attackHeld} from './look.mjs';
test('either Shift attacks, and attack cannot also trigger sprint or charge',()=>{assert.equal(attackHeld(new Set(['ShiftLeft'])),true);assert.equal(attackHeld(new Set(['ShiftRight'])),true);assert.equal(attackHeld(new Set(['KeyC'])),false);assert.equal(ATTACK_KEYS.has(SPRINT_KEY),false);assert.equal(SPRINT_KEY,'KeyC');});
test('releasing one Shift does not stop attack while the other remains held',()=>{const keys=new Set(['ShiftLeft','ShiftRight']);keys.delete('ShiftLeft');assert.equal(attackHeld(keys),true);keys.delete('ShiftRight');assert.equal(attackHeld(keys),false);});
