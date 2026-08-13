import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";



export default async function OnboardingPage(){


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









  const organizationId =
    membership.organization_id;









  const [

    { count: agentsCount },

    { count: propertiesCount },

    { count: leadsCount }


  ] = await Promise.all([







    supabase
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
        organizationId
      ),








    supabase
      .from("properties")
      .select(
        "id",
        {
          count:"exact",
          head:true
        }
      )
      .eq(
        "organization_id",
        organizationId
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
        "organization_id",
        organizationId
      )




  ]);









  const steps = [

    {
      title:"Crear equipo",
      completed:
        (agentsCount || 0) > 1
    },


    {
      title:"Cargar propiedades",
      completed:
        (propertiesCount || 0) > 0
    },


    {
      title:"Crear primer lead",
      completed:
        (leadsCount || 0) > 0
    }


  ];









  const completedSteps =
    steps.filter(
      step =>
        step.completed
    ).length;








  const progress =
    Math.round(
      (
        completedSteps /
        steps.length
      )
      *
      100
    );









  // ===============================
  // COMPLETAR ONBOARDING AUTOMÁTICO
  // ===============================


  if(progress >= 100){


    await supabase
      .from("organization_onboarding")
      .upsert({

        organization_id:
          organizationId,

        completed:true

      },
      {
        onConflict:
          "organization_id"
      });




    redirect(
      "/protected"
    );

  }









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









        <div className="text-center">


          <p className="
          text-blue-400
          font-semibold
          ">

            RevScale AI

          </p>







          <h1 className="
          mt-3
          text-4xl
          font-bold
          ">

            🚀 Bienvenido a RevScale

          </h1>








          <p className="
          mt-4
          text-slate-400
          ">

            Configurá tu plataforma comercial inteligente.

          </p>




        </div>









        <section className="
        mt-10
        rounded-2xl
        border
        border-white/10
        bg-white/[0.03]
        p-6
        ">



          <div className="
          flex
          justify-between
          ">


            <h2 className="font-semibold">

              Progreso de configuración

            </h2>



            <span className="text-blue-400">

              {progress}%

            </span>


          </div>






          <div className="
          mt-4
          h-3
          rounded-full
          bg-white/10
          ">


            <div
              className="
              h-3
              rounded-full
              bg-blue-500
              "
              style={{
                width:`${progress}%`
              }}
            />


          </div>



        </section>









        <section className="
        mt-10
        grid
        gap-5
        md:grid-cols-2
        ">


          <StepCard
            icon={
              (agentsCount || 0) > 1
              ?
              "✅"
              :
              "👥"
            }
            title="Crear equipo"
            description="Invitá vendedores y asigná roles."
            href="/protected/agents"
          />




          <StepCard
            icon={
              (propertiesCount || 0) > 0
              ?
              "✅"
              :
              "🏠"
            }
            title="Cargar propiedades"
            description="Agregá tu inventario inmobiliario."
            href="/protected/properties"
          />




          <StepCard
            icon={
              (leadsCount || 0) > 0
              ?
              "✅"
              :
              "👤"
            }
            title="Crear primer lead"
            description="Cargá clientes y activá la IA comercial."
            href="/protected/leads/new"
          />




          <StepCard
            icon="🤖"
            title="Probar Matching IA"
            description="Encontrá propiedades ideales para cada cliente."
            href="/protected/leads"
          />



        </section>






        <div className="
        mt-10
        rounded-2xl
        border
        border-blue-500/20
        bg-blue-500/10
        p-6
        text-center
        ">


          <h2 className="
          text-xl
          font-semibold
          ">

            🚀 Terminemos la configuración

          </h2>



          <p className="
          mt-2
          text-slate-300
          ">

            Completá los pasos iniciales para activar todo el potencial de RevScale.

          </p>




          <Link
            href="/protected/properties"
            className="
            mt-5
            inline-block
            rounded-xl
            bg-blue-500
            px-6
            py-3
            font-semibold
            hover:bg-blue-400
            "
          >

            ⚙️ Continuar configuración

          </Link>





        </div>






      </div>


    </main>

  );

}








function StepCard({
icon,
title,
description,
href
}:{
icon:string;
title:string;
description:string;
href:string;
}){


return (

<div className="
rounded-2xl
border
border-white/10
bg-white/[0.03]
p-6
">


<div className="text-4xl">

{icon}

</div>



<h2 className="
mt-4
text-xl
font-semibold
">

{title}

</h2>




<p className="
mt-2
text-sm
text-slate-400
">

{description}

</p>




<Link
href={href}
className="
mt-5
inline-block
rounded-xl
bg-white/10
px-4
py-2
text-sm
font-semibold
hover:bg-white/20
"
>

Abrir

</Link>


</div>

);

}