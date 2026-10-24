import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {Animator} from '../src/render/animator';
import {actionPose,DOLL_ANIMS,weaponMotion,type Rig} from '../src/render/paperDoll';
import {skillAnimation} from '../src/render/combatAnimation';
const rig=JSON.parse(readFileSync(join(__dirname,'../public/sprites/wayfarer/rig.json'),'utf8')) as Rig;

// Forward kinematics independently checks the position produced by joint angles.
function wrist(p:ReturnType<typeof actionPose>,side:'near'|'far') {
 const v=rig.views.side.parts,s=v['arm_'+side].pivot,e=v['forearm_'+side].pivot,w=v['hand_'+side].pivot;
 const a=(p.angle['arm_'+side]??0)*Math.PI/180,b=a+(p.angle['forearm_'+side]??0)*Math.PI/180;
 return [s[0]+(e[0]-s[0])*Math.cos(a)-(e[1]-s[1])*Math.sin(a)+(w[0]-e[0])*Math.cos(b)-(w[1]-e[1])*Math.sin(b),
  s[1]+(e[0]-s[0])*Math.sin(a)+(e[1]-s[1])*Math.cos(a)+(w[0]-e[0])*Math.sin(b)+(w[1]-e[1])*Math.cos(b)];
}

describe('Wayfarer articulated actions',()=>{
 it('uses the shared weapon action for generated gear without explicit motion',()=>{
  for(const [visual,motion] of [['surveyor_bow','shoot'],['aether_rod','cast'],['copper_saber','melee'],['doll_weapon_gauntlet','punch'],['doll_unique_gearheart_gauntlet','punch']])
   expect(weaponMotion([{name:'Generated gear',slot:'weapon',visual,layers:['weapon']}])).toBe(motion);
  expect(weaponMotion([])).toBe('unarmed');
 });
 it('punches forward on the server hit frame and returns to the carry position',()=>{
  for(const motion of ['punch','unarmed']) {
   const start=wrist(actionPose(rig,'side','attack',0,8,motion),'near');
   const hit=wrist(actionPose(rig,'side','attack',4,8,motion),'near');
   const end=wrist(actionPose(rig,'side','attack',7,8,motion),'near');
   expect(hit[0]).toBeLessThan(start[0]-35);
   expect(hit[1]).toBeGreaterThan(rig.views.side.parts.arm_near.pivot[1]);
   expect(end[0]).toBeCloseTo(start[0]);expect(end[1]).toBeCloseTo(start[1]);
  }
 });
 it('keeps side-view weapon hands in front of the torso, including every walk frame',()=>{
  for(const motion of ['melee','shoot','cast'])for(const anim of ['idle','walk'] as const)for(let f=0;f<8;f++){
   const p=actionPose(rig,'side',anim,f,8,motion),hand=wrist(p,'near');
   expect(hand[0]).toBeLessThan(rig.views.side.parts.torso.pivot[0]-20);
   expect(hand[1]).toBeGreaterThan(280);expect(hand[1]).toBeLessThan(330);
  }
 });
 it('draws the string with a separate bent pulling arm, then releases it',()=>{
  const pull=actionPose(rig,'side','shoot',7,12,'shoot'),release=actionPose(rig,'side','shoot',8,12,'shoot');
  expect(pull.bowDraw).toBeGreaterThan(.9);expect(release.bowDraw).toBe(0);
  expect(Math.abs(pull.angle.forearm_far)).toBeGreaterThan(45);
  expect(wrist(pull,'far')[0]).toBeGreaterThan(wrist(pull,'near')[0]+50);
 });
 it('casts with an open free hand below the face and keeps the staff in front',()=>{
  const p=actionPose(rig,'side','cast',6,12,'cast');
  expect(p.openHands).toContain('hand_far');expect(p.spell).toBeGreaterThan(0);
  expect(wrist(p,'far')[1]).toBeGreaterThan(245);
  expect(wrist(p,'near')[0]).toBeLessThan(230);
 });
 it('selects casting for magic, shooting for ranger skills and melee for sword skills',()=>{
  expect(skillAnimation({id:'sundering_pulse',job:'all'})).toBe('cast');
  expect(skillAnimation({id:'prism_field',job:'arcanist'})).toBe('cast');
  expect(skillAnimation({id:'volley',job:'strider'})).toBe('shoot');
  expect(skillAnimation({id:'cleaving_arc',job:'vanguard'})).toBe('attack');
 });
});

describe('server-timed spell release',()=>{
 for(const impactMs of [150,600,1800])it(`releases once at ${impactMs}ms and does not flinch out of casting`,()=>{
  const a=new Animator(DOLL_ANIMS),events:string[]=[];
  a.play('cast',{impactMs,onEvent:e=>events.push(e)});
  expect(a.play('hit')).toBe(false);
  a.update(impactMs-1);expect(events).toEqual([]);
  expect(a.update(1).frame).toBe(8);expect(events).toEqual(['hit']);
  a.update(500);expect(events).toEqual(['hit']);expect(a.current).toBe('idle');
 });
});
