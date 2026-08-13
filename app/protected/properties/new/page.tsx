import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";



export default function NewPropertyPage() {

  return (

    <Suspense fallback={<NewPropertySkeleton />}>

      <NewPropertyContent />

    </Suspense>

  );

}






async function NewPropertyContent() {


  const supabase =
    await createClient();





  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();





  if(
    claimsError ||
    !claimsData?.claims?.sub
  ){

    redirect("/auth/login");

  }








  async function createProperty(
    formData: FormData
  ){

    "use server";



    const supabase =
      await createClient();






    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims();





    if(
      claimsError ||
      !claimsData?.claims?.sub
    ){

      redirect("/auth/login");

    }







    const userId =
      String(
        claimsData.claims.sub
      );








    const { data: membership, error: membershipError } =
      await supabase
        .from("organization_members")
        .select(
          "organization_id"
        )
        .eq(
          "user_id",
          userId
        )
        .order(
          "created_at",
          {
            ascending:true
          }
        )
        .limit(1)
        .maybeSingle();







    if(
      membershipError ||
      !membership
    ){

      throw new Error(
        "No se encontró una organización para este usuario."
      );

    }








    // ==============================
    // VALIDAR LIMITE DE PROPIEDADES
    // ==============================


    const { data: subscription } =
      await supabase
        .from("subscriptions")
        .select(
          `
          max_properties
          `
        )
        .eq(
          "organization_id",
          membership.organization_id
        )
        .single();







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
          membership.organization_id
        );








    if(
      subscription?.max_properties &&
      propertiesCount !== null &&
      propertiesCount >= subscription.max_properties
    ){

      throw new Error(
        "Alcanzaste el límite de propiedades de tu plan. Actualizá tu suscripción."
      );

    }









    const title =
      String(
        formData.get("title") || ""
      ).trim();





    if(!title){

      throw new Error(
        "El título es obligatorio."
      );

    }







    const priceValue =
      String(
        formData.get("price") || ""
      ).trim();





    const bedroomsValue =
      String(
        formData.get("bedrooms") || ""
      ).trim();





    const bathroomsValue =
      String(
        formData.get("bathrooms") || ""
      ).trim();





    const areaValue =
      String(
        formData.get("area_m2") || ""
      ).trim();








    const { error } =
      await supabase
        .from("properties")
        .insert({

          organization_id:
            membership.organization_id,


          title,


          property_type:
            String(
              formData.get("property_type") || ""
            ).trim() || null,


          operation:
            String(
              formData.get("operation") || ""
            ).trim() || null,



          zone:
            String(
              formData.get("zone") || ""
            ).trim() || null,



          address:
            String(
              formData.get("address") || ""
            ).trim() || null,



          price:
            priceValue
            ?
            Number(priceValue)
            :
            null,



          currency:
            String(
              formData.get("currency") || ""
            ).trim() || null,



          bedrooms:
            bedroomsValue
            ?
            Number(bedroomsValue)
            :
            null,



          bathrooms:
            bathroomsValue
            ?
            Number(bathroomsValue)
            :
            null,



          area_m2:
            areaValue
            ?
            Number(areaValue)
            :
            null,



          status:
            String(
              formData.get("status") || ""
            ).trim()
            ||
            "AVAILABLE",



          description:
            String(
              formData.get("description") || ""
            ).trim()
            ||
            null

        });







    if(error){

      throw new Error(
        error.message
      );

    }








    revalidatePath(
      "/protected/properties"
    );


    redirect(
      "/protected/properties"
    );

  }









  return (

    <main className="min-h-screen p-8">


      <div className="mx-auto max-w-4xl">


        <Link
          href="/protected/properties"
          className="text-sm font-semibold text-blue-400"
        >

          ← Volver a Propiedades

        </Link>






        <div className="mt-6">


          <p className="text-sm font-medium text-blue-400">
            Inventario inmobiliario
          </p>


          <h1 className="mt-1 text-3xl font-bold">
            Nueva propiedad
          </h1>


          <p className="mt-2 text-slate-400">
            Agregá una propiedad al inventario.
          </p>


        </div>







        <form
          action={createProperty}
          className="
          mt-8
          space-y-6
          rounded-2xl
          border
          border-white/10
          bg-white/[0.03]
          p-6
          "
        >


          <input
            name="title"
            required
            placeholder="Apartamento en Punta Carretas"
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3"
          />



          <div className="grid gap-5 md:grid-cols-2">


            <input
              name="zone"
              placeholder="Zona"
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3"
            />


            <input
              name="address"
              placeholder="Dirección"
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3"
            />


          </div>






          <div className="grid gap-5 md:grid-cols-3">


            <input
              name="price"
              type="number"
              placeholder="350000"
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3"
            />


            <input
              name="bedrooms"
              type="number"
              placeholder="3"
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3"
            />


            <input
              name="bathrooms"
              type="number"
              placeholder="2"
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3"
            />


          </div>





          <textarea
            name="description"
            placeholder="Descripción"
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3"
          />






          <button
            className="
            rounded-xl
            bg-blue-500
            px-6
            py-3
            font-semibold
            "
          >

            Guardar propiedad

          </button>





        </form>


      </div>


    </main>

  );

}






function NewPropertySkeleton(){

  return (

    <main className="min-h-screen p-8">

      <div className="animate-pulse">

        Cargando...

      </div>

    </main>

  );

}