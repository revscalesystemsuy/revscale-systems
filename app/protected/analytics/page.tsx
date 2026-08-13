import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";



export default async function AnalyticsPage() {


  const supabase =
    await createClient();




  const { data: claimsData } =
    await supabase.auth.getClaims();





  if(!claimsData?.claims){

    redirect("/auth/login");

  }








  const [

    { count: totalLeads },

    { count: hotLeads },

    { count: contactedLeads },

    { count: visits },

    { count: interactions },

    { count: propertiesSent },

    { count: pendingFollowups },

    { data: recentLeads },

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
      .from("interactions")
      .select(
        "id",
        {
          count:"exact",
          head:true
        }
      )
      .eq(
        "detected_intent",
        "CONTACTAR_LEAD"
      ),







    supabase
      .from("interactions")
      .select(
        "id",
        {
          count:"exact",
          head:true
        }
      )
      .eq(
        "detected_intent",
        "AGENDAR_VISITA"
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
      .from("interactions")
      .select(
        "id",
        {
          count:"exact",
          head:true
        }
      )
      .eq(
        "detected_intent",
        "ENVIAR_PROPIEDAD"
      ),







    supabase
      .from("followups")
      .select(
        "id",
        {
          count:"exact",
          head:true
        }
      )
      .eq(
        "status",
        "PENDING"
      ),







    supabase
      .from("leads")
      .select(
        `
        id,
        full_name,
        lead_score,
        lead_temperature
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
      .from("interactions")
      .select(
        `
        property_id
        `
      )
      .eq(
        "detected_intent",
        "ENVIAR_PROPIEDAD"
      )





  ]);









  const { data: topProperties } =
    await supabase
      .from("properties")
      .select(
        `
        id,
        title,
        zone,
        price,
        currency
        `
      );








  const propertyCount:any = {};





  propertyInteractions?.forEach(
    (item:any)=>{

      if(item.property_id){

        propertyCount[item.property_id] =
          (propertyCount[item.property_id] || 0) + 1;

      }

    }
  );








  const propertyRanking =
    Object.entries(propertyCount)
    .map(
      ([id,count])=>{


        const property =
          topProperties?.find(
            p =>
              p.id === id
          );



        return {

          id,

          title:
            property?.title ||
            "Propiedad",

          zone:
            property?.zone,

          price:
            property?.price,

          currency:
            property?.currency,

          count

        };


      }
    )
    .sort(
      (a:any,b:any)=>
        b.count - a.count
    )
    .slice(
      0,
      5
    );









  const conversion =
    totalLeads
    ?
    Math.round(
      (
        Number(visits || 0) /
        Number(totalLeads)
      )
      *
      100
    )
    :
    0;








  const contactRate =
    totalLeads
    ?
    Math.round(
      (
        Number(contactedLeads || 0) /
        Number(totalLeads)
      )
      *
      100
    )
    :
    0;








  const visitRate =
    totalLeads
    ?
    Math.round(
      (
        Number(visits || 0) /
        Number(totalLeads)
      )
      *
      100
    )
    :
    0;








  const interactionAverage =
    totalLeads
    ?
    (
      Number(interactions || 0) /
      Number(totalLeads)
    ).toFixed(1)
    :
    0;









  return (

    <main className="
    min-h-screen
    bg-slate-950
    p-8
    text-white
    ">


      <div className="mx-auto max-w-7xl">



        <Link
          href="/protected"
          className="text-blue-400"
        >
          ← Dashboard
        </Link>






        <h1 className="
        mt-6
        text-3xl
        font-bold
        ">

          📈 Analytics Comercial

        </h1>






        <p className="mt-2 text-slate-400">
          Métricas reales del proceso comercial.
        </p>








        <section className="
        mt-8
        grid
        gap-5
        md:grid-cols-6
        ">


          <MetricCard title="Leads" value={totalLeads || 0}/>

          <MetricCard title="HOT" value={hotLeads || 0}/>

          <MetricCard title="Contactados" value={contactedLeads || 0}/>

          <MetricCard title="Envíos" value={propertiesSent || 0}/>

          <MetricCard title="Visitas" value={visits || 0}/>

          <MetricCard title="Pendientes" value={pendingFollowups || 0}/>


        </section>









        <section className="
        mt-8
        grid
        gap-5
        md:grid-cols-3
        ">


          <MetricCard
            title="💬 Contacto"
            value={`${contactRate}%`}
          />


          <MetricCard
            title="📅 Visita"
            value={`${visitRate}%`}
          />


          <MetricCard
            title="⚡ Interacciones/Lead"
            value={interactionAverage}
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
            🏆 Propiedades ganadoras
          </h2>



          <div className="mt-5 space-y-3">


            {
              propertyRanking.map(
                (property:any,index)=>(


                  <div
                    key={property.id}
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

                      {" "}

                      {property.title}

                    </p>



                    <p className="text-sm text-slate-400">

                      {property.zone}

                    </p>



                    <p className="mt-2 text-blue-400">

                      💬 Enviada:
                      {" "}
                      {property.count}
                      veces

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
            📊 Embudo comercial
          </h2>



          <div className="
          mt-5
          grid
          gap-4
          md:grid-cols-5
          ">


            <Step title="👤 Leads" value={totalLeads || 0}/>

            <Step title="💬 Contactados" value={contactedLeads || 0}/>

            <Step title="🏠 Envíos" value={propertiesSent || 0}/>

            <Step title="📅 Visitas" value={visits || 0}/>

            <Step title="🔥 Conversión" value={`${conversion}%`}/>


          </div>


        </section>








        <section className="
        mt-8
        rounded-2xl
        border
        border-white/10
        bg-white/[0.03]
        ">


          <h2 className="border-b border-white/10 p-6 text-xl font-semibold">
            🔥 Últimos leads
          </h2>




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

                  <p className="font-semibold">
                    {lead.full_name || "Sin nombre"}
                  </p>


                  <p className="text-sm text-slate-400">

                    Score:
                    {" "}
                    {lead.lead_score}

                    {" · "}

                    {lead.lead_temperature}

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
value:number|string;
}){


return (

<div className="
rounded-2xl
border
border-white/10
bg-white/[0.03]
p-5
">


<p className="text-sm text-slate-400">
{title}
</p>


<p className="mt-2 text-3xl font-bold">
{value}
</p>


</div>

);

}








function Step({
title,
value
}:{
title:string;
value:number|string;
}){


return (

<div className="
rounded-xl
border
border-white/10
p-5
">


<p className="text-sm text-slate-400">
{title}
</p>


<p className="mt-2 text-2xl font-bold">
{value}
</p>


</div>

);

}