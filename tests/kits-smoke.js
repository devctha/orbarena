require("./characters-smoke.js");
const assert2=require("node:assert/strict"),OA2=global.OrbArena,rr=new OA2.Random("KITS");
for(const character of OA2.CharacterRegistry.all()){
 const self=OA2.CharacterFactory.create(character,{id:character.id+"-p",team:"player",x:220,y:270,vx:240,vy:20,orbit:1,phase:.2}),target=OA2.CharacterFactory.create(OA2.CharacterRegistry.get(character.id==="echo"?"hydra":"echo"),{id:character.id+"-e",team:"enemy",x:350,y:270,vx:-180,vy:10,orbit:-1,phase:2});self.abilities=[];target.abilities=[];self.perks=[];target.perks=[];
 const w={player:self,enemy:target,time:1,intensity:1,arena:{padding:30,gravitySign:1,gravityTimer:0,rotationForce:0,rotationTimer:0},physics:{},camera:{trauma:0},timeDilation:{scale:1,timer:0},effects:[],scheduled:[],summons:[],zones:[],characterZones:[],poisonPools:[]},noop=()=>0;
 const c={random:rr,damage:noop,heal:noop,shield:noop,impulse:noop,radial:noop,projectile:noop,burst:noop,zone:noop,summon:()=>({active:true,x:200,y:200}),clone:()=>({active:true,x:200,y:200}),poison:noop,poisonPool:noop,spikes:noop,slowFighter:noop,slowProjectiles:noop,slowAbilities:noop,slowGame:noop,teleport:(world,f,x,y)=>{f.x=x;f.y=y;},clearControls:noop,removeProjectiles:()=>2,addOrbitals:noop,schedule:noop,effect:noop},h=OA2.CharacterMechanics.get(character.id),e={type:"damage",fighter:self,target,damage:18,impact:360,source:"projectile"};
 for(const [name,args] of [["spawn",[w,self,target,c]],["update",[w,self,target,.1,c]],["active",[w,self,target,c]],["event",[w,self,target,e,c]],["receive",[w,self,target,e,c]],["ultimate",[w,self,target,c]]]) assert2.doesNotThrow(()=>h[name]?.(...args),character.id+" "+name);
}
console.log("KITS_OK 60/60");
