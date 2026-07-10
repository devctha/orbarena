(function(){
  "use strict";
  const OA=window.OrbArena;
  class CombatAuditSystem{
    static build(){
      const characters=OA.CharacterRegistry.all();
      return OA.CATALOG.abilities.map((ability)=>{
        const core=OA.abilityById?.(ability.id),power=OA.PowerRegistry.get?.(ability.id),character=characters.find((item)=>item.powerId===ability.id||item.kit?.active===ability.name||item.kit?.ultimate===ability.name),implemented=Boolean(core||power||ability.effect||ability.execute||ability.handler);
        return{id:ability.id,character:character?.id||"shared",type:ability.type,cooldown:ability.cooldown,effectExpected:ability.description,effectImplemented:core?.effect||(power?"power-handler":ability.effect||"catalog-adapter"),damage:ability.damage||core?.power||0,status:core?.params?.status||ability.status||null,particles:ability.fx?.particles||ability.fx||[],sound:ability.sfx||null,ai:Boolean(ability.ai),autoCast:Boolean(ability.autoCast),functional:implemented};
      });
    }
    static summary(){const rows=this.build();return{total:rows.length,functional:rows.filter((row)=>row.functional).length,missing:rows.filter((row)=>!row.functional),rows};}
  }
  OA.CombatAuditSystem=CombatAuditSystem;
}());
