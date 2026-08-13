import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";


export default function NewFollowupPage() {

  return (

    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 p-8 text-white">
          Cargando formulario...
        </main>
      }
    >

      <NewFollowupContent />

    </Suspense>

  );

}





async function NewFollowupContent() {


  const supabase = await createClient();



  const { data: leads } = await supabase
    .from("leads")
    .select(
      `
      id,
      full_name
      `
    )
    .order("created_at", { ascending: false });





  async function createFollowup(formData: FormData) {

    "use server";



    const supabase = await createClient();



    const lead_id = String(formData.get("lead_id") || "");
    const title = String(formData.get("title") || "");
    const notes = String(formData.get("notes") || "");
    const due_at = String(formData.get("due_at") || "");
    const priority = String(formData.get("priority") || "MEDIUM");



    if (!lead_id || !title) {

      throw new Error(
        "Lead y título son obligatorios"
      );

    }





    const { data: lead, error: leadError } =
      await supabase
        .from("leads")
        .select("organization_id")
        .eq("id", lead_id)
        .single();





    if (leadError || !lead) {

      throw new Error(
        "No se encontró el lead"
      );

    }






    const { error } = await supabase
      .from("followups")
      .insert({

        organization_id: lead.organization_id,

        lead_id: lead_id,

        title: title,

        notes: notes || null,

        due_at: due_at
          ? new Date(due_at).toISOString()
          : null,

        priority: priority,

        status: "PENDING"

      });






    if (error) {

      console.error(
        "FOLLOWUP ERROR:",
        error
      );


      throw new Error(
        error.message
      );

    }






    redirect("/protected/followups");

  }








  return (

    <main className="min-h-screen bg-slate-950 p-8 text-white">


      <div className="mx-auto max-w-3xl">



        <Link
          href="/protected/followups"
          className="text-blue-400 hover:text-blue-300"
        >
          ← Volver a Follow-ups
        </Link>





        <h1 className="mt-6 text-3xl font-bold">
          Nuevo follow-up
        </h1>




        <p className="mt-2 text-slate-400">
          Crear una tarea comercial para un lead.
        </p>






        <form
          action={createFollowup}
          className="
          mt-8
          space-y-5
          rounded-2xl
          border
          border-white/10
          bg-white/[0.03]
          p-6
          "
        >






          <div>

            <label className="text-sm text-slate-400">
              Lead
            </label>



            <select
              name="lead_id"
              required
              className="
              mt-2
              w-full
              rounded-xl
              border
              border-white/10
              bg-slate-950
              p-3
              "
            >


              <option value="">
                Seleccionar lead
              </option>



              {leads?.map((lead)=>(

                <option
                  key={lead.id}
                  value={lead.id}
                >

                  {lead.full_name}

                </option>

              ))}


            </select>


          </div>







          <div>

            <label className="text-sm text-slate-400">
              Título
            </label>



            <input

              name="title"

              required

              placeholder="Ej: Coordinar visita"

              className="
              mt-2
              w-full
              rounded-xl
              border
              border-white/10
              bg-transparent
              p-3
              "

            />


          </div>







          <div>

            <label className="text-sm text-slate-400">
              Notas
            </label>



            <textarea

              name="notes"

              rows={4}

              placeholder="Detalles del seguimiento..."

              className="
              mt-2
              w-full
              rounded-xl
              border
              border-white/10
              bg-transparent
              p-3
              "

            />


          </div>







          <div>

            <label className="text-sm text-slate-400">
              Fecha y hora
            </label>



            <input

              name="due_at"

              type="datetime-local"

              required

              className="
              mt-2
              w-full
              rounded-xl
              border
              border-white/10
              bg-transparent
              p-3
              "

            />


          </div>







          <div>

            <label className="text-sm text-slate-400">
              Prioridad
            </label>




            <select

              name="priority"

              className="
              mt-2
              w-full
              rounded-xl
              border
              border-white/10
              bg-slate-950
              p-3
              "

            >



              <option value="LOW">
                Baja
              </option>


              <option value="MEDIUM">
                Media
              </option>


              <option value="HIGH">
                Alta
              </option>



            </select>


          </div>








          <button

            className="
            rounded-xl
            bg-blue-500
            px-6
            py-3
            font-semibold
            hover:bg-blue-400
            "

          >

            Crear follow-up

          </button>






        </form>




      </div>



    </main>

  );

}