import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";



export default async function ProtectedPage() {


  const supabase =
    await createClient();





  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();






  if(
    claimsError ||
    !claimsData?.claims
  ){

    redirect("/auth/login");

  }








  const [

    { count: totalLeads },

    { count: hotLeads },

    { count: humanLeads },

    { count: totalInteractions },

    { data: hotOpportunities },

    { data: recentLeads },

    { data: followups },

    { data: urgentLeads },

    { data: activeAgents },

    { data: profiles },

    { data: propertyInteractions }


  ] = await Promise.all([









    supabase
      .from("leads")
      .select(
        "id",
        {
          count:"exact",
          head:true
        }
      ),









    supabase
      .from("leads")
      .select(
        "id",
        {
          count:"exact",
          head:true
        }
      )
      .eq(
        "lead_temperature",
        "HOT"
      ),









    supabase
      .from("leads")
      .select(
        "id",
        {
          count:"exact",
          head:true
        }
      )
      .eq(
        "requires_human",
        true
      ),









    supabase
      .from("interactions")
      .select(
        "id",
        {
          count:"exact",
          head:true
        }
      ),









    supabase
      .from("leads")
      .select(
        `
        id,
        full_name,
        primary_zone,
        lead_score,
        next_action
        `
      )
      .eq(
        "lead_temperature",
        "HOT"
      )
      .order(
        "lead_score",
        {
          ascending:false
        }
      )
      .limit(5),









    supabase
      .from("leads")
      .select(
        `
        id,
        full_name,
        primary_zone,
        lead_score
        `
      )
      .order(
        "created_at",
        {
          ascending:false
        }
      )
      .limit(5),









    supabase
      .from("followups")
      .select(
        `
        id,
        assigned_to,
        status
        `
      ),









    supabase
      .from("leads")
      .select(
        `
        id,
        full_name,
        lead_score,
        next_action,
        primary_zone,
        budget_max,
        lead_temperature
        `
      )
      .gte(
        "lead_score",
        80
      )
      .order(
        "lead_score",
        {
          ascending:false
        }
      )
      .limit(5),









    supabase
      .from("organization_members")
      .select(
        `
        id,
        user_id,
        role,
        status
        `
      )
      .eq(
        "status",
        "ACTIVE"
      ),









    supabase
      .from("profiles")
      .select(
        `
        id,
        full_name
        `
      ),









    supabase
      .from("interactions")
      .select(
        `
        id,
        property_id,
        detected_intent
        `
      )
      .eq(
        "detected_intent",
        "ENVIAR_PROPIEDAD"
      )





  ]);









  const pendingFollowups =
    followups?.filter(
      f =>
        f.status === "PENDING"
    ).length || 0;









  const aiRecommendations =
    urgentLeads?.map((lead)=>{


      let recommendation =
        "📞 Contactar cliente";


      let reason =
        "Lead con alta puntuación";




      if(
        lead.primary_zone &&
        lead.budget_max
      ){

        recommendation =
          "🏠 Enviar propiedades";


        reason =
          "Tiene zona y presupuesto definidos";

      }





      if(
        lead.lead_temperature === "HOT"
      ){

        recommendation =
          "📅 Priorizar seguimiento";


        reason =
          "Lead caliente detectado por IA";

      }





      return {

        ...lead,

        recommendation,

        reason

      };


    }) || [];









  const topProperties =
    propertyInteractions
    ?.reduce(
      (acc:any,item:any)=>{


        if(!item.property_id){

          return acc;

        }


        acc[item.property_id] =
          (acc[item.property_id] || 0) + 1;


        return acc;


      },
      {}
    );








  const propertyRanking =
    Object.entries(
      topProperties || {}
    )
    .map(
      ([propertyId,count])=>({

        propertyId,

        count

      })
    )
    .sort(
      (a:any,b:any)=>
        b.count-a.count
    )
    .slice(
      0,
      5
    );








  const ranking =
    activeAgents
    ?.map(agent=>{


      const agentFollowups =
        followups?.filter(
          f =>
            f.assigned_to === agent.user_id
        ) || [];




      const profile =
        profiles?.find(
          p =>
            p.id === agent.user_id
        );




      return {

        id:
          agent.id,


        name:
          profile?.full_name ||
          "Sin nombre",



        total:
          agentFollowups.length,



        completed:
          agentFollowups.filter(
            f =>
              f.status === "COMPLETED"
          ).length


      };


    })
    .sort(
      (a,b)=>
        b.completed -
        a.completed
    )
    || [];return (

<main className="
min-h-screen
bg-slate-950
p-8
text-white
">


<div className="mx-auto max-w-7xl">





<div className="mb-8">


<p className="text-sm font-medium text-blue-400">
AI Sales Intelligence
</p>


<h1 className="mt-1 text-3xl font-bold">
Dashboard comercial
</h1>


<p className="mt-2 text-slate-400">
Prioridades, oportunidades y rendimiento del equipo.
</p>


</div>









<section
className="
rounded-2xl
border
border-blue-500/20
bg-blue-500/5
p-6
"
>


<h2 className="text-xl font-bold">
🤖 AI Sales Brief
</h2>


<p className="mt-3 text-slate-300">

Tenés{" "}
<b>
{hotLeads ?? 0}
</b>{" "}
oportunidades calientes.

La IA recomienda priorizar los leads con mayor intención.

</p>


</section>









<section className="
mt-8
grid
gap-4
md:grid-cols-5
">


<MetricCard
title="Leads"
value={totalLeads ?? 0}
/>


<MetricCard
title="HOT"
value={hotLeads ?? 0}
/>


<MetricCard
title="Humano"
value={humanLeads ?? 0}
/>


<MetricCard
title="Interacciones"
value={totalInteractions ?? 0}
/>


<MetricCard
title="Pendientes"
value={pendingFollowups}
/>


</section>









<section className="
mt-8
rounded-2xl
border
border-white/10
bg-white/[0.03]
p-6
">


<h2 className="text-xl font-semibold">
⚡ Acciones recomendadas por IA
</h2>



<div className="mt-5 space-y-4">


{
aiRecommendations.map(
(lead)=>(
<div
key={lead.id}
className="
rounded-xl
border
border-white/10
p-4
"
>


<Link
href={`/protected/leads/${lead.id}`}
className="
font-semibold
hover:text-blue-400
"
>

🔥 {lead.full_name || "Sin nombre"}

</Link>


<p className="mt-2 text-blue-400">

Score:
{" "}
{lead.lead_score}

</p>



<p className="mt-2 text-slate-300">

🤖 Acción:
{" "}
{lead.recommendation}

</p>



<p className="mt-1 text-sm text-slate-500">

Motivo:
{" "}
{lead.reason}

</p>


</div>
)
)
}


</div>


</section>









<section className="
mt-8
rounded-2xl
border
border-white/10
bg-white/[0.03]
p-6
">


<h2 className="text-xl font-semibold">
🏆 Propiedades ganadoras
</h2>



<p className="mt-2 text-sm text-slate-400">
Propiedades más enviadas por WhatsApp.
</p>




<div className="mt-5 space-y-3">


{
propertyRanking.map(
(property:any,index:number)=>(


<div
key={property.propertyId}
className="
rounded-xl
border
border-white/10
p-4
"
>


<p className="font-semibold">

{
index===0
?
"🥇"
:
"🏠"
}

Propiedad

</p>


<p className="mt-1 text-blue-400">

Enviada:
{" "}
{property.count}
veces

</p>


</div>


)
)
}


{
!propertyRanking.length && (

<p className="text-slate-500">
Todavía no hay envíos de propiedades.
</p>

)

}


</div>


</section>









<section className="
mt-8
rounded-2xl
border
border-white/10
bg-white/[0.03]
p-6
">


<h2 className="text-xl font-semibold">
🏆 Rendimiento del equipo
</h2>



<div className="mt-5 space-y-4">


{
ranking.map(
(agent,index)=>(


<div
key={agent.id}
className="
rounded-xl
border
border-white/10
p-4
"
>


<p className="font-semibold">

{
index===0
?
"🥇"
:
"👤"
}

{" "}

{agent.name}

</p>



<p className="text-sm text-slate-400">

Seguimientos:
{" "}
{agent.total}

</p>



<p className="text-sm text-blue-400">

Completados:
{" "}
{agent.completed}

</p>


</div>


)
)
}


</div>


</section>









<section className="
mt-8
rounded-2xl
border
border-white/10
bg-white/[0.03]
">


<div className="border-b border-white/10 p-6">


<h2 className="text-xl font-semibold">
🔥 Oportunidades calientes
</h2>


</div>





{
hotOpportunities?.map(
lead=>(


<div
key={lead.id}
className="
flex
justify-between
border-b
border-white/5
p-6
"
>


<Link
href={`/protected/leads/${lead.id}`}
className="
font-semibold
hover:text-blue-400
"
>

{lead.full_name}

</Link>



<div className="text-right">


<p className="font-bold text-blue-400">
{lead.lead_score}
</p>


<p className="text-sm text-slate-400">
{lead.next_action}
</p>


</div>


</div>


)
)
}



</section>









<section className="
mt-8
rounded-2xl
border
border-white/10
bg-white/[0.03]
">


<div className="border-b border-white/10 p-6">


<h2 className="text-xl font-semibold">
Leads recientes
</h2>


</div>





{
recentLeads?.map(
lead=>(


<div
key={lead.id}
className="
border-b
border-white/5
p-5
"
>


<Link
href={`/protected/leads/${lead.id}`}
className="
font-semibold
hover:text-blue-400
"
>

{lead.full_name}

</Link>



<p className="text-sm text-slate-400">

{lead.primary_zone}
{" · "}
Score:
{" "}
{lead.lead_score}

</p>


</div>


)
)
}



</section>






</div>


</main>

);

}








function MetricCard({
title,
value
}:{
title:string;
value:number;
}){


return (

<div
className="
rounded-2xl
border
border-white/10
bg-white/[0.03]
p-5
"
>


<p className="text-sm text-slate-400">
{title}
</p>


<p className="mt-2 text-3xl font-bold">
{value}
</p>


</div>

);

}