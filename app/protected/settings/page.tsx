import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";


export default async function SettingsPage() {


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
        organization_id,
        role
        `
      )
      .eq(
        "user_id",
        userId
      )
      .single();







  const organizationId =
    membership?.organization_id;







  const { data: organization } =
    await supabase
      .from("organizations")
      .select(
        `
        id,
        name,
        slug,
        created_at
        `
      )
      .eq(
        "id",
        organizationId
      )
      .single();








  const { count: membersCount } =
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
        organizationId
      );








  const { data: subscription } =
    await supabase
      .from("subscriptions")
      .select(
        `
        plan,
        status,
        max_agents,
        max_leads,
        max_properties
        `
      )
      .eq(
        "organization_id",
        organizationId
      )
      .single();








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
        organizationId
      );








  const { count: propertiesCount } =
    await supabase
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
      );









  return (

    <main className="
    min-h-screen
    bg-slate-950
    p-8
    text-white
    ">


      <div className="mx-auto max-w-5xl">






        <h1 className="text-3xl font-bold">
          Configuración
        </h1>



        <p className="mt-2 text-slate-400">
          Administración de tu organización y plataforma.
        </p>









        <section className="
        mt-8
        grid
        gap-5
        md:grid-cols-2
        ">








          <Card title="🏢 Organización">


            <p className="text-lg font-semibold">
              {organization?.name}
            </p>


            <p className="mt-2 text-sm text-slate-400">

              Slug:
              {" "}
              {organization?.slug}

            </p>


            <p className="mt-2 text-sm text-slate-400">


              Creada:
              {" "}

              {
                organization?.created_at &&
                new Date(
                  organization.created_at
                ).toLocaleDateString("es-UY")
              }


            </p>


          </Card>









          <Card title="👤 Usuario actual">


            <p>

              Rol:
              {" "}

              <span className="text-blue-400">
                {membership?.role}
              </span>


            </p>


            <p className="mt-3 text-sm text-slate-400">

              Usuario:
              {" "}
              {userId}

            </p>


          </Card>









          <Card title="👥 Equipo">


            <p className="text-3xl font-bold">

              {membersCount ?? 0}

            </p>



            <p className="text-slate-400">
              miembros activos
            </p>



            <p className="mt-4 text-sm text-slate-500">

              Límite:
              {" "}
              {subscription?.max_agents ?? 0}
              {" "}
              agentes

            </p>


          </Card>









          <Card title="💳 Suscripción">


            <p>

              Plan actual:

              {" "}

              <span className="
              font-semibold
              text-blue-400
              ">

                {
                  subscription?.plan ||
                  "TRIAL"
                }

              </span>


            </p>







            <p className="mt-2 text-slate-400">

              Estado:

              {" "}

              {
                subscription?.status ||
                "INACTIVE"
              }

            </p>









            <div className="
            mt-5
            border-t
            border-white/10
            pt-5
            ">


              <h3 className="font-semibold">
                Uso actual
              </h3>





              <p className="mt-3 text-sm text-slate-400">

                👥 Agentes:

                {" "}

                {membersCount ?? 0}

                /

                {subscription?.max_agents ?? 0}


              </p>





              <p className="mt-2 text-sm text-slate-400">

                👤 Leads:

                {" "}

                {leadsCount ?? 0}

                /

                {subscription?.max_leads ?? 0}


              </p>





              <p className="mt-2 text-sm text-slate-400">

                🏠 Propiedades:

                {" "}

                {propertiesCount ?? 0}

                /

                {subscription?.max_properties ?? 0}


              </p>



            </div>








            <Link
              href="/pricing"
              className="
              mt-6
              block
              rounded-xl
              bg-blue-500
              px-5
              py-3
              text-center
              font-semibold
              hover:bg-blue-400
              "
            >

              🚀 Actualizar plan

            </Link>



          </Card>








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
            Próximamente
          </h2>




          <div className="
          mt-4
          space-y-3
          text-slate-400
          ">


            <p>
              🤖 Configuración del asistente IA
            </p>


            <p>
              💳 Gestión avanzada de planes
            </p>


            <p>
              📱 Integraciones WhatsApp / Email
            </p>


            <p>
              🔐 Permisos por rol
            </p>


            <p>
              📈 Métricas de crecimiento
            </p>


          </div>


        </section>






      </div>


    </main>

  );

}







function Card({
  title,
  children
}:{
  title:string;
  children:React.ReactNode;
}){


  return (

    <div
      className="
      rounded-2xl
      border
      border-white/10
      bg-white/[0.03]
      p-6
      "
    >


      <h2 className="mb-4 text-lg font-semibold">
        {title}
      </h2>


      {children}


    </div>

  );

}