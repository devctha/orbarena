(function(){
  "use strict";
  const OA=window.OrbArena,priority={decorative:0,low:1,medium:2,high:3,critical:4};
  class ScreenShakeManager{
    constructor(enabled=true){this.enabled=enabled;this.items=[];this.max=1.15;}
    add(intensity,duration=.2,frequency=30,level="medium",dx=0,dy=0){if(!this.enabled)return;this.items.push({intensity:Math.min(this.max,intensity),duration,life:duration,frequency,priority:priority[level]??2,dx,dy});this.items.sort((a,b)=>b.priority-a.priority);if(this.items.length>6)this.items.length=6;}
    update(dt){for(const item of this.items)item.life-=dt;this.items=this.items.filter(item=>item.life>0);}
    get trauma(){return Math.min(this.max,this.items.reduce((sum,item)=>sum+item.intensity*(item.life/item.duration),0));}
  }
  class CameraManager{
    constructor(settings){this.settings=settings;this.zoomImpulse=0;this.focus=null;}
    impact(energy){this.zoomImpulse=Math.max(this.zoomImpulse,Math.min(.075,energy/9000));}
    ultimate(fighter){this.focus={fighter,life:.65};this.zoomImpulse=.08;}
    update(world,dt){this.zoomImpulse+=(0-this.zoomImpulse)*Math.min(1,dt*7);if(this.focus){this.focus.life-=dt;if(this.focus.life<=0)this.focus=null;}world.camera.cinematicZoom=this.settings.reducedMotion?0:this.zoomImpulse;}
  }
  class AdaptivePerformanceSystem{
    constructor(settings){this.settings=settings;this.level=0;this.cooldown=0;this.stable=0;this.minimumFps=60;}
    update(fps,dt,particles){this.minimumFps=Math.min(this.minimumFps,fps);if(!this.settings.adaptiveEffects)return this.level;this.cooldown=Math.max(0,this.cooldown-dt);const target=fps<25?4:fps<35?3:fps<45?2:fps<55?1:0;if(target>this.level&&this.cooldown<=0){this.level=target;this.cooldown=2.5;this.stable=0;}else if(target<this.level){this.stable+=dt;if(this.stable>5&&this.cooldown<=0){this.level-=1;this.cooldown=3;this.stable=0;}}else this.stable=0;particles.setLod?.(Math.max(.18,1-this.level*.2));return this.level;}
  }
  OA.ScreenShakeManager=ScreenShakeManager;OA.CameraManager=CameraManager;OA.AdaptivePerformanceSystem=AdaptivePerformanceSystem;
}());
