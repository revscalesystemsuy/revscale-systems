import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { toggleAgentStatus } from "./actions";


export default function AgentsPage() {


  return (

    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 p-8 text-white">
          Cargando...
        </main>
      }
    >

      <AgentsContent />

    </Suspense>

  );

}





async function AgentsContent() {


  const supabase = await createClient();





  const { data: members } =
    await supabase
      .from("organization_members")
      .select(
        `
        id,
        user_id,
        role,
        status,
        created_at
        `
      )
      .order(
        "created_at",
        {
          ascending:true
        }
      );





  const { data: profiles } =
    await supabase
      .from("profiles")
      .select(
        `
        id,
        full_name,
        phone
        `
      );





  const userIds =
    members?.map(
      m => m.user_id
    ) || [];





  const { data: followups } =
    await supabase
      .from("followups")
      .select(
        `
        assigned_to,
        status
        `
      )
      .in(
        "assigned_to",
        userIds
      );







  const agents =
    members?.map((member)=>{


      const profile =
        profiles?.find(
          p =>
            p.id === member.user_id
        );




      const agentFollowups =
        followups?.filter(
          f =>
            f.assigned_to === member.user_id
        ) || [];





      return {

        ...member,

        profile,

        total:
          agentFollowups.length,


        pending:
          agentFollowups.filter(
            f =>
              f.status === "PENDING"
          ).length,


        completed:
          agentFollowups.filter(
            f =>
              f.status === "COMPLETED"
          ).length

      };


    }) || [];







  return (

    <main className="min-h-screen bg-slate-950 p-8 text-white">


      <div className="mx-auto max-w-7xl">





        <div className="flex justify-between">


          <div>

            <h1 className="text-3xl font-bold">
              Agentes
            </h1>


            <p className="mt-2 text-slate-400">
              Equipo comercial.
            </p>


          </div>





          <Link
            href="/protected/agents/invite"
            className="
            rounded-xl
            bg-blue-500
            px-5
            py-3
            font-semibold
            "
          >
            + Invitar agente
          </Link>


        </div>








        <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">





          {agents.map((agent:any)=>(



            <div
              key={agent.id}
              className="
              rounded-2xl
              border
              border-white/10
              bg-white/[0.03]
              p-6
              "
            >





              <h2 className="text-xl font-bold">

                {
                  agent.profile?.full_name
                  ||
                  "Sin nombre"
                }

              </h2>





              <p className="text-slate-400">

                📞{" "}
                {
                  agent.profile?.phone
                  ||
                  "Sin teléfono"
                }

              </p>








              <div className="mt-4">

                {
                  agent.status === "ACTIVE"

                  ?

                  <span
                    className="
                    rounded-full
                    bg-green-500/10
                    px-3
                    py-1
                    text-sm
                    text-green-400
                    "
                  >
                    🟢 Activo
                  </span>

                  :

                  <span
                    className="
                    rounded-full
                    bg-red-500/10
                    px-3
                    py-1
                    text-sm
                    text-red-400
                    "
                  >
                    🔴 Suspendido
                  </span>

                }

              </div>







              <span
                className="
                inline-block
                mt-4
                rounded-full
                bg-blue-500/10
                px-3
                py-1
                text-blue-400
                "
              >

                {agent.role}

              </span>







              <div className="mt-6 grid grid-cols-3 gap-3">


                <Metric
                  label="Total"
                  value={agent.total}
                />


                <Metric
                  label="Pend."
                  value={agent.pending}
                />


                <Metric
                  label="OK"
                  value={agent.completed}
                />


              </div>








              <Link
                href={`/protected/agents/${agent.id}/edit`}
                className="
                mt-5
                block
                rounded-xl
                border
                border-white/10
                px-4
                py-2
                text-center
                text-sm
                hover:bg-white/5
                "
              >
                ✏️ Editar agente
              </Link>








              <form
                action={toggleAgentStatus}
                className="mt-3"
              >

                <input
                  type="hidden"
                  name="id"
                  value={agent.id}
                />


                <input
                  type="hidden"
                  name="status"
                  value={
                    agent.status === "ACTIVE"
                    ? "SUSPENDED"
                    : "ACTIVE"
                  }
                />



                <button
                  className="
                  w-full
                  rounded-xl
                  border
                  border-white/10
                  px-4
                  py-2
                  text-sm
                  hover:bg-white/5
                  "
                >

                  {
                    agent.status === "ACTIVE"
                    ? "⏸ Suspender"
                    : "▶ Activar"
                  }

                </button>


              </form>





            </div>


          ))}



        </section>




      </div>


    </main>

  );

}






function Metric({
  label,
  value
}:{
  label:string;
  value:number;
}){


  return (

    <div
      className="
      rounded-xl
      bg-white/[0.03]
      p-3
      text-center
      "
    >

      <p className="text-xs text-slate-400">
        {label}
      </p>


      <p className="text-xl font-bold">
        {value}
      </p>


    </div>

  );

}