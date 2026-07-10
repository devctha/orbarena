(function(){
  "use strict";
  const OA=window.OrbArena;
  class SidebarUI{
    constructor(app){this.app=app;this.rail=document.querySelector("#main-sidebar");this.toggle=document.querySelector(".sidebar-toggle");this.closeButton=this.rail?.querySelector(".sidebar-close");this.ensureModeSwitch();this.bind();}
    ensureModeSwitch(){const actions=document.querySelector(".primary-actions");if(!actions||document.querySelector(".home-game-modes"))return;actions.insertAdjacentHTML("afterend",`<section class="home-game-modes" aria-label="Escolha o modo de jogo"><button data-home-mode="orb"><small>MODO ORB</small><b>ORB ARENA</b><span>Ricochetes, builds e Wall Boost</span></button><button data-home-mode="stick"><small>NOVO MODO</small><b>STICK ARENA</b><span>Plataformas, combos e luta 2D</span></button></section>`);document.querySelectorAll("[data-home-mode]").forEach((button)=>button.onclick=()=>{document.querySelector("#game-mode-select").value=button.dataset.homeMode;this.app.openSetup();});}
    bind(){if(!this.rail)return;const setOpen=(open)=>{this.rail.classList.toggle("open",open);document.body.classList.toggle("sidebar-open",open);this.toggle?.setAttribute("aria-expanded",String(open));};this.toggle?.addEventListener("click",()=>setOpen(!this.rail.classList.contains("open")));this.closeButton?.addEventListener("click",()=>setOpen(false));this.rail.querySelectorAll(".nav-item").forEach((item)=>item.addEventListener("click",()=>{this.rail.querySelectorAll(".nav-item").forEach((entry)=>entry.classList.toggle("active",entry===item));if(matchMedia("(max-width:760px)").matches)setOpen(false);}));document.addEventListener("keydown",(event)=>{if(event.key==="Escape")setOpen(false);});}
  }
  OA.SidebarUI=SidebarUI;
}());
