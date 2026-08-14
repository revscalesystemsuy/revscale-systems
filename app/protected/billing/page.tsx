import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";


export const dynamic = "force-dynamic";



export default async function BillingPage() {


  const supabase =
    await createClient();





  const { data: claimsData } =
    await supabase.auth.getClaims();





  const userId =
    claimsData?.claims?.sub;





  if(!userId){

    redirect("/auth/login");

  }







  const { data: membership } =
    await supabase
      .from("organization_members")
      .select(
        `
        organization_id
        `
      )
      .eq(
        "user_id",
        userId
      )
      .single();








  if(!membership){

    redirect("/protected");

  }








  const { data: subscription } =
    await supabase
      .from("subscriptions")
      .select(
        `
        plan,
        status,
        max_agents,
        max_leads
        `
      )
      .eq(
        "organization_id",
        membership.organization_id
      )
      .maybeSingle();









  const { count: agentsCount } =
    await supabase
      .from("organization_members")
      .select(
        "id",
        {
          count:"exact",
          head:true
        }
      )
      .eq(
        "organization_id",
        membership.organization_id
      )
      .eq(
        "status",
        "ACTIVE"
      );








  const { count: leadsCount } =
    await supabase
      .from("leads")
      .select(
        "id",
        {
          count:"exact",
          head:true
        }
      )
      .eq(
        "organization_id",
        membership.organization_id
      );








  return (

    <main className="
    min-h-screen
    bg-slate-950
    p-8
    text-white
    ">


      <div className="
      mx-auto
      max-w-5xl
      ">





        <h1 className="
        text-3xl
        font-bold
        ">

          💳 Mi Plan

        </h1>





        <p className="
        mt-2
        text-slate-400
        ">

          Administración de tu suscripción.

        </p>









        <section className="
        mt-8
        rounded-2xl
        border
        border-white/10
        bg-white/[0.03]
        p-8
        ">





          <div className="
          flex
          justify-between
          items-start
          ">





            <div>


              <p className="text-sm text-slate-400">

                Plan actual

              </p>




              <h2 className="
              mt-2
              text-4xl
              font-bold
              text-blue-400
              ">

                {subscription?.plan || "TRIAL"}

              </h2>



            </div>








            <span
              className="
              rounded-full
              bg-green-500/10
              px-4
              py-2
              text-green-400
              "
            >

              {subscription?.status || "INACTIVE"}

            </span>





          </div>








          <div className="
          mt-8
          grid
          gap-5
          md:grid-cols-2
          ">




            <UsageCard

              title="👥 Agentes activos"

              current={
                agentsCount || 0
              }

              max={
                subscription?.max_agents || 0
              }

            />






            <UsageCard

              title="🔥 Leads"

              current={
                leadsCount || 0
              }

              max={
                subscription?.max_leads || 0
              }

            />






          </div>






        </section>









        <section className="
        mt-8
        rounded-2xl
        border
        border-white/10
        bg-white/[0.03]
        p-8
        ">



          <h2 className="
          text-xl
          font-semibold
          ">

            Incluye tu plan

          </h2>






          <div className="
          mt-5
          space-y-3
          text-slate-300
          ">


            <p>
              ✓ Dashboard comercial con IA
            </p>


            <p>
              ✓ Gestión de leads
            </p>


            <p>
              ✓ Follow-ups automáticos
            </p>


            <p>
              ✓ Equipo de agentes
            </p>


            <p>
              ✓ Reportes comerciales
            </p>


          </div>





        </section>








        <button
          className="
          mt-8
          rounded-xl
          bg-blue-500
          px-6
          py-3
          font-semibold
          "
        >

          Mejorar plan

        </button>






      </div>


    </main>

  );

}








function UsageCard({
title,
current,
max
}:{
title:string;
current:number;
max:number;
}){


return (

<div className="
rounded-xl
border
border-white/10
p-5
">


<p className="text-slate-400">

{title}

</p>




<p className="
mt-3
text-3xl
font-bold
">

{current}

<span className="
text-slate-500
text-lg
">

{" "}
/ {max}

</span>


</p>




</div>

);

}