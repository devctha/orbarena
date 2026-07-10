(function(){
  "use strict";const OA=window.OrbArena;
  OA.CharacterSelectUI.prototype.animateArena=function(){
    const canvas=document.querySelector("#arena-preview-canvas"),context=canvas.getContext("2d"),balls=[{x:150,y:55,vx:1.6,vy:1.1,c:"#55dce8"},{x:430,y:120,vx:-1.35,vy:-.9,c:"#a373e7"},{x:310,y:75,vx:1.05,vy:-1.4,c:"#f0b65d"}];
    const frame=()=>{
      const active=document.querySelector("#screen-characters").classList.contains("active")&&this.app.state.settings.arenaPreview!==false&&!document.hidden;
      if(active){context.clearRect(0,0,canvas.width,canvas.height);context.fillStyle="#06101a";context.fillRect(20,14,canvas.width-40,canvas.height-28);context.strokeStyle="#3a9ba5";context.lineWidth=3;context.strokeRect(20,14,canvas.width-40,canvas.height-28);for(const ball of balls){ball.x+=ball.vx;ball.y+=ball.vy;if(ball.x<30||ball.x>canvas.width-30){ball.vx*=-1.08;ball.x=Math.max(30,Math.min(canvas.width-30,ball.x));}if(ball.y<24||ball.y>canvas.height-24){ball.vy*=-1.08;ball.y=Math.max(24,Math.min(canvas.height-24,ball.y));}context.strokeStyle=ball.c+"44";context.beginPath();context.moveTo(ball.x-ball.vx*8,ball.y-ball.vy*8);context.lineTo(ball.x,ball.y);context.stroke();context.fillStyle=ball.c;context.beginPath();context.arc(ball.x,ball.y,7,0,Math.PI*2);context.fill();}}
      setTimeout(()=>requestAnimationFrame(frame),active?0:350);
    };requestAnimationFrame(frame);
  };
}());
